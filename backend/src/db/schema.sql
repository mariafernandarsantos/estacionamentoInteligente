-- Tabela de vagas (estado mais recente)
CREATE TABLE IF NOT EXISTS vagas (
  id_vaga TEXT PRIMARY KEY,
  id_setor TEXT NOT NULL,
  estado_atual TEXT NOT NULL CHECK (estado_atual IN ('FREE', 'OCCUPIED')),
  data_ultima_alteracao TEXT NOT NULL,
  id_ultimo_evento TEXT NOT NULL
);

-- Tabela de eventos das vagas (histórico)
CREATE TABLE IF NOT EXISTS eventos_vaga (
  id_evento TEXT PRIMARY KEY,
  data_hora TEXT NOT NULL,
  id_setor TEXT NOT NULL,
  id_vaga TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('FREE', 'OCCUPIED')),
  payload_json TEXT NOT NULL
);

-- Snapshots periódicos de ocupação por setor
CREATE TABLE IF NOT EXISTS historico_setores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data_hora TEXT NOT NULL,
  id_setor TEXT NOT NULL,
  qtd_ocupadas INTEGER NOT NULL,
  qtd_livres INTEGER NOT NULL,
  taxa_ocupacao REAL NOT NULL
);

-- Incidentes detectados (flapping, stuck)
CREATE TABLE IF NOT EXISTS incidentes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data_abertura TEXT NOT NULL,
  data_fechamento TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('STUCK_OCCUPIED', 'STUCK_FREE', 'FLAPPING')),
  severidade TEXT NOT NULL CHECK (severidade IN ('LOW', 'MEDIUM', 'HIGH')),
  id_setor TEXT NOT NULL,
  id_vaga TEXT NOT NULL,
  evidencias_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'resolved'))
);

-- Log de recomendações enviadas aos usuários
CREATE TABLE IF NOT EXISTS log_recomendacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data_hora TEXT NOT NULL,
  setor_origem TEXT NOT NULL,
  setor_recomendado TEXT NOT NULL,
  motivo TEXT NOT NULL,
  dados_json TEXT NOT NULL
);
