import { BaseView } from './BaseView.js';
import { USER_ROLES } from '../models/User.js';

/**
 * Vista de Gestión de Usuarios y Accesos FIA (US 23)
 * Muestra la nómina de usuarios con filtros, estadísticas y acciones CRUD.
 */
export class UserManagementView extends BaseView {
  constructor(containerId = 'main-content') {
    super(containerId);
    this.searchQuery = '';
    this.selectedRole = 'all';
    this.selectedStatus = 'all';
  }

  render({
    users = [],
    teams = [],
    currentUser
  }) {
    const container = this.getContainer();
    if (!container) return;

    this._lastState = { users, teams, currentUser };

    const fiaCount = users.filter(u => u.isAdminFIA()).length;
    const escuderiaCount = users.filter(u => u.isAdminEscuderia()).length;
    const activeCount = users.filter(u => u.activo).length;

    // Filtrado local
    const filteredUsers = users.filter(user => {
      // Solo mostramos usuarios administrables (FIA y Escudería), o todos si hubiera público
      if (this.selectedRole !== 'all' && user.rol !== this.selectedRole) {
        return false;
      }
      if (this.selectedStatus === 'active' && !user.activo) {
        return false;
      }
      if (this.selectedStatus === 'inactive' && user.activo) {
        return false;
      }
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const matchName = (user.nombre || '').toLowerCase().includes(query);
        const matchUsername = (user.username || '').toLowerCase().includes(query);
        const matchEmail = (user.email || '').toLowerCase().includes(query);
        const matchTeam = (user.escuderiaNombre || '').toLowerCase().includes(query);
        const matchCargo = ((user.cargo || user.cargoEquipo) || '').toLowerCase().includes(query);
        if (!matchName && !matchUsername && !matchEmail && !matchTeam && !matchCargo) {
          return false;
        }
      }
      return true;
    });

    container.innerHTML = `
      <section class="section-container animate-fade-in" id="user-management-section">
        <div class="section-hero">
          <div class="hero-text">
            <div class="hero-badge">ADMINISTRACIÓN DE USUARIOS FIA</div>
            <h2 class="hero-title">Gestión de Usuarios y Credenciales</h2>
            <p class="hero-subtitle">
              Administración de cuentas para responsables de escuderías y personal administrativo de la FIA.
            </p>
          </div>
          <div class="public-notice-pill">Acceso Exclusivo Comisario FIA</div>
        </div>

        <!-- Tarjetas de Resumen Estadístico -->
        <div class="user-stats-grid">
          <div class="stat-card">
            <span class="stat-icon">👥</span>
            <div class="stat-meta">
              <span class="stat-value">${users.length}</span>
              <span class="stat-label">Total de Usuarios</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">⚖️</span>
            <div class="stat-meta">
              <span class="stat-value">${fiaCount}</span>
              <span class="stat-label">Personal FIA</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🏎️</span>
            <div class="stat-meta">
              <span class="stat-value">${escuderiaCount}</span>
              <span class="stat-label">Responsables Escudería</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">✅</span>
            <div class="stat-meta">
              <span class="stat-value">${activeCount}</span>
              <span class="stat-label">Cuentas Activas</span>
            </div>
          </div>
        </div>

        <!-- Tarjeta Principal con Filtros y Tabla -->
        <div class="standings-card mt-4">
          <div class="standings-card-header" style="flex-wrap: wrap; gap: 1rem; align-items: center;">
            <div>
              <h3 class="card-title">Cuentas de Usuarios Registradas</h3>
              <p class="card-subtitle">Personal autorizado para operar en el sistema de calendario y campeonato.</p>
            </div>
            <div class="d-flex gap-2 align-items-center" style="margin-left: auto;">
              <button class="btn btn-primary" id="btn-create-user">
                <span>➕</span> Nuevo Usuario
              </button>
            </div>
          </div>

          <!-- Barra de Búsqueda y Filtros -->
          <div class="user-filters-bar">
            <div class="filter-group-item search-item">
              <label for="user-search-input" class="form-label-sm">Buscar:</label>
              <input
                id="user-search-input"
                type="text"
                class="form-input form-input-sm"
                placeholder="Nombre, usuario, email o escudería..."
                value="${this.escapeHTML(this.searchQuery)}"
              />
            </div>

            <div class="filter-group-item">
              <label for="user-role-filter" class="form-label-sm">Rol:</label>
              <select id="user-role-filter" class="form-select form-select-sm">
                <option value="all" ${this.selectedRole === 'all' ? 'selected' : ''}>Todos los roles</option>
                <option value="${USER_ROLES.ADMIN_FIA}" ${this.selectedRole === USER_ROLES.ADMIN_FIA ? 'selected' : ''}>Personal FIA</option>
                <option value="${USER_ROLES.ADMIN_ESCUDERIA}" ${this.selectedRole === USER_ROLES.ADMIN_ESCUDERIA ? 'selected' : ''}>Responsables Escudería</option>
              </select>
            </div>

            <div class="filter-group-item">
              <label for="user-status-filter" class="form-label-sm">Estado:</label>
              <select id="user-status-filter" class="form-select form-select-sm">
                <option value="all" ${this.selectedStatus === 'all' ? 'selected' : ''}>Todos los estados</option>
                <option value="active" ${this.selectedStatus === 'active' ? 'selected' : ''}>Activos</option>
                <option value="inactive" ${this.selectedStatus === 'inactive' ? 'selected' : ''}>Inactivos</option>
              </select>
            </div>

            ${(this.searchQuery || this.selectedRole !== 'all' || this.selectedStatus !== 'all') ? `
              <button class="btn btn-sm btn-secondary" id="btn-reset-filters" style="align-self: flex-end;">
                Limpiar filtros
              </button>
            ` : ''}
          </div>

          <!-- Tabla de Datos de Usuarios -->
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Cargo / Entidad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${filteredUsers.length === 0 ? `
                  <tr>
                    <td colspan="6" class="text-center py-4" style="color: var(--text-muted);">
                      No se encontraron cuentas de usuario que coincidan con los criterios de búsqueda.
                    </td>
                  </tr>
                ` : filteredUsers.map(user => {
                  const isCurrent = currentUser?.id === user.id;
                  const isFia = user.isAdminFIA();
                  const isEscuderia = user.isAdminEscuderia();

                  let roleBadge = '';
                  if (isFia) {
                    roleBadge = '<span class="badge-role-fia">⚖️ Personal FIA</span>';
                  } else if (isEscuderia) {
                    roleBadge = `<span class="badge-role-team">🏎️ Escudería</span>`;
                  } else {
                    roleBadge = '<span class="badge-role-public">👤 Público</span>';
                  }

                  let detailsText = '';
                  if (isFia) {
                    detailsText = `<strong>${this.escapeHTML(user.cargo || 'Comisario FIA')}</strong><br><small class="text-muted">${this.escapeHTML(user.departamento || '-')} &bull; Lic: ${this.escapeHTML(user.licenciaFIA || '-')}</small>`;
                  } else if (isEscuderia) {
                    detailsText = `<strong>${this.escapeHTML(user.cargoEquipo || 'Team Principal')}</strong><br><small class="text-gold">🏁 ${this.escapeHTML(user.escuderiaNombre || 'Escudería no asignada')}</small>`;
                  } else {
                    detailsText = `<span class="text-muted">Aficionado Internacional</span>`;
                  }

                  return `
                    <tr class="${isCurrent ? 'table-row-highlight' : ''}">
                      <td>
                        <div class="user-table-cell">
                          <img
                            src="${this.escapeHTML(user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.nombre)}`)}"
                            alt="${this.escapeHTML(user.nombre)}"
                            class="user-table-avatar"
                            onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=user'"
                          />
                          <div class="user-table-info">
                            <strong>${this.escapeHTML(user.nombre)}</strong>
                            <small class="text-muted">@${this.escapeHTML(user.username)}${isCurrent ? ' <span class="badge-current-user">(Tú)</span>' : ''}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="user-email-text">${this.escapeHTML(user.email)}</span>
                      </td>
                      <td>${roleBadge}</td>
                      <td>${detailsText}</td>
                      <td>
                        ${user.activo
                          ? '<span class="badge-status badge-status-finished">Activo</span>'
                          : '<span class="badge-status badge-status-cancelled">Inactivo</span>'
                        }
                      </td>
                      <td>
                        <div class="action-buttons-group">
                          <button
                            class="btn btn-sm btn-outline-gold"
                            data-action="edit-user"
                            data-user-id="${user.id}"
                            title="Modificar usuario"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            class="btn btn-sm btn-outline-danger"
                            data-action="delete-user"
                            data-user-id="${user.id}"
                            ${isCurrent ? 'disabled title="No puedes eliminar tu propia cuenta activa"' : 'title="Eliminar usuario"'}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const container = this.getContainer();
    if (!container) return;

    // Botón Crear Usuario
    const createBtn = container.querySelector('#btn-create-user');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        if (this.onCreateUser) this.onCreateUser();
      });
    }

    // Input Búsqueda
    const searchInput = container.querySelector('#user-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render(this._lastState);
        // Mantener foco al final del input tras re-render
        const newSearchInput = this.getContainer()?.querySelector('#user-search-input');
        if (newSearchInput) {
          newSearchInput.focus();
          newSearchInput.setSelectionRange(newSearchInput.value.length, newSearchInput.value.length);
        }
      });
    }

    // Filtro Rol
    const roleFilter = container.querySelector('#user-role-filter');
    if (roleFilter) {
      roleFilter.addEventListener('change', (e) => {
        this.selectedRole = e.target.value;
        this.render(this._lastState);
      });
    }

    // Filtro Estado
    const statusFilter = container.querySelector('#user-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.selectedStatus = e.target.value;
        this.render(this._lastState);
      });
    }

    // Resetear Filtros
    const resetBtn = container.querySelector('#btn-reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.selectedRole = 'all';
        this.selectedStatus = 'all';
        this.render(this._lastState);
      });
    }

    // Botones Editar
    container.querySelectorAll('[data-action="edit-user"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-user-id');
        if (this.onEditUser) this.onEditUser(userId);
      });
    });

    // Botones Eliminar
    container.querySelectorAll('[data-action="delete-user"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-user-id');
        if (this.onDeleteUser) this.onDeleteUser(userId);
      });
    });
  }

  setCreateUserHandler(handler) {
    this.onCreateUser = handler;
  }

  setEditUserHandler(handler) {
    this.onEditUser = handler;
  }

  setDeleteUserHandler(handler) {
    this.onDeleteUser = handler;
  }
}

