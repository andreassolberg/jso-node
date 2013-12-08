
var
    OAuthConnectMiddleware = require('./OAuthConnectMiddleware').OAuthConnectMiddleware,
    FacebookMiddleware = require('./FacebookMiddleware').FacebookMiddleware,
	OAuth = require('./jso').OAuth,
	Class = require('./class').Class;



var Facebook = OAuth.extend({
	"init": function(config, storageStrategy, redirectStrategy) {

		var defaultConfig = {

			authorization: 'https://www.facebook.com/dialog/oauth',
			token: 'https://graph.facebook.com/oauth/access_token',


			"presenttoken": "qs",

			scopes: { 
				request: ["user_about_me"]
			}
		};

		for(var key in defaultConfig) {
			if (!config[key]) {
				config[key] = defaultConfig[key];
			}
		}


		this._super(config, storageStrategy, redirectStrategy);
	},

	"getAuthenticationMiddleware": function() {
		return new FacebookMiddleware(this);
	}
})


exports.Facebook = Facebook;