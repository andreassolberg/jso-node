define(function(require) {


	var environment = 'http://dev.app.bridge.uninett.no';
	var $ = jQuery;

	$(document).ready(function() {

		console.log("-----");

		var App = function() {

			var that = this;
			this.metadata = null;

			window.addEventListener("message", function(event) {
				/**
				 * When receving a message that the widget is ready, then send a message back with metadata.
				 */
				if (event.data.msg === 'ready') {
					that.onReady(event.data.data);
				} else if (event.data.msg === 'appconfig') {
					that.onRegisterCompleted(event.data.data);
				}
			}, false);

			$("body").on('click', '#actResetConfig', function(e) {
				e.preventDefault(); e.stopPropagation();

				console.log("Reset config");
				that.deleteConfiguredMetadata(that.metadata.client_id);

			});

			$("body").on('click', '#actDevDashboard', function(e) {
				e.preventDefault(); e.stopPropagation();

				console.log("actDevDashboard");

				var url = 'https://dev.uwap.org/#!/config/' + encodeURIComponent(that.metadata.client_id);
				window.open(url, '_blank');

			});

			this.loadConfiguredMetadata();

		}


		App.prototype.onReady = function(message) {
				
			console.log("Received a message from widget to container", event.data);

			// Perform a request for registering client to widget.
			var widget = document.getElementById("uwap_autoconnect_widget").contentWindow;
			// console.log($("#uwap_autoconnect_widget"));
			widget.postMessage({
				"msg": "metdata", 
				"metadata": this.metadata
			}, environment);

		} 

		App.prototype.deleteConfiguredMetadata = function(id) {
			var that = this;
			var url = 'setup';
			$.ajax({
				dataType: "json",
				url: url,
				data: {"id": id},
				method: "DELETE",
				success: function(a) {
					console.log("DELETED LOCAL CONFIGURATION");
					that.loadConfiguredMetadata();
				}
			});
		}

		App.prototype.setAuthStatus = function(user, metadata) {


			$("body").removeClass('userAdmin');
			if (user !== null) {

				$("body").addClass('userAuthenticated');
				
				$(".dataUsername").empty().html(user.name);

				console.log("Compare", user.userid, metadata);
				if (user.userid === metadata['uwap-userid']) {
					$("body").addClass('userAdmin');
				}

			} else {

				$("body").removeClass('userAuthenticated');
				$(".dataUsername").empty().html('Not authenticated');

			}

		}

		App.prototype.loadConfiguredMetadata = function(expectAlreadyConfigured) {
			var that = this;

			$("#alreadyRegisteredContainer").hide();
			$("#manualContainer").hide();

			$.getJSON('../autoconfigure-api/setup', function(response) {


				var metadata = response.metadata;
				console.log("Loaded local metadata ", metadata);

				that.metadata = metadata;

				if (response.user) {
					that.setAuthStatus(response.user, metadata);
				} else {
					that.setAuthStatus(null);
				}

				if (that.metadata.client_id) {

					if (that.metadata.autoconfigure) {

						$("#alreadyRegisteredContainer").show();

					} else {
						$("#manualContainer").show();

					}

				} else {
					if (expectAlreadyConfigured) {
						console.error("Expecting the metadata to already be configured, but it does not seem to be.", metadata);
					} else {
						that.loadWidget();	
					}
					
				}



			});

		}


		App.prototype.loadWidget = function() {

			var ihtml = '<iframe id="uwap_autoconnect_widget" src="http://dev.app.bridge.uninett.no/autoconnect.html" ' + 
							'style="border-radius: 10px; border: 1px solid #aaa; width: 100%; height: 680px"></iframe>';

			$("#mainContainer").empty().append(ihtml);

		}

		App.prototype.onRegisterCompleted = function(message) {
			var that = this;
			console.log("APP CONFIG RECEIVED FROM Autconfigure...", message);

			$("#uwap_autoconnect_widget").hide();
			// $("#currentconfig").html(JSON.stringify(event.data.data, undefined, 4));


			var metadata = {};
			for(var key in message) {
				if (message.hasOwnProperty(key)) {

					if (key === 'id') {
						metadata['client_id'] = message[key];
					} else if (key === 'name') {
						metadata['client_name'] = message[key];
					} else if (key === 'redirect_uri') {
						metadata[key] = message[key][0];
					} else {
						metadata[key] = message[key];
					}

				}
			}

			console.log("Metadata sent for registering", metadata);

			$("#updmetadata").attr('value', JSON.stringify(metadata));

			$.ajax({
				type: "POST",
				dataType: "json",
				contentType: "application/json; charset=utf-8",
				url: '../autoconfigure-api/register',
				data: JSON.stringify(metadata),
				success: function(msg) {

					that.loadConfiguredMetadata(true);
					// location.reload(true);	
				}
			});

		}

		var a = new App();


	});






	//Return the module value
	return function () {};
});