var  
	utils = require('./utils').utils;


var 
	localStorage;


var LocalStorage = function() {
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






SimpleStore = function() {
	this.s = new LocalStorage();
}

/**
	saveState SimpleStore.prototype. an object with an Identifier.
	TODO: Ensure that both localstorage and JSON encoding has fallbacks for ancient browsers.
	In the state object, we put the request object, plus these parameters:
	  * reSimpleStore.prototype.ash
	  * providerID
	  * scopes

 */
SimpleStore.prototype.saveState = function (state, obj) {
	this.s.setItem("state-" + state, JSON.stringify(obj));
},
/**
 * getStage()  returns the state object, but also removes it.
 * @type {Object}
 */
SimpleStore.prototype.getState = function(state) {
	// log("getState (" + state+ ")");
	var obj = JSON.parse(this.s.getItem("state-" + state));
	this.s.removeItem("state-" + state)
	return obj;
}




/*
 * Checks if a token, has includes a specific scope.
 * If token has no scope at all, false is returned.
 */
SimpleStore.prototype.hasScope = function(token, scope) {
	var i;
	if (!token.scopes) return false;
	for(i = 0; i < token.scopes.length; i++) {
		if (token.scopes[i] === scope) return true;
	}
	return false;
};

/*
 * Takes an array of tokens, and removes the ones that
 * are expired, and the ones that do not meet a scopes requirement.
 */
SimpleStore.prototype.filterTokens = function(tokens, scopes) {
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
};


/*
 * saveTokens() SimpleStore.prototype. a list of tokens for a provider.

	Usually the tokens SimpleStore.prototype. are a plain Access token plus:
	  * expires : time that the token expires
	  * providerID: the provider of the access token?
	  * scopes: an array with the scopes (not string)
 */
SimpleStore.prototype.saveTokens = function(provider, tokens) {
	// log("Save Tokens (" + provider+ ")");
	this.s.setItem("tokens-" + provider, JSON.stringify(tokens));
};

SimpleStore.prototype.getTokens = function(provider) {
	// log("Get Tokens (" + provider+ ")");
	var tokens = JSON.parse(this.s.getItem("tokens-" + provider));
	if (!tokens) tokens = [];

	// log("Token received", tokens)
	return tokens;
};
SimpleStore.prototype.wipeTokens = function(provider) {
	this.s.removeItem("tokens-" + provider);
};
/*
 * Save a single token for a provider.
 * This also cleans up expired tokens for the same provider.
 */
SimpleStore.prototype.saveToken = function(provider, token) {
	var tokens = this.getTokens(provider);
	tokens = this.filterTokens(tokens);
	tokens.push(token);
	this.saveTokens(provider, tokens);
};

/*
 * Get a token if exists for a provider with a set of scopes.
 * The scopes parameter is OPTIONAL.
 */
SimpleStore.prototype.getToken = function(provider, scopes) {
	var tokens = this.getTokens(provider);
	tokens = this.filterTokens(tokens, scopes);
	if (tokens.length < 1) return null;
	return tokens[0];
};

exports.SimpleStore = SimpleStore;


