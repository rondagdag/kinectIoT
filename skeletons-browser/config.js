var config = {};

config.iotConnectionString = 'HostName=HacksterIoTHub.azure-devices.net;DeviceId=kinectNodeDevice;SharedAccessKey=lduni4cs3dL5mb+bElwwCMVQG4gvC3c7vZZQTIuecKc=';
config.eventHubConnectionString = 'Endpoint=sb://kinectiot-eventhub.servicebus.windows.net/;SharedAccessKeyName=nodeclient;SharedAccessKey=bx5Nx8YpeFAQNyVGrxxa3p8tA8L55cIfT2k+JkRhKDs=';
config.eventHubPath = 'kinectiot-eventhub';
config.eventHubConsumerGroup = '$Default';  
config.port = 8000;
config.messageInterval = 2000;
module.exports = config;