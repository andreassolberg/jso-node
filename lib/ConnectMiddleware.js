var 


	querystring = require('querystring'),
    url = require('url'),

    // Local utility classes
    Class = require('./class').Class,

    AccessToken = require('./AccessToken').AccessToken
    ;




var ConnectMiddleware = Class.extend({
	"init": function(oauth) {
		this.oauth = oauth;
		this.actions = {};
	},
	"requireScopes": function(scopeconfig) {
		this.actions['requireScopes'] = scopeconfig;
		return this;
	},
	"callback": function() {
		this.actions['callback'] = true;
		return this;
	},



	// setToken stored the retrieved token in request object, and if available session storage, 
	// and if available authenticated user's storage.
	"setToken": function(req, token, userid) {

		console.log("SETTING TOKEN", this.oauth);

		if (!req._oauth) req._oauth = {};
		if (!req._oauth[this.oauth.providerID]) req._oauth[this.oauth.providerID] = {};

		req._oauth[this.oauth.providerID].checked = true;
		req._oauth[this.oauth.providerID].token = token;

		if (req.session) {

			if (!req.session._oauth) req.session._oauth = {};
			if (!req.session._oauth[this.providerID]) req.session._oauth[this.oauth.providerID] = {};

			req.session._oauth[this.oauth.providerID].checked = true;
			req.session._oauth[this.oauth.providerID].token = token;

			if (userid) {
				req.session.userid = userid;			
			}

			if (req.session.userid) {
				// Store token in storage... if user is authenticated..
				console.log("Storing token in user storage...");
				this.oauth.store.saveToken(this.oauth.providerID, req.session.userid, token);
			}
		}
	},

	// checkToken looks for a cached token in first request object, then sessino object, and then user storage.
	// If not found it returns null
	"checkToken": function(req, callback) {
		console.log("FeideConnectMiddleware ==> Checking for token");

		if (req._oauth && req._oauth[this.oauth.providerID]) {
			return callback(req._oauth.token);
		}

		if (req.session && req.session._oauth && req.session._oauth[this.oauth.providerID]) {
			return callback(new AccessToken(req.session._oauth[this.oauth.providerID].token));
		}

		if (req.session && req.session.userid) {
			// READ FROM USer authenticated storage.
			// "getToken": function(provider, userid, scopes) {
			var requiredTokens = null;
			return this.oauth.store.getToken(this.oauth.providerID, req.session.userid, requiredTokens, callback);
			// return null;
		}

		return callback(null);
		
	},



	"handleCallback": function(req, res, next) {
		console.log("FeideConnectMiddleware ==> Processing callback");
		var that = this;
		var up = url.parse(req.url);
		var parameters = querystring.parse(up.query);
		var redirectHandler = this.oauth.getRedirectHandler(req, res);
		console.log("Request", up.query, parameters);
		return this.oauth.callbackCode(parameters.code, parameters.state, function(token, returnTo) {

			if (token instanceof Error) {
				console.log(token);
				throw new Error;
			}

			

			console.log("FeideConnectMiddleware ==> Callback received token", token);

			

			if  (that.actions['authenticate']) {

				that.handleAuthentication(req, res, next, token, function(userid) {
					console.log("Authentication complete. " + userid + "Redirecting to " + returnTo);
					console.log("but before we move, lets dump the session");
					console.log(req.session);

					that.setToken(req, token, userid);

					return redirectHandler(returnTo);
				});

			} else {
				that.setToken(req, token);
				return redirectHandler(returnTo);			
			}


			// console.log("Done redirecting");

		});
	},

	"handleAuthorize": function(req, res, next) {

		var requestConfig = {};
		if (this.actions.requireScopes) {
			requestConfig.scopes = {"require": this.actions.requireScopes};
		}

		var redirectHandler = this.oauth.getRedirectHandler(req, res);
		var fullURL = req.protocol + "://" + req.get('host') + req.originalUrl;
		// fullURL = 'http://localhost:3000/dump';
		// console.log(fullURL); 
		// console.log("path", req);
		console.log("FeideConnectMiddleware ==> RequireScopes", this.actions.requireScopes);
		return this.oauth.authorize(redirectHandler, requestConfig, fullURL);

	},

	"handle": function(req, res, next) {

		var that = this;


		console.log("\n=== FeideConnectMiddleware == " + req.url);



		if (this.actions['callback']) {
			this.handleCallback(req, res, next);

		} else {

			// checkToken looks for a cached token in first request object, then sessino object, and then user storage.
			// If not found it returns null
			var token = this.checkToken(req, function(token) {

				console.log("Checking for token returns", token);
				if (that.actions.requireScopes && !token) {
					that.handleAuthorize(req, res, next);

				} else {
					next();	
				}

			});


		}

	}




});


