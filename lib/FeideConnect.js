
var
    OAuthConnectMiddleware = require('./OAuthConnectMiddleware').OAuthConnectMiddleware,
    FeideConnectMiddleware = require('./FeideConnectMiddleware').FeideConnectMiddleware,
	OAuth = require('./jso').OAuth,
	Class = require('./class').Class;



var FeideConnect = OAuth.extend({
	"init": function(config, storageStrategy, redirectStrategy) {

		var defaultConfig = {

			"authorization": "https://core.uwap.org/api/oauth/authorization",
			"token": "https://core.uwap.org/api/oauth/token",

			"scopes": { 
				"request": ["userinfo"]
			}
		};

		for(var key in defaultConfig) {
			if (!config[key]) {
				config[key] = defaultConfig[key];
			}
		}


		this._super(config, storageStrategy, redirectStrategy);
		this.providerID = "FeideConnect";
	},

	"getMiddleware": function() {
		return new FeideConnectMiddleware(this);
	}
})


exports.FeideConnect = FeideConnect;