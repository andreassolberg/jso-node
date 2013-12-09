var 
  // , passport = require('passport')
  // , po2 = require('passport-oauth2')
  // , OAuth2Strategy = require('passport-oauth2').OAuth2Strategy
    OAuth = require('./lib/jso').OAuth,
    Facebook = require('./lib/Facebook').Facebook,
    FeideConnect = require('./lib/FeideConnect').FeideConnect,
	express = require('express')
  ;

var 
  app = express(),
  store = new express.session.MemoryStore()
  ;


var feideconnect = new FeideConnect({

	client_id: "c74e2395-3712-4c53-b488-e0108af48952",
	client_secret: "bde08ff3-eee2-4369-9e6b-5e17e2579793",
	redirect_uri: "http://localhost:3000/callback/FeideConnect",
	// authorization: "https://core.uwap.org/api/oauth/authorization",
	// token: "https://core.uwap.org/api/oauth/token",
	// token: "https://nk2qnlpqohtb.runscope.net",
	// default_scopes: ["userinfo"],
	scopes: { 
		request: ["userinfo"]
	}

});

var facebook = new Facebook({

	client_id: "262740470541011",
	client_secret: "ecfe8eb8272306aa96ca1f22b23a03f2",
	redirect_uri: "http://localhost:3000/callback/Facebook",

	scopes: { 
		request: ["user_about_me"]
	}
});


var sessionConfig = { 
	"key": "sess",
	"secret": "slksdfsdfkjhsdf9duytf",
	"store": store,
};
app.use(express.cookieParser());
app.use(express.session(sessionConfig));

app.use('/callback/Facebook', facebook.getMiddleware().callback().authenticate() );
app.use('/callback/FeideConnect', feideconnect.getMiddleware().callback() );

app.use('/test', facebook.getMiddleware().requireScopes(['user_about_me']));
app.use('/test', feideconnect.getMiddleware().requireScopes(['userinfo']));

app.use('/', facebook.getMiddleware() );
app.use('/', feideconnect.getMiddleware() );

app.use(app.router);


app.get('/dump', function(req, res){
	

	var token1 = facebook.getMiddleware().checkToken(req);
	var token2 = feideconnect.getMiddleware().checkToken(req);

	var body = 'Dump status.';

	console.log("GOT TOKEN");
	console.log(token1);
	console.log(token2);

	if (!req.session.c) req.session.c = 0;
	req.session.c++;

	if (req._oauth) {
		body += "\n\n-----\nOAuth object: " + JSON.stringify(req._oauth, undefined, 4);	
	}
	if (req.session) {
		body += "\n\n-----\nSession object: " + JSON.stringify(req.session, undefined, 4);	
	}
	if (token1) {
		body += '\n\n-----\nOauth token expires ' + token1.getExpiresIn() + "\nToken" + JSON.stringify(token1, undefined, 4);	
	}
	if (token2) {
		body += '\n\n-----\nOauth token expires ' + token2.getExpiresIn() + "\nToken" + JSON.stringify(token2, undefined, 4);	
	}


	// var redirectHandler = o.getRedirectHandler(req, res);

	// OAuth.prototype.getJSON = function(url, options, callback, redirectCallback
	// o.getJSON("https://core.uwap.org/api/userinfo", {}, function(data) {
	// 	if (data instanceof Error) {
	// 		console.log("Error: " + data);
	// 		return;
	// 	}
	// 	console.log("Successfully retrieved data: ", data);
	// }, redirectHandler);


	facebook.getJSON('https://graph.facebook.com/me/feed', token1, {}, function(data) {

		console.log("DATA facebook", data);

		body += "\n\nFacebook data " + JSON.stringify(data, undefined, 4);


		feideconnect.getJSON('https://core.uwap.org/api/groups', token2, {}, function(data) {

			console.log("DATA Feideconnect", data);

			body += "\nFeideConnect data " + JSON.stringify(data, undefined, 4);

			res.setHeader('Content-Type', 'text/plain');
			res.setHeader('Content-Length', body.length);
			res.end(body);


		});


	});


});


app.get('/test', function(req, res){
	var body = 'Test OAuth. Got data: ';


	// var redirectHandler = o.getRedirectHandler(req, res);



	var token1 = facebook.getMiddleware().checkToken(req);
	var token2 = feideconnect.getMiddleware().checkToken(req);

	console.log("GOT TOKEN");
	console.log(token1);
	console.log(token2);

	if (req._oauth) {
		body += "\n\n-----\nOAuth object: " + JSON.stringify(req._oauth, undefined, 4);	
	}
	if (req.session) {
		body += "\n\n-----\nSession object: " + JSON.stringify(req.session, undefined, 4);	
	}
	if (token1) {
		body += '\n\n-----\nOauth token expires ' + token1.getExpiresIn() + "\nToken" + JSON.stringify(token1, undefined, 4);	
	}
	if (token2) {
		body += '\n\n-----\nOauth token expires ' + token2.getExpiresIn() + "\nToken" + JSON.stringify(token2, undefined, 4);	
	}



	res.setHeader('Content-Type', 'text/plain');
	res.setHeader('Content-Length', body.length);
	res.end(body);


	// OAuth.prototype.getJSON = function(url, options, callback, redirectCallback
	// o.getJSON("https://core.uwap.org/api/userinfo", {}, function(data) {
	// 	if (data instanceof Error) {
	// 		console.log("Error: " + data);
	// 		return;
	// 	}
	// 	console.log("Successfully retrieved data: ", data);
	// }, redirectHandler);


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


