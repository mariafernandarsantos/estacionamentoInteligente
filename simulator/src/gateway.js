const mqtt = require('mqtt');
const Sensor = require('./sensor');

class Gateway {
  constructor(sectorId, numSpots) {
    this.sectorId = sectorId;
    this.numSpots = numSpots;
    this.sensors = new Map();
    this.mqttClient = null;
  }

  start() {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
    const options = {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD
    };
    this.mqttClient = mqtt.connect(brokerUrl, options);

    this.mqttClient.on('connect', () => {
      console.log(`[Gateway ${this.sectorId}] Connected to MQTT`);
      
      // inicia os sensores
      for (let i = 1; i <= this.numSpots; i++) {
        const spotId = `${this.sectorId}-${i.toString().padStart(2, '0')}`;
        const sensor = new Sensor(this.sectorId, spotId, this);
        this.sensors.set(spotId, sensor);
        
        setTimeout(() => {
          sensor.start();
        }, i * 200);
      }

      // status do gateway
      setInterval(() => {
        this.mqttClient.publish(
          `campus/parking/sectors/${this.sectorId}/gateway/status`,
          JSON.stringify({ status: 'online', ts: new Date().toISOString() })
        );
      }, 30000);
    });

    this.mqttClient.on('error', (err) => {
      console.error(`[Gateway ${this.sectorId}] MQTT Error:`, err.message);
    });
  }

  publishEvent(payload) {
    if (this.mqttClient && this.mqttClient.connected) {
      const topic = `campus/parking/sectors/${this.sectorId}/spots/${payload.spotId}/events`;
      this.mqttClient.publish(topic, JSON.stringify(payload));
    }
  }

  getSensor(spotId) {
    return this.sensors.get(spotId);
  }
}

module.exports = Gateway;
