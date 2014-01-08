
var
    // Local utility classes
    Class = require('./class').Class,
    utils = require('./utils'),


	fs = require('fs'),
	path = require('path');



var ConfigurationManager = Class.extend({


	"init": function() {


		this.configurationFile = path.resolve(path.dirname(require.main.filename), 'config.js');
		this.configuration = JSON.parse(
		    fs.readFileSync(this.configurationFile)
		);

	},

	"get": function(id) {
		if (this.configuration.hasOwnProperty(id)) {
			return this.configuration[id];
		} else {
			throw new Error('Could not find config for ' + id);
		}

	}

});

exports.ConfigurationManager = ConfigurationManager;