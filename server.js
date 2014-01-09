
var 
	// , passport = require('passport')
	// , po2 = require('passport-oauth2')
	// , OAuth2Strategy = require('passport-oauth2').OAuth2Strategy

	ConfigurationManager = require('./lib/ConfigurationManager').ConfigurationManager,

	jso = require('./lib/jso'),
	// OAuth = require('./lib/jso').OAuth,
	// FeideConnect = require('./lib/FeideConnect').FeideConnect,
	express = require('express')
  ;


var 
  app = express(),
  store = new express.session.MemoryStore()
  ;


var cm = new ConfigurationManager();
var config = cm.get('feideconnect');


var o = new jso.FeideConnect(config);


var sessionConfig = { 
	// path: '/', 
	// httpOnly: true, 
	// maxAge: null,
	"secret": "slksdf89sd8ftsdjhfgsduytf",
	"store": store,
	"cookie": { 
		path: '/', 
		httpOnly: true, 
		maxAge: 1000*24*60*60*1000 // , // 10000 days.
		// secure: true
	}
};
app.use(express.cookieParser());
app.use(express.session(sessionConfig));

app.use('/callback', o.getMiddleware().callback().authenticate() );

// app.use('/', o.getAuthenticationMiddleware() );
app.use('/test', o.getMiddleware()
	.requireScopes(['userinfo'])

);

app.use('/_autoconfigure/', express.static(__dirname + '/webapp/'));

app.use('/', o.getMiddleware());
app.use(app.router);


app.get('/_autoconfigure-api/setup', function(req, res) {

	var body = ;

	var bodystr = JSON.stringify(body);
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Content-Length', bodystr.length);
	res.end(bodystr);

});





app.get('/dump', function(req, res){
	var body = 'Test OAuth. Got data: ';

	if (req._oauth) {
		body += "OAuth object: " + JSON.stringify(req._oauth, undefined, 4);	
	}
	if (req.session) {
		body += "Session object: " + JSON.stringify(req.session, undefined, 4);	
	}



	o.getMiddleware().checkToken(req, function(token) {


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

var port = 9001;
app.listen(port);
console.log('Listening on port ' + port);


