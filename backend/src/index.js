const express = require('express');
const cors = require('cors');
const { initMqttClient } = require('./mqtt/client');
const apiRoutes = require('./routes/api');
const spotService = require('./services/spotService');
const recommendationService = require('./services/recommendationService');
const incidentService = require('./services/incidentService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/v1', apiRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

initMqttClient();


// ocupação a cada 1 min
setInterval(() => {
  const summary = spotService.getSectorsSummary();
  spotService.saveSectorSnapshot(summary);
}, 60 * 1000);

// verifica incidente a cada 5 seg
setInterval(() => {
  incidentService.detectIncidents();
}, 5 * 1000);

// verifica lotação e gera recomendação a cada 5 seg
setInterval(() => {
  recommendationService.checkAndGenerateRecommendations();
}, 5 * 1000);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
