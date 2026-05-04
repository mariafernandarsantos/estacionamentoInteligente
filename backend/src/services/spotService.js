const db = require('../db/database');

const spotService = {
  processEvent: (payload) => {
    const { eventId, ts, sectorId, spotId, state, source } = payload;
    
    // Check for idempotency
    const checkStmt = db.prepare('SELECT 1 FROM eventos_vaga WHERE id_evento = ?');
    if (checkStmt.get(eventId)) {
      console.log(`Evento ignorado (idempotência): ${eventId}`);
      return false; // Already processed
    }

    // Insert event
    const insertEvent = db.prepare(`
      INSERT INTO eventos_vaga (id_evento, data_hora, id_setor, id_vaga, estado, payload_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Update current state
    const updateSpot = db.prepare(`
      UPDATE vagas 
      SET estado_atual = ?, data_ultima_alteracao = ?, id_ultimo_evento = ?
      WHERE id_vaga = ?
    `);

    db.transaction(() => {
      insertEvent.run(eventId, ts, sectorId, spotId, state, JSON.stringify(payload));
      updateSpot.run(state, ts, eventId, spotId);
    })();

    return true; // Successfully processed
  },

  getAllSpots: () => {
    return db.prepare('SELECT * FROM vagas').all();
  },

  getSpotsBySector: (sectorId) => {
    return db.prepare('SELECT * FROM vagas WHERE id_setor = ?').all(sectorId);
  },

  getFreeSpotsBySector: (sectorId, limit = 10) => {
    return db.prepare("SELECT * FROM vagas WHERE id_setor = ? AND estado_atual = 'FREE' LIMIT ?").all(sectorId, limit);
  },

  getSectorsSummary: () => {
    const rows = db.prepare(`
      SELECT 
        id_setor, 
        SUM(CASE WHEN estado_atual = 'OCCUPIED' THEN 1 ELSE 0 END) as occupiedCount,
        SUM(CASE WHEN estado_atual = 'FREE' THEN 1 ELSE 0 END) as freeCount,
        COUNT(*) as total
      FROM vagas
      GROUP BY id_setor
    `).all();

    return rows.map(r => ({
      sectorId: r.id_setor,
      occupiedCount: r.occupiedCount,
      freeCount: r.freeCount,
      occupancyRate: r.occupiedCount / r.total,
      lastUpdateTs: new Date().toISOString()
    }));
  },

  saveSectorSnapshot: (summary) => {
    const insertSnapshot = db.prepare(`
      INSERT INTO historico_setores (data_hora, id_setor, qtd_ocupadas, qtd_livres, taxa_ocupacao)
      VALUES (?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (const sec of summary) {
        insertSnapshot.run(sec.lastUpdateTs, sec.sectorId, sec.occupiedCount, sec.freeCount, sec.occupancyRate);
      }
    })();
  },

  getTurnoverReport: (sectorId, fromTs, toTs) => {
    // turnover = nº de transições FREE→OCCUPIED por período
    // Neste caso, basta contar eventos de OCCUPIED nesse período
    const stmt = db.prepare(`
      SELECT COUNT(*) as turnover
      FROM eventos_vaga
      WHERE id_setor = ? 
        AND estado = 'OCCUPIED'
        AND data_hora >= ? 
        AND data_hora <= ?
    `);
    
    const result = stmt.get(sectorId, fromTs, toTs);
    return result.turnover;
  }
};

module.exports = spotService;
