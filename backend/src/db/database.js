const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', '..', 'data', 'parking.db');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : null });

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

console.log('Banco de dados inicializado em:', dbPath);

// Inicializa as 90 vagas
const stmtCheck = db.prepare('SELECT count(*) as count FROM vagas');
const { count } = stmtCheck.get();

if (count === 0) {
  const insertVaga = db.prepare('INSERT INTO vagas (id_vaga, id_setor, estado_atual, data_ultima_alteracao, id_ultimo_evento) VALUES (?, ?, ?, ?, ?)');
  const now = new Date().toISOString();
  
  db.transaction(() => {
    ['A', 'B', 'C'].forEach(sector => {
      for (let i = 1; i <= 30; i++) {
        const spotId = `${sector}-${i.toString().padStart(2, '0')}`;
        insertVaga.run(spotId, sector, 'FREE', now, 'init');
      }
    });
  })();
  console.log('90 vagas iniciais criadas com sucesso no banco de dados.');
}

module.exports = db;
