'use strict';
var iothub = require('azure-iothub');
var config = require('./config');

var connectionString = 'HostName=HacksterIoTHub.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=7AKT2CYp+yT4z7OHJkQzBX/QX1EpsWnm9FchNiBtxIg='; 
var registry = iothub.Registry.fromConnectionString(connectionString);

var device = new iothub.Device(null);
device.deviceId = 'kinectNodeDevice1';
registry.create(device, function(err, deviceInfo, res) {
  if (err) {
    registry.get(device.deviceId, printDeviceInfo);
  }
  if (deviceInfo) {
    printDeviceInfo(err, deviceInfo, res)
  }
});


function printDeviceInfo(err, deviceInfo, res) {
  if (deviceInfo) {
    console.log('Device id: ' + deviceInfo.deviceId);
    console.log('Device key: ' + deviceInfo.authentication.SymmetricKey.primaryKey);
  }
}