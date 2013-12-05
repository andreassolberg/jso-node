var 
	querystring = require('querystring'),
    url = require('url');

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

FeideConnectMiddleware.prototype.handle = function(req, res, next) {

	var redirectHandler = this.oauth.getRedirectHandler(req, res);

	console.log("\n=== FeideConnectMiddleware == " + req.url);

	if (this.actions['callback']) {
		console.log("FeideConnectMiddleware ==> Processing callback");
		var up = url.parse(req.url);
		var parameters = querystring.parse(up.query);
		// console.log("Request", up.query, parameters);
		this.oauth.callbackCode(parameters.code, parameters.state, function(token, returnTo) {

			if (token instanceof Error) {
				throw new Error;
			}
			req._oauth.token = token;
			req._oauth.checked = true;
			console.log("FeideConnectMiddleware ==> Callback received token", token);
			console.log("Redirecting to " + returnTo);

			return redirectHandler(returnTo);
			// console.log("Done redirecting");

		});

	}

	if (!req._oauth) {
		req._oauth = {};
	}

	var requestConfig = {};
	if (this.actions.requireScopes) {
		requestConfig.scopes = {"require": this.actions.requireScopes};
	}


	if (!req._oauth.checked) {
		console.log("FeideConnectMiddleware ==> Checking for token");

		var requiredScopes = 
		req._oauth.token = this.oauth.checkToken(requestConfig);
		req._oauth.checked = true;
	}

	if (this.actions.requireScopes && !req._oauth.token) {

		var fullURL = req.protocol + "://" + req.get('host') + req.url;
		console.log(fullURL); 
		console.log("FeideConnectMiddleware ==> RequireScopes", this.actions.requireScopes);
		return this.oauth.authorize(redirectHandler, requestConfig, fullURL);
	}

	if (this.actions['authenticate']) {
		console.log("FeideConnectMiddleware ==> Authenticate");
		// console.log("ABOUT TO ATHENTICATICATE:..");
		if (!req._oauth.token) {
			throw new Error('Token is not provided.');
		}

		// 
		var token = req._oauth.token;
		console.log("FeideConnectMiddleware ==> Successfully authenticated", token);


		this.oauth.getJSON('https://core.uwap.org/api/userinfo', token, {}, function (data) {
			console.log("REVEICED USERINFO", data);
		});

		// console.log("Now lets authenticate with this token", token);
	}



	// console.log("OAuth middleware handle");
	// console.log(' %s %s', req.method, req.url);
	next();
}


exports.FeideConnectMiddleware = FeideConnectMiddleware;