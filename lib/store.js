var  
	utils = require('./utils').utils,
    Class = require('./class').Class,
    AccessToken = require('./AccessToken').AccessToken
    ;


var 
	localStorage,
	LocalStorage,
	SimpleStore
	;


LocalStorage = function() {
	this.objects = {};
};
LocalStorage.prototype.getItem = function(key) {
	if (this.objects.hasOwnProperty(key)) {
		return this.objects[key];
	}
	return null;
}
LocalStorage.prototype.setItem = function(key, value) {
	this.objects[key] = value;
}
LocalStorage.prototype.removeItem = function(key) {
	if (this.objects.hasOwnProperty(key)) {
		delete this.objects[key];
	}
}

localStorage = new LocalStorage();



var StorageStrategy = Class.extend({
	"init": function() {

	},
	"saveState": function (state, obj) {},
	"getState": function (state, callback) {},
	/*
	 * Checks if a token, has includes a specific scope.
	 * If token has no scope at all, false is returned.
	 */
	"hasScope": function(token, scope) {
		var i;
		if (!token.scopes) return false;
		for(i = 0; i < token.scopes.length; i++) {
			if (token.scopes[i] === scope) return true;
		}
		return false;
	},
	/*
	 * Takes an array of tokens, and removes the ones that
	 * are expired, and the ones that do not meet a scopes requirement.
	 */
	"filterTokens": function(tokens, scopes) {
		var i, j, 
			result = [],
			now = utils.epoch(),
			usethis;

		if (!scopes) scopes = [];

		for(i = 0; i < tokens.length; i++) {
			usethis = true;

			// Filter out expired tokens. Tokens that is expired in 1 second from now.
			if (tokens[i].expires && tokens[i].expires < (now+1)) usethis = false;

			// Filter out this token if not all scope requirements are met
			for(j = 0; j < scopes.length; j++) {
				if (!this.s.hasScope(tokens[i], scopes[j])) usethis = false;
			}

			if (usethis) result.push(tokens[i]);
		}
		return result;
	},
	"saveTokens": function (provider, tokens) {},
	"getTokens": function (provider, userid, callback) {},
	"wipeTokens": function(provider, userid) {},

	/*
	 * Save a single token for a provider.
	 * This also cleans up expired tokens for the same provider.
	 */
	"saveToken": function(provider, userid, token) {
		var that = this;
		return this.getTokens(provider, userid, function(tokens) {
			tokens = that.filterTokens(tokens);
			tokens.push(token);
			that.saveTokens(provider, userid, tokens);

		});
	},
	
	/*
	 * Get a token if exists for a provider with a set of scopes.
	 * The scopes parameter is OPTIONAL.
	 */
	"getToken": function(provider, userid, scopes, callback) {
		var that = this;
		return this.getTokens(provider, userid, function(tokens) {
			tokens = that.filterTokens(tokens, scopes);
			if (tokens.length < 1) return callback(null);
			return callback(tokens[0]);
		});
	}
});



/*
 * SimpleStore is not meant for production, but is very easy to get started with.
 * It stores both tokens and states in memory.
 * Warning: It attempts to clean up both expired tokens and used states, but over time
 * there may be some garbage left here...
 */
SimpleStore = StorageStrategy.extend({
	"init": function() {
		var that = this;
		this.s = new LocalStorage();
		this._super();

		setInterval(function() {
			that.reportStatus();
		}, 10000);
	},
	"reportStatus": function() {
		console.log("---- Reporting storage usage -----");
		for(var key in this.s.objects) {
			console.log("  [" + key + "] " + this.s.objects[key]);
		}
		console.log("---- --------- ------- ----- -----");
	},
	/**
		saveState SimpleStore.prototype. an object with an Identifier.
		TODO: Ensure that both localstorage and JSON encoding has fallbacks for ancient browsers.
		In the state object, we put the request object, plus these parameters:
		  * reSimpleStore.prototype.ash
		  * providerID
		  * scopes

	 */
	"saveState": function (state, obj) {
		this.s.setItem("state-" + state, JSON.stringify(obj));
	},
	/**
	 * getStage()  returns the state object, but also removes it.
	 * @type {Object}
	 */
	"getState": function(state, callback) {
		// log("getState (" + state+ ")");
		var obj = JSON.parse(this.s.getItem("state-" + state));
		this.s.removeItem("state-" + state)
		callback(obj);
	},



	"getIdentificator": function(provider, userid, key) {
		if (!provider) throw new Error('Missing required parameter');
		if (!userid) throw new Error('Missing required parameter');
		return key + '-' + provider + '-' + userid;
	},


	/*
	 * saveTokens() SimpleStore.prototype. a list of tokens for a provider.

		Usually the tokens SimpleStore.prototype. are a plain Access token plus:
		  * expires : time that the token expires
		  * providerID: the provider of the access token?
		  * scopes: an array with the scopes (not string)
	 */
	"saveTokens": function(provider, userid, tokens) {
		if (!provider) throw new Error('Missing required parameter');
		if (!userid) throw new Error('Missing required parameter');

		this.s.setItem(this.getIdentificator(provider, userid, 'tokens'), JSON.stringify(tokens));
	},

	"getTokens": function(provider, userid, callback) {
		if (!provider) throw new Error('Missing required parameter');
		if (!userid) throw new Error('Missing required parameter');

		var tokenObjects = [];

		var tokens = JSON.parse(this.s.getItem(this.getIdentificator(provider, userid, 'tokens')));
		if (!tokens) tokens = [];

		for(var i = 0; i < tokens.length; i++) {
			tokenObjects.push(new AccessToken(tokens[i]));
		}

		// log("Token received", tokens)
		callback(tokenObjects);
	},
	"wipeTokens": function(provider, userid) {
		if (!provider) throw new Error('Missing required parameter');
		if (!userid) throw new Error('Missing required parameter');

		this.s.removeItem(this.getIdentificator(provider, userid, 'tokens'));
	},

})



exports.SimpleStore = SimpleStore;


