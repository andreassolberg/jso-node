
var 
  // , passport = require('passport')
  // , po2 = require('passport-oauth2')
  // , OAuth2Strategy = require('passport-oauth2').OAuth2Strategy
    OAuth = require('./lib/jso').OAuth,
    FeideConnect = require('./lib/FeideConnect').FeideConnect,
	express = require('express')
  ;


var 
  app = express()
  ;



var o_old = new OAuth({

	client_id: "c74e2395-3712-4c53-b488-e0108af48952",
	client_secret: "bde08ff3-eee2-4369-9e6b-5e17e2579793",
	redirect_uri: "http://0.0.0.0:3000/callback",

	authorization: "https://core.uwap.org/api/oauth/authorization",
	token: "https://core.uwap.org/api/oauth/token",
	// token: "https://nk2qnlpqohtb.runscope.net",
	
	// default_scopes: ["userinfo"],
	scopes: { 
		request: ["userinfo"]
	}

});


var o = new FeideConnect({

	client_id: "c74e2395-3712-4c53-b488-e0108af48952",
	client_secret: "bde08ff3-eee2-4369-9e6b-5e17e2579793",
	redirect_uri: "http://0.0.0.0:3000/callback",

	scopes: { 
		request: ["userinfo"]
	}

});

app.use('/callback', o.getAuthenticationMiddleware().callback() );

// app.use('/', o.getAuthenticationMiddleware() );
app.use('/test', o.getAuthenticationMiddleware()
	.requireScopes(['userinfo'])
	.authenticate()
);


app.get('/test', function(req, res){
	var body = 'Test OAuth. Got data: ';

	var redirectHandler = o.getRedirectHandler(req, res);


	// OAuth.prototype.getJSON = function(url, options, callback, redirectCallback
	o.getJSON("https://core.uwap.org/api/userinfo", {}, function(data) {
		if (data instanceof Error) {
			console.log("Error: " + data);
			return;
		}
		console.log("Successfully retrieved data: ", data);
	}, redirectHandler);


	res.setHeader('Content-Type', 'text/plain');
	res.setHeader('Content-Length', body.length);
	res.end(body);
});


app.get('/test', function(req, res){
	var body = 'Test OAuth. Got data: ';



	res.setHeader('Content-Type', 'text/plain');
	res.setHeader('Content-Length', body.length);
	res.end(body);
});



app.get('/hello.txt', function(req, res){
  var body = 'Hello World';
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Length', body.length);
  res.end(body);
});


// app.get('/login', passport.authenticate('local', { successRedirect: '/',
//                                                     failureRedirect: '/login' }));


app.listen(3000);
console.log('Listening on port 3000');