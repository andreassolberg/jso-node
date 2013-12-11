
var
    // Local utility classes
    Class = require('./class').Class,
    utils = require('./utils');

var Model = Class.extend({
	"init": function(props) {
		if (!this.props) this.props = {};
		for(var key in props) {
			this.props[key] = props[key];
		}
	},
	"get": function(key) {
		if (!this.has(key)) return null;
		return this.props[key];
	},
	"has": function(key) {
		if (!this.props) return false;
		return this.props.hasOwnProperty(key);
	},
	"set": function(key, value) {
		if (!this.props) this.props = {};
		this.props[key] = value;
	},
	"toJSON": function () {
		if (!this.props) return {};
		return this.props;
	}
})


// Store expires and not expires_in, since it may be stored and retrieved again.
var AccessToken = Model.extend({

	"init": function(props) {

		if (!props) {
			console.log("Trying to initate AccessToken without properties");
		}

		if (!this.props) this.props = {};
		if (props.hasOwnProperty('expires_in')) {
			this.setExpiresIn(props['expires_in']);
			delete props['expires_in'];
		}

		this._super(props);
	},

	// expire may be undefined, to just calculate expiration from existing value
	"setExpiresIn": function(expirein) {

		var now = utils.epoch();
		this.setExpireYes = true;

		if (typeof expirein !== 'undefined') {
			// this.expires_in = expirein;
			this.setMeta('expires_in', expirein);
		}

		if (expirein) {
			this.set('expires', now + parseInt(expirein, 10));
		} else {
			this.set('expires', null);
		}
		
	},
	"issuedNow": function() {
		var now = utils.epoch();
		this.setMeta('issued', now);
	},
	"getExpiresIn": function() {
		var now = utils.epoch();
		if (!this.has('expires')) return null;
		return this.props.expires - now;
	},
	"getScopes": function() {
		if (!this.has('scope')) {
			return [];
		}

		var scope = this.get('scope');
		return scope.split(" ");
	},

	"setMeta": function(key, value) {
		if (!this.props) this.props = {};
		if (!this.props.meta) this.props.meta = {};
		this.props.meta[key] = value;
	}

})



exports.AccessToken = AccessToken;