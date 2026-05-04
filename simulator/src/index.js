const express = require('express');
const cors = require('cors');
const Gateway = require('./gateway');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

const gateways = {
  'A': new Gateway('A', 30),
  'B': new Gateway('B', 30),
  'C': new Gateway('C', 30)
};

gateways['A'].start();
gateways['B'].start();
gateways['C'].start();

// Encontra um sensor globalmente
const getSensor = (spotId) => {
  const sectorId = spotId.split('-')[0];
  const gateway = gateways[sectorId];
  if (gateway) {
    return gateway.getSensor(spotId);
  }
  return null;
};

// HTTP API: Inject Fault
// POST /api/v1/simulator/fault
app.post('/api/v1/simulator/fault', (req, res) => {
  const { spotId, type } = req.body;
  
  if (!spotId || !['STUCK_OCCUPIED', 'STUCK_FREE', 'FLAPPING'].includes(type)) {
    return res.status(400).json({ error: 'Invalid spotId or type' });
  }

  const sensor = getSensor(spotId);
  if (!sensor) {
    return res.status(404).json({ error: 'Sensor not found' });
  }

  sensor.injectFault(type);
  res.json({ message: `Fault ${type} injected in ${spotId}` });
});

// HTTP API: Remove Fault
// DELETE /api/v1/simulator/fault/:spotId
app.delete('/api/v1/simulator/fault/:spotId', (req, res) => {
  const { spotId } = req.params;
  const sensor = getSensor(spotId);
  
  if (!sensor) {
    return res.status(404).json({ error: 'Sensor not found' });
  }

  sensor.removeFault();
  res.json({ message: `Fault removed from ${spotId}` });
});

// Forçar ocupação 
app.post('/api/v1/simulator/fill-sector', (req, res) => {
  const { sectorId, percentage } = req.body;
  const gw = gateways[sectorId];
  if (!gw) return res.status(404).json({ error: 'Sector not found' });

  const numToFill = Math.floor(30 * (percentage || 0.95));
  let count = 0;
  
  for (const [id, sensor] of gw.sensors.entries()) {
    if (count < numToFill) {
      if (sensor.state !== 'OCCUPIED') {
        sensor.state = 'OCCUPIED';
        sensor.publishEvent();
      }
      count++;
    } else {
      if (sensor.state !== 'FREE') {
        sensor.state = 'FREE';
        sensor.publishEvent();
      }
    }
  }

  res.json({ message: `Sector ${sectorId} filled to ${percentage * 100}%` });
});


app.listen(PORT, () => {
  console.log(`Simulator running on http://localhost:${PORT}`);
});
