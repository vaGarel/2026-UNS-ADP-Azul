import { BaseView } from './BaseView.js';
import { DateFormatter } from '../utils/DateFormatter.js';
import { USER_ROLES } from '../models/User.js';

export class UserAdminView extends BaseView {
  constructor(containerId = 'main-content') {
    super(containerId);
  }

  render({ users = [], currentUser, teams = [] }) {
    const container = this.getContainer();
    if (!container) return;

    const isFIA = currentUser.isAdminFIA();

    container.innerHTML = `
      <section class="section-container animate-fade-in" id="user-admin-section">
        <div class="section-hero">
          <div class="hero-text">
            <div class="hero-badge">DIRECCIÓN GENERAL DE ACCESO FIA</div>
            <h2 class="hero-title">Administración de Usuarios y Perfiles</h2>
            <p class="hero-subtitle">Gestión centralizada de cuentas de usuario, asignación de permisos para administradores de escuderías, directivos FIA y público.</p>
          </div>
          <div class="hero-actions">
            ${isFIA ? `
              <button class="btn btn-primary btn-glow" id="btn-create-user">
                <span class="btn-icon">👤➕</span> Crear Nueva Cuenta de Usuario
              </button>
            ` : ''}
          </div>
        </div>

        <div class="table-responsive-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol / Permiso</th>
                <th>Entidad / Escudería</th>
                <th>Email de Contacto</th>
                <th>Estado</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => {
                let roleBadge = '<span class="badge-status badge-status-scheduled">Público</span>';
                if (u.rol === USER_ROLES.ADMIN_FIA) roleBadge = '<span class="badge-role-fia px-2 py-1 rounded">⚖️ Admin FIA</span>';
                if (u.rol === USER_ROLES.ADMIN_ESCUDERIA) roleBadge = '<span class="badge-role-team px-2 py-1 rounded">🏎️ Admin Escudería</span>';

                const isMe = u.id === currentUser.id;

                return `
                  <tr>
                    <td>
                      <div class="user-identity-cell">
                        <img src="${u.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + u.nombre}" alt="${u.nombre}" class="user-avatar-small">
                        <div>
                          <strong>${this.escapeHTML(u.nombre)}</strong>
                          ${isMe ? '<span class="badge-pill badge-pill-titular ml-1">Tú (Activo)</span>' : ''}
                        </div>
                      </div>
                    </td>
                    <td>${roleBadge}</td>
                    <td>${this.escapeHTML(u.escuderiaNombre || u.departamento || 'Acceso Abierto')}</td>
                    <td><code>${this.escapeHTML(u.email)}</code></td>
                    <td>
                      <span class="badge-status ${u.activo ? 'badge-status-finished' : 'badge-status-danger'}">
                        ${u.activo ? 'Activo' : 'Suspendido'}
                      </span>
                    </td>
                    <td class="text-right">
                      ${!isMe ? `
                        <button class="btn btn-sm btn-outline-danger btn-delete-user" data-user-id="${u.id}">
                          🗑️ Eliminar
                        </button>
                      ` : '<span class="text-muted small">Sesión Activa</span>'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const container = this.getContainer();
    if (!container) return;

    const createBtn = container.querySelector('#btn-create-user');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        if (this.onCreateUser) this.onCreateUser();
      });
    }

    container.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.userId;
        if (this.onDeleteUser) this.onDeleteUser(id);
      });
    });
  }

  setCreateHandler(h) { this.onCreateUser = h; }
  setDeleteHandler(h) { this.onDeleteUser = h; }
}
