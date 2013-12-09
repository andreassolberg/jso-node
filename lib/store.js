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
	"getState": function (state) {},
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
	"getTokens": function (provider) {},
	"wipeTokens": function(provider) {},

	/*
	 * Save a single token for a provider.
	 * This also cleans up expired tokens for the same provider.
	 */
	"saveToken": function(provider, userid, token) {
		var tokens = this.getTokens(provider, userid);
		tokens = this.filterTokens(tokens);
		tokens.push(token);
		this.saveTokens(provider, userid, tokens);
	},
	
	/*
	 * Get a token if exists for a provider with a set of scopes.
	 * The scopes parameter is OPTIONAL.
	 */
	"getToken": function(provider, userid, scopes) {
		var tokens = this.getTokens(provider, userid);
		tokens = this.filterTokens(tokens, scopes);
		if (tokens.length < 1) return null;
		return tokens[0];
	}
});




SimpleStore = StorageStrategy.extend({
	"init": function() {
		this.s = new LocalStorage();
		this._super();
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
	"getState": function(state) {
		// log("getState (" + state+ ")");
		var obj = JSON.parse(this.s.getItem("state-" + state));
		this.s.removeItem("state-" + state)
		return obj;
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

	"getTokens": function(provider, userid) {
		if (!provider) throw new Error('Missing required parameter');
		if (!userid) throw new Error('Missing required parameter');

		var tokenObjects = [];

		var tokens = JSON.parse(this.s.getItem(this.getIdentificator(provider, userid, 'tokens')));
		if (!tokens) tokens = [];

		for(var i = 0; i < tokens.length; i++) {
			tokenObjects.push(new AccessToken(tokens[i]));
		}

		// log("Token received", tokens)
		return tokenObjects;
	},
	"wipeTokens": function(provider, userid) {
		if (!provider) throw new Error('Missing required parameter');
		if (!userid) throw new Error('Missing required parameter');

		this.s.removeItem(this.getIdentificator(provider, userid, 'tokens'));
	},

})


exports.SimpleStore = SimpleStore;


