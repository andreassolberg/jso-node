var 
	querystring = require('querystring'),
    url = require('url'),
    AccessToken = require('./AccessToken').AccessToken
    ;

var FeideConnectMiddleware = function(oauth) {
	this.oauth = oauth;
	this.actions = {};
}

FeideConnectMiddleware.prototype.requireScopes = function(scopeconfig) {
	this.actions['requireScopes'] = scopeconfig;
	return this;
}

FeideConnectMiddleware.prototype.callback = function() {
	this.actions['callback'] = true;
	return this;
}

FeideConnectMiddleware.prototype.authenticate = function() {
	this.actions['authenticate'] = true;
	return this;
}


// setToken stored the retrieved token in request object, and if available session storage, 
// and if available authenticated user's storage.
FeideConnectMiddleware.prototype.setToken = function(req, token) {

	if (!req._oauth) req._oauth = {};
	req._oauth.checked = true;
	req._oauth.token = token;

	if (req.session) {

		if (!req.session._oauth) req.session._oauth = {};
		req.session._oauth.checked = true;
		req.session._oauth.token = token;

		if (req.session.userid) {
			// Store token in storage... if user is authenticated..
			console.log("ABOUT TO STORE token in the authenticated users storage.")
		}
	}
}

// checkToken looks for a cached token in first request object, then sessino object, and then user storage.
// If not found it returns null
FeideConnectMiddleware.prototype.checkToken = function(req) {
	console.log("FeideConnectMiddleware ==> Checking for token");

	if (req._oauth) {
		return req._oauth.token;
	}

	if (req.session && req.session._oauth) {
		return new AccessToken(req.session._oauth.token);
	}

	if (req.session && req.session.userid) {
		// READ FROM USer authenticated storage.
		return null;
	}

	return null;
	
}

FeideConnectMiddleware.prototype.handleCallback = function(req, res, next) {
	console.log("FeideConnectMiddleware ==> Processing callback");
	var that = this;
	var up = url.parse(req.url);
	var parameters = querystring.parse(up.query);
	var redirectHandler = this.oauth.getRedirectHandler(req, res);
	// console.log("Request", up.query, parameters);
	return this.oauth.callbackCode(parameters.code, parameters.state, function(token, returnTo) {

		if (token instanceof Error) {
			throw new Error;
		}

		that.setToken(req, token);

		console.log("FeideConnectMiddleware ==> Callback received token", token);
		console.log("Redirecting to " + returnTo);

		if  (that.actions['authenticate']) {

			that.handleAuthentication(req, res, next, token, function(userid) {
				return redirectHandler(returnTo);
			});

		} else {
			return redirectHandler(returnTo);			
		}


		// console.log("Done redirecting");

	});
}
FeideConnectMiddleware.prototype.handleAuthentication = function(req, res, next, token, callback) {
	if (!req.session) {
		throw new Error('Express session handler required to be loaded in advance for authentication to work with an OAuth Authentication Middleware');
	}


	if (!req.session.c) req.session.c = 1;
	req.session.c++;

	if (req.session.userid) {
		console.log("FeideConnectMiddleware ==> User is already authenticated. Good.");

	} else {



		console.log("FeideConnectMiddleware ==> Authenticate");
		// console.log("ABOUT TO ATHENTICATICATE:..");
		if (!token) {
			throw new Error('Token is not provided.');
		}

		console.log("FeideConnectMiddleware ==> Successfully authorized. not retrieve userinfo", token);

		this.oauth.getJSON('https://core.uwap.org/api/userinfo', token, {}, function (data) {
			console.log("FeideConnectMiddleware ==> Successfully authenticated", token);
			console.log("X > REVEICED USERINFO", data.data.userid);

			var _oauth = req.session._oauth;
			req.session.regenerate(function(err) {
				req.session._oauth = _oauth;
				req.session.userid = data.data.userid;
				callback(data.data.userid);

            });


		});

	}
}
FeideConnectMiddleware.prototype.handleAuthorize = function(req, res, next) {

	var requestConfig = {};
	if (this.actions.requireScopes) {
		requestConfig.scopes = {"require": this.actions.requireScopes};
	}

	var redirectHandler = this.oauth.getRedirectHandler(req, res);
	var fullURL = req.protocol + "://" + req.get('host') + req.originalUrl;
	fullURL = 'http://0.0.0.0:3000/dump';
	// console.log(fullURL); 
	// console.log("path", req);
	console.log("FeideConnectMiddleware ==> RequireScopes", this.actions.requireScopes);
	return this.oauth.authorize(redirectHandler, requestConfig, fullURL);

}

FeideConnectMiddleware.prototype.handle = function(req, res, next) {

	var that = this;


	console.log("\n=== FeideConnectMiddleware == " + req.url);



	if (this.actions['callback']) {
		this.handleCallback(req, res, next);

	} else {



		// checkToken looks for a cached token in first request object, then sessino object, and then user storage.
		// If not found it returns null
		var token = this.checkToken(req);
		console.log("Checking for token returns", token);

		if (this.actions.requireScopes && !token) {
			this.handleAuthorize(req, res, next);

		} else {
			next();	
		}

	}





	// console.log("OAuth middleware handle");
	// console.log(' %s %s', req.method, req.url);
	
}


exports.FeideConnectMiddleware = FeideConnectMiddleware;