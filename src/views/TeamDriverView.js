import { BaseView } from './BaseView.js';
import { DRIVER_ROLES } from '../models/Driver.js';

export class TeamDriverView extends BaseView {
  constructor(containerId = 'main-content') {
    super(containerId);
    this.selectedTeamFilter = 'ALL';
  }

  render({ teams = [], drivers = [], cars = [], currentUser }) {
    const container = this.getContainer();
    if (!container) return;

    const canManageDrivers = currentUser.canManageDrivers();

    const filteredDrivers = this.selectedTeamFilter === 'ALL'
      ? drivers
      : drivers.filter(d => d.escuderiaId === this.selectedTeamFilter);

    container.innerHTML = `
      <section class="section-container animate-fade-in" id="teams-section">
        <div class="section-hero">
          <div class="hero-text">
            <div class="hero-badge">PARQUE CERRADO Y ALINEACIONES</div>
            <h2 class="hero-title">Escuderías Oficiales y Registro de Pilotos</h2>
            <p class="hero-subtitle">Registro de pilotos titulares y reservas/suplentes por cada escudería, monoplazas homologados y especificaciones técnicas oficiales FIA 2026.</p>
          </div>
          <div class="hero-actions">
            ${canManageDrivers ? `
              <button class="btn btn-primary btn-glow" id="btn-create-driver">
                <span class="btn-icon">👤➕</span> Registrar Nuevo Piloto
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Selector de Escudería para Filtrar -->
        <div class="filters-bar-card">
          <div class="filter-group category-chips">
            <button class="chip ${this.selectedTeamFilter === 'ALL' ? 'active' : ''}" data-team-filter="ALL">Todas las Escuderías</button>
            ${teams.map(t => `
              <button class="chip ${this.selectedTeamFilter === t.id ? 'active' : ''}" data-team-filter="${t.id}">
                ${this.escapeHTML(t.nombre)}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Escuderías Cards Grid -->
        <div class="teams-grid mb-5">
          ${teams.filter(t => this.selectedTeamFilter === 'ALL' || t.id === this.selectedTeamFilter).map(team => {
            const teamCars = cars.filter(c => c.escuderiaId === team.id);
            return `
              <div class="team-card" style="border-top: 4px solid ${team.colorPrimario || '#e10600'};">
                <div class="team-card-header">
                  <div class="team-identity">
                    <span class="team-color-box" style="background-color: ${team.colorPrimario};"></span>
                    <div>
                      <h3 class="team-name">${this.escapeHTML(team.nombre)}</h3>
                      <span class="team-country">📍 ${this.escapeHTML(team.pais)}</span>
                    </div>
                  </div>
                  <div class="team-points-badge">
                    <span class="points-val">${team.puntosTotales}</span>
                    <span class="points-label">PTS</span>
                  </div>
                </div>

                <div class="team-specs-grid">
                  <div class="spec-row">
                    <span class="spec-label">Director:</span>
                    <span class="spec-val">${this.escapeHTML(team.directorEquipo || '-')}</span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-label">Dir. Técnico:</span>
                    <span class="spec-val">${this.escapeHTML(team.directorTecnico || '-')}</span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-label">Unidad de Potencia:</span>
                    <span class="spec-val">${this.escapeHTML(team.unidadPotencia || '-')}</span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-label">Chasis:</span>
                    <span class="spec-val">${this.escapeHTML(team.chasis || '-')}</span>
                  </div>
                </div>

                <div class="team-cars-list">
                  <span class="subhead-label">Monoplazas Homologados:</span>
                  <div class="cars-chips-group">
                    ${teamCars.map(c => `
                      <span class="car-chip">
                        🏎️ #${c.numeroAuto} (${this.escapeHTML(c.chasisCodigo)})
                      </span>
                    `).join('') || '<span class="text-muted small">Sin monoplazas asignados</span>'}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Lista de Pilotos Registrados -->
        <div class="drivers-roster-section">
          <div class="roster-header">
            <h3 class="section-heading">Plantel Oficial de Pilotos (Titulares y Suplentes)</h3>
            <span class="text-muted">Disponibilidad pública inmediata conforme al reglamento</span>
          </div>

          <div class="drivers-cards-grid">
            ${filteredDrivers.map(driver => {
              const isTitular = driver.rol === DRIVER_ROLES.TITULAR;
              const canEditThisDriver = currentUser.isAdminFIA() ||
                (currentUser.isAdminEscuderia() && currentUser.isAuthorizedForTeam(driver.escuderiaId));

              return `
                <div class="driver-profile-card">
                  <div class="driver-card-header">
                    <span class="driver-number-large">#${driver.numero}</span>
                    <div class="driver-role-indicator ${isTitular ? 'role-titular' : 'role-suplente'}">
                      ${isTitular ? '⭐ Titular' : '🔄 Suplente / Reserva'}
                    </div>
                  </div>

                  <div class="driver-card-body">
                    <div class="driver-main-info">
                      <span class="driver-country-flag">${driver.banderaPais || '🏁'}</span>
                      <h4 class="driver-full-name">${this.escapeHTML(driver.getNombreCompleto ? driver.getNombreCompleto() : `${driver.nombre} ${driver.apellido}`)}</h4>
                    </div>
                    <span class="driver-team-label">${this.escapeHTML(driver.escuderiaNombre)}</span>

                    <div class="driver-stats-row">
                      <div class="stat-box">
                        <span class="stat-num">${driver.puntos}</span>
                        <span class="stat-tag">PUNTOS</span>
                      </div>
                      <div class="stat-box">
                        <span class="stat-num">${driver.victorias || 0}</span>
                        <span class="stat-tag">VICTORIAS</span>
                      </div>
                      <div class="stat-box">
                        <span class="stat-num">${driver.podios || 0}</span>
                        <span class="stat-tag">PODIOS</span>
                      </div>
                    </div>
                  </div>

                  ${canEditThisDriver ? `
                    <div class="driver-card-footer">
                      <button class="btn btn-sm btn-outline btn-edit-driver" data-driver-id="${driver.id}">
                        ✏️ Editar Piloto
                      </button>
                      <button class="btn btn-sm btn-outline-danger btn-delete-driver" data-driver-id="${driver.id}">
                        🗑️
                      </button>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </section>
    `;

    this._bindEvents(drivers, currentUser);
  }

  _bindEvents(drivers, currentUser) {
    const container = this.getContainer();
    if (!container) return;

    container.querySelectorAll('[data-team-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        this.selectedTeamFilter = chip.dataset.teamFilter;
        if (this.onFilterTeam) this.onFilterTeam(this.selectedTeamFilter);
      });
    });

    const createDriverBtn = container.querySelector('#btn-create-driver');
    if (createDriverBtn) {
      createDriverBtn.addEventListener('click', () => {
        if (this.onCreateDriver) this.onCreateDriver();
      });
    }

    container.querySelectorAll('.btn-edit-driver').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.driverId;
        if (this.onEditDriver) this.onEditDriver(id);
      });
    });

    container.querySelectorAll('.btn-delete-driver').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.driverId;
        if (this.onDeleteDriver) this.onDeleteDriver(id);
      });
    });
  }

  setFilterTeamHandler(h) { this.onFilterTeam = h; }
  setCreateDriverHandler(h) { this.onCreateDriver = h; }
  setEditDriverHandler(h) { this.onEditDriver = h; }
  setDeleteDriverHandler(h) { this.onDeleteDriver = h; }
}
