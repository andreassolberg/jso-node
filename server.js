
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


// var scopes = {
// 	request: ["https://www.googleapis.com/auth/userinfo.email"],
// 	require: ["https://www.googleapis.com/auth/userinfo.email"]
// };


app.use('/callback', o.getAuthenticationMiddleware().callback() );

app.use('/', o.getAuthenticationMiddleware() );
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


 // o.ajax({
 //     url: "https://www.googleapis.com/oauth2/v1/userinfo",
 //     oauth: {
 //         scopes: {
 //             request: ["https://www.googleapis.com/auth/userinfo.email"],
 //             require: ["https://www.googleapis.com/auth/userinfo.email"]
 //         }
 //     },
 //     dataType: 'json',
 //     success: function(data) {
 //         console.log("Response (google):");
 //         console.log(data);
 //         $(".loader-hideOnLoad").hide();
 //     }
 // });

// // console.log(po2);

// passport.use('provider', new po2.Strategy({
//     "authorizationURL": 'https://core.uwap.org/api/oauth/authorization',
//     "tokenURL": 'https://core.uwap.org/api/oauth/token',
//     "clientID": 'c74e2395-3712-4c53-b488-e0108af48952',
//     "clientSecret": 'bde08ff3-eee2-4369-9e6b-5e17e2579793',
//     "callbackURL": 'http://0.0.0.0:3000/callback'
//   },
//   function(accessToken, refreshToken, profile, done) {


//     console.log("Got the token", accessToken, refreshToken, profile);
//     done();

//     // User.findOrCreate(..., function(err, user) {
//     //   done(err, user);
//     // });
//   }
// ));

// Redirect the user to the OAuth 2.0 provider for authentication.  When
// complete, the provider will redirect the user back to the application at
//     /auth/provider/callback
// app.get('/auth/provider', passport.authenticate('provider'));

// // The OAuth 2.0 provider has redirected the user back to the application.
// // Finish the authentication process by attempting to obtain an access
// // token.  If authorization was granted, the user will be logged in.
// // Otherwise, authentication has failed.
// app.get('/callback', 
// passport.authenticate('provider', { successRedirect: '/',
//                                       failureRedirect: '/login' }));


// app.get('/auth/provider',
//   passport.authenticate('provider', { scope: ['email', 'sms'] })
// );




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