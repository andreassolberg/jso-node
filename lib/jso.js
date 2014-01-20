var 
	querystring = require('querystring'),
    crypto = require('crypto'),
    https = require('https'),
    http = require('http'),
    url = require('url'),
    request = require('request'),
    path = require('path'),

    // Local utility classes
    Class = require('./class').Class,
    utils = require('./utils'),
    store = require('./store'),

	express = require('express'),

    middleware = require('./ConnectMiddleware'),
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
	"init": function(configManager, storageStrategy, redirectStrategy) {
		this.providerID = "providerID";
		this.configManager = configManager;

		this.userid = null;

		this.internalStates = {};

		this.store = storageStrategy ? storageStrategy : new store.SimpleStore();
		// this.redirect = redirectStrategy ? redirectStrategy : new ConnectRedirectStrategy();

		// if (this.providerID) {
		// 	OAuth.instances[this.providerID] = this;
		// }
	},
	"setAuthenticated": function(userid) {
		this.userid = userid;
	},
	"getMiddleware": function () {
		return new middleware.ConnectMiddleware(this);
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

			res.redirect(vurl);

			// res.writeHead (302, {'Location': vurl});
			// res.end('<html><body>You are being redirected.</body></html>');

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

		utils.log("About to resolve code", requestOptions, requestBody);

		request.post(requestOptions, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				console.log("Received data was [" + response.statusCode + "]" + body);

				var pbody = querystring.parse(body);
				// var pbody = JSON.parse(body);
				// console.log(pbody); return;

				return callback(pbody);

			} else {

				console.log("Response: " + body);
				console.log("Status code", response.statusCode);
				console.log("error", error);
				console.log(response);

				// TODO Provide some more details to the error
				return callback(new Error("Could not resolve OAuth code"));

			}
			
		}).form(requestBody);
	},

	"callbackCode": function(code, state, callback) {

		var that = this;
		var now = utils.epoch();

		this.store.getState(state, function(stateObject) {

			if (stateObject === null) {
				throw new Error('Cannot look up state ' + state);
			}

			console.log("State object retrieved", stateObject); 

			if (stateObject.providerID !== that.providerID) {
				throw new Error('Incorrect Provider ID in reponse. Due to security reasons, this is not accepted. ' + 
					'[ ' + stateObject.providerID + ' !== ' + that.providerid+ ']');
			}


			console.log("resoveCode")
			that.resolveCode(code, function(codeResponse) {
				// console.log("resoveCode")
				console.log("Code resolved to ", codeResponse);

				if (codeResponse instanceof Error) {
					return callback(codeResponse);
				}

				if (!codeResponse['access_token']) {
					return callback(new Error('Response from token endpoint did not contain the access_token property. It did not report a proper error either.'));
				}

				// Facbeook is using the property 'expires' not part of OAuth standard
				// Only accepted if option allowExpire is explicitly set to true. This is done by the
				// Facebook subclass.
				if (codeResponse.expires && !that.getOption('allowExpire', false)) {
					delete codeResponse.expires;
				} else if (codeResponse.expires) {
					codeResponse.expires_in = parseInt(codeResponse.expires, 10);
					delete codeResponse.expires;
				}


				var token = new AccessToken(codeResponse);
				token.issuedNow();
				token.setMeta('providerID', that.providerID);


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
				
				if (!token.has('expires')) {

					if (that.hasOption('default_lifetime')) {
						token.setExpiresIn(this.getOption('default_lifetime'));
					} else {
						token.setExpiresIn(default_lifetime);
					}

				}

				console.log("Access token became", codeResponse, token);

				if (that.userid) {
					that.store.saveToken(state.providerID, that.userid, token);
				}


				callback(token, stateObject.returnTo);



			});



		});

		// console.log("Obtaining state object for state", state);
		// console.log(stateObject);


	},

	"_getRequestScopes": function(opts) {
		var scopes = [];
		var config = this.configManager.get();
		/*
		 * Calculate which scopes to request, based upon provider config and request config.
		 */
		if (config.scopes && config.scopes.request) {
			for(var i = 0; i < config.scopes.request.length; i++) scopes.push(config.scopes.request[i]);
		}
		if (opts && opts.scopes && opts.scopes.request) {
			for(var i = 0; i < opts.scopes.request.length; i++) scopes.push(opts.scopes.request[i]);
		}
		return utils.uniqueList(scopes);
	},

	"_getRequiredScopes": function(opts) {
		var scopes = [];
		var config = this.configManager.get();
		/*
		 * Calculate which scopes to request, based upon provider config and request config.
		 */
		if (config.scopes && config.scopes.require) {
			for(var i = 0; i < config.scopes.require.length; i++) scopes.push(config.scopes.require[i]);
		}
		if (opts && opts.scopes && opts.scopes.require) {
			for(var i = 0; i < opts.scopes.require.length; i++) scopes.push(opts.scopes.require[i]);
		}
		return utils.uniqueList(scopes);
	},


	"checkToken": function(opts, callback) {
		// var scopesRequest  = this._getRequestScopes(opts);
		var scopesRequire = this._getRequiredScopes(opts);
		var token = null;
		if (this.userid) {
			return this.store.getToken(this.providerID, this.userid, scopesRequire, callback);
		}

		return callback(token);
	},

	"authorize": function(redirectCallback, opts, returnTo) {
		var 
			request,
			authurl,
			scopes;

		var config = this.configManager.get();
		// utils.log("About to send an authorization request to this entry:", this.config);

		console.log("Config is ", config);
		if (!config.authorization) throw "Missing OAuth config parameter: authorization";

		request = {
			"response_type": "code",
			"state": utils.uuid(),
			"returnTo": returnTo
		};

		// if (callback && typeof callback === 'function') {
		// 	this.internalStates[request.state] = callback;
		// }

		if (config["redirect_uri"]) {
			request["redirect_uri"] = config["redirect_uri"];
		}
		if (!config["client_id"]) throw new {"message": "client_id not registered with application."};
		request["client_id"] = config["client_id"];

		/*
		 * Calculate which scopes to request, based upon provider config and request config.
		 */
		scopes = this._getRequestScopes(opts);
		if (scopes.length > 0) {
			request["scope"] = utils.scopeList(scopes);
		}

		authurl = utils.encodeURL(config.authorization, request);

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
		if (this.userid) {
			this.store.wipeTokens(this.providerID, this.userid);	
		}
		
	},


	"hasOption": function(key, overrides) {
		var config = this.configManager.get();
		if (typeof overrides === 'object' && overrides !== null) {
			if (overrides.hasOwnProperty(key)) {
				return overrides[key];
			}
		}
		if (config.hasOwnProperty(key)) {
			return config[key];
		}
	},

	"getOption": function(key, defaultValue, overrides) {
		var config = this.configManager.get();
		if (typeof overrides === 'object' && overrides !== null) {
			if (overrides.hasOwnProperty(key)) {
				return overrides[key];
			}
		}
		if (config.hasOwnProperty(key)) {
			return config[key];
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

			console.log("Response headers");
			console.log(response.headers);

			console.log("Response status");
			console.log(response.statusCode);

			console.log("Body");
			console.log(body);

			if (error) {
				console.log("Error: ", error);
				return;
			}

			if (response.statusCode == 401) {
				// Something is wrong with this token. 
				// TODO: Wipe the token, and then 

				return callback(new Error("Error performing JSON Requeset, Invalid AcessToken provided."));

			} else if (false) {
				// TODO: Missing scopes, or similar situtation should be detected.

			} else if (!error && response.statusCode == 200) {
				// Everything should be ok.

				try {

					var data = JSON.parse(body);
					return callback(data);

				} catch (exception) {
					return callback(new Error("Error performing authorized JSON request with provided accesstoken. Could not parse JSON data.\n" + body));
				}


			} 

			var errstr = "Error performing authorized JSON request with provided accesstoken. \n" + 
				"Status code (" + response.statusCode + ") \n" + body;
			return callback(new Error(errstr));

		});



	}



})




