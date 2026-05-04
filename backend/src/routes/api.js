const express = require('express');
const router = express.Router();
const spotService = require('../services/spotService');
const recommendationService = require('../services/recommendationService');
const incidentService = require('../services/incidentService');

// api/v1/map
router.get('/map', (req, res) => {
  try {
    const spots = spotService.getAllSpots();
    res.json({ map: spots });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// /api/v1/sectors
router.get('/sectors', (req, res) => {
  try {
    const summary = spotService.getSectorsSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// api/v1/sectors/:sectorId/spots
router.get('/sectors/:sectorId/spots', (req, res) => {
  try {
    const spots = spotService.getSpotsBySector(req.params.sectorId);
    res.json(spots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// api/v1/sectors/:sectorId/free-spots
router.get('/sectors/:sectorId/free-spots', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const freeSpots = spotService.getFreeSpotsBySector(req.params.sectorId, limit);
    res.json(freeSpots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// api/v1/reports/turnover
router.get('/reports/turnover', (req, res) => {
  try {
    const { sectorId, from, to } = req.query;
    if (!sectorId || !from || !to) {
      return res.status(400).json({ error: 'Missing required query parameters: sectorId, from, to' });
    }
    const turnover = spotService.getTurnoverReport(sectorId, from, to);
    res.json({ sectorId, from, to, turnover });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// api/v1/incidents
router.get('/incidents', (req, res) => {
  try {
    const status = req.query.status;
    if (status === 'open') {
      const incidents = incidentService.getOpenIncidents();
      res.json(incidents);
    } else {
      res.status(400).json({ error: 'Only ?status=open is currently supported' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// api/v1/recommendation
router.get('/recommendation', (req, res) => {
  try {
    const { fromSector } = req.query;
    if (!fromSector) {
      return res.status(400).json({ error: 'Missing fromSector parameter' });
    }
    const rec = recommendationService.getRecommendationForSector(fromSector);
    if (rec) {
      res.json(rec);
    } else {
      res.json({ message: `Nenhuma recomendação necessária para o setor ${fromSector} no momento.` });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
