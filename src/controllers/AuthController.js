import { USER_ROLES } from '../models/User.js';

export class AuthController {
  constructor(authService, modalManager, toastNotification, eventEmitter) {
    this.authService = authService;
    this.modalManager = modalManager;
    this.toastNotification = toastNotification;
    this.eventEmitter = eventEmitter;
  }

  openRoleSwitcherModal() {
    const users = this.authService.getAvailableUsers();
    const currentUser = this.authService.getCurrentUser();

    const roleCardsHtml = users.map(u => {
      const isSelected = u.id === currentUser.id;
      let badge = 'Public Fan';
      let icon = '👤';
      if (u.rol === USER_ROLES.ADMIN_FIA) {
        badge = 'Administrador FIA';
        icon = '⚖️';
      } else if (u.rol === USER_ROLES.ADMIN_ESCUDERIA) {
        badge = `Admin Escudería (${u.escuderiaNombre})`;
        icon = '🏎️';
      }

      return `
        <div class="role-select-card ${isSelected ? 'selected' : ''}" data-user-id="${u.id}">
          <div class="role-select-header">
            <span class="role-badge-icon">${icon}</span>
            <div class="role-card-info">
              <h4>${u.nombre}</h4>
              <span class="role-badge-tag">${badge}</span>
            </div>
            ${isSelected ? '<span class="active-check">✓ En Uso</span>' : ''}
          </div>
          <div class="role-permissions-list">
            <small class="text-muted">
              ${u.rol === USER_ROLES.ADMIN_FIA
                ? '• Gestión total de calendario deportivo oficial y registro/modificación de puntajes de carrera.'
                : (u.rol === USER_ROLES.ADMIN_ESCUDERIA
                  ? `• Consulta del calendario y asentado formal de notificaciones oficiales de puntajes para ${u.escuderiaNombre}.`
                  : '• Consulta y visualización del calendario deportivo, clasificación de campeonato y descarga de eventos.')}
            </small>
          </div>
          <button class="btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'} btn-select-role w-100 mt-2">
            ${isSelected ? 'Sesión Actual' : 'Cambiar a este Rol'}
          </button>
        </div>
      `;
    }).join('');

    const contentHtml = `
      <div class="role-switcher-modal-content">
        <p class="mb-3 text-muted">
          Seleccione una cuenta de usuario para evaluar en tiempo real cómo cambia la interfaz, las vistas permitidas y las autorizaciones CRUD según los requerimientos del Enunciado 1 de la FIA.
        </p>
        <div class="roles-grid">
          ${roleCardsHtml}
        </div>
        <div class="modal-actions mt-4">
          <button class="btn btn-secondary" id="btn-close-switcher">Cerrar</button>
        </div>
      </div>
    `;

    this.modalManager.open({
      title: '🔄 Selector Dinámico de Roles y Permisos (Demo Sprint 0)',
      contentHtml,
      onRender: (container, closeModal) => {
        container.querySelector('#btn-close-switcher').addEventListener('click', closeModal);

        container.querySelectorAll('.role-select-card').forEach(card => {
          card.addEventListener('click', () => {
            const userId = card.dataset.userId;
            if (userId !== currentUser.id) {
              const newUser = this.authService.switchUser(userId);
              this.toastNotification.success('Rol Cambiado', `Ahora estás navegando como "${newUser.nombre}" (${newUser.rol}).`);
              closeModal();
            }
          });
        });
      }
    });
  }
}
