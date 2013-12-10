
var mongojs = require("mongojs");

var MongoStore = StorageStrategy.extend({
	"init": function(config) {
		var that = this;
		this.db = mongojs(config.connect, ['oauth-consumer-store-tokens', 'oauth-consumer-store-states']);
		this.tokens = this.db['oauth-consumer-store-tokens'];
		this.states = this.db['oauth-consumer-store-states'];

		this.s = new LocalStorage();

		this._super();

		setInterval(function() {
			that.reportStatus();
		}, 10000);
	},

	"reportStatus": function() {
		console.log("---- Reporting storage usage -----");
		this.states.find({}, function(err, entries) {
			// console.log("states", entries);
		});
		this.tokens.find({}, function(err, entries) {
			console.log("tokens", entries);
		});
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

		this.states.save({
			"key": state,
			"state": obj
		}, function(err, saved) {
			console.log("MONGODB STORE. >> Successfully saved state to MongoDB")
		});

	},
	/**
	 * getStage()  returns the state object, but also removes it.
	 * @type {Object}
	 */
	"getState": function(state, callback) {
		this.states.find({"key": state}, function(err, entries) {
			if (entries && entries.length > 0) {
				callback(entries[0].state);
			}
		});
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

		this.tokens.save({
			"provider": provider,
			"userid": userid,
			"tokens": tokens
		}, function(err, saved) {
			console.log("MONGODB STORE. >> Successfully saved tokens to MongoDB")
		});


		// this.s.setItem(this.getIdentificator(provider, userid, 'tokens'), JSON.stringify(tokens));
	},

	"getTokens": function(provider, userid, callback) {
		if (!provider) throw new Error('Missing required parameter');
		if (!userid) throw new Error('Missing required parameter');

		var query = {
			"provider": provider,
			"userid": userid
		};

		var tokenObjects = [];

		return this.tokens.find(query, function(err, tokens) {
			if (tokens && tokens.length > 0) {
				
				for(var i = 0; i < tokens.length; i++) {
					tokenObjects.push(new AccessToken(tokens[i]));
				}

			}
			return callback(tokenObjects);
		});

	},
	"wipeTokens": function(provider, userid) {
		if (!provider) throw new Error('Missing required parameter');
		if (!userid) throw new Error('Missing required parameter');

		this.s.removeItem(this.getIdentificator(provider, userid, 'tokens'));
	},

});
exports.MongoStore = MongoStore;