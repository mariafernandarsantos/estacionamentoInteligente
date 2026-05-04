const mqtt = require('mqtt');
const spotService = require('../services/spotService');

const initMqttClient = () => {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  const client = mqtt.connect(brokerUrl);

  client.on('connect', () => {
    console.log(`Connected to MQTT broker at ${brokerUrl}`);
    // Subscribe to all spot events across all sectors
    client.subscribe('campus/parking/sectors/+/spots/+/events', (err) => {
      if (!err) {
        console.log('Subscribed to campus/parking/sectors/+/spots/+/events');
      } else {
        console.error('MQTT Subscribe error:', err);
      }
    });

    // Subscribe to gateway status
    client.subscribe('campus/parking/sectors/+/gateway/status');
  });

  client.on('message', (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      
      if (topic.endsWith('/events')) {
        // payload = { eventId, ts, sectorId, spotId, state, source }
        spotService.processEvent(payload);
      } else if (topic.endsWith('/status')) {
        // TODO: Handle gateway status if needed (optional for MVP)
        // console.log(`Gateway status from ${topic}:`, payload);
      }
    } catch (error) {
      console.error('Error processing MQTT message:', error.message);
    }
  });

  return client;
};

module.exports = { initMqttClient };
