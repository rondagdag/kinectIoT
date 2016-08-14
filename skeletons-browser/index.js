var Kinect2 = require('kinect2'),
	express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server);

var kinect = new Kinect2();

var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;

var outputResult = "y";
//var connectionString = 'HostName=HacksterIoTHub.azure-devices.net;DeviceId=myFirstNodeDevice;SharedAccessKey=ZZ6gJr4V/X5XI3ghb9LZUbvSEYxE+zapPPJ1N8PBfLk=';
var connectionString = 'HostName=HacksterIoTHub.azure-devices.net;DeviceId=kinectNodeDevice;SharedAccessKey=lduni4cs3dL5mb+bElwwCMVQG4gvC3c7vZZQTIuecKc=';
var client = clientFromConnectionString(connectionString);

function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}

function updateHandState(handState, body) {
	switch (handState) {
		case 3:
			//sendBody(body);
		break;

		/*case 2:
			sendBody(body);
		break;
		*/
		case 4:
			body.result = outputResult;
			sendBody(body);
		break;
	}
}


function getJoints(joints)
{
	var saveJoints = [];
	var total = 12;			
	for (var i = 0; i < total; i++) {
		var joint = joints[i];
		saveJoints.push({
			depthX : joint.depthX,
			depthY : joint.depthY,
			cameraZ : joint.cameraZ
		});		
	}	
	 return saveJoints;
}


var messages = [];
function sendBody(body) {
	var data = JSON.stringify({ deviceId: 'kinectNodeDevice', 
		joints : getJoints(body.joints),		
		result : body.result
	});
	var message = new Message(data);
	console.log("Sending message: " + message.getData());
	messages.push(message);
	client.sendEvent(message, printResultFor('send'));			
}

function sendEventByBatch() {
	console.log(messages);
	console.log(client);
	client.sendEventBatch(messages, printResultFor('send'));
	messages = [];
}

var connectCallback = function (err) {
  if (err) {
    console.log('Could not connect: ' + err);
  } else {
    console.log('Client connected');

		if(kinect.open()) {
			server.listen(8000);
			console.log('Server listening on port 8000');
			console.log('Point your browser to http://localhost:8000');

			app.get('/', function(req, res) {
				res.sendFile(__dirname + '/public/index.html');
			});

			kinect.on('bodyFrame', function(bodyFrame){
				console.log(bodyFrame);
				io.sockets.emit('bodyFrame', bodyFrame);
				bodyFrame.bodies.forEach(function(body){
						if(body.tracked) {
							updateHandState(body.leftHandState, body);
						}					
				});
			});

			kinect.openBodyReader();
		}

		
		client.on('message', function (msg) { 
			console.log(msg); 
			client.complete(msg, function () {
				console.log('completed');
			});
		}); 

		//setInterval(sendEventByBatch, 10000);
	}
};

client.open(connectCallback);

