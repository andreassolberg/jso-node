var 
	querystring = require('querystring'),
    crypto = require('crypto'),
    https = require('https'),
    http = require('http'),
    url = require('url'),
    request = require('request'),
    Class = require('./class').Class,

    // Local utility classes
    utils = require('./utils').utils,
    store = require('./store'),

    OAuthConnectMiddleware = require('./OAuthConnectMiddleware').OAuthConnectMiddleware,
    AccessToken = require('./AccessToken').AccessToken
    ;


// Local variables
var 
	default_lifetime = 3600,
	options = {
		"debug": true
	},
	strictRequireState = false // TOdo enable do not use state.
	;


// var ConnectRedirectStrategy = function() {
// 	// console.log("ConnectRedirectStrategy()");
// }
// ConnectRedirectStrategy.prototype.redirect = function(url) {
// 	console.log("redirect", url);
// }



var OAuth = Class.extend({
	"init": function(config, storageStrategy, redirectStrategy) {
		this.providerID = "providerID";
		this.config = config;

		this.internalStates = {};

		this.store = storageStrategy ? storageStrategy : new store.SimpleStore();
		// this.redirect = redirectStrategy ? redirectStrategy : new ConnectRedirectStrategy();

		// if (this.providerID) {
		// 	OAuth.instances[this.providerID] = this;
		// }
	},
	"getMiddleware": function () {
		return new OAuthConnectMiddleware(this);
	},
	"getRedirectHandler": function(req, res) {

		var redirect = function(inputurl) {
			var purl = url.parse(inputurl);

			// console.log("Parsing url : " + inputurl);
			// console.log(purl);

			if (!purl.hostname) throw new Error('Missing hostname in url');
			// if (!purl.port) throw new Error('Missing port in url');
			if (purl.protocol !== 'http:' && purl.protocol !== 'https:') throw new Error('Invalid protocol for url to redirect');

			var vurl = url.format(purl);

			console.log(" Redirect   About to redirect user to ", vurl);

			res.writeHead (301, {'Location': vurl});
			res.end();

		};
		return redirect;
	},
	"resolveCode": function(code, callback) {
		var requestOptions = {
			"url": this.getOption('token'),
			"headers": {},
			'auth': {
				'user': this.getOption('client_id'),
				'pass': this.getOption('client_secret'),
				'sendImmediately': true
			}
		};
		

		var requestBody = {
			"grant_type": "authorization_code",
			"code": code,
			"client_id": this.getOption('client_id')
		};

		if (this.hasOption('redirect_uri')) {
			requestBody.redirect_uri = this.getOption('redirect_uri');
		}

		// utils.log("About to resolve code", requestOptions, requestBody);

		request.post(requestOptions, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				// console.log(body) // Print the google web page.
				// console.log("Received data was " + body);
				var pbody = JSON.parse(body);
				// console.log(pbody);

				return callback(pbody);

			} else {

				// TODO Provide some more details to the error
				return callback(new Error("Could not resolve OAuth code"));

			}
			
		}).form(requestBody);
	},

	"callbackCode": function(code, state, callback) {

		var that = this;
		var now = utils.epoch();

		stateObject = this.store.getState(state);

		// console.log("Obtaining state object for state", state);
		// console.log(stateObject);

		if (stateObject === null) {
			throw new Error('Cannot look up state ' + state);
		}

		if (stateObject.providerID !== this.providerID) {
			throw new Error('Incorrect Provider ID in reponse. Due to security reasons, this is not accepted.');
		}



		this.resolveCode(code, function(codeResponse) {

			// console.log("Code resolved to ", codeResponse);

			if (codeResponse instanceof Error) {
				return callback(codeResponse);
			}

			var token = new AccessToken(codeResponse);


			/**
			 * If state was not provided, and default provider contains a scope parameter
			 * we assume this is the one requested...
			 */
			if (!codeResponse.state && that.hasOption('default_scope')) {
				token.scopes = that._getRequestScopes();
				token.set('scope', that._getRequestScopes().join(' '));
				// utils.log("Setting state: ", state);
			}
			// utils.log("Checking atoken ", token);

			/*
			 * Decide when this token should expire.
			 * Priority fallback:
			 * 1. Access token expires_in
			 * 2. Life time in config (may be false = permanent...)
			 * 3. Specific permanent scope.
			 * 4. Default library lifetime:
			 */
			
			if (!token.has('expire_in')) {

				if (that.hasOption('default_lifetime')) {
					token.setExpiresIn(this.getOption('default_lifetime'));
				} else {
					token.setExpiresIn(default_lifetime);
				}

			}


			that.store.saveToken(state.providerID, token);


			callback(token, stateObject.returnTo);



		});

	},

	"_getRequestScopes": function(opts) {
		var scopes = [];
		/*
		 * Calculate which scopes to request, based upon provider config and request config.
		 */
		if (this.config.scopes && this.config.scopes.request) {
			for(var i = 0; i < this.config.scopes.request.length; i++) scopes.push(this.config.scopes.request[i]);
		}
		if (opts && opts.scopes && opts.scopes.request) {
			for(var i = 0; i < opts.scopes.request.length; i++) scopes.push(opts.scopes.request[i]);
		}
		return utils.uniqueList(scopes);
	},

	"_getRequiredScopes": function(opts) {
		var scopes = [];
		/*
		 * Calculate which scopes to request, based upon provider config and request config.
		 */
		if (this.config.scopes && this.config.scopes.require) {
			for(var i = 0; i < this.config.scopes.require.length; i++) scopes.push(this.config.scopes.require[i]);
		}
		if (opts && opts.scopes && opts.scopes.require) {
			for(var i = 0; i < opts.scopes.require.length; i++) scopes.push(opts.scopes.require[i]);
		}
		return utils.uniqueList(scopes);
	},


	"checkToken": function(opts) {
		// var scopesRequest  = this._getRequestScopes(opts);
		var scopesRequire = this._getRequiredScopes(opts);
		var token = this.store.getToken(this.providerID, scopesRequire);

		return token;
	},

	"authorize": function(redirectCallback, opts, returnTo) {
		var 
			request,
			authurl,
			scopes;

		// utils.log("About to send an authorization request to this entry:", this.config);
		if (!this.config.authorization) throw "Missing OAuth config parameter: authorization";

		request = {
			"response_type": "code",
			"state": utils.uuid(),
			"returnTo": returnTo
		};

		// if (callback && typeof callback === 'function') {
		// 	this.internalStates[request.state] = callback;
		// }

		if (this.config["redirect_uri"]) {
			request["redirect_uri"] = this.config["redirect_uri"];
		}
		if (!this.config["client_id"]) throw new {"message": "client_id not registered with application."};
		request["client_id"] = this.config["client_id"];

		/*
		 * Calculate which scopes to request, based upon provider config and request config.
		 */
		scopes = this._getRequestScopes(opts);
		if (scopes.length > 0) {
			request["scope"] = utils.scopeList(scopes);
		}

		authurl = utils.encodeURL(this.config.authorization, request);

		// We'd like to cache the hash for not loosing Application state. 
		// With the implciit grant flow, the hash will be replaced with the access
		// token when we return after authorization.
		// if (window.location.hash) {
		// 	request["restoreHash"] = window.location.hash;
		// }
		request["providerID"] = this.providerID;
		if (scopes) {
			request["scopes"] = scopes;
		}


		// utils.log("Saving state [" + request.state + "]");
		// utils.log(JSON.parse(JSON.stringify(request)));

		this.store.saveState(request.state, request);

		// console.log("redirectCallback", redirectCallback);

		redirectCallback(authurl);
	},


	"wipeTokens": function() {
		this.store.wipeTokens(this.providerID);
	},


	"hasOption": function(key, overrides) {
		if (typeof overrides === 'object' && overrides !== null) {
			if (overrides.hasOwnProperty(key)) {
				return overrides[key];
			}
		}
		if (this.config.hasOwnProperty(key)) {
			return this.config[key];
		}
	},

	"getOption": function(key, defaultValue, overrides) {

		if (typeof overrides === 'object' && overrides !== null) {
			if (overrides.hasOwnProperty(key)) {
				return overrides[key];
			}
		}
		if (this.config.hasOwnProperty(key)) {
			return this.config[key];
		}
		if (typeof defaultValue !== 'undefined') {
			return defaultValue;
		}

		throw new Error('Required options');
	},



	"getJSON":  function(url, token, options, callback, redirectCallback) {

		var that = this;
		// if (redirectCallback !== null && typeof redirectCallback !== 'unfined') {}

		// console.log("getJSON()", url, options, redirectCallback);
		// console.log("=====> getJSON()", redirectCallback);
		options = options || {};

		if  (!token instanceof AccessToken) {
			throw new Error('Invalid token provided. Not an AccessToken');
		}


		var requestOptions = {
			"url": url,
			"headers": {}
		}

		// utils.log("Ready. Got an token, and ready to perform an AJAX call", token);

		if (that.getOption('presenttoken', null, options) === 'qs') {
			requestOptions.url += ((url.indexOf("?") === -1) ? '?' : '&') + "access_token=" + encodeURIComponent(token.get("access_token"));
		} else {
			requestOptions.headers["Authorization"] = "Bearer " + token.get("access_token");
		}

		// utils.log('Performing call to url', requestOptions);

		request(requestOptions, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				// console.log(body) // Print the google web page.
			}
			var data = JSON.parse(body);
			callback(data);
			// console.log("No errors. Data received was: " + body);
		});



	}



})





