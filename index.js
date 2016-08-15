'use strict';

var inherits = require('util').inherits;
var Service, Characteristic, PowerUsage, DustDensity, SoilMoisture;
var mqtt = require('mqtt');

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  makePowerUsageCharacteristic();  
  makeDustDensityCharacteristic();
  makeSoilMoistureCharacteristic();
  homebridge.registerAccessory("homebridge-mqtt-people", "mqtt-people", PeopleAccessory);
}

function PeopleAccessory(log, config) {
  this.log = log;
  this.name = config["name"];
  this.url = config['url'];

  this.topics = config["topics"];
  this.msgobject = config["msgobject"];

  this.client_Id    = 'mqttjs_' + Math.random().toString(16).substr(2, 8);

  this.OccupancyDetected = 0;
  this.PowerUsage        = 0;
  this.DustDensity       = 0;
  this.SoilMoisture      = 0;

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

  this.service
    .getCharacteristic(Characteristic.OccupancyDetected)
    .on('get', this.getState.bind(this));

  this.service.addCharacteristic(PowerUsage);
  this.service.getCharacteristic(PowerUsage)
    .on('get', this.getPowerUsage.bind(this))

  this.service.addCharacteristic(DustDensity);
  this.service.getCharacteristic(DustDensity)
    .on('get', this.getDustDensity.bind(this))

  this.service.addCharacteristic(SoilMoisture);
  this.service.getCharacteristic(SoilMoisture)
    .on('get', this.getSoilMoisture.bind(this))

  // mqtt
  this.client  = mqtt.connect(this.url, this.options);
  var that = this;
 
  this.client.on('message', function (topic, message) {
    // message is Buffer 
    var data = JSON.parse(message);
    if (data === null) {return null}
    if (topic == that.topics.People) {
      that.OccupancyDetected = (parseFloat(data[that.msgobject.People]) == 0 ? Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_DETECTED);
      that.service.getCharacteristic(Characteristic.OccupancyDetected).setValue(that.OccupancyDetected, undefined, 'fromSetValue');
    }

    if (topic == that.topics.PowerUsage) {
      that.PowerUsage = parseFloat(data[that.msgobject.PowerUsage]);
      that.service.getCharacteristic(PowerUsage).setValue(that.PowerUsage, undefined, 'fromSetValue');
    }

    if (topic == that.topics.DustandSoil) {
      that.DustDensity = (data[that.msgobject.DustDensity] * 10);
      that.SoilMoisture = parseFloat(data[that.msgobject.SoilMoisture]);
      that.service.getCharacteristic(DustDensity).setValue(that.DustDensity, undefined, 'fromSetValue');
      that.service.getCharacteristic(SoilMoisture).setValue(that.SoilMoisture, undefined, 'fromSetValue');
    }
  });

  this.client.subscribe(this.topics.People);
  this.client.subscribe(this.topics.PowerUsage);
  this.client.subscribe(this.topics.DustandSoil);
}

PeopleAccessory.prototype.getState = function(callback) {
    callback(null, this.OccupancyDetected);
}

PeopleAccessory.prototype.getPowerUsage = function(callback) {
    callback(null, this.PowerUsage);
}

PeopleAccessory.prototype.getDustDensity = function(callback) {
    callback(null, this.DustDensity);
}

PeopleAccessory.prototype.getSoilMoisture = function(callback) {
    callback(null, this.SoilMoisture);
}

PeopleAccessory.prototype.getServices = function() {
  return [this.service];
}

function makePowerUsageCharacteristic() {
    PowerUsage = function() {
        Characteristic.call(this, 'Power Usage', 'AE48F447-E065-4B31-8050-8FB06DB9E087');
    
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: 'W',
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
    
        this.value = this.getDefaultValue();
    };
    inherits(PowerUsage, Characteristic);
}

function makeDustDensityCharacteristic() {
    DustDensity = function() {
        Characteristic.call(this, 'Dust Density x 10', 'AE48F447-0000-0000-8050-8FB06DB9E087');
    
        this.setProps({
            format: Characteristic.Formats.FLOAT,
            unit: 'mg/m3',
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
    
        this.value = this.getDefaultValue();
    };
    inherits(DustDensity, Characteristic);
}

function makeSoilMoistureCharacteristic() {
    SoilMoisture = function() {
        Characteristic.call(this, 'Soil Moisture', 'AE48F447-1111-0000-8050-8FB06DB9E087');
    
        this.setProps({
            format: Characteristic.Formats.UINT16,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
    
        this.value = this.getDefaultValue();
    };
    inherits(SoilMoisture, Characteristic);
}
