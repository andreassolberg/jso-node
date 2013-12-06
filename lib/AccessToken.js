
var
    utils = require('./utils').utils,
	Class = require('./class').Class;


var Model = Class.extend({
	"init": function(props) {
		this.props = props;
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

		if (!this.props) this.props = {};
		if (props.hasOwnProperty('expires_in')) {
			this.setExpiresIn(props['expired_in']);
			delete props['expired_in'];
		}

		this._super(props);
	},

	// expire may be undefined, to just calculate expiration from existing value
	"setExpiresIn": function(expirein) {

		var now = utils.epoch();

		if (typeof expirein !== 'undefined') {
			this.expire_in = expirein;
		}

		if (this.has('expires_in')) {
			this.props.expires = now + parseInt(this.get("expires_in"), 10);
		} else {
			this.props.expires = null;
		}
		
	},
	"getExpiresIn": function() {
		var now = utils.epoch();
		return this.props.expires - now;
	},
	"getScopes": function() {
		if (!this.has('scope')) {
			return [];
		}

		var scope = this.get('scope');
		return scope.split(" ");
	}

})



exports.AccessToken = AccessToken;