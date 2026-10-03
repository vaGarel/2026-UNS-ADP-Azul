import { BaseView } from './BaseView.js';
import { USER_ROLES } from '../models/User.js';

export class NavbarView extends BaseView {
  constructor(containerId = 'navbar-container') {
    super(containerId);
  }

  render({ currentUser, currentSection, availableUsers = [] }) {
    const container = this.getContainer();
    if (!container) return;

    let roleBadgeClass = 'badge-role-public';
    let roleIcon = '👤';
    if (currentUser.isAdminFIA()) {
      roleBadgeClass = 'badge-role-fia';
      roleIcon = '⚖️';
    } else if (currentUser.isAdminEscuderia()) {
      roleBadgeClass = 'badge-role-team';
      roleIcon = '🏎️';
    }

    container.innerHTML = `
      <header class="app-header">
        <div class="header-main-bar">
          <div class="brand-group">
            <div class="fia-logo-emblem">
              <span class="fia-badge-text">FIA</span>
              <span class="fia-year">2026</span>
            </div>
            <div class="brand-titles">
              <h1 class="brand-title">FEDERATION INTERNATIONALE DE L'AUTOMOBILE</h1>
              <span class="brand-subtitle">Official Sports Calendar & Championship Management System</span>
            </div>
          </div>

          <div class="user-session-panel">
            <div class="current-user-badge ${roleBadgeClass}">
              <span class="role-icon">${roleIcon}</span>
              <div class="user-meta">
                <span class="user-name">${this.escapeHTML(currentUser.nombre)}</span>
                <span class="user-role-desc">${this.escapeHTML(currentUser.getRoleLabel ? currentUser.getRoleLabel() : currentUser.rol)}</span>
              </div>
            </div>

            <div class="session-actions">
              <button class="btn btn-sm btn-outline-gold" id="btn-switch-role" title="Cambiar de Rol para Probar Permisos">
                <span class="icon">🔄</span> Cambiar Rol (Demo)
              </button>
            </div>
          </div>
        </div>

        <nav class="navigation-bar">
          <ul class="nav-links">
            <li>
              <button class="nav-tab ${currentSection === 'calendar' ? 'active' : ''}" data-section="calendar">
                <span class="nav-icon">📅</span> Calendario Deportivo
              </button>
            </li>
            <li>
              <button class="nav-tab ${currentSection === 'scores' ? 'active' : ''}" data-section="scores">
                <span class="nav-icon">🏆</span> Puntajes & Campeonato
              </button>
            </li>
            <li>
              <button class="nav-tab ${currentSection === 'teams' ? 'active' : ''}" data-section="teams">
                <span class="nav-icon">🏎️</span> Escuderías & Pilotos
              </button>
            </li>
            <li>
              <button class="nav-tab ${currentSection === 'technical' ? 'active' : ''}" data-section="technical">
                <span class="nav-icon">🛠️</span> Controles Técnicos
              </button>
            </li>
            <li>
              <button class="nav-tab ${currentSection === 'sanctions' ? 'active' : ''}" data-section="sanctions">
                <span class="nav-icon">🚩</span> Sanciones
              </button>
            </li>
            ${!currentUser.isPublico() ? `
            <li>
              <button class="nav-tab ${currentSection === 'messages' ? 'active' : ''}" data-section="messages">
                <span class="nav-icon">💬</span> Mensajería Interna
              </button>
            </li>
            ` : ''}
            ${currentUser.isAdminFIA() ? `
            <li>
              <button class="nav-tab ${currentSection === 'users' ? 'active' : ''}" data-section="users">
                <span class="nav-icon">👥</span> Gestión Usuarios
              </button>
            </li>
            ` : ''}
          </ul>
        </nav>
      </header>
    `;

    this._bindInternalEvents(availableUsers);
  }

  _bindInternalEvents(availableUsers) {
    const container = this.getContainer();
    if (!container) return;

    container.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const section = tab.dataset.section;
        if (this.onNavigate) this.onNavigate(section);
      });
    });

    const switchBtn = container.querySelector('#btn-switch-role');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        if (this.onOpenRoleSwitcher) this.onOpenRoleSwitcher();
      });
    }
  }

  setNavigationHandler(handler) {
    this.onNavigate = handler;
  }

  setRoleSwitcherHandler(handler) {
    this.onOpenRoleSwitcher = handler;
  }
}
