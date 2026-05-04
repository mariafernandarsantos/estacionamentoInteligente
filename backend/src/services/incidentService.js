const db = require('../db/database');

const incidentService = {
  detectIncidents: () => {
    const now = new Date();
    
    // Todas as vagas para análise
    const vagas = db.prepare('SELECT * FROM vagas').all();
    
    // Limites de tempo (usando tempo real = tempo simulado / 60)
    // Ex: 4 horas simuladas = 4 minutos reais = 240.000 ms
    const limitStuckOccupiedMs = 2 * 60 * 1000; 
    const limitStuckFreeMs = 2 * 60 * 1000;
    
    // Flapping: 5 trocas em 5 minutos simulados (5 segundos reais)
    const limitFlappingMs = 5 * 1000;
    
    const insertIncident = db.prepare(`
      INSERT INTO incidentes (data_abertura, tipo, severidade, id_setor, id_vaga, evidencias_json, status)
      VALUES (?, ?, ?, ?, ?, ?, 'open')
    `);

    db.transaction(() => {
      vagas.forEach(vaga => {
        // Verificar se já existe incidente aberto para essa vaga
        const openIncident = db.prepare("SELECT id, tipo FROM incidentes WHERE id_vaga = ? AND status = 'open'").get(vaga.id_vaga);
        
        const lastChange = new Date(vaga.data_ultima_alteracao);
        const timeSinceChangeMs = now.getTime() - lastChange.getTime();

        let newIncidentType = null;
        let severity = 'LOW';
        let evidence = {};

        // 1. Detectar STUCK_OCCUPIED
        if (vaga.estado_atual === 'OCCUPIED' && timeSinceChangeMs > limitStuckOccupiedMs) {
          newIncidentType = 'STUCK_OCCUPIED';
          severity = 'MEDIUM';
          evidence = { reason: `Vaga ocupada por ${Math.round(timeSinceChangeMs/1000)} minutos (simulados)` };
        }
        // 2. Detectar STUCK_FREE
        else if (vaga.estado_atual === 'FREE' && timeSinceChangeMs > limitStuckFreeMs) {
          newIncidentType = 'STUCK_FREE';
          severity = 'LOW';
          evidence = { reason: `Vaga livre por ${Math.round(timeSinceChangeMs/1000)} minutos (simulados)` };
        }

        // 3. Detectar FLAPPING
        const recentEventsCount = db.prepare(`
          SELECT COUNT(*) as count 
          FROM eventos_vaga 
          WHERE id_vaga = ? AND data_hora > ?
        `).get(vaga.id_vaga, new Date(now.getTime() - limitFlappingMs).toISOString()).count;

        if (recentEventsCount > 5) {
          newIncidentType = 'FLAPPING';
          severity = 'HIGH';
          evidence = { reason: `${recentEventsCount} trocas de estado nos últimos 5 minutos (simulados)` };
        }

        // Se detectou incidente e não tem outro igual aberto, salva
        if (newIncidentType && (!openIncident || openIncident.tipo !== newIncidentType)) {
          insertIncident.run(
            now.toISOString(),
            newIncidentType,
            severity,
            vaga.id_setor,
            vaga.id_vaga,
            JSON.stringify(evidence)
          );
          console.log(`[INCIDENTE] ${newIncidentType} detectado na vaga ${vaga.id_vaga}`);
        }
        
        // Se a vaga mudou e curou o incidente
        if (openIncident) {
          if ((openIncident.tipo === 'STUCK_OCCUPIED' && vaga.estado_atual === 'FREE') ||
              (openIncident.tipo === 'STUCK_FREE' && vaga.estado_atual === 'OCCUPIED') ||
              (openIncident.tipo === 'FLAPPING' && recentEventsCount <= 1)) {
            db.prepare("UPDATE incidentes SET status = 'resolved', data_fechamento = ? WHERE id = ?")
              .run(now.toISOString(), openIncident.id);
            console.log(`[INCIDENTE] ${openIncident.tipo} resolvido na vaga ${vaga.id_vaga}`);
          }
        }
      });
    })();
  },

  getOpenIncidents: () => {
    return db.prepare("SELECT * FROM incidentes WHERE status = 'open'").all();
  }
};

module.exports = incidentService;
