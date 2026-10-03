import { DRIVER_ROLES } from '../models/Driver.js';

/**
 * Controlador de Escuderías y Pilotos
 */
export class TeamDriverController {
  constructor(
    teamDriverService,
    authService,
    teamDriverView,
    modalManager,
    toastNotification,
    eventEmitter
  ) {
    this.teamDriverService = teamDriverService;
    this.authService = authService;
    this.teamDriverView = teamDriverView;
    this.modalManager = modalManager;
    this.toastNotification = toastNotification;
    this.eventEmitter = eventEmitter;

    this.selectedTeamFilter = 'ALL';

    this._bindViewHandlers();
    this._subscribeToEvents();
  }

  _bindViewHandlers() {
    this.teamDriverView.setFilterTeamHandler((teamId) => {
      this.selectedTeamFilter = teamId;
      this.refreshView();
    });

    this.teamDriverView.setCreateDriverHandler(() => this.handleCreateDriver());
    this.teamDriverView.setEditDriverHandler((id) => this.handleEditDriver(id));
    this.teamDriverView.setDeleteDriverHandler((id) => this.handleDeleteDriver(id));
  }

  _subscribeToEvents() {
    this.eventEmitter.on('drivers:updated', () => this.refreshView());
    this.eventEmitter.on('auth:userChanged', () => this.refreshView());
  }

  render() {
    const teams = this.teamDriverService.getTeams();
    const drivers = this.teamDriverService.getDrivers();
    const cars = this.teamDriverService.getCars();
    const currentUser = this.authService.getCurrentUser();

    this.teamDriverView.render({
      teams,
      drivers,
      cars,
      currentUser
    });
  }

  refreshView() {
    this.render();
  }

  handleCreateDriver() {
    const teams = this.teamDriverService.getTeams();
    const currentUser = this.authService.getCurrentUser();

    let defaultTeamId = teams[0] ? teams[0].id : '';
    if (currentUser.isAdminEscuderia() && currentUser.escuderiaId) {
      defaultTeamId = currentUser.escuderiaId;
    }

    const formHtml = `
      <form id="form-driver-crud" class="crud-form">
        <div class="form-row">
          <div class="form-group flex-1">
            <label for="drv-nombre">Nombre *</label>
            <input type="text" id="drv-nombre" class="form-input" required placeholder="Ej. Franco">
          </div>
          <div class="form-group flex-1">
            <label for="drv-apellido">Apellido *</label>
            <input type="text" id="drv-apellido" class="form-input" required placeholder="Ej. Colapinto">
          </div>
          <div class="form-group" style="width: 100px;">
            <label for="drv-numero">Dorsal / N° *</label>
            <input type="number" id="drv-numero" class="form-input" min="1" max="99" value="43" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-2">
            <label for="drv-escuderia">Escudería Asignada *</label>
            <select id="drv-escuderia" class="form-select" ${currentUser.isAdminEscuderia() ? 'disabled' : ''}>
              ${teams.map(t => `<option value="${t.id}" ${t.id === defaultTeamId ? 'selected' : ''}>${t.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="form-group flex-1">
            <label for="drv-rol">Rol en el Equipo *</label>
            <select id="drv-rol" class="form-select">
              <option value="${DRIVER_ROLES.TITULAR}">Piloto Titular</option>
              <option value="${DRIVER_ROLES.SUPLENTE}">Piloto Reserva / Suplente</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-2">
            <label for="drv-nacionalidad">Nacionalidad *</label>
            <input type="text" id="drv-nacionalidad" class="form-input" value="Argentina" required>
          </div>
          <div class="form-group flex-1">
            <label for="drv-bandera">Bandera</label>
            <input type="text" id="drv-bandera" class="form-input" value="🇦🇷">
          </div>
          <div class="form-group flex-1">
            <label for="drv-sigla">Sigla (3 Letras)</label>
            <input type="text" id="drv-sigla" class="form-input" maxlength="3" value="COL">
          </div>
        </div>

        <div class="modal-actions mt-4">
          <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar Piloto</button>
        </div>
      </form>
    `;

    this.modalManager.open({
      title: '👤➕ Registrar Piloto en Escudería',
      contentHtml: formHtml,
      onRender: (container, closeModal) => {
        container.querySelector('#btn-cancel-modal').addEventListener('click', closeModal);
        const form = container.querySelector('#form-driver-crud');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          try {
            const teamId = currentUser.isAdminEscuderia() ? currentUser.escuderiaId : form.querySelector('#drv-escuderia').value;
            const data = {
              nombre: form.querySelector('#drv-nombre').value,
              apellido: form.querySelector('#drv-apellido').value,
              numero: Number(form.querySelector('#drv-numero').value),
              escuderiaId: teamId,
              rol: form.querySelector('#drv-rol').value,
              nacionalidad: form.querySelector('#drv-nacionalidad').value,
              banderaPais: form.querySelector('#drv-bandera').value,
              sigla: form.querySelector('#drv-sigla').value.toUpperCase()
            };

            this.teamDriverService.createDriver(data);
            this.toastNotification.success('Piloto Registrado', 'El piloto ha sido incorporado al plantel oficial.');
            closeModal();
          } catch (err) {
            this.toastNotification.error('Error', err.message);
          }
        });
      }
    });
  }

  handleEditDriver(id) {
    const drivers = this.teamDriverService.getDrivers();
    const driver = drivers.find(d => d.id === id);
    if (!driver) return;

    const teams = this.teamDriverService.getTeams();
    const currentUser = this.authService.getCurrentUser();

    const formHtml = `
      <form id="form-driver-edit" class="crud-form">
        <div class="form-row">
          <div class="form-group flex-1">
            <label for="drv-edit-nombre">Nombre *</label>
            <input type="text" id="drv-edit-nombre" class="form-input" required value="${driver.nombre}">
          </div>
          <div class="form-group flex-1">
            <label for="drv-edit-apellido">Apellido *</label>
            <input type="text" id="drv-edit-apellido" class="form-input" required value="${driver.apellido}">
          </div>
          <div class="form-group" style="width: 100px;">
            <label for="drv-edit-numero">Dorsal *</label>
            <input type="number" id="drv-edit-numero" class="form-input" min="1" max="99" value="${driver.numero}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-2">
            <label for="drv-edit-escuderia">Escudería</label>
            <select id="drv-edit-escuderia" class="form-select" ${currentUser.isAdminEscuderia() ? 'disabled' : ''}>
              ${teams.map(t => `<option value="${t.id}" ${t.id === driver.escuderiaId ? 'selected' : ''}>${t.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="form-group flex-1">
            <label for="drv-edit-rol">Rol *</label>
            <select id="drv-edit-rol" class="form-select">
              <option value="${DRIVER_ROLES.TITULAR}" ${driver.rol === DRIVER_ROLES.TITULAR ? 'selected' : ''}>Piloto Titular</option>
              <option value="${DRIVER_ROLES.SUPLENTE}" ${driver.rol === DRIVER_ROLES.SUPLENTE ? 'selected' : ''}>Piloto Reserva / Suplente</option>
            </select>
          </div>
        </div>

        <div class="modal-actions mt-4">
          <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">Actualizar Piloto</button>
        </div>
      </form>
    `;

    this.modalManager.open({
      title: `✏️ Modificar Piloto: ${driver.nombre} ${driver.apellido}`,
      contentHtml: formHtml,
      onRender: (container, closeModal) => {
        container.querySelector('#btn-cancel-modal').addEventListener('click', closeModal);
        const form = container.querySelector('#form-driver-edit');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          try {
            const teamId = currentUser.isAdminEscuderia() ? currentUser.escuderiaId : form.querySelector('#drv-edit-escuderia').value;
            const data = {
              nombre: form.querySelector('#drv-edit-nombre').value,
              apellido: form.querySelector('#drv-edit-apellido').value,
              numero: Number(form.querySelector('#drv-edit-numero').value),
              escuderiaId: teamId,
              rol: form.querySelector('#drv-edit-rol').value
            };

            this.teamDriverService.updateDriver(id, data);
            this.toastNotification.success('Piloto Actualizado', 'Los datos del piloto han sido actualizados.');
            closeModal();
          } catch (err) {
            this.toastNotification.error('Error', err.message);
          }
        });
      }
    });
  }

  async handleDeleteDriver(id) {
    const drivers = this.teamDriverService.getDrivers();
    const driver = drivers.find(d => d.id === id);
    if (!driver) return;

    const confirmed = await this.modalManager.confirm({
      title: '🗑️ Eliminar Piloto del Plantel',
      message: `¿Está seguro de que desea retirar a <strong>${driver.nombre} ${driver.apellido}</strong> (#${driver.numero})?`,
      confirmText: 'Sí, Eliminar',
      confirmClass: 'btn-danger'
    });

    if (confirmed) {
      try {
        this.teamDriverService.deleteDriver(id);
        this.toastNotification.success('Piloto Eliminado', 'El registro ha sido eliminado del plantel.');
      } catch (err) {
        this.toastNotification.error('Error', err.message);
      }
    }
  }
}