var FeideConnect = OAuth.extend({
	"init": function(configManager, storageStrategy, redirectStrategy) {

		// var defaultConfig = {
		// 	"authorization": "https://core.uwap.org/api/oauth/authorization",
		// 	"token": "https://core.uwap.org/api/oauth/token",

		// 	"scopes": { 
		// 		"request": ["userinfo"]
		// 	}
		// };

		// for(var key in defaultConfig) {
		// 	if (!config[key]) {
		// 		config[key] = defaultConfig[key];
		// 	}
		// }

		this._super(configManager, storageStrategy, redirectStrategy);
		this.providerID = "FeideConnect";
	},

	"setupMiddleware": function(mount, app) {
		var that = this;
		var basedir = path.resolve(path.dirname(module.filename) + '/../');

		console.log("Setting up main file path: " + basedir)

		console.log("Base dir ", basedir);
		console.log("Mount    ", mount);


		var redirect_path = mount + '/callback';


		app.use(mount + '/callback', this.getMiddleware().callback().authenticate() );

		// app.use('/', o.getAuthenticationMiddleware() );

		app.use(this.getMiddleware());
		app.use(mount + '/autoconfigure/', express.static(basedir + '/webapp/'));
		app.use(mount + '/autoconfigure-login', this.getMiddleware()
			.requireScopes(['userinfo'])
		);

		app.get(mount + '/autoconfigure-login', function(req, res) {
			
			res.redirect(mount + '/autoconfigure/');

			// if (req.query.return) {
			// 	res.redirect(req.query.return);
			// } else {
			// 	res.setHeader('Content-Type', 'text/plain');
			// 	res.end('Successfully authenticated.');
			// }

		});

		app.delete(mount + '/autoconfigure-api/setup', function(req, res) {

			console.log("About to delete");
			console.log(req.body.id);


			var config = that.configManager.getPublicConfig();

			if (!that.configManager.isConfigured()) {
				throw new Error('Cannot delete a configuration that is not registered.');
			}
			if (req.session && req.session.user) {

				if (config['uwap-userid'] !== req.session.user.userid) {

					throw new Error('Only the owner of the application [' + config['uwap-userid'] + '] may delete it. You are [' + req.session.user.userid + ']');
				}

			} else {
				throw new Error('User is not authenticated');
			}



			that.configManager.delete();

			
			var bodystr = JSON.stringify(true);

			res.setHeader('Content-Type', 'application/json');
			// res.setHeader('Content-Length', bodystr.length);
			res.end(bodystr);
		});


		app.get(mount + '/autoconfigure-api/setup', function(req, res) {

			// var body = {

			// 	"client_id": "c74e2395-3712-4c53-b488-e0108af48952",
			// 	"client_secret": "bde08ff3-eee2-4369-9e6b-5e17e2579793",
			// 	"redirect_uri": "http://localhost:3000/callback/FeideConnect",

			// 	"scopes": { 
			// 		"request": ["userinfo"]
			// 	}

			// };

			var body = {};
			body.metadata = that.configManager.getPublicConfig();
			body.metadata.redirect_uri = req.protocol + "://" + req.get('host') + redirect_path;

			body.host = req.get('host');

			// console.log(req);

			if (req.session && req.session.user) {
				console.log("USER Exists, will add.", req.session.user);
				body.user = JSON.parse(JSON.stringify(req.session.user));
			}

			var bodystr = JSON.stringify(body);



			res.setHeader('Content-Type', 'application/json');
			// res.setHeader('Content-Length', bodystr.length);
			res.end(bodystr);

		});


		app.post(mount + '/autoconfigure-api/register', function(req, res) {

			console.log("Retrieving metadata ", req.body);

			if (that.configManager.isConfigured()) {
				throw new Error('Already configured, cannot register.');
			}


			var body = {};

			// if (req.session && req.session.user) {
			// 	body.user = req.session.user;
			// } else {
			// 	throw new Error('User is not authenticated');
			// }

			// body.redirect_uri = req.url + redirect_path;

			console.log("ABOUT TO REGISTER METADATA", req.body)

			body.metadata = that.configManager.register(req.body);


			// var body = {"msg": "ok"};
			var bodystr = JSON.stringify(body);
			res.setHeader('Content-Type', 'application/json');
			// res.setHeader('Content-Length', bodystr.length);
			res.end(bodystr);

		});





	},

	"getMiddleware": function() {
		return new middleware.FeideConnectMiddleware(this);
	}
})


var Facebook = OAuth.extend({
	"init": function(configManager, storageStrategy, redirectStrategy) {

		// var defaultConfig = {
		// 	"authorization": 'https://www.facebook.com/dialog/oauth',
		// 	"token": 'https://graph.facebook.com/oauth/access_token',

		// 	"allowExpire": true,
		// 	"presenttoken": "qs",

		// 	"scopes": { 
		// 		request: ["user_about_me"]
		// 	}
		// };

		// for(var key in defaultConfig) {
		// 	if (!config[key]) {
		// 		config[key] = defaultConfig[key];
		// 	}
		// }

		this._super(configManager, storageStrategy, redirectStrategy);
		this.providerID = "Facebook";
	},

	"getMiddleware": function () {
		console.log("getMiddleware with FacebookMiddleware: " + this.providerID);
		return new middleware.FacebookMiddleware(this);
	}

});


exports.OAuth = OAuth;
exports.AccessToken = AccessToken;
exports.FeideConnect = FeideConnect;
exports.Facebook = Facebook;