import { CONTROL_TYPES, CONTROL_STATUS } from '../models/TechnicalControl.js';

export class TechnicalControlController {
  constructor(
    technicalControlService,
    carRepository,
    teamRepository,
    eventRepository,
    authService,
    technicalControlView,
    modalManager,
    toastNotification,
    eventEmitter
  ) {
    this.technicalControlService = technicalControlService;
    this.carRepository = carRepository;
    this.teamRepository = teamRepository;
    this.eventRepository = eventRepository;
    this.authService = authService;
    this.technicalControlView = technicalControlView;
    this.modalManager = modalManager;
    this.toastNotification = toastNotification;
    this.eventEmitter = eventEmitter;

    this._bindViewHandlers();
    this._subscribeToEvents();
  }

  _bindViewHandlers() {
    this.technicalControlView.setCreateHandler(() => this.handleCreateControl());
    this.technicalControlView.setDeleteHandler((id) => this.handleDeleteControl(id));
  }

  _subscribeToEvents() {
    this.eventEmitter.on('technicalControls:updated', () => this.refreshView());
    this.eventEmitter.on('auth:userChanged', () => this.refreshView());
  }

  render() {
    const controls = this.technicalControlService.getTechnicalControls();
    const currentUser = this.authService.getCurrentUser();
    this.technicalControlView.render({ controls, currentUser });
  }

  refreshView() {
    this.render();
  }

  handleCreateControl() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser.canManageTechnicalControls()) {
      this.toastNotification.error('Permiso denegado', 'Solo comisarios técnicos FIA pueden registrar controles.');
      return;
    }

    const cars = this.carRepository.getAll();
    const events = this.eventRepository.getAll();

    const formHtml = `
      <form id="form-tech-control" class="crud-form">
        <div class="form-row">
          <div class="form-group flex-2">
            <label for="tc-event">Gran Premio / Sesión *</label>
            <select id="tc-event" class="form-select" required>
              ${events.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="form-group flex-1">
            <label for="tc-date">Fecha de Verificación *</label>
            <input type="date" id="tc-date" class="form-input" required value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-2">
            <label for="tc-car">Monoplaza Inspeccionado *</label>
            <select id="tc-car" class="form-select" required>
              ${cars.map(c => `
                <option value="${c.id}">
                  #${c.numeroAuto} - ${c.escuderiaNombre} (${c.pilotoNombre})
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-group flex-2">
            <label for="tc-type">Tipo de Verificación Técnica *</label>
            <select id="tc-type" class="form-select">
              <option value="${CONTROL_TYPES.WEIGHT_LIMIT}">Peso Mínimo (798 kg)</option>
              <option value="${CONTROL_TYPES.FUEL_FLOW}">Muestra de Combustible</option>
              <option value="${CONTROL_TYPES.AERO_FLEXIBILITY}">Flexibilidad Alerón / DRS</option>
              <option value="${CONTROL_TYPES.PLANK_WEAR}">Desgaste de Plancha de Fondo</option>
              <option value="${CONTROL_TYPES.POWER_UNIT}">Unidad de Potencia y Baterías</option>
              <option value="${CONTROL_TYPES.SAFETY_EQUIPMENT}">Equipamiento de Seguridad y Halo</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label for="tc-status">Dictamen Técnico *</label>
            <select id="tc-status" class="form-select">
              <option value="${CONTROL_STATUS.PASSED}">Aprobado (Conforme)</option>
              <option value="${CONTROL_STATUS.FAILED}">No Aprobado (Rechazado)</option>
              <option value="${CONTROL_STATUS.UNDER_REVIEW}">En Revisión de Laboratorio</option>
            </select>
          </div>
          <div class="form-group flex-2">
            <label for="tc-measurements">Valores Medidos / Parámetros</label>
            <input type="text" id="tc-measurements" class="form-input" placeholder="Ej. Peso: 798.6 kg. Flexión: 1.4 mm.">
          </div>
        </div>

        <div class="form-group">
          <label for="tc-obs">Observaciones del Comisario Técnico</label>
          <textarea id="tc-obs" class="form-textarea" rows="2" placeholder="Dictamen y detalles para el informe de carrera..."></textarea>
        </div>

        <div class="modal-actions mt-4">
          <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar Dictamen</button>
        </div>
      </form>
    `;

    this.modalManager.open({
      title: '🔬➕ Registrar Control Técnico Oficial FIA',
      contentHtml: formHtml,
      onRender: (container, closeModal) => {
        container.querySelector('#btn-cancel-modal').addEventListener('click', closeModal);
        const form = container.querySelector('#form-tech-control');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          try {
            const data = {
              eventoId: form.querySelector('#tc-event').value,
              fecha: form.querySelector('#tc-date').value,
              autoId: form.querySelector('#tc-car').value,
              tipoControl: form.querySelector('#tc-type').value,
              estado: form.querySelector('#tc-status').value,
              mediciones: form.querySelector('#tc-measurements').value,
              observaciones: form.querySelector('#tc-obs').value
            };

            this.technicalControlService.createTechnicalControl(data);
            this.toastNotification.success('Control Técnico Registrado', 'El dictamen ha sido asentado en el sistema.');
            closeModal();
          } catch (err) {
            this.toastNotification.error('Error', err.message);
          }
        });
      }
    });
  }

  async handleDeleteControl(id) {
    const confirmed = await this.modalManager.confirm({
      title: '🗑️ Eliminar Registro de Control Técnico',
      message: '¿Está seguro de que desea eliminar este informe de control?',
      confirmText: 'Sí, Eliminar'
    });

    if (confirmed) {
      try {
        this.technicalControlService.deleteTechnicalControl(id);
        this.toastNotification.success('Registro Eliminado', 'El control técnico ha sido removido.');
      } catch (err) {
        this.toastNotification.error('Error', err.message);
      }
    }
  }
}