// /**
//  * Check if the hash contains an access token. 
//  * And if it do, extract the state, compare with
//  * config, and store the access token for later use.
//  *
//  * The url parameter is optional. Used with phonegap and
//  * childbrowser when the jso context is not receiving the response,
//  * instead the response is received on a child browser.
//  */
// OAuth.prototype.callback = function(url, callback, providerID) {
// 	var 
// 		atoken,
// 		// h = window.location.hash,
// 		now = utils.epoch(),
// 		state,
// 		instance;

// 	utils.log("OAuth.prototype.callback()");

// 	// If a url is provided 
// 	if (url) {
// 		// utils.log('Hah, I got the url and it ' + url);
// 		if(url.indexOf('#') === -1) return;
// 		h = url.substring(url.indexOf('#'));
// 		// utils.log('Hah, I got the hash and it is ' +  h);
// 	}

// 	/*
// 	 * Start with checking if there is a token in the hash
// 	 */
// 	if (h.length < 2) return;
// 	if (h.indexOf("access_token") === -1) return;
// 	h = h.substring(1);
// 	atoken = utils.parseQueryString(h);

// 	if (atoken.state) {
// 		state = this.store.getState(atoken.state);
// 	} else {
// 		if (!providerID) {throw "Could not get [state] and no default providerid is provided.";}
// 		state = {providerID: providerID};
// 	}

	
// 	if (!state) throw "Could not retrieve state";
// 	if (!state.providerID) throw "Could not get providerid from state";
// 	if (!OAuth.instances[state.providerID]) throw "Could not retrieve OAuth.instances for this provider.";
	
