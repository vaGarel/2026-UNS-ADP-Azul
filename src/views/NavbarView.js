import { BaseView } from './BaseView.js';

export class NavbarView extends BaseView {
  constructor(containerId = 'navbar-container') {
    super(containerId);
  }

  render({ currentUser, currentSection }) {
    const container = this.getContainer();
    if (!container) return;
    if (!currentUser) {
      container.innerHTML = '';
      return;
    }

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
                <span class="user-name">${this.escapeHTML(currentUser.username)}</span>
                <span class="user-role-desc">${this.escapeHTML(currentUser.getRoleLabel ? currentUser.getRoleLabel() : currentUser.rol)}</span>
              </div>
            </div>

            <div class="session-actions">
              <button class="btn btn-sm btn-outline-gold" id="btn-logout" title="Cerrar sesión">
                Cerrar sesión
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
              <button class="nav-tab ${currentSection === 'competition' ? 'active' : ''}" data-section="competition">
                <span class="nav-icon">🏎️</span> Competition
              </button>
            </li>
          </ul>
        </nav>
      </header>
    `;

    this._bindInternalEvents();
  }

  _bindInternalEvents() {
    const container = this.getContainer();
    if (!container) return;

    container.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const section = tab.dataset.section;
        if (this.onNavigate) this.onNavigate(section);
      });
    });

    const logoutBtn = container.querySelector('#btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (this.onLogout) this.onLogout();
      });
    }
  }

  setNavigationHandler(handler) {
    this.onNavigate = handler;
  }

  setLogoutHandler(handler) {
    this.onLogout = handler;
  }
}
