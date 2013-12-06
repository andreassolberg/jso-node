
var 
  // , passport = require('passport')
  // , po2 = require('passport-oauth2')
  // , OAuth2Strategy = require('passport-oauth2').OAuth2Strategy
    OAuth = require('./lib/jso').OAuth,
    FeideConnect = require('./lib/FeideConnect').FeideConnect,
	express = require('express')
  ;


var 
  app = express(),
  store = new express.session.MemoryStore()
  ;


// var o_old = new OAuth({

// 	client_id: "c74e2395-3712-4c53-b488-e0108af48952",
// 	client_secret: "bde08ff3-eee2-4369-9e6b-5e17e2579793",
// 	redirect_uri: "http://0.0.0.0:3000/callback",

// 	authorization: "https://core.uwap.org/api/oauth/authorization",
// 	token: "https://core.uwap.org/api/oauth/token",
// 	// token: "https://nk2qnlpqohtb.runscope.net",
	
// 	// default_scopes: ["userinfo"],
// 	scopes: { 
// 		request: ["userinfo"]
// 	}

// });


var o = new FeideConnect({

	client_id: "c74e2395-3712-4c53-b488-e0108af48952",
	client_secret: "bde08ff3-eee2-4369-9e6b-5e17e2579793",
	redirect_uri: "http://0.0.0.0:3000/callback",

	scopes: { 
		request: ["userinfo"]
	}

});

var sessionConfig = { 
	// path: '/', 
	// httpOnly: true, 
	// maxAge: null,
	"secret": "slksdf89sd8ftsdjhfgsduytf",
	"store": store
};
app.use(express.cookieParser());
app.use(express.session(sessionConfig));

app.use('/callback', o.getAuthenticationMiddleware().callback().authenticate() );

// app.use('/', o.getAuthenticationMiddleware() );
app.use('/test', o.getAuthenticationMiddleware()
	.requireScopes(['userinfo'])

);
app.use('/', o.getAuthenticationMiddleware());
app.use(app.router);



app.get('/dump', function(req, res){
	var body = 'Test OAuth. Got data: ';

	if (req._oauth) {
		body += "OAuth object: " + JSON.stringify(req._oauth, undefined, 4);	
	}
	if (req.session) {
		body += "Session object: " + JSON.stringify(req.session, undefined, 4);	
	}


	var token = o.getAuthenticationMiddleware().checkToken(req);

	console.log("GOT TOKEN", token, req.session._oauth);

	if (token) {
		body += 'Oauth token expires ' + token.getExpiresIn() + "\nToken" + JSON.stringify(token, undefined, 4);	
	}

    if(typeof req.cookies['connect.sid'] !== 'undefined'){
        console.log(req.cookies['connect.sid']);
        body += JSON.stringify("Session cookie " + req.cookies['connect.sid'], undefined, 4);	
    }

	var redirectHandler = o.getRedirectHandler(req, res);

	// OAuth.prototype.getJSON = function(url, options, callback, redirectCallback
	// o.getJSON("https://core.uwap.org/api/userinfo", {}, function(data) {
	// 	if (data instanceof Error) {
	// 		console.log("Error: " + data);
	// 		return;
	// 	}
	// 	console.log("Successfully retrieved data: ", data);
	// }, redirectHandler);

	res.setHeader('Content-Type', 'text/plain');
	res.setHeader('Content-Length', body.length);
	res.end(body);
});


app.get('/test', function(req, res){
	var body = 'Test OAuth. Got data: ';


	var redirectHandler = o.getRedirectHandler(req, res);

	if (req._oauth && req._oauth.token) {
		body += 'Oauth token expires ' + req._oauth.token.dfg();
	}

	// OAuth.prototype.getJSON = function(url, options, callback, redirectCallback
	// o.getJSON("https://core.uwap.org/api/userinfo", {}, function(data) {
	// 	if (data instanceof Error) {
	// 		console.log("Error: " + data);
	// 		return;
	// 	}
	// 	console.log("Successfully retrieved data: ", data);
	// }, redirectHandler);

	res.setHeader('Content-Type', 'text/plain');
	res.setHeader('Content-Length', body.length);
	res.end(body);
});


// app.get('/test', function(req, res){
// 	var body = 'Test OAuth. Got data: ';

// 	res.setHeader('Content-Type', 'text/plain');
// 	res.setHeader('Content-Length', body.length);
// 	res.end(body);
// });



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


