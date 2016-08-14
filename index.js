var Service, Characteristic;
var mqtt    = require('mqtt');

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-mqtt-people", "mqtt-people", PeopleAccessory);
}

function PeopleAccessory(log, config) {
  this.log = log;
  this.name = config["name"];
  this.url = config['url'];
  this.topic = config['topic'];
  this.msgobject = config['msgobject'];
  this.client_Id 		= 'mqttjs_' + Math.random().toString(16).substr(2, 8);
  this.OccupancyDetected = 0;
  this.options = {
    keepalive: 10,
    clientId: this.client_Id,
		protocolId: 'MQTT',
    protocolVersion: 4,
		clean: true,
		reconnectPeriod: 1000,
		connectTimeout: 30 * 1000,
		will: {
			topic: 'WillMsg',
			payload: 'Connection Closed abnormally..!',
			qos: 0,
			retain: false
		},
		username: config["username"],
		password: config["password"],
		rejectUnauthorized: false
	};

  this.service = new Service.OccupancySensor(this.name);
  this.client  = mqtt.connect(this.url, this.options);
  var that = this;
  this.client.subscribe(this.topic);
 
  this.client.on('message', function (topic, message) {
    // message is Buffer 
    data = JSON.parse(message);
    if (data === null) {return null}
    that.OccupancyDetected = (parseFloat(data[that.msgobject]) == 0 ? Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_DETECTED);
});

  this.service
    .getCharacteristic(Characteristic.OccupancyDetected)
    .on('get', this.getState.bind(this));
}

PeopleAccessory.prototype.getState = function(callback) {
    callback(null, this.OccupancyDetected);
}

PeopleAccessory.prototype.getServices = function() {
  return [this.service];
}

