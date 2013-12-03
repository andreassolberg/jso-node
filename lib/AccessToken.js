
var
	class = require('./class').class;

var Model = class.extends({
	"init": function(props) {
		for(var key in props) {
			this[key] = props[key];
		}
	}
})



var AccessToken = class.extends({
	"init": function(props) {
		this._super(props);
	}
	
})



exports.AccessToken = AccessToken;