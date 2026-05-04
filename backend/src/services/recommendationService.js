const db = require('../db/database');
const spotService = require('./spotService');

const recommendationService = {
  checkAndGenerateRecommendations: () => {
    const summary = spotService.getSectorsSummary();
    const recommendations = [];

    const fullSectors = summary.filter(s => s.occupancyRate >= 0.90);
    if (fullSectors.length === 0) return recommendations;

    const availableSectors = summary.filter(s => s.occupancyRate < 0.90);
    // Sort available by most free spots
    availableSectors.sort((a, b) => b.freeCount - a.freeCount);

    if (availableSectors.length === 0) return recommendations; // Todo o campus lotado!

    const bestAlternative = availableSectors[0];

    const insertRec = db.prepare(`
      INSERT INTO log_recomendacoes (data_hora, setor_origem, setor_recomendado, motivo, dados_json)
      VALUES (?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (const full of fullSectors) {
        const rec = {
          fromSector: full.sectorId,
          recommendedSector: bestAlternative.sectorId,
          reason: `Setor ${full.sectorId} com ${(full.occupancyRate * 100).toFixed(0)}% de ocupação. Setor ${bestAlternative.sectorId} tem ${bestAlternative.freeCount} vagas livres.`,
          ts: new Date().toISOString()
        };
        
        insertRec.run(rec.ts, rec.fromSector, rec.recommendedSector, rec.reason, JSON.stringify(rec));
        recommendations.push(rec);
      }
    })();

    return recommendations;
  },

  getRecommendationForSector: (fromSector) => {
    const stmt = db.prepare(`
      SELECT * FROM log_recomendacoes 
      WHERE setor_origem = ? 
      ORDER BY id DESC LIMIT 1
    `);
    const row = stmt.get(fromSector);
    
    if (row) {
      // Verifica se a recomendação é recente (últimos 5 minutos simulados/reais)
      const recTime = new Date(row.data_hora).getTime();
      const now = new Date().getTime();
      if (now - recTime < 5 * 60 * 1000) { // 5 min
        return JSON.parse(row.dados_json);
      }
    }
    
    // Fallback: calcula na hora se necessário
    const recs = recommendationService.checkAndGenerateRecommendations();
    return recs.find(r => r.fromSector === fromSector) || null;
  }
};

module.exports = recommendationService;
