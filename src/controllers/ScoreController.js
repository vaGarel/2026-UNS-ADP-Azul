import { RACE_STATUS } from '../models/RaceResult.js';

/**
 * Controlador de Puntajes y Resultados de Carrera (US 07)
 * Patrón MVC - Coordina ScoreView y ScoreService
 */
export class ScoreController {
  constructor(
    scoreService,
    eventRepository,
    teamRepository,
    driverRepository,
    authService,
    scoreView,
    modalManager,
    toastNotification,
    eventEmitter
  ) {
    this.scoreService = scoreService;
    this.eventRepository = eventRepository;
    this.teamRepository = teamRepository;
    this.driverRepository = driverRepository;
    this.authService = authService;
    this.scoreView = scoreView;
    this.modalManager = modalManager;
    this.toastNotification = toastNotification;
    this.eventEmitter = eventEmitter;

    this.currentTab = 'standings';
    this.selectedEventId = 'evt-2026-01';

    this._bindViewHandlers();
    this._subscribeToEvents();
  }

  _bindViewHandlers() {
    this.scoreView.setTabHandler((tab) => {
      this.currentTab = tab;
      this.refreshView();
    });

    this.scoreView.setSelectEventHandler((eventId) => {
      this.selectedEventId = eventId;
      this.refreshView();
    });

    this.scoreView.setOpenScoreModalHandler(() => this.handleOpenScoreModal());
    this.scoreView.setAcknowledgeScoreHandler((scoreId) => this.handleAcknowledgeScore(scoreId));
  }

  _subscribeToEvents() {
    this.eventEmitter.on('scores:updated', () => this.refreshView());
    this.eventEmitter.on('scores:acknowledged', () => this.refreshView());
    this.eventEmitter.on('auth:userChanged', () => this.refreshView());
  }

  render() {
    const drivers = this.driverRepository.getStandings();
    const teams = this.teamRepository.getStandings();
    const events = this.eventRepository.getAll();
    const results = this.scoreService.getAllResults();
    const currentUser = this.authService.getCurrentUser();

    this.scoreView.render({
      drivers,
      teams,
      events,
      results,
      currentUser,
      selectedEventId: this.selectedEventId
    });
  }

  refreshView() {
    this.render();
  }

  handleOpenScoreModal() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser.canManageScores()) {
      this.toastNotification.error('Permiso denegado', 'Solo el personal de la FIA puede cargar puntajes.');
      return;
    }

    const events = this.eventRepository.getAll();
    const drivers = this.driverRepository.getAll();
    const teams = this.teamRepository.getAll();

    const formHtml = `
      <form id="form-race-score" class="crud-form">
        <div class="form-group">
          <label for="score-event">Gran Premio / Carrera *</label>
          <select id="score-event" class="form-select" required>
            ${events.map(e => `
              <option value="${e.id}" ${e.id === this.selectedEventId ? 'selected' : ''}>
                ${e.banderaPais || '🏁'} ${e.nombre} (${e.circuito})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label for="score-driver">Piloto Oficial *</label>
            <select id="score-driver" class="form-select" required>
              <option value="">Seleccione un piloto...</option>
              ${drivers.map(d => `
                <option value="${d.id}" data-team-id="${d.escuderiaId}">
                  #${d.numero} ${d.nombre} ${d.apellido} (${d.escuderiaNombre})
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-group flex-1">
            <label for="score-team">Escudería *</label>
            <select id="score-team" class="form-select" required>
              <option value="">Seleccione la escudería...</option>
              ${teams.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label for="score-position">Posición Final *</label>
            <input type="number" id="score-position" class="form-input" min="1" max="22" value="1" required>
          </div>
          <div class="form-group flex-1">
            <label for="score-time">Tiempo Total / Gap</label>
            <input type="text" id="score-time" class="form-input" placeholder="Ej. 1:32:15.890 o +3.412s" value="1:30:45.120">
          </div>
          <div class="form-group flex-1">
            <label for="score-status">Estado</label>
            <select id="score-status" class="form-select">
              <option value="${RACE_STATUS.FINISHED}">Clasificado (Finalizó)</option>
              <option value="${RACE_STATUS.DNF}">Retirado (DNF)</option>
              <option value="${RACE_STATUS.DSQ}">Descalificado (DSQ)</option>
            </select>
          </div>
        </div>

        <div class="form-check-group mt-2">
          <label class="custom-checkbox">
            <input type="checkbox" id="score-fastest-lap">
            <span class="checkmark"></span>
            <span class="checkbox-label"><strong>🟣 Registró la Vuelta Rápida (+1 Punto FIA si termina en Top 10)</strong></span>
          </label>
        </div>

        <div class="score-points-preview-box mt-3" id="points-preview">
          <span>Puntos calculados automáticamente por regla FIA: <strong id="preview-pts">25 PTS</strong></span>
        </div>

        <div class="modal-actions mt-4">
          <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar Puntaje Oficial</button>
        </div>
      </form>
    `;

    this.modalManager.open({
      title: '📝 Cargar Resultado y Puntaje Oficial de Carrera (FIA)',
      contentHtml: formHtml,
      onRender: (container, closeModal) => {
        container.querySelector('#btn-cancel-modal').addEventListener('click', closeModal);

        const form = container.querySelector('#form-race-score');
        const driverSelect = form.querySelector('#score-driver');
        const teamSelect = form.querySelector('#score-team');
        const posInput = form.querySelector('#score-position');
        const fastLapCheck = form.querySelector('#score-fastest-lap');
        const previewPts = form.querySelector('#preview-pts');

        const updatePreview = () => {
          const pos = Number(posInput.value) || 1;
          const hasFl = fastLapCheck.checked;
          const pts = this.scoreService.scoringStrategy.calculatePoints(pos, hasFl, true);
          previewPts.textContent = `${pts} PTS`;
        };

        driverSelect.addEventListener('change', () => {
          const opt = driverSelect.options[driverSelect.selectedIndex];
          if (opt && opt.dataset.teamId) {
            teamSelect.value = opt.dataset.teamId;
          }
        });

        posInput.addEventListener('input', updatePreview);
        fastLapCheck.addEventListener('change', updatePreview);

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          try {
            const data = {
              eventoId: form.querySelector('#score-event').value,
              pilotoId: form.querySelector('#score-driver').value,
              escuderiaId: form.querySelector('#score-team').value,
              posicion: Number(form.querySelector('#score-position').value),
              tiempoTotal: form.querySelector('#score-time').value,
              estadoFinal: form.querySelector('#score-status').value,
              vueltaRapida: form.querySelector('#score-fastest-lap').checked
            };

            this.scoreService.registerRaceScore(data);
            this.toastNotification.success('Puntaje Registrado', 'Los puntos de carrera y el campeonato mundial han sido actualizados con éxito.');
            closeModal();
          } catch (err) {
            this.toastNotification.error('Error al Registrar Puntaje', err.message);
          }
        });
      }
    });
  }

  handleAcknowledgeScore(scoreId) {
    try {
      this.scoreService.acknowledgeScoreNotification(scoreId);
      this.toastNotification.success('Notificación Asentada', 'La escudería ha confirmado formalmente la recepción del puntaje.');
    } catch (err) {
      this.toastNotification.error('Error', err.message);
    }
  }
}
