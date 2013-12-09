var 
	querystring = require('querystring'),
    url = require('url'),
    AccessToken = require('./AccessToken').AccessToken
    ;

var FacebookMiddleware = function(oauth) {
	this.oauth = oauth;
	this.actions = {};
}

FacebookMiddleware.prototype.requireScopes = function(scopeconfig) {
	this.actions['requireScopes'] = scopeconfig;
	return this;
}

FacebookMiddleware.prototype.callback = function() {
	this.actions['callback'] = true;
	return this;
}

FacebookMiddleware.prototype.authenticate = function() {
	this.actions['authenticate'] = true;
	return this;
}


// setToken stored the retrieved token in request object, and if available session storage, 
// and if available authenticated user's storage.
FacebookMiddleware.prototype.setToken = function(req, token, userid) {

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
}

// checkToken looks for a cached token in first request object, then sessino object, and then user storage.
// If not found it returns null
FacebookMiddleware.prototype.checkToken = function(req) {
	console.log("FacebookMiddleware ==> Checking for token");

	if (req._oauth &&  req._oauth[this.oauth.providerID]) {
		return req._oauth.token;
	}

	if (req.session && req.session._oauth && req.session._oauth[this.oauth.providerID]) {
		return new AccessToken(req.session._oauth[this.oauth.providerID].token);
	}

	if (req.session && req.session.userid) {
		// READ FROM USer authenticated storage.
		// "getToken": function(provider, userid, scopes) {
		var requiredTokens = null;
		return this.oauth.store.getToken(this.oauth.providerID, req.session.userid, requiredTokens);
		// return null;
	}

	return null;
	
}

FacebookMiddleware.prototype.handleCallback = function(req, res, next) {
	console.log("FacebookMiddleware ==> Processing callback");
	var that = this;
	var up = url.parse(req.url);
	var parameters = querystring.parse(up.query);
	var redirectHandler = this.oauth.getRedirectHandler(req, res);
	// console.log("Request", up.query, parameters);
	return this.oauth.callbackCode(parameters.code, parameters.state, function(token, returnTo) {

		if (token instanceof Error) {
			console.log(token);
			throw new Error;
		}

		

		console.log("FacebookMiddleware ==> Callback received token", token);

		

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
}
FacebookMiddleware.prototype.handleAuthentication = function(req, res, next, token, callback) {
	if (!req.session) {
		throw new Error('Express session handler required to be loaded in advance for authentication to work with an OAuth Authentication Middleware');
	}


	if (!req.session.c) req.session.c = 1;
	req.session.c++;

	if (req.session.userid) {
		console.log("FacebookMiddleware ==> User is already authenticated. Good.");
		callback(req.session.userid);
	} else {



		console.log("FacebookMiddleware ==> Authenticate");
		// console.log("ABOUT TO ATHENTICATICATE:..");
		if (!token) {
			throw new Error('Token is not provided.');
		}

		console.log("FacebookMiddleware ==> Successfully authorized. now retrieve userinfo", token);

		this.oauth.getJSON('https://graph.facebook.com/me', token, {}, function (data) {
			console.log("FacebookMiddleware ==> Successfully authenticated", token);
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
FacebookMiddleware.prototype.handleAuthorize = function(req, res, next) {

	var requestConfig = {};
	if (this.actions.requireScopes) {
		requestConfig.scopes = {"require": this.actions.requireScopes};
	}

	var redirectHandler = this.oauth.getRedirectHandler(req, res);
	var fullURL = req.protocol + "://" + req.get('host') + req.originalUrl;
	// fullURL = 'http://localhost:3000/dump';
	// console.log(fullURL); 
	// console.log("path", req);
	console.log("FacebookMiddleware ==> RequireScopes", this.actions.requireScopes);
	return this.oauth.authorize(redirectHandler, requestConfig, fullURL);

}

FacebookMiddleware.prototype.handle = function(req, res, next) {

	var that = this;


	console.log("\n=== FacebookMiddleware == " + req.url);



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

	// console.log("Dont with connnect.")



	// console.log("OAuth middleware handle");
	// console.log(' %s %s', req.method, req.url);
	
}


exports.FacebookMiddleware = FacebookMiddleware;