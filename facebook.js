


var 
  // , passport = require('passport')
  // , po2 = require('passport-oauth2')
  // , OAuth2Strategy = require('passport-oauth2').OAuth2Strategy
    OAuth = require('./lib/jso').OAuth,
    Facebook = require('./lib/Facebook').Facebook,
	express = require('express'),
	fs = require('fs')
  ;


var 
  app = express(),
  store = new express.session.MemoryStore()
  ;


var configurationFile = './config.json';
var configuration = JSON.parse(
    fs.readFileSync(configurationFile)
);


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


var o = new Facebook(configuration.facebook);


var sessionConfig = { 
	"key": "sess",
	"secret": "slksdfsdfkjhsdf9duytf",
	"store": store,
	// "cookie": { 
	// 	path: '/', 
	// 	httpOnly: true, 
	// 	maxAge: 1000*24*60*60*1000 // , // 10000 days.
	// 	// secure: true
	// }
};
app.use(express.cookieParser());
app.use(express.session(sessionConfig));

app.use('/callback', o.getMiddleware().callback().authenticate() );
app.use('/test', o.getMiddleware()
	.requireScopes(['userinfo'])
);
app.use('/', o.getMiddleware() );
app.use(app.router);



app.get('/dump', function(req, res){
	

	var token = o.getMiddleware().checkToken(req);
	var body = 'Dump status.';

	console.log("GOT TOKEN");
	console.log(token);

	if (!req.session.c) req.session.c = 0;
	req.session.c++;

	if (req._oauth) {
		body += "\n\n-----\nOAuth object: " + JSON.stringify(req._oauth, undefined, 4);	
	}
	if (req.session) {
		body += "\n\n-----\nSession object: " + JSON.stringify(req.session, undefined, 4);	
	}
	if (token) {
		body += '\n\n-----\nOauth token expires ' + token.getExpiresIn() + "\nToken" + JSON.stringify(token, undefined, 4);	
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

	if (req._oauth) {
		body += "OAuth object: " + JSON.stringify(req._oauth, undefined, 4);	
	}
	if (req.session) {
		body += "Session object: " + JSON.stringify(req.session, undefined, 4);	
	}

	var token = o.getMiddleware().checkToken(req);

	console.log("GOT TOKEN", token, req.session._oauth);

	if (token) {
		body += 'Oauth token expires ' + token.getExpiresIn() + "\nToken" + JSON.stringify(token, undefined, 4);	
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


