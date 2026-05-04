const { v4: uuidv4 } = require('uuid');

class Sensor {
  constructor(sectorId, spotId, gateway) {
    this.sectorId = sectorId;
    this.spotId = spotId;
    this.gateway = gateway;
    this.state = 'FREE'; 
    
    this.faultType = null; 
    this.flappingInterval = null;
    this.nextEventTimeout = null;
  }

  start() {
    this.scheduleNextEvent();
  }

  scheduleNextEvent() {
    if (this.nextEventTimeout) clearTimeout(this.nextEventTimeout);
    if (this.faultType === 'STUCK_OCCUPIED' || this.faultType === 'STUCK_FREE') {
      return;
    }

    if (this.faultType === 'FLAPPING') {
      return;
    }

    let delayMs = 0;
    if (this.state === 'FREE') {
      // Tempo para ocupar
      delayMs = Math.floor(Math.random() * (60000 - 90000) + 90000); // 1min a 1min e meio
    } else {
      // Tempo para liberar
      delayMs = Math.floor(Math.random() * (120000 - 30000) + 30000); // 30s a 2min
    }

    this.nextEventTimeout = setTimeout(() => {
      this.toggleState();
      this.scheduleNextEvent();
    }, delayMs);
  }

  toggleState() {
    this.state = this.state === 'FREE' ? 'OCCUPIED' : 'FREE';
    this.publishEvent();
  }

  publishEvent() {
    const payload = {
      eventId: uuidv4(),
      ts: new Date().toISOString(),
      sectorId: this.sectorId,
      spotId: this.spotId,
      state: this.state,
      source: 'sensor'
    };
    this.gateway.publishEvent(payload);
  }

  injectFault(type) {
    this.faultType = type;
    if (this.nextEventTimeout) clearTimeout(this.nextEventTimeout);
    if (this.flappingInterval) clearInterval(this.flappingInterval);

    if (type === 'STUCK_OCCUPIED') {
      this.state = 'OCCUPIED';
      this.publishEvent();
    } else if (type === 'STUCK_FREE') {
      this.state = 'FREE';
      this.publishEvent();
    } else if (type === 'FLAPPING') {
      // Troca a cada 500ms reais (30 segundos simulados)
      this.flappingInterval = setInterval(() => {
        this.toggleState();
      }, 500);
    }
  }

  removeFault() {
    this.faultType = null;
    if (this.flappingInterval) clearInterval(this.flappingInterval);
    this.scheduleNextEvent();
  }
}

module.exports = Sensor;
