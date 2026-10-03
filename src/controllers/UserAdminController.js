import { USER_ROLES } from '../models/User.js';

export class UserAdminController {
  constructor(
    userAdminService,
    teamRepository,
    authService,
    userAdminView,
    modalManager,
    toastNotification,
    eventEmitter
  ) {
    this.userAdminService = userAdminService;
    this.teamRepository = teamRepository;
    this.authService = authService;
    this.userAdminView = userAdminView;
    this.modalManager = modalManager;
    this.toastNotification = toastNotification;
    this.eventEmitter = eventEmitter;

    this._bindViewHandlers();
    this._subscribeToEvents();
  }

  _bindViewHandlers() {
    this.userAdminView.setCreateHandler(() => this.handleCreateUser());
    this.userAdminView.setDeleteHandler((id) => this.handleDeleteUser(id));
  }

  _subscribeToEvents() {
    this.eventEmitter.on('users:updated', () => this.refreshView());
    this.eventEmitter.on('auth:userChanged', () => this.refreshView());
  }

  render() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser.isAdminFIA()) return;

    const users = this.userAdminService.getUsers();
    const teams = this.teamRepository.getAll();
    this.userAdminView.render({ users, currentUser, teams });
  }

  refreshView() {
    this.render();
  }

  handleCreateUser() {
    const teams = this.teamRepository.getAll();

    const formHtml = `
      <form id="form-user-crud" class="crud-form">
        <div class="form-row">
          <div class="form-group flex-2">
            <label for="usr-nombre">Nombre y Apellido *</label>
            <input type="text" id="usr-nombre" class="form-input" required placeholder="Ej. Toto Wolff">
          </div>
          <div class="form-group flex-2">
            <label for="usr-email">Email Corporativo / Oficial *</label>
            <input type="email" id="usr-email" class="form-input" required placeholder="ejemplo@mercedesf1.com">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label for="usr-rol">Rol del Usuario *</label>
            <select id="usr-rol" class="form-select">
              <option value="${USER_ROLES.ADMIN_ESCUDERIA}">Administrativo de Escudería</option>
              <option value="${USER_ROLES.ADMIN_FIA}">Personal Administrativo de la FIA</option>
              <option value="${USER_ROLES.PUBLICO}">Público General / Espectador</option>
            </select>
          </div>
          <div class="form-group flex-1" id="group-team-assign">
            <label for="usr-team">Escudería Asignada</label>
            <select id="usr-team" class="form-select">
              ${teams.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="modal-actions mt-4">
          <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">Crear Cuenta</button>
        </div>
      </form>
    `;

    this.modalManager.open({
      title: '👤➕ Crear Nueva Cuenta de Usuario',
      contentHtml: formHtml,
      onRender: (container, closeModal) => {
        container.querySelector('#btn-cancel-modal').addEventListener('click', closeModal);
        const form = container.querySelector('#form-user-crud');
        const rolSelect = form.querySelector('#usr-rol');
        const teamGroup = form.querySelector('#group-team-assign');

        rolSelect.addEventListener('change', () => {
          if (rolSelect.value === USER_ROLES.ADMIN_ESCUDERIA) {
            teamGroup.style.display = 'block';
          } else {
            teamGroup.style.display = 'none';
          }
        });

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          try {
            const teamId = form.querySelector('#usr-team').value;
            const team = teams.find(t => t.id === teamId);
            const data = {
              nombre: form.querySelector('#usr-nombre').value,
              email: form.querySelector('#usr-email').value,
              rol: rolSelect.value,
              escuderiaId: rolSelect.value === USER_ROLES.ADMIN_ESCUDERIA ? teamId : null,
              escuderiaNombre: rolSelect.value === USER_ROLES.ADMIN_ESCUDERIA && team ? team.nombre : ''
            };

            this.userAdminService.createUser(data);
            this.toastNotification.success('Usuario Creado', 'La cuenta ha sido dada de alta.');
            closeModal();
          } catch (err) {
            this.toastNotification.error('Error', err.message);
          }
        });
      }
    });
  }

  async handleDeleteUser(id) {
    const confirmed = await this.modalManager.confirm({
      title: '🗑️ Eliminar Usuario',
      message: '¿Está seguro de que desea eliminar permanentemente este perfil de usuario?',
      confirmText: 'Sí, Eliminar Cuenta'
    });

    if (confirmed) {
      try {
        this.userAdminService.deleteUser(id);
        this.toastNotification.success('Usuario Eliminado', 'La cuenta ha sido revocada.');
      } catch (err) {
        this.toastNotification.error('Error', err.message);
      }
    }
  }
}