var AuthenticationMiddleware = ConnectMiddleware.extend({
	"authenticate": function() {
		this.actions['authenticate'] = true;
		return this;
	},

	"handleAuthentication": function(req, res, next, token, callback) {
		if (!req.session) {
			throw new Error('Express session handler required to be loaded in advance for authentication to work with an OAuth Authentication Middleware');
		}
		throw new Error('This OAuth connect middleware does not implement authentication. You need to instanciate a subclass of this middleware that implements authentication.');
	}

});






var FeideConnectMiddleware = AuthenticationMiddleware.extend({
	"init": function(oauth) {
		this._super(oauth);
	},
	"handleAuthentication": function(req, res, next, token, callback) {
		if (!req.session) {
			throw new Error('Express session handler required to be loaded in advance for authentication to work with an OAuth Authentication Middleware');
		}


		if (!req.session.c) req.session.c = 1;
		req.session.c++;

		if (req.session.userid) {
			console.log("FeideConnectMiddleware ==> User is already authenticated. Good.");
			callback(req.session.userid);
		} else {



			console.log("FeideConnectMiddleware ==> Authenticate");
			// console.log("ABOUT TO ATHENTICATICATE:..");
			if (!token) {
				throw new Error('Token is not provided.');
			}

			console.log("FeideConnectMiddleware ==> Successfully authorized. now retrieve userinfo", token);

			this.oauth.getJSON('https://graph.facebook.com/me', token, {}, function (data) {
				console.log("FeideConnectMiddleware ==> Successfully authenticated", token);
				console.log("X > REVEICED USERINFO", data);

				var user = {
					"userid": data.id,
					"name": data.name
				};
				console.log("User objcet", user);

				var _oauth = req.session._oauth;



				req.session.regenerate(function(err) {
					req.session._oauth = _oauth;
					req.session.userid = user.userid;
					req.session.user = user;

					console.log("Regenerating session to be", req.session);

					callback(user.userid);
	            });


			});

		}
	}
});



var FacebookMiddleware = AuthenticationMiddleware.extend({
	"init": function(oauth) {
		this._super(oauth);
	},
	"handleAuthentication": function(req, res, next, token, callback) {
		if (!req.session) {
			throw new Error('Express session handler required to be loaded in advance for authentication to work with an OAuth Authentication Middleware');
		}


		if (!req.session.c) req.session.c = 1;
		req.session.c++;

		if (req.session.userid) {
			console.log("FeideConnectMiddleware ==> User is already authenticated. Good.");
			callback(req.session.userid);
		} else {



			console.log("FeideConnectMiddleware ==> Authenticate");
			// console.log("ABOUT TO ATHENTICATICATE:..");
			if (!token) {
				throw new Error('Token is not provided.');
			}

			console.log("FeideConnectMiddleware ==> Successfully authorized. now retrieve userinfo", token);

			this.oauth.getJSON('https://graph.facebook.com/me', token, {}, function (data) {
				console.log("FeideConnectMiddleware ==> Successfully authenticated", token);
				console.log("X > REVEICED USERINFO", data);

				var user = {
					"userid": data.id,
					"name": data.name
				};
				console.log("User objcet", user);

				var _oauth = req.session._oauth;



				req.session.regenerate(function(err) {
					req.session._oauth = _oauth;
					req.session.userid = user.userid;
					req.session.user = user;

					console.log("Regenerating session to be", req.session);

					callback(user.userid);
	            });


			});

		}
	}
});









exports.ConnectMiddleware = ConnectMiddleware;
exports.AuthenticationMiddleware = AuthenticationMiddleware;
exports.ConnectMiddleware = ConnectMiddleware;
exports.FeideConnectMiddleware = FeideConnectMiddleware;
exports.FacebookMiddleware = FacebookMiddleware;




