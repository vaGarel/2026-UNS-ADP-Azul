import { BaseView } from './BaseView.js';
import { INSPECTION_OUTCOMES } from '../models/TechnicalInspection.js';

export class CompetitionManagementView extends BaseView {
  constructor(containerId = 'main-content') {
    super(containerId);
    this.activeTab = 'teams';
    this.selectedCarId = null;
    this.selectedInspectionId = null;
  }

  render({ teams = [], drivers = [], cars = [], inspections = [], currentUser }) {
    const container = this.getContainer();
    if (!container) return;

    const canManageProfiles = currentUser.canManageCompetitionProfiles();
    const canManageInspections = currentUser.canManageCarInspections();
    container.innerHTML = `
      <section class="section-container animate-fade-in" id="competition-management">
        <div class="section-hero">
          <div class="hero-text">
            <div class="hero-badge">ADMINISTRACIÓN DE COMPETICIÓN FIA</div>
            <h2 class="hero-title">Equipos, pilotos e inspecciones técnicas</h2>
            <p class="hero-subtitle">Perfiles de competición e historial técnico de los autos.</p>
          </div>
          ${canManageProfiles ? '<div class="public-notice-pill">Acceso de gestión FIA</div>' : ''}
        </div>

        <div class="scores-tab-bar" aria-label="Datos de competición">
          <button class="score-tab-btn ${this.activeTab === 'teams' ? 'active' : ''}" data-management-tab="teams">Equipos</button>
          <button class="score-tab-btn ${this.activeTab === 'drivers' ? 'active' : ''}" data-management-tab="drivers">Pilotos</button>
          <button class="score-tab-btn ${this.activeTab === 'cars' ? 'active' : ''}" data-management-tab="cars">Autos e inspecciones</button>
        </div>

        ${this.activeTab === 'teams' ? this._renderTeams(teams, canManageProfiles) : ''}
        ${this.activeTab === 'drivers' ? this._renderDrivers(drivers, teams, canManageProfiles) : ''}
        ${this.activeTab === 'cars' ? this._renderCars(cars, inspections, teams, canManageInspections) : ''}
      </section>
    `;

    this._bindEvents();
  }

  _renderTeams(teams, canManage) {
    return `
      <div class="standings-card">
        <div class="standings-card-header">
          <h3 class="card-title">Perfiles de equipos</h3>
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
                <td>${team.activo ? 'Activo' : 'Archivado'}</td>
                <td class="points-cell">${team.puntosTotales} PTS</td>
                ${canManage ? `<td>${this._profileActions('team', team)}</td>` : ''}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  _renderDrivers(drivers, teams, canManage) {
    const teamById = new Map(teams.map(team => [team.id, team]));
    return `
      <div class="standings-card">
        <div class="standings-card-header">
          <h3 class="card-title">Perfiles de pilotos</h3>
          ${canManage ? '<button class="btn btn-primary" data-create-profile="driver">Agregar piloto</button>' : ''}
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>Piloto</th><th>Número</th><th>Equipo</th><th>Rol</th><th>Estado</th><th>Puntos de campeonato</th>${canManage ? '<th>Acciones</th>' : ''}</tr></thead>
            <tbody>${drivers.map(driver => `
              <tr>
                <td><strong>${this.escapeHTML(driver.getNombreCompleto())}</strong></td>
                <td>#${driver.numero}</td>
                <td>${this.escapeHTML(teamById.get(driver.escuderiaId)?.nombre || driver.escuderiaNombre || 'Equipo eliminado')}</td>
                <td>${this.escapeHTML(driver.rol)}</td>
                <td>${driver.activo ? 'Activo' : 'Archivado'}</td>
                <td class="points-cell">${driver.puntos} PTS</td>
                ${canManage ? `<td>${this._profileActions('driver', driver)}</td>` : ''}
              </tr>`).join('')}
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

  _renderCars(cars, inspections, teams, canManage) {
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
      return this._renderCars(cars, inspections, teams, canManage);
    }

    if (this.selectedInspectionId) {
      const inspection = inspections.find(item => item.id === this.selectedInspectionId);
      if (inspection) return this._renderInspectionDetail(car, inspection, canManage);
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
              <thead><tr><th>Fecha</th><th>Tipo de inspección</th><th>Resultado</th><th></th></tr></thead>
              <tbody>${carInspections.map(item => `
                <tr>
                  <td>${this.escapeHTML(item.fecha)}</td>
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

  _renderInspectionDetail(car, inspection, canManage) {
    return `
      <div class="standings-card">
        <div class="standings-card-header">
          <div>
            <button class="btn btn-sm btn-outline" data-back-inspections>← Inspecciones</button>
            <h3 class="card-title mt-2">Detalle de inspección</h3>
          </div>
          ${canManage ? `
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline" data-edit-inspection="${inspection.id}">Editar</button>
              <button class="btn btn-sm btn-outline-danger" data-delete-inspection="${inspection.id}">Eliminar</button>
            </div>` : ''}
        </div>
        <dl class="inspection-details">
          <div><dt>Auto</dt><dd>#${car.numeroAuto} ${this.escapeHTML(car.modelo)}</dd></div>
          <div><dt>Fecha de inspección</dt><dd>${this.escapeHTML(inspection.fecha)}</dd></div>
          <div><dt>Tipo</dt><dd>${this.escapeHTML(inspection.tipoInspeccion)}</dd></div>
          <div><dt>Resultado</dt><dd>${this.escapeHTML(inspection.resultado)}</dd></div>
          <div><dt>Observaciones</dt><dd>${this.escapeHTML(inspection.observaciones || 'Sin observaciones registradas.')}</dd></div>
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
}
