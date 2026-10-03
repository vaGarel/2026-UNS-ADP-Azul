import { SANCTION_TYPES, SANCTION_SEVERITY } from '../models/Sanction.js';

export class SanctionController {
  constructor(
    sanctionService,
    driverRepository,
    teamRepository,
    eventRepository,
    authService,
    sanctionView,
    modalManager,
    toastNotification,
    eventEmitter
  ) {
    this.sanctionService = sanctionService;
    this.driverRepository = driverRepository;
    this.teamRepository = teamRepository;
    this.eventRepository = eventRepository;
    this.authService = authService;
    this.sanctionView = sanctionView;
    this.modalManager = modalManager;
    this.toastNotification = toastNotification;
    this.eventEmitter = eventEmitter;

    this._bindViewHandlers();
    this._subscribeToEvents();
  }

  _bindViewHandlers() {
    this.sanctionView.setCreateHandler(() => this.handleCreateSanction());
    this.sanctionView.setAcknowledgeHandler((id) => this.handleAcknowledgeSanction(id));
    this.sanctionView.setDeleteHandler((id) => this.handleDeleteSanction(id));
  }

  _subscribeToEvents() {
    this.eventEmitter.on('sanctions:updated', () => this.refreshView());
    this.eventEmitter.on('sanctions:acknowledged', () => this.refreshView());
    this.eventEmitter.on('auth:userChanged', () => this.refreshView());
  }

  render() {
    const sanctions = this.sanctionService.getSanctions();
    const currentUser = this.authService.getCurrentUser();
    this.sanctionView.render({ sanctions, currentUser });
  }

  refreshView() {
    this.render();
  }

  handleCreateSanction() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser.canManageSanctions()) {
      this.toastNotification.error('Permiso denegado', 'Solo comisarios FIA pueden emitir sanciones.');
      return;
    }

    const events = this.eventRepository.getAll();
    const teams = this.teamRepository.getAll();
    const drivers = this.driverRepository.getAll();

    const formHtml = `
      <form id="form-sanction-crud" class="crud-form">
        <div class="form-row">
          <div class="form-group flex-2">
            <label for="snc-event">Gran Premio / Evento *</label>
            <select id="snc-event" class="form-select" required>
              ${events.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="form-group flex-1">
            <label for="snc-date">Fecha de Resolución *</label>
            <input type="date" id="snc-date" class="form-input" required value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label for="snc-team">Escudería Implicada *</label>
            <select id="snc-team" class="form-select" required>
              <option value="">Seleccione escudería...</option>
              ${teams.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="form-group flex-1">
            <label for="snc-driver">Piloto Sancionado (Opcional)</label>
            <select id="snc-driver" class="form-select">
              <option value="">Sanción a la Escudería (General)</option>
              ${drivers.map(d => `<option value="${d.id}" data-team-id="${d.escuderiaId}">#${d.numero} ${d.nombre} ${d.apellido} (${d.escuderiaNombre})</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-2">
            <label for="snc-type">Tipo de Penalización *</label>
            <select id="snc-type" class="form-select">
              <option value="${SANCTION_TYPES.TIME_PENALTY}">Penalización de Tiempo (+5s / +10s)</option>
              <option value="${SANCTION_TYPES.GRID_PENALTY}">Pérdida de Posiciones en Grilla</option>
              <option value="${SANCTION_TYPES.FINANCIAL_FINE}">Multa Económica</option>
              <option value="${SANCTION_TYPES.DISQUALIFICATION}">Descalificación de Sesión (DSQ)</option>
              <option value="${SANCTION_TYPES.REPRIMAND}">Reprimenda Oficial / Superlicencia</option>
              <option value="${SANCTION_TYPES.PIT_LANE_START}">Largada desde el Pit Lane</option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label for="snc-val">Valor / Magnitud *</label>
            <input type="text" id="snc-val" class="form-input" required placeholder="Ej. +5 Segundos o €15,000" value="+5 Segundos">
          </div>
          <div class="form-group flex-1">
            <label for="snc-severity">Gravedad *</label>
            <select id="snc-severity" class="form-select">
              <option value="${SANCTION_SEVERITY.LOW}">Leve</option>
              <option value="${SANCTION_SEVERITY.MEDIUM}" selected>Moderada</option>
              <option value="${SANCTION_SEVERITY.HIGH}">Grave</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="snc-article">Artículo del Reglamento FIA *</label>
          <input type="text" id="snc-article" class="form-input" required value="Art. 33.3 del Reglamento Deportivo de Fórmula 1 de la FIA">
        </div>

        <div class="form-group">
          <label for="snc-motivo">Motivo / Razonamiento de los Comisarios *</label>
          <textarea id="snc-motivo" class="form-textarea" rows="2" required placeholder="Describir los hechos, telemetría y pruebas analizadas..."></textarea>
        </div>

        <div class="modal-actions mt-4">
          <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">Emitir Resolución Oficial</button>
        </div>
      </form>
    `;

    this.modalManager.open({
      title: '🚩➕ Emitir Sanción Oficial FIA',
      contentHtml: formHtml,
      onRender: (container, closeModal) => {
        container.querySelector('#btn-cancel-modal').addEventListener('click', closeModal);

        const form = container.querySelector('#form-sanction-crud');
        const driverSelect = form.querySelector('#snc-driver');
        const teamSelect = form.querySelector('#snc-team');

        driverSelect.addEventListener('change', () => {
          const opt = driverSelect.options[driverSelect.selectedIndex];
          if (opt && opt.dataset.teamId) {
            teamSelect.value = opt.dataset.teamId;
          }
        });

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          try {
            const data = {
              eventoId: form.querySelector('#snc-event').value,
              fecha: form.querySelector('#snc-date').value,
              escuderiaId: form.querySelector('#snc-team').value,
              pilotoId: form.querySelector('#snc-driver').value || null,
              tipoSancion: form.querySelector('#snc-type').value,
              valorPenalidad: form.querySelector('#snc-val').value,
              gravedad: form.querySelector('#snc-severity').value,
              articuloReglamento: form.querySelector('#snc-article').value,
              motivo: form.querySelector('#snc-motivo').value
            };

            this.sanctionService.createSanction(data);
            this.toastNotification.success('Sanción Emitida', 'La resolución de los comisarios ha sido publicada y notificada.');
            closeModal();
          } catch (err) {
            this.toastNotification.error('Error', err.message);
          }
        });
      }
    });
  }

  handleAcknowledgeSanction(id) {
    try {
      this.sanctionService.acknowledgeSanction(id);
      this.toastNotification.success('Notificación Asentada', 'Se ha dejado constancia formal de que la escudería fue notificada.');
    } catch (err) {
      this.toastNotification.error('Error', err.message);
    }
  }

  async handleDeleteSanction(id) {
    const confirmed = await this.modalManager.confirm({
      title: '🗑️ Eliminar Sanción',
      message: '¿Está seguro de que desea retirar esta resolución de sanción?',
      confirmText: 'Sí, Eliminar'
    });

    if (confirmed) {
      try {
        this.sanctionService.deleteSanction(id);
        this.toastNotification.success('Sanción Retirada', 'El registro ha sido eliminado.');
      } catch (err) {
        this.toastNotification.error('Error', err.message);
      }
    }
  }
}
