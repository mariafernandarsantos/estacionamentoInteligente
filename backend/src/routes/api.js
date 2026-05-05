const express = require('express');
const router = express.Router();
const spotService = require('../services/spotService');
const recommendationService = require('../services/recommendationService');
const incidentService = require('../services/incidentService');

/**
 * @swagger
 * /api/v1/map:
 *   get:
 *     summary: Retorna o mapa completo de todas as vagas.
 *     responses:
 *       200:
 *         description: Lista de todas as vagas com seus status.
 */
// api/v1/map
router.get('/map', (req, res) => {
  try {
    const spots = spotService.getAllSpots();
    res.json({ map: spots });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * @swagger
 * /api/v1/sectors:
 *   get:
 *     summary: Retorna o resumo consolidado dos setores.
 *     responses:
 *       200:
 *         description: Total de vagas livres e ocupadas por setor.
 */
// /api/v1/sectors
router.get('/sectors', (req, res) => {
  try {
    const summary = spotService.getSectorsSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/sectors/{sectorId}/spots:
 *   get:
 *     summary: Retorna todas as vagas de um setor específico.
 *     parameters:
 *       - in: path
 *         name: sectorId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do setor (ex: A)
 *     responses:
 *       200:
 *         description: Lista das vagas do setor especificado.
 */
// api/v1/sectors/:sectorId/spots
router.get('/sectors/:sectorId/spots', (req, res) => {
  try {
    const spots = spotService.getSpotsBySector(req.params.sectorId);
    res.json(spots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/sectors/{sectorId}/free-spots:
 *   get:
 *     summary: Retorna as vagas livres de um setor.
 *     parameters:
 *       - in: path
 *         name: sectorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limite de resultados
 *     responses:
 *       200:
 *         description: Lista de vagas livres do setor.
 */
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

/**
 * @swagger
 * /api/v1/reports/turnover:
 *   get:
 *     summary: Retorna o relatório de rotatividade de um setor.
 *     parameters:
 *       - in: query
 *         name: sectorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Relatório de rotatividade gerado.
 */
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

/**
 * @swagger
 * /api/v1/incidents:
 *   get:
 *     summary: Retorna a lista de incidentes.
 *     parameters:
 *       - in: query
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *         description: Status do incidente (ex: open)
 *     responses:
 *       200:
 *         description: Lista de incidentes filtrada por status.
 */
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

/**
 * @swagger
 * /api/v1/recommendation:
 *   get:
 *     summary: Retorna a recomendação para redirecionamento a partir de um setor lotado.
 *     parameters:
 *       - in: query
 *         name: fromSector
 *         required: true
 *         schema:
 *           type: string
 *         description: Setor de origem que está lotado (ex: A)
 *     responses:
 *       200:
 *         description: Recomendação de redirecionamento.
 */
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
