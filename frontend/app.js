const API_URL = 'http://localhost:3000/api/v1';
const SIMULATOR_URL = 'http://localhost:4000/api/v1/simulator';

let currentMap = [];
let openIncidents = [];
let currentSectors = [];

const sectorsStatsEl = document.getElementById('sectorsStats');
const campusMapEl = document.getElementById('campusMap');
const incidentsListEl = document.getElementById('incidentsList');
const recommendationPanel = document.getElementById('recommendationPanel');
const recommendationText = document.getElementById('recommendationText');

async function init() {
  await fetchAndRender();
  setInterval(fetchAndRender, 2000);
}

async function fetchAndRender() {
  try {
    // Busca dados em paralelo
    const [sectorsRes, mapRes, incidentsRes] = await Promise.all([
      fetch(`${API_URL}/sectors`),
      fetch(`${API_URL}/map`),
      fetch(`${API_URL}/incidents?status=open`)
    ]);

    currentSectors = await sectorsRes.json();
    const mapData = await mapRes.json();
    currentMap = mapData.map;
    openIncidents = await incidentsRes.json();

    renderSectorsStats();
    renderMap();
    renderIncidents();
    checkRecommendations();
  } catch (err) {
    console.error("Erro ao buscar dados da API:", err);
  }
}

function renderSectorsStats() {
  sectorsStatsEl.innerHTML = currentSectors.map(sector => {
    const rate = (sector.occupancyRate * 100).toFixed(0);
    return `
      <div class="glass-card stat-card">
        <div class="sector-name">Setor ${sector.sectorId}</div>
        <div class="numbers">
          <span style="color: var(--occupied-color)">${sector.occupiedCount} <span class="label">Ocupadas</span></span>
          <span style="color: var(--free-color)">${sector.freeCount} <span class="label">Livres</span></span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${rate}%; background: ${rate >= 90 ? 'var(--occupied-color)' : 'var(--free-color)'}"></div>
        </div>
        <div style="text-align: right; font-size: 0.8rem; margin-top: 0.3rem; color: var(--text-muted)">
          Lotação: ${rate}%
        </div>
      </div>
    `;
  }).join('');
}

function renderMap() {
  const sectors = ['A', 'B', 'C'];
  
  campusMapEl.innerHTML = sectors.map(sectorId => {
    const spots = currentMap.filter(s => s.id_setor === sectorId).sort((a,b) => a.id_vaga.localeCompare(b.id_vaga));
    
    return `
      <div class="sector-map">
        <div class="sector-title">Setor ${sectorId}</div>
        <div class="spots-grid">
          ${spots.map(spot => {
            // Verifica se tem incidente
            const incident = openIncidents.find(i => i.id_vaga === spot.id_vaga);
            let stateClass = spot.estado_atual === 'FREE' ? 'free' : 'occupied';
            if (incident) stateClass = 'incident';

            // Pega só o número da vaga para exibir
            const shortName = spot.id_vaga.split('-')[1];

            return `<div class="spot ${stateClass}" title="${spot.id_vaga} - ${spot.estado_atual}">${shortName}</div>`;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderIncidents() {
  if (openIncidents.length === 0) {
    incidentsListEl.innerHTML = '<p class="empty-state">Nenhum incidente detectado.</p>';
    return;
  }

  incidentsListEl.innerHTML = openIncidents.map(inc => {
    let evidence = {};
    try { evidence = JSON.parse(inc.evidencias_json); } catch(e){}
    
    return `
      <div class="incident-item">
        <strong>${inc.tipo}</strong> em <strong>${inc.id_vaga}</strong>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.3rem;">
          ${evidence.reason || 'Análise automática'}
        </p>
      </div>
    `;
  }).join('');
}

async function checkRecommendations() {
  // Verifica se algum setor tá lotado e busca recomendação
  const fullSector = currentSectors.find(s => s.occupancyRate >= 0.90);
  
  if (fullSector) {
    try {
      const res = await fetch(`${API_URL}/recommendation?fromSector=${fullSector.sectorId}`);
      const data = await res.json();
      
      if (data && data.recommendedSector) {
        recommendationText.innerHTML = `O <strong>Setor ${data.fromSector}</strong> está lotado. Dirija-se ao <strong>Setor ${data.recommendedSector}</strong>.`;
        recommendationPanel.style.display = 'block';
        return;
      }
    } catch(err){}
  }
  
  recommendationPanel.style.display = 'none';
}

// Controles do simulador

async function injectFault() {
  const spotId = document.getElementById('faultSpotId').value;
  const type = document.getElementById('faultType').value;
  
  if (!spotId) return alert('Digite o ID da vaga. Ex: A-07');

  try {
    const res = await fetch(`${SIMULATOR_URL}/fault`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spotId, type })
    });
    const data = await res.json();
    alert(data.message || data.error);
    document.getElementById('faultSpotId').value = '';
  } catch (err) {
    alert('Erro ao contatar simulador');
  }
}

async function removeFault() {
  const spotId = document.getElementById('resolveSpotId').value;
  if (!spotId) return alert('Digite o ID da vaga. Ex: A-07');

  try {
    const res = await fetch(`${SIMULATOR_URL}/fault/${spotId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    alert(data.message || data.error);
    document.getElementById('resolveSpotId').value = '';
  } catch (err) {
    alert('Erro ao contatar simulador');
  }
}

async function fillSector() {
  const sectorId = document.getElementById('fillSectorId').value;
  try {
    const res = await fetch(`${SIMULATOR_URL}/fill-sector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectorId, percentage: 0.95 }) 
    });
    const data = await res.json();
    alert(data.message || data.error);
  } catch (err) {
    alert('Erro ao contatar simulador');
  }
}

// Start
init();
