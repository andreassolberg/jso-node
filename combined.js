var 
  // , passport = require('passport')
  // , po2 = require('passport-oauth2')
  // , OAuth2Strategy = require('passport-oauth2').OAuth2Strategy

  	fs = require('fs'),

    OAuth = require('./lib/jso').OAuth,
    Facebook = require('./lib/Facebook').Facebook,
    FeideConnect = require('./lib/FeideConnect').FeideConnect,
	express = require('express'),
	jsostores = require('./lib/store')
  ;

var 
  app = express(),
  store = new express.session.MemoryStore()
  ;


var configurationFile = './config.json';
var configuration = JSON.parse(
    fs.readFileSync(configurationFile)
);


var feideconnect = new FeideConnect(configuration.feideconnect, new jsostores.MongoStore(configuration.mongoConfig) );

var facebook = new Facebook(configuration.facebook);


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
	


	facebook.getMiddleware().checkToken(req, function(token1) {

		feideconnect.getMiddleware().checkToken(req, function(token2) {


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
	});

});


app.get('/test', function(req, res){
	var body = 'Test OAuth. Got data: ';


	// var redirectHandler = o.getRedirectHandler(req, res);



	facebook.getMiddleware().checkToken(req, function(token1) {

		feideconnect.getMiddleware().checkToken(req, function(token2) {



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

		});

	});




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


