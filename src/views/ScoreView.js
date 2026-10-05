import { BaseView } from './BaseView.js';
import { DateFormatter } from '../utils/DateFormatter.js';
import { RACE_STATUS } from '../models/RaceResult.js';

export class ScoreView extends BaseView {
  constructor(containerId = 'main-content') {
    super(containerId);
    this.activeTab = 'standings'; // 'standings' | 'race-results'
    this.selectedEventId = 'evt-2026-01';
  }

  render({ drivers = [], teams = [], events = [], results = [], currentUser, selectedEventId }) {
    if (selectedEventId) this.selectedEventId = selectedEventId;
    const container = this.getContainer();
    if (!container) return;

    const canManageScores = currentUser.canManageScores();
    const canAcknowledge = currentUser.canAcknowledgeNotifications() || currentUser.isAdminFIA();
    const completedEvents = events.filter(e => e.estado === 'Finalizado' || e.puntajesRegistrados);

    container.innerHTML = `
      <section class="section-container animate-fade-in" id="scores-section">
        <div class="section-hero">
          <div class="hero-text">
            <div class="hero-badge">SISTEMA OFICIAL DE PUNTUACIÓN FIA</div>
            <h2 class="hero-title">Puntajes y Clasificación del Campeonato 2026</h2>
            <p class="hero-subtitle">Registro y validación de resultados de carrera, cálculo de puntos según normativa FIA (25-18-15-12-10-8-6-4-2-1) y trazabilidad de notificaciones a escuderías.</p>
          </div>
          <div class="hero-actions">
            ${canManageScores ? `
              <button class="btn btn-primary btn-glow" id="btn-open-score-modal">
                <span class="btn-icon">📝</span> Cargar / Modificar Puntaje (FIA)
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Pestañas de Vista -->
        <div class="scores-tab-bar">
          <button class="score-tab-btn ${this.activeTab === 'standings' ? 'active' : ''}" id="tab-btn-standings">
            🏆 Tablas de Campeonato Mundial
          </button>
          <button class="score-tab-btn ${this.activeTab === 'race-results' ? 'active' : ''}" id="tab-btn-race-results">
            🏁 Resultados por Gran Premio
          </button>
        </div>

        ${this.activeTab === 'standings' ? this._renderStandingsTab(drivers, teams) : this._renderRaceResultsTab(completedEvents, results, currentUser, canAcknowledge)}
      </section>
    `;

    this._bindEvents(completedEvents, results, currentUser);
  }

  _renderStandingsTab(drivers, teams) {
    const sortedDrivers = [...drivers].sort((a, b) => b.puntos - a.puntos);
    const sortedTeams = [...teams].sort((a, b) => b.puntosTotales - a.puntosTotales);

    return `
      <div class="standings-dual-grid">
        <!-- Campeonato de Pilotos -->
        <div class="standings-card">
          <div class="standings-card-header">
            <div>
              <h3 class="card-title">Campeonato Mundial de Pilotos</h3>
              <p class="card-subtitle">Clasificación oficial de pilotos de Fórmula 1</p>
            </div>
            <span class="badge-trophy">🥇 Pilotos</span>
          </div>

          <div class="table-responsive">
            <table class="data-table standings-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Pos</th>
                  <th>Piloto</th>
                  <th>Escudería</th>
                  <th class="text-center">Rol</th>
                  <th class="text-right">Victorias</th>
                  <th class="text-right">Puntos</th>
                </tr>
              </thead>
              <tbody>
                ${sortedDrivers.map((d, index) => {
                  const pos = index + 1;
                  let posClass = '';
                  if (pos === 1) posClass = 'pos-p1';
                  if (pos === 2) posClass = 'pos-p2';
                  if (pos === 3) posClass = 'pos-p3';

                  return `
                    <tr class="${posClass}">
                      <td><span class="pos-badge ${posClass}">${pos}</span></td>
                      <td>
                        <div class="driver-cell">
                          <span class="driver-flag">${d.banderaPais || '🏁'}</span>
                          <strong>${this.escapeHTML(d.getNombreCompleto ? d.getNombreCompleto() : `${d.nombre} ${d.apellido}`)}</strong>
                          <span class="driver-number">#${d.numero}</span>
                        </div>
                      </td>
                      <td><span class="team-name-cell">${this.escapeHTML(d.escuderiaNombre)}</span></td>
                      <td class="text-center">
                        <span class="badge-pill ${d.rol === 'Piloto Titular' ? 'badge-pill-titular' : 'badge-pill-suplente'}">
                          ${d.rol === 'Piloto Titular' ? 'Titular' : 'Reserva'}
                        </span>
                      </td>
                      <td class="text-right">${d.victorias || 0}</td>
                      <td class="text-right points-cell">${d.puntos} PTS</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Campeonato de Constructores -->
        <div class="standings-card">
          <div class="standings-card-header">
            <div>
              <h3 class="card-title">Campeonato Mundial de Constructores</h3>
              <p class="card-subtitle">Puntos acumulados por cada escudería oficial</p>
            </div>
            <span class="badge-trophy">🏎️ Constructores</span>
          </div>

          <div class="table-responsive">
            <table class="data-table standings-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Pos</th>
                  <th>Escudería</th>
                  <th>Motor / Chasis</th>
                  <th>Director</th>
                  <th class="text-right">Puntos</th>
                </tr>
              </thead>
              <tbody>
                ${sortedTeams.map((t, index) => {
                  const pos = index + 1;
                  let posClass = '';
                  if (pos === 1) posClass = 'pos-p1';
                  if (pos === 2) posClass = 'pos-p2';
                  if (pos === 3) posClass = 'pos-p3';

                  return `
                    <tr class="${posClass}">
                      <td><span class="pos-badge ${posClass}">${pos}</span></td>
                      <td>
                        <div class="team-cell">
                          <span class="team-color-indicator" style="background-color: ${t.colorPrimario || '#e10600'};"></span>
                          <strong>${this.escapeHTML(t.nombre)}</strong>
                        </div>
                      </td>
                      <td><small class="text-muted">${this.escapeHTML(t.unidadPotencia || t.chasis)}</small></td>
                      <td>${this.escapeHTML(t.directorEquipo || '-')}</td>
                      <td class="text-right points-cell">${t.puntosTotales} PTS</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  _renderRaceResultsTab(completedEvents, results, currentUser, canAcknowledge) {
    const selectedEvent = completedEvents.find(e => e.id === this.selectedEventId) || completedEvents[0];
    const eventResults = results.filter(r => r.eventoId === (selectedEvent ? selectedEvent.id : ''));

    return `
      <div class="race-results-container">
        <div class="event-selector-bar">
          <label for="select-result-event"><strong>Seleccionar Gran Premio:</strong></label>
          <select id="select-result-event" class="form-select">
            ${completedEvents.map(e => `
              <option value="${e.id}" ${e.id === (selectedEvent ? selectedEvent.id : '') ? 'selected' : ''}>
                ${e.banderaPais || '🏁'} ${e.nombre} (${e.circuito})
              </option>
            `).join('')}
          </select>
        </div>

        ${selectedEvent ? `
          <div class="results-table-card">
            <div class="results-header-info">
              <div>
                <h3 class="results-title">${this.escapeHTML(selectedEvent.nombre)}</h3>
                <p class="text-muted">Circuito: ${this.escapeHTML(selectedEvent.circuito)} | Fecha: ${DateFormatter.formatDate(selectedEvent.fechaInicio)}</p>
              </div>
              <div class="notification-summary-badge">
                <span>📋 Control de Notificación de Puntajes</span>
              </div>
            </div>

            ${eventResults.length === 0 ? `
              <div class="empty-state-card mt-3">
                <p>No hay registros de puntajes cargados para este Gran Premio aún.</p>
              </div>
            ` : `
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>N°</th>
                      <th>Piloto</th>
                      <th>Escudería</th>
                      <th>Tiempo / Diferencia</th>
                      <th>Vuelta Rápida</th>
                      <th>Puntos</th>
                      <th>Estado Notificación Escudería</th>
                      <th class="text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${eventResults.map(r => {
                      const isAck = r.notificadoEscuderia;
                      const isMyTeam = currentUser.isAdminEscuderia() && currentUser.isAuthorizedForTeam(r.escuderiaId);
                      const canAckThis = canAcknowledge && (currentUser.isAdminFIA() || isMyTeam);

                      return `
                        <tr>
                          <td><strong>P${r.posicion}</strong></td>
                          <td><span class="driver-number">#${r.pilotoNumero}</span></td>
                          <td><strong>${this.escapeHTML(r.pilotoNombre)}</strong></td>
                          <td>${this.escapeHTML(r.escuderiaNombre)}</td>
                          <td><code>${this.escapeHTML(r.tiempoTotal || 'En Vuelta')}</code></td>
                          <td>
                            ${r.vueltaRapida ? '<span class="badge-fastest-lap">🟣 1:31.447</span>' : '<span class="text-muted">-</span>'}
                          </td>
                          <td><strong class="points-badge">${r.puntos} PTS</strong></td>
                          <td>
                            ${isAck ? `
                              <span class="badge-status badge-status-finished" title="Notificado el ${DateFormatter.formatDateTime(r.fechaNotificacion)}">
                                ✓ Notificado (${DateFormatter.formatDate(r.fechaNotificacion)})
                              </span>
                            ` : `
                              <span class="badge-status badge-status-scheduled">
                                ⏳ Pendiente de Confirmación
                              </span>
                            `}
                          </td>
                          <td class="text-right">
                            ${!isAck && canAckThis ? `
                              <button class="btn btn-sm btn-outline-success btn-ack-score" data-score-id="${r.id}">
                                ✓ Asentar Notificación
                              </button>
                            ` : (isAck ? '<span class="text-success small">✓ Asentado</span>' : '<span class="text-muted small">Solo Escudería</span>')}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        ` : `
          <div class="empty-state-card">
            <p>No hay carreras finalizadas registradas en el sistema.</p>
          </div>
        `}
      </div>
    `;
  }

  _bindEvents(completedEvents, results, currentUser) {
    const container = this.getContainer();
    if (!container) return;

    const tabStandings = container.querySelector('#tab-btn-standings');
    const tabRaceResults = container.querySelector('#tab-btn-race-results');
    if (tabStandings) {
      tabStandings.addEventListener('click', () => {
        this.activeTab = 'standings';
        if (this.onTabChange) this.onTabChange('standings');
      });
    }
    if (tabRaceResults) {
      tabRaceResults.addEventListener('click', () => {
        this.activeTab = 'race-results';
        if (this.onTabChange) this.onTabChange('race-results');
      });
    }

    const selectEvent = container.querySelector('#select-result-event');
    if (selectEvent) {
      selectEvent.addEventListener('change', (e) => {
        this.selectedEventId = e.target.value;
        if (this.onSelectEvent) this.onSelectEvent(e.target.value);
      });
    }

    const openScoreModalBtn = container.querySelector('#btn-open-score-modal');
    if (openScoreModalBtn) {
      openScoreModalBtn.addEventListener('click', () => {
        if (this.onOpenScoreModal) this.onOpenScoreModal();
      });
    }

    container.querySelectorAll('.btn-ack-score').forEach(btn => {
      btn.addEventListener('click', () => {
        const scoreId = btn.dataset.scoreId;
        if (this.onAcknowledgeScore) this.onAcknowledgeScore(scoreId);
      });
    });
  }

  setTabHandler(h) { this.onTabChange = h; }
  setSelectEventHandler(h) { this.onSelectEvent = h; }
  setOpenScoreModalHandler(h) { this.onOpenScoreModal = h; }
  setAcknowledgeScoreHandler(h) { this.onAcknowledgeScore = h; }
}