// 	instance = OAuth.instances[state.providerID];

// 	/**
// 	 * If state was not provided, and default provider contains a scope parameter
// 	 * we assume this is the one requested...
// 	 */
// 	if (!atoken.state && co.scope) {
// 		state.scopes = instance._getRequestScopes();
// 		utils.log("Setting state: ", state);
// 	}
// 	utils.log("Checking atoken ", atoken, " and instance ", instance);

// 	/*
// 	 * Decide when this token should expire.
// 	 * Priority fallback:
// 	 * 1. Access token expires_in
// 	 * 2. Life time in config (may be false = permanent...)
// 	 * 3. Specific permanent scope.
// 	 * 4. Default library lifetime:
// 	 */
// 	if (atoken["expires_in"]) {
// 		atoken["expires"] = now + parseInt(atoken["expires_in"], 10);
// 	} else if (instance.config["default_lifetime"] === false) {
// 		// Token is permanent.
// 	} else if (instance.config["default_lifetime"]) {
// 		atoken["expires"] = now + instance.config["default_lifetime"];
// 	} else if (instance.config["permanent_scope"]) {
// 		if (!this.store.hasScope(atoken, instance.config["permanent_scope"])) {
// 			atoken["expires"] = now + default_lifetime;
// 		}
// 	} else {
// 		atoken["expires"] = now + default_lifetime;
// 	}

// 	/*
// 	 * Handle scopes for this token
// 	 */
// 	if (atoken["scope"]) {
// 		atoken["scopes"] = atoken["scope"].split(" ");
// 	} else if (state["scopes"]) {
// 		atoken["scopes"] = state["scopes"];
// 	}



// 	this.store.saveToken(state.providerID, atoken);

// 	// if (state.restoreHash) {
// 	// 	window.location.hash = state.restoreHash;
// 	// } else {
// 	// 	window.location.hash = '';
// 	// }


// 	utils.log(atoken);

// 	if (OAuth.internalStates[atoken.state] && typeof OAuth.internalStates[atoken.state] === 'function') {
// 		// log("InternalState is set, calling it now!");
// 		OAuth.internalStates[atoken.state]();
// 		delete OAuth.internalStates[atoken.state];
// 	}


// 	if (typeof callback === 'function') {
// 		callback();
// 	}

// 	// utils.log(atoken);

// }



// OAuth.prototype.ajax = function(settings) {

// 	var 
// 		allowia,
// 		scopes,
// 		token,
// 		providerid,
// 		co;

// 	var that = this;

// 	if (!OAuth.$) throw {"message": "JQuery support not enabled."};
	
// 	oauthOptions = settings.oauth || {};

// 	var errorOverridden = settings.error || null;
// 	settings.error = function(jqXHR, textStatus, errorThrown) {
// 		utils.log('error(jqXHR, textStatus, errorThrown)');
// 		utils.log(jqXHR);
// 		utils.log(textStatus);
// 		utils.log(errorThrown);

// 		if (jqXHR.status === 401) {

// 			utils.log("Token expired. About to delete this token");
// 			utils.log(token);
// 			that.wipeTokens();

// 		}
// 		if (errorOverridden && typeof errorOverridden === 'function') {
// 			errorOverridden(jqXHR, textStatus, errorThrown);
// 		}
// 	}


// 	this.getToken(function(token) {
// 		utils.log("Ready. Got an token, and ready to perform an AJAX call", token);

// 		if (that.config["presenttoken"] && that.config["presenttoken"] === "qs") {
// 			// settings.url += ((h.indexOf("?") === -1) ? '?' : '&') + "access_token=" + encodeURIComponent(token["access_token"]);
// 			if (!settings.data) settings.data = {};
// 			settings.data["access_token"] = token["access_token"];
// 		} else {
// 			if (!settings.headers) settings.headers = {};
// 			settings.headers["Authorization"] = "Bearer " + token["access_token"];
// 		}
// 		utils.log('$.ajax settings', settings);
// 		OAuth.$.ajax(settings);

// 	}, oauthOptions);

// }





exports.OAuth = OAuth;