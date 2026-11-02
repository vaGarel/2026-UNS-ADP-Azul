import { USER_ROLES } from '../models/User.js';

/**
 * Controlador de Gestión de Usuarios y Accesos FIA (US 23)
 * Coordina la vista de administración, los modales interactivos y el servicio de usuarios.
 */
export class UserManagementController {
  constructor(
    userService,
    teamRepository,
    authService,
    userManagementView,
    modalManager,
    toastNotification,
    eventEmitter
  ) {
    this.userService = userService;
    this.teamRepository = teamRepository;
    this.authService = authService;
    this.view = userManagementView;
    this.modalManager = modalManager;
    this.toastNotification = toastNotification;
    this.eventEmitter = eventEmitter;

    this._bindViewHandlers();
    this.eventEmitter.on('users:updated', () => this.render());
  }

  render() {
    try {
      const users = this.userService.getAllUsers();
      const teams = this.teamRepository.getAll();
      const currentUser = this.authService.getCurrentUser();

      this.view.render({
        users,
        teams,
        currentUser
      });
    } catch (error) {
      console.error('Error al renderizar Gestión de Usuarios:', error);
      this.toastNotification.error('Acceso denegado', error.message);
    }
  }

  _bindViewHandlers() {
    this.view.setCreateUserHandler(() => this.openUserModal());
    this.view.setEditUserHandler(userId => this.openUserModal(userId));
    this.view.setDeleteUserHandler(userId => this.deleteUser(userId));
  }

  openUserModal(userId = null) {
    const isEdit = Boolean(userId);
    let existing = null;

    if (isEdit) {
      try {
        existing = this.userService.getUserById(userId);
      } catch (error) {
        this.toastNotification.error('Usuario no encontrado', error.message);
        return;
      }
      if (!existing) {
        this.toastNotification.error('Usuario inexistente', 'El usuario seleccionado ya no se encuentra en el sistema.');
        return;
      }
    }

    const teams = this.teamRepository.getAll().filter(t => t.activo);
    const escape = value => this.view.escapeHTML(value || '');

    const initialRole = existing ? existing.rol : USER_ROLES.ADMIN_ESCUDERIA;
    const isInitialFia = initialRole === USER_ROLES.ADMIN_FIA;

    const modalTitle = isEdit
      ? `Editar Usuario: ${escape(existing.nombre)}`
      : 'Crear Nueva Cuenta de Usuario';

    const formHtml = `
      <form id="user-management-form" class="crud-form">
        <div id="modal-inline-error" class="login-error mb-3" style="display: none;"></div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label for="user-form-name">Nombre Completo *</label>
            <input
              id="user-form-name"
              type="text"
              class="form-input"
              required
              placeholder="ej. Frédéric Vasseur"
              value="${escape(existing?.nombre)}"
            />
          </div>

          <div class="form-group flex-1">
            <label for="user-form-username">Nombre de Usuario (@username) *</label>
            <input
              id="user-form-username"
              type="text"
              class="form-input"
              required
              placeholder="ej. ferrari_team"
              value="${escape(existing?.username)}"
            />
            <small class="form-hint">Letras, números, guiones y guiones bajos (mín. 3 caracteres).</small>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label for="user-form-email">Correo Electrónico Oficial *</label>
            <input
              id="user-form-email"
              type="email"
              class="form-input"
              required
              placeholder="ej. fvasseur@ferrari.com"
              value="${escape(existing?.email)}"
            />
          </div>

          <div class="form-group flex-1">
            <label for="user-form-role">Rol en el Sistema *</label>
            <select id="user-form-role" class="form-select" required ${isEdit && existing?.isAdminFIA() && this.authService.getCurrentUser()?.id === existing.id ? 'disabled title="No puedes cambiar tu propio rol"' : ''}>
              <option value="${USER_ROLES.ADMIN_ESCUDERIA}" ${!isInitialFia ? 'selected' : ''}>Responsable de Escudería</option>
              <option value="${USER_ROLES.ADMIN_FIA}" ${isInitialFia ? 'selected' : ''}>Personal Administrativo FIA (Comisario)</option>
            </select>
          </div>
        </div>

        <!-- Campos Específicos para Responsable de Escudería -->
        <div id="escuderia-fields-group" style="${isInitialFia ? 'display: none;' : ''}">
          <div class="form-row">
            <div class="form-group flex-1">
              <label for="user-form-team">Escudería Asignada *</label>
              <select id="user-form-team" class="form-select">
                <option value="">-- Seleccionar Escudería --</option>
                ${teams.map(team => `
                  <option value="${escape(team.id)}" ${existing?.escuderiaId === team.id ? 'selected' : ''}>
                    ${escape(team.nombre)} (${escape(team.pais)})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="form-group flex-1">
              <label for="user-form-team-cargo">Cargo en la Escudería</label>
              <input
                id="user-form-team-cargo"
                type="text"
                class="form-input"
                placeholder="ej. Team Principal & CEO"
                value="${escape(existing?.cargoEquipo || '')}"
              />
            </div>
          </div>
        </div>

        <!-- Campos Específicos para Personal FIA -->
        <div id="fia-fields-group" style="${!isInitialFia ? 'display: none;' : ''}">
          <div class="form-row">
            <div class="form-group flex-1">
              <label for="user-form-cargo">Cargo Oficial FIA</label>
              <input
                id="user-form-cargo"
                type="text"
                class="form-input"
                placeholder="ej. Comisario Deportivo FIA"
                value="${escape(existing?.cargo || '')}"
              />
            </div>

            <div class="form-group flex-1">
              <label for="user-form-department">Departamento</label>
              <input
                id="user-form-department"
                type="text"
                class="form-input"
                placeholder="ej. Dirección de Carrera y Reglamentación"
                value="${escape(existing?.departamento || '')}"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="user-form-licence">Licencia o Credencial FIA</label>
            <input
              id="user-form-licence"
              type="text"
              class="form-input"
              placeholder="ej. FIA-SUPER-COMM-2026"
              value="${escape(existing?.licenciaFIA || '')}"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label for="user-form-password">
              Contraseña de Acceso ${isEdit ? '<span class="text-muted">(Opcional: solo si desea cambiarla)</span>' : '*'}
            </label>
            <input
              id="user-form-password"
              type="password"
              class="form-input"
              ${isEdit ? '' : 'required'}
              placeholder="${isEdit ? 'Dejar en blanco para mantener la actual' : 'Mínimo 6 caracteres'}"
            />
            <small class="form-hint">Mínimo 6 caracteres para autenticación segura.</small>
          </div>

          <div class="form-group flex-1 d-flex flex-column justify-content-center pt-3">
            <label class="custom-checkbox-label">
              <input
                id="user-form-active"
                type="checkbox"
                ${(existing ? existing.activo : true) ? 'checked' : ''}
              />
              <span class="checkbox-text">Cuenta activa (permite iniciar sesión)</span>
            </label>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-user-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-user-modal">
            ${isEdit ? '💾 Guardar Cambios' : '➕ Crear Cuenta'}
          </button>
        </div>
      </form>
    `;

    this.modalManager.open({
      title: modalTitle,
      contentHtml: formHtml,
      customClass: 'modal-lg',
      onRender: (container, closeModal) => {
        const form = container.querySelector('#user-management-form');
        const roleSelect = container.querySelector('#user-form-role');
        const fiaFields = container.querySelector('#fia-fields-group');
        const escuderiaFields = container.querySelector('#escuderia-fields-group');
        const errorAlert = container.querySelector('#modal-inline-error');
        const cancelBtn = container.querySelector('#btn-cancel-user-modal');

        cancelBtn.addEventListener('click', closeModal);

        roleSelect.addEventListener('change', (e) => {
          const selected = e.target.value;
          if (selected === USER_ROLES.ADMIN_FIA) {
            fiaFields.style.display = 'block';
            escuderiaFields.style.display = 'none';
          } else {
            fiaFields.style.display = 'none';
            escuderiaFields.style.display = 'block';
          }
        });

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          errorAlert.style.display = 'none';
          errorAlert.textContent = '';

          const roleValue = roleSelect.value;
          const payload = {
            nombre: container.querySelector('#user-form-name').value.trim(),
            username: container.querySelector('#user-form-username').value.trim(),
            email: container.querySelector('#user-form-email').value.trim(),
            rol: roleValue,
            activo: container.querySelector('#user-form-active').checked
          };

          const passwordValue = container.querySelector('#user-form-password').value;
          if (passwordValue) {
            payload.password = passwordValue;
          }

          if (roleValue === USER_ROLES.ADMIN_FIA) {
            payload.cargo = container.querySelector('#user-form-cargo').value.trim();
            payload.departamento = container.querySelector('#user-form-department').value.trim();
            payload.licenciaFIA = container.querySelector('#user-form-licence').value.trim();
          } else if (roleValue === USER_ROLES.ADMIN_ESCUDERIA) {
            payload.escuderiaId = container.querySelector('#user-form-team').value;
            payload.cargoEquipo = container.querySelector('#user-form-team-cargo').value.trim();
          }

          try {
            if (isEdit) {
              await this.userService.updateUser(userId, payload);
              this.toastNotification.success('Usuario actualizado', `Se modificó la cuenta de "${payload.nombre}" correctamente.`);
            } else {
              await this.userService.createUser(payload);
              this.toastNotification.success('Usuario creado', `Se creó la cuenta para "${payload.nombre}" exitosamente.`);
            }
            closeModal();
          } catch (error) {
            console.error('Error al guardar usuario:', error);
            errorAlert.textContent = error.message;
            errorAlert.style.display = 'block';
            this.toastNotification.error('Error de validación', error.message);
          }
        });
      }
    });
  }

  async deleteUser(userId) {
    let targetUser = null;
    try {
      targetUser = this.userService.getUserById(userId);
    } catch (error) {
      this.toastNotification.error('Acceso denegado', error.message);
      return;
    }

    if (!targetUser) return;

    const confirmed = await this.modalManager.confirm({
      title: 'Eliminar Cuenta de Usuario',
      message: `¿Está seguro de que desea eliminar permanentemente la cuenta de "${targetUser.nombre}" (@${targetUser.username})? El usuario ya no podrá autenticarse ni operar en el sistema.`,
      confirmText: 'Eliminar Cuenta',
      confirmClass: 'btn-danger'
    });

    if (!confirmed) return;

    try {
      this.userService.deleteUser(userId);
      this.toastNotification.success(
        'Usuario eliminado',
        `La cuenta de "${targetUser.nombre}" fue eliminada correctamente.`
      );
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      this.toastNotification.error('No se pudo eliminar el usuario', error.message);
    }
  }
}

