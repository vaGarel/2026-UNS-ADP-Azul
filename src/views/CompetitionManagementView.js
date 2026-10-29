import { BaseView } from './BaseView.js';
import { INSPECTION_OUTCOMES } from '../models/TechnicalInspection.js';

export class CompetitionManagementView extends BaseView {
  constructor(containerId = 'main-content') {
    super(containerId);
    this.activeTab = 'teams';
    this.selectedCarId = null;
    this.selectedInspectionId = null;
    this.selectedTeamFilter = 'all';
  }

  render({
    teams = [],
    drivers = [],
    cars = [],
    inspections = [],
    sanctions = [],
    currentUser
  }) {
    const container = this.getContainer();
    if (!container) return;

    this._lastState = { teams, drivers, cars, inspections, sanctions, currentUser };

    const canManageTeams = currentUser.canManageCompetitionProfiles();
    const canManageInspections = currentUser.canManageCarInspections();
    const canManageSanctions = currentUser.canManageSanctions();
    const canViewConfidential = currentUser.canViewConfidentialTechnicalObservations();

    container.innerHTML = `
      <section class="section-container animate-fade-in" id="competition-management">
        <div class="section-hero">
          <div class="hero-text">
            <div class="hero-badge">ADMINISTRACIÓN DE COMPETICIÓN FIA</div>
            <h2 class="hero-title">Equipos, pilotos, inspecciones técnicas y sanciones</h2>
            <p class="hero-subtitle">Gestión oficial de perfiles de escuderías, pilotos titulares y suplentes, historial técnico y penalizaciones deportivas.</p>
          </div>
          ${canManageTeams ? '<div class="public-notice-pill">Acceso Comisario FIA</div>' : (currentUser.isAdminEscuderia() ? '<div class="public-notice-pill">Panel de Escudería</div>' : '<div class="public-notice-pill">Consulta Pública</div>')}
        </div>

        <div class="scores-tab-bar" aria-label="Datos de competición">
          <button class="score-tab-btn ${this.activeTab === 'teams' ? 'active' : ''}" data-management-tab="teams">🏎️ Equipos</button>
          <button class="score-tab-btn ${this.activeTab === 'drivers' ? 'active' : ''}" data-management-tab="drivers">👤 Pilotos</button>
          <button class="score-tab-btn ${this.activeTab === 'cars' ? 'active' : ''}" data-management-tab="cars">🔧 Autos e inspecciones</button>
          <button class="score-tab-btn ${this.activeTab === 'sanctions' ? 'active' : ''}" data-management-tab="sanctions">⚖️ Sanciones</button>
        </div>

        ${this.activeTab === 'teams' ? this._renderTeams(teams, canManageTeams) : ''}
        ${this.activeTab === 'drivers' ? this._renderDrivers(drivers, teams, currentUser) : ''}
        ${this.activeTab === 'cars' ? this._renderCars(cars, inspections, teams, canManageInspections, canViewConfidential) : ''}
        ${this.activeTab === 'sanctions' ? this._renderSanctions(sanctions, canManageSanctions) : ''}
      </section>
    `;

    this._bindEvents();
  }

  _renderTeams(teams, canManage) {
    return `
      <div class="standings-card">
        <div class="standings-card-header">
          <div>
            <h3 class="card-title">Perfiles de equipos</h3>
            <p class="card-subtitle">Registro oficial de escuderías del Campeonato Mundial 2026.</p>
          </div>
          ${canManage ? '<button class="btn btn-primary" data-create-profile="team">Agregar equipo</button>' : ''}
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>Equipo</th><th>País</th><th>Director</th><th>Estado</th><th>Puntos de campeonato</th>${canManage ? '<th>Acciones</th>' : ''}</tr></thead>
            <tbody>${teams.map(team => `
              <tr>
                <td><strong>${this.escapeHTML(team.nombre)}</strong><br><small>${this.escapeHTML(team.nombreCompleto)}</small></td>
                <td>${this.escapeHTML(team.pais)}</td>
                <td>${this.escapeHTML(team.directorEquipo || '-')}</td>
                <td>${team.activo ? '<span class="badge-status badge-status-finished">Activo</span>' : '<span class="badge-status badge-status-cancelled">Archivado</span>'}</td>
                <td class="points-cell">${team.puntosTotales} PTS</td>
                ${canManage ? `<td>${this._profileActions('team', team)}</td>` : ''}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  _renderDrivers(drivers, teams, currentUser) {
    const teamById = new Map(teams.map(team => [team.id, team]));
    const canAddDriver = currentUser.isAdminEscuderia();

    let filteredDrivers = drivers;
    if (this.selectedTeamFilter !== 'all') {
      filteredDrivers = drivers.filter(d => d.escuderiaId === this.selectedTeamFilter);
    }

    return `
      <div class="standings-card">
        <div class="standings-card-header" style="flex-wrap: wrap; gap: 1rem;">
          <div>
            <h3 class="card-title">Perfiles y nómina de pilotos</h3>
            <p class="card-subtitle">Listado organizado de pilotos titulares y de reserva por escudería.</p>
          </div>
          <div class="d-flex gap-2 align-items-center" style="margin-left: auto;">
            <label for="driver-team-filter" class="form-label mb-0" style="white-space: nowrap; font-size: 0.85rem; color: var(--color-gold);">Filtrar por equipo:</label>
            <select id="driver-team-filter" class="form-select form-select-sm" data-driver-team-filter style="max-width: 220px;">
              <option value="all" ${this.selectedTeamFilter === 'all' ? 'selected' : ''}>Todos los equipos</option>
              ${teams.map(team => `
                <option value="${this.escapeHTML(team.id)}" ${this.selectedTeamFilter === team.id ? 'selected' : ''}>
                  ${this.escapeHTML(team.nombre)}
                </option>
              `).join('')}
            </select>
            ${canAddDriver ? '<button class="btn btn-primary" data-create-profile="driver">+ Agregar piloto (Escudería)</button>' : ''}
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Piloto</th>
                <th>Número</th>
                <th>Equipo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Puntos</th>
                ${canAddDriver ? '<th>Acciones</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${filteredDrivers.length ? filteredDrivers.map(driver => {
                const canManageThisDriver = currentUser.isAdminEscuderia() && driver.escuderiaId === currentUser.escuderiaId;
                const isTitular = driver.isTitular ? driver.isTitular() : driver.rol === 'Piloto Titular';

                return `
                  <tr>
                    <td>
                      <div class="d-flex align-items-center gap-2">
                        <span style="font-size: 1.2rem;">${this.escapeHTML(driver.banderaPais || '🏁')}</span>
                        <div>
                          <strong>${this.escapeHTML(driver.getNombreCompleto ? driver.getNombreCompleto() : `${driver.nombre} ${driver.apellido}`)}</strong>
                          <span class="badge" style="background: rgba(255,255,255,0.08); font-size: 0.75rem; margin-left: 0.35rem;">${this.escapeHTML(driver.sigla || '')}</span>
                        </div>
                      </div>
                    </td>
                    <td><strong style="color: var(--color-gold); font-size: 1.05rem;">#${driver.numero}</strong></td>
                    <td>${this.escapeHTML(teamById.get(driver.escuderiaId)?.nombre || driver.escuderiaNombre || 'Equipo eliminado')}</td>
                    <td>
                      <span class="badge-status ${isTitular ? 'badge-status-finished' : 'badge-status-scheduled'}" style="font-weight: 600;">
                        ${isTitular ? '★ Titular' : '⏱️ Suplente / Reserva'}
                      </span>
                    </td>
                    <td>${driver.activo ? '<span class="text-success">Activo</span>' : '<span class="text-muted">Archivado</span>'}</td>
                    <td class="points-cell">${driver.puntos || 0} PTS</td>
                    ${canAddDriver ? `
                      <td>
                        ${canManageThisDriver ? this._profileActions('driver', driver) : ''}
                      </td>
                    ` : ''}
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="${canAddDriver ? 7 : 6}" class="text-center text-muted py-4">No hay pilotos registrados para el filtro seleccionado.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  _renderSanctions(sanctions, canManage) {
    return `
      <div class="standings-card">
        <div class="standings-card-header">
          <div>
            <h3 class="card-title">Registro oficial de penalizaciones y sanciones</h3>
            <p class="card-subtitle">Sanciones impuestas por los comisarios deportivos de la FIA a pilotos y escuderías.</p>
          </div>
          ${canManage ? '<button class="btn btn-primary" data-create-sanction>+ Registrar sanción (FIA)</button>' : ''}
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Gran Premio</th>
                <th>Piloto sancionado</th>
                <th>Escudería</th>
                <th>Sanción aplicada</th>
                <th>Motivo de la infracción</th>
                <th>Puntos carnet</th>
                <th>Estado</th>
                ${canManage ? '<th>Acciones</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${sanctions.length ? sanctions.map(s => `
                <tr>
                  <td>${this.escapeHTML(s.fecha)}</td>
                  <td><strong>${this.escapeHTML(s.granPremio || 'Gran Premio Oficial')}</strong></td>
                  <td><strong>${this.escapeHTML(s.pilotoNombre)}</strong></td>
                  <td>${this.escapeHTML(s.escuderiaNombre || '-')}</td>
                  <td><span class="badge-status badge-status-scheduled" style="background: rgba(225,6,0,0.15); color: #ff6b6b; border: 1px solid rgba(225,6,0,0.4);">${this.escapeHTML(s.tipoSancion)}</span></td>
                  <td>${this.escapeHTML(s.motivo)}</td>
                  <td>${s.puntosPenalizacion > 0 ? `<strong class="text-danger">+${s.puntosPenalizacion} pts</strong>` : '0 pts'}</td>
                  <td><span class="badge-status badge-status-finished">${this.escapeHTML(s.estado || 'Aplicada')}</span></td>
                  ${canManage ? `
                    <td>
                      <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline" data-edit-sanction="${s.id}">Editar</button>
                        <button class="btn btn-sm btn-outline-danger" data-delete-sanction="${s.id}">Eliminar</button>
                      </div>
                    </td>
                  ` : ''}
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="${canManage ? 9 : 8}" class="text-center text-muted py-4">No hay sanciones registradas en la temporada.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  _profileActions(type, profile) {
    const action = profile.activo ? 'archive' : 'restore';
    return `
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline" data-profile-edit="${type}:${profile.id}">Editar</button>
        <button class="btn btn-sm btn-outline-warning" data-profile-toggle="${type}:${profile.id}:${action}">${action === 'archive' ? 'Archivar' : 'Restaurar'}</button>
        <button class="btn btn-sm btn-outline-danger" data-profile-delete="${type}:${profile.id}">Eliminar</button>
      </div>
    `;
  }

  _renderCars(cars, inspections, teams, canManage, canViewConfidential) {
    if (!this.selectedCarId) {
      const teamById = new Map(teams.map(team => [team.id, team]));
      return `
        <div class="standings-card">
          <div class="standings-card-header"><h3 class="card-title">Autos y equipos asociados</h3></div>
          <div class="table-responsive">
            <table class="data-table">
              <thead><tr><th>Auto</th><th>Modelo / chasis</th><th>Equipo</th><th>Piloto asignado</th><th>Estado técnico</th><th></th></tr></thead>
              <tbody>${cars.map(car => `
                <tr>
                  <td><strong>#${car.numeroAuto}</strong></td>
                  <td>${this.escapeHTML(car.modelo)}<br><small>${this.escapeHTML(car.chasisCodigo)}</small></td>
                  <td>${this.escapeHTML(teamById.get(car.escuderiaId)?.nombre || car.escuderiaNombre || 'Equipo eliminado')}</td>
                  <td>${this.escapeHTML(car.pilotoNombre || '-')}</td>
                  <td>${this.escapeHTML(car.estado)}</td>
                  <td><button class="btn btn-sm btn-outline" data-open-car="${car.id}">Ver inspecciones</button></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    const car = cars.find(item => item.id === this.selectedCarId);
    if (!car) {
      this.selectedCarId = null;
      this.selectedInspectionId = null;
      return this._renderCars(cars, inspections, teams, canManage, canViewConfidential);
    }

    if (this.selectedInspectionId) {
      const inspection = inspections.find(item => item.id === this.selectedInspectionId);
      if (inspection) return this._renderInspectionDetail(car, inspection, canManage, canViewConfidential);
      this.selectedInspectionId = null;
    }

    const carInspections = inspections.filter(item => item.autoId === car.id)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    return `
      <div class="standings-card">
        <div class="standings-card-header">
          <div>
            <button class="btn btn-sm btn-outline" data-back-cars>← Autos</button>
            <h3 class="card-title mt-2">Auto #${car.numeroAuto} — ${this.escapeHTML(car.modelo)}</h3>
            <p class="card-subtitle">${this.escapeHTML(teams.find(team => team.id === car.escuderiaId)?.nombre || car.escuderiaNombre || 'Equipo eliminado')} · ${this.escapeHTML(car.pilotoNombre || 'Sin piloto asignado')}</p>
          </div>
          ${canManage ? '<button class="btn btn-primary" data-create-inspection>Registrar inspección</button>' : ''}
        </div>
        ${carInspections.length ? `
          <div class="table-responsive">
            <table class="data-table">
              <thead><tr><th>Fecha</th><th>Gran Premio</th><th>Tipo de inspección</th><th>Resultado</th><th></th></tr></thead>
              <tbody>${carInspections.map(item => `
                <tr>
                  <td>${this.escapeHTML(item.fecha)}</td>
                  <td>${this.escapeHTML(item.granPremio || 'Gran Premio Oficial')}</td>
                  <td>${this.escapeHTML(item.tipoInspeccion)}</td>
                  <td><span class="badge-status ${item.resultado === INSPECTION_OUTCOMES.PASS ? 'badge-status-finished' : 'badge-status-scheduled'}">${this.escapeHTML(item.resultado)}</span></td>
                  <td><button class="btn btn-sm btn-outline" data-open-inspection="${item.id}">Ver detalle</button></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>` : '<div class="empty-state-card"><p>Este auto todavía no tiene inspecciones técnicas registradas.</p></div>'}
      </div>
    `;
  }

  _renderInspectionDetail(car, inspection, canManage, canViewConfidential) {
    return `
      <div class="standings-card">
        <div class="standings-card-header">
          <div>
            <button class="btn btn-sm btn-outline" data-back-inspections>← Inspecciones</button>
            <h3 class="card-title mt-2">Detalle de inspección técnica</h3>
          </div>
          ${canManage ? `
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline" data-edit-inspection="${inspection.id}">Editar</button>
              <button class="btn btn-sm btn-outline-danger" data-delete-inspection="${inspection.id}">Eliminar</button>
            </div>` : ''}
        </div>
        <dl class="inspection-details">
          <div><dt>Auto</dt><dd>#${car.numeroAuto} ${this.escapeHTML(car.modelo)}</dd></div>
          <div><dt>Gran Premio</dt><dd>${this.escapeHTML(inspection.granPremio || 'Control Técnico General FIA')}</dd></div>
          <div><dt>Fecha de inspección</dt><dd>${this.escapeHTML(inspection.fecha)}</dd></div>
          <div><dt>Tipo</dt><dd>${this.escapeHTML(inspection.tipoInspeccion)}</dd></div>
          <div><dt>Resultado</dt><dd><span class="badge-status ${inspection.resultado === INSPECTION_OUTCOMES.PASS ? 'badge-status-finished' : 'badge-status-scheduled'}">${this.escapeHTML(inspection.resultado)}</span></dd></div>
          <div>
            <dt>Observaciones técnicas</dt>
            <dd>
              ${canViewConfidential
                ? this.escapeHTML(inspection.observaciones || 'Sin observaciones técnicas registradas.')
                : '<span class="text-muted"><em>[Información técnica reservada para la FIA y Escuderías]</em></span>'}
            </dd>
          </div>
        </dl>
      </div>
    `;
  }

  _bindEvents() {
    const container = this.getContainer();
    if (!container) return;

    container.querySelectorAll('[data-management-tab]').forEach(button => {
      button.addEventListener('click', () => {
        this.activeTab = button.dataset.managementTab;
        this.selectedCarId = null;
        this.selectedInspectionId = null;
        this.onTabChange?.(this.activeTab);
      });
    });

    const filterSelect = container.querySelector('[data-driver-team-filter]');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.selectedTeamFilter = e.target.value;
        if (this._lastState) {
          this.render(this._lastState);
        }
      });
    }

    container.querySelectorAll('[data-create-profile]').forEach(button => {
      button.addEventListener('click', () => this.onCreateProfile?.(button.dataset.createProfile));
    });
    container.querySelectorAll('[data-profile-edit]').forEach(button => {
      const [type, id] = button.dataset.profileEdit.split(':');
      button.addEventListener('click', () => this.onEditProfile?.(type, id));
    });
    container.querySelectorAll('[data-profile-toggle]').forEach(button => {
      const [type, id, action] = button.dataset.profileToggle.split(':');
      button.addEventListener('click', () => this.onToggleProfile?.(type, id, action));
    });
    container.querySelectorAll('[data-profile-delete]').forEach(button => {
      const [type, id] = button.dataset.profileDelete.split(':');
      button.addEventListener('click', () => this.onDeleteProfile?.(type, id));
    });
    container.querySelectorAll('[data-open-car]').forEach(button => {
      button.addEventListener('click', () => {
        this.selectedCarId = button.dataset.openCar;
        this.selectedInspectionId = null;
        this.onOpenCar?.(this.selectedCarId);
      });
    });
    container.querySelector('[data-back-cars]')?.addEventListener('click', () => {
      this.selectedCarId = null;
      this.selectedInspectionId = null;
      this.onBackToCars?.();
    });
    container.querySelector('[data-create-inspection]')?.addEventListener('click', () => {
      this.onCreateInspection?.(this.selectedCarId);
    });
    container.querySelectorAll('[data-open-inspection]').forEach(button => {
      button.addEventListener('click', () => {
        this.selectedInspectionId = button.dataset.openInspection;
        this.onOpenInspection?.(this.selectedInspectionId);
      });
    });
    container.querySelector('[data-back-inspections]')?.addEventListener('click', () => {
      this.selectedInspectionId = null;
      this.onBackToInspections?.(this.selectedCarId);
    });
    container.querySelector('[data-edit-inspection]')?.addEventListener('click', button => {
      this.onEditInspection?.(button.currentTarget.dataset.editInspection);
    });
    container.querySelector('[data-delete-inspection]')?.addEventListener('click', button => {
      this.onDeleteInspection?.(button.currentTarget.dataset.deleteInspection);
    });

    // Sanction events
    container.querySelector('[data-create-sanction]')?.addEventListener('click', () => {
      this.onCreateSanction?.();
    });
    container.querySelectorAll('[data-edit-sanction]').forEach(button => {
      button.addEventListener('click', () => {
        this.onEditSanction?.(button.dataset.editSanction);
      });
    });
    container.querySelectorAll('[data-delete-sanction]').forEach(button => {
      button.addEventListener('click', () => {
        this.onDeleteSanction?.(button.dataset.deleteSanction);
      });
    });
  }

  setTabHandler(handler) { this.onTabChange = handler; }
  setCreateProfileHandler(handler) { this.onCreateProfile = handler; }
  setEditProfileHandler(handler) { this.onEditProfile = handler; }
  setToggleProfileHandler(handler) { this.onToggleProfile = handler; }
  setDeleteProfileHandler(handler) { this.onDeleteProfile = handler; }
  setOpenCarHandler(handler) { this.onOpenCar = handler; }
  setBackToCarsHandler(handler) { this.onBackToCars = handler; }
  setCreateInspectionHandler(handler) { this.onCreateInspection = handler; }
  setOpenInspectionHandler(handler) { this.onOpenInspection = handler; }
  setBackToInspectionsHandler(handler) { this.onBackToInspections = handler; }
  setEditInspectionHandler(handler) { this.onEditInspection = handler; }
  setDeleteInspectionHandler(handler) { this.onDeleteInspection = handler; }
  setCreateSanctionHandler(handler) { this.onCreateSanction = handler; }
  setEditSanctionHandler(handler) { this.onEditSanction = handler; }
  setDeleteSanctionHandler(handler) { this.onDeleteSanction = handler; }
}
