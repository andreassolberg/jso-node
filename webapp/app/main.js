define(function(require) {


	var environment = 'http://dev.app.bridge.uninett.no';
	var $ = jQuery;

	$(document).ready(function() {

		var onReady = function(message) {
				
			console.log("Received a message from widget to container", event.data);
			// console.log("Received a message to container", event);


			$.getJSON('/_autoconfigure-api/setup', function(metadata) {

				// Perform a request for registering client to widget.
				var widget = document.getElementById("uwap_autoconnect_widget").contentWindow;
				// console.log($("#uwap_autoconnect_widget"));
				widget.postMessage({
					"msg": "metdata", 
					"metadata": metadata
				}, environment);

			});

		} 


		var onRegisterCompleted = function(message) {
			console.log("APP CONFIG RECEIVED FROM Autconfigure...", event.data.data);

			$("#uwap_autoconnect_widget").hide();
			// $("#currentconfig").html(JSON.stringify(event.data.data, undefined, 4));



			var meta = {
				'authorization': '<?php echo $uwap["oauth"]["authorization"]; ?>',
				'token':  '<?php echo $uwap["oauth"]["token"]; ?>',
				'userinfo':  '<?php echo $uwap["oauth"]["userinfo"]; ?>',
				'client_id':  message['client_id'],
				'client_secret':  message['client_secret'],
				'redirect_uri':  message['redirect_uri'][0],
			};


			$("#updmetadata").attr('value', JSON.stringify(meta));

			$.ajax({
				type: "POST",
				dataType: "json",
				contentType: "application/json; charset=utf-8",
				url: '/_autoconfigure-api/register',
				data: JSON.stringify({"metadata": meta}),
				success: function(msg) {

					location.reload(true);	
				}
			});

		}




		window.addEventListener("message", function(event) {

			/**
			 * When receving a message that the widget is ready, then send a message back with metadata.
			 */
			if (event.data.msg === 'ready') {

				onReady(event.data.data);

			} else if (event.data.msg === 'appconfig') {

				onRegisterCompleted(event.data.data);

			}


		}, false);



	});


	



	//Return the module value
	return function () {};
});