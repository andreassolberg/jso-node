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

	if (this.actions['callback']) {
		var up = url.parse(req.url);
		var parameters = querystring.parse(up.query);
		console.log("Request", up.query, parameters);
		this.oauth.callbackCode(parameters.code, parameters.state);
	}

	if (!req._oauth) {
		req._oauth = {};
	}

	if (!req._oauth.checked) {
		var token = this.oauth.checkToken();
		req._oauth.token = token;
		req._oauth.checked = true;
	}

	if (this.actions.requireScopes) {
		var token = this.oauth.getToken(function(token) {
			req._oauth.token = token;
			req._oauth.checked = true;
		}, redirectHandler, {
			scopes: {"require": this.actions.requireScopes}
		});
	}

	if (this.actions['authenticate']) {

		console.log("ABOUT TO ATHENTICATICATE:..");
		if (!req._oauth.token) {
			throw new Error('Token is not provided.');
		}

		var token = req._oauth.token;


		console.log("Now lets authenticate with this token", token);
	}



	console.log("OAuth middleware handle");
	console.log(' %s %s', req.method, req.url);
	next();
}


exports.FeideConnectMiddleware = FeideConnectMiddleware;