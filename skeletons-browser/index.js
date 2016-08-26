var Kinect2 = require('kinect2'),
	express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server);

var kinect = new Kinect2();

var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;

var outputResult = null;
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
			body.result = null;
			sendBody(body);
		break;

		case 2:
			lastMessage = null;
			//sendBody(body);
		break;
		
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
var lastMessage = null;
function sendBody(body) {
	var data = JSON.stringify({ deviceId: 'kinectNodeDevice', 
		joints : getJoints(body.joints),		
		result : body.result
	});
	var message = new Message(data);
	//console.log("message: " + message.getData());
	lastMessage = message;
	//messages.push(message);
	//client.sendEvent(message, printResultFor('send'));			
}

function sendLastMessage(){ 
	console.log("sending Message: " + lastMessage);
	if (lastMessage != null)
	{
		client.sendEvent(lastMessage, printResultFor('send'));
	}		
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
				//console.log(bodyFrame);
				io.sockets.emit('bodyFrame', bodyFrame);
				bodyFrame.bodies.forEach(function(body){
						if(body.tracked) {
							updateHandState(body.leftHandState, body);
						}					
				});
			});

			kinect.openBodyReader();

			setInterval(sendLastMessage, 3000);

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


var Promise = require('bluebird');
var EventHubClient = require('azure-event-hubs').Client;
var moment = require('moment');



// The Event Hubs SDK can also be used with an Azure IoT Hub connection string.
// In that case, the eventHubPath variable is not used and can be left undefined.
var eventHubConnectionString = 'Endpoint=sb://kinectiot-eventhub.servicebus.windows.net/;SharedAccessKeyName=nodeclient;SharedAccessKey=bx5Nx8YpeFAQNyVGrxxa3p8tA8L55cIfT2k+JkRhKDs=';
var eventHubPath = 'kinectiot-eventhub';
var eventHubClient = EventHubClient.fromConnectionString(eventHubConnectionString, eventHubPath);

// Set the consumer group and start time offset for the event hub receivers
// If you have created a consumer group for your node app to use, enter it here
var consumerGroup = '$Default';  
// Set the consumer up to receive only new messages, not all the old ones as well
// set receiveAfterTime to null to read all of the messages from the beginning 
var receiveAfterTime = Date.now() - 5000;


// Log a received message body out to the console
var printEvent = function (ehEvent) {
  var body = ehEvent.body
  var created = moment(body.timecreated);
  //console.log(body);

  console.log("output " + body['scored labels']);
  //var val = Number(body.value);
  //console.log(created.format("hh:mm:ss a") + " - " + body.measurename + ": " + val.toFixed(2) + body.unitofmeasure);
};

// Log an error to the console
var printError = function (err) {
  console.error(err.message);
};

// Send the given eventBody to the Event Hub
var sendEvent = function (eventBody) {
  return function (sender) {
    console.log('Sending Event: ' + eventBody);
    return sender.send(eventBody);
  };
};

eventHubClient.open()
  .then(eventHubClient.getPartitionIds.bind(eventHubClient))
  .then(function (partitionIds) {
    return partitionIds.map(function (partitionId) {
      return eventHubClient.createReceiver(
          consumerGroup,  
          partitionId, 
          { 'startAfterTime': receiveAfterTime }  
      ).then(function (receiver) {
          receiver.on('errorReceived', printError);
          receiver.on('message', printEvent);
        });
    });
  })
  // The send commands have been commented out since we want to just receive
  // messages from the Photon sender, but you can see how you could use this code
  // to send messages as well..
  //   .then(client.createSender.bind(client))
  //   .then(sendEvent('foo'))
  .catch(printError);