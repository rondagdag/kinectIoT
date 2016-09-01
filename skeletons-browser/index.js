var config = require('./config');


var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	path = require('path'),
	io = require('socket.io').listen(server);

var WebSocketClient = require('websocket').client;
var wsclient = new WebSocketClient();

var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;

var outputResult = null;
var connectionString = config.iotConnectionString; 
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
		 		
		wsclient.on('connectFailed', function(error) {
    	console.log('Connect Error: ' + error.toString());
		});
		
		wsclient.on('connect', function(connection) {

			server.listen(config.port);
			console.log('Server listening on port ' + config.port);
			console.log('Point your browser to http://localhost:' + config.port);

			var staticPath = path.join(__dirname, '/public');
			app.use(express.static(staticPath));
		
			// kinect.on('bodyFrame', function(bodyFrame){
			// 	//console.log(bodyFrame);
			// 	io.sockets.emit('bodyFrame', bodyFrame);
			// 	bodyFrame.bodies.forEach(function(body){
			// 			if(body.tracked) {
			// 				updateHandState(body.leftHandState, body);
			// 			}					
			// 	});
			// });

			// kinect.openBodyReader();

		
			console.log('WebSocket Client Connected');
			connection.on('error', function(error) {
					console.log("Connection Error: " + error.toString());
			});
			connection.on('close', function() {
					console.log('echo-protocol Connection Closed');
			});
			connection.on('message', function(event) {
				//console.log(event);
				if (event.type === 'utf8') {
						console.log("Received: '" + event.utf8Data + "'");
					// SKELETON DATA

					// Get the data in JSON format.
					var bodyFrame = JSON.parse(event.utf8Data);
					console.log(bodyFrame);
					io.sockets.emit('bodyFrame', bodyFrame);
					bodyFrame.skeletons.forEach(function(body){
							console.log(body);
							/*if(body.tracked) {
								updateHandState(body.leftHandState, body);
							}	*/				
					});

            // Display the skeleton joints.
            // for (var i = 0; i < jsonObject.skeletons.length; i++) {
            //     for (var j = 0; j < jsonObject.skeletons[i].joints.length; j++) {
            //         var joint = jsonObject.skeletons[i].joints[j];

                    // Draw!!!
                    /*context.fillStyle = "#FF0000";
                    context.beginPath();
                    context.arc(joint.x, joint.y, 10, 0, Math.PI * 2, true);
                    context.closePath();
                    context.fill();*/
             //   }
            //}
        	}
			});
				
			setInterval(sendLastMessage, config.messageInterval /*2000*/);

			connection.sendUTF("Color");
		});

		/*if(kinect.open()) {
			
			server.listen(config.port);
			console.log('Server listening on port ' + config.port);
			console.log('Point your browser to http://localhost:' + config.port);

			var staticPath = path.join(__dirname, '/public');
			app.use(express.static(staticPath));

			// app.get('/', function(req, res) {
			// 	res.sendFile(__dirname + '/public/index.html');
			// });		 								

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

			setInterval(sendLastMessage, config.messageInterval );

		}*/

		
		client.on('message', function (msg) { 
			console.log(msg); 
			client.complete(msg, function () {
				console.log('completed');
			});
		}); 

		wsclient.connect('ws://localhost:8181/');
		

		//setInterval(sendEventByBatch, 10000);
	}
};

client.open(connectCallback);


//app.use(express.static('public'));
//app.use(morgan('dev'));
//var httpServer = http.createServer(app);


var Promise = require('bluebird');
var EventHubClient = require('azure-event-hubs').Client;
var moment = require('moment');

// The Event Hubs SDK can also be used with an Azure IoT Hub connection string.
// In that case, the eventHubPath variable is not used and can be left undefined.
var eventHubConnectionString = config.eventHubConnectionString; //'Endpoint=sb://kinectiot-eventhub.servicebus.windows.net/;SharedAccessKeyName=nodeclient;SharedAccessKey=bx5Nx8YpeFAQNyVGrxxa3p8tA8L55cIfT2k+JkRhKDs=';
var eventHubPath = config.eventHubPath; //'kinectiot-eventhub';
var eventHubClient = EventHubClient.fromConnectionString(eventHubConnectionString, eventHubPath);

// Set the consumer group and start time offset for the event hub receivers
// If you have created a consumer group for your node app to use, enter it here
var consumerGroup = config.eventHubConsumerGroup; //'$Default';  
// Set the consumer up to receive only new messages, not all the old ones as well
// set receiveAfterTime to null to read all of the messages from the beginning 
var receiveAfterTime = Date.now() - 5000;


// Log a received message body out to the console
var printEvent = function (ehEvent) {
  var body = ehEvent.body
  var created = moment(body.timecreated);
  //console.log(body);

  console.log("output " + body['scored labels']);
	io.sockets.emit('label', body['scored labels']);
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




// AnkleLeft	14 	Left ankle
// AnkleRight	18 	Right ankle
// ElbowLeft	5 	Left elbow
// ElbowRight	9 	Right elbow
// FootLeft	15 	Left foot
// FootRight	19 	Right foot
// HandLeft	7 	Left hand
// HandRight	11 	Right hand
// HandTipLeft	21 	Tip of the left hand
// HandTipRight	23 	Tip of the right hand
// Head	3 	Head
// HipLeft	12 	Left hip
// HipRight	16 	Right hip
// KneeLeft	13 	Left knee
// KneeRight	17 	Right knee
// Neck	2 	Neck
// ShoulderLeft	4 	Left shoulder
// ShoulderRight	8 	Right shoulder
// SpineBase	0 	Base of the spine
// SpineMid	1 	Middle of the spine
// SpineShoulder	20 	Spine at the shoulder
// ThumbLeft	22 	Left thumb
// ThumbRight	24 	Right thumb
// WristLeft	6 	Left wrist
// WristRight	10 	Right wrist
