import { DRIVER_ROLES } from '../models/Driver.js';
import { INSPECTION_OUTCOMES, INSPECTION_TYPES } from '../models/TechnicalInspection.js';

export class CompetitionManagementController {
  constructor(
    profileService,
    inspectionService,
    teamRepository,
    driverRepository,
    carRepository,
    authService,
    view,
    modalManager,
    toastNotification,
    eventEmitter
  ) {
    this.profileService = profileService;
    this.inspectionService = inspectionService;
    this.teamRepository = teamRepository;
    this.driverRepository = driverRepository;
    this.carRepository = carRepository;
    this.authService = authService;
    this.view = view;
    this.modalManager = modalManager;
    this.toastNotification = toastNotification;
    this.eventEmitter = eventEmitter;

    this._bindViewHandlers();
    this.eventEmitter.on('competition:profilesUpdated', () => this.render());
    this.eventEmitter.on('competition:inspectionsUpdated', () => this.render());
  }

  render() {
    this.view.render({
      teams: this.teamRepository.getAll(),
      drivers: this.driverRepository.getAll(),
      cars: this.carRepository.getAll(),
      inspections: this.inspectionService.getAll(),
      currentUser: this.authService.getCurrentUser()
    });
  }

  _bindViewHandlers() {
    this.view.setTabHandler(() => this.render());
    this.view.setCreateProfileHandler(type => this.openProfileForm(type));
    this.view.setEditProfileHandler((type, id) => this.openProfileForm(type, id));
    this.view.setToggleProfileHandler((type, id, action) => this.toggleProfile(type, id, action));
    this.view.setDeleteProfileHandler((type, id) => this.deleteProfile(type, id));
    this.view.setOpenCarHandler(() => this.render());
    this.view.setBackToCarsHandler(() => this.render());
    this.view.setCreateInspectionHandler(carId => this.openInspectionForm(carId));
    this.view.setOpenInspectionHandler(() => this.render());
    this.view.setBackToInspectionsHandler(() => this.render());
    this.view.setEditInspectionHandler(id => this.openInspectionForm(null, id));
    this.view.setDeleteInspectionHandler(id => this.deleteInspection(id));
  }

  openProfileForm(type, id = null) {
    const existing = id
      ? (type === 'team' ? this.teamRepository.getById(id) : this.driverRepository.getById(id))
      : null;
    if (id && !existing) {
      this.toastNotification.error('Perfil inexistente', 'El perfil seleccionado ya no está disponible.');
      return;
    }

    const isTeam = type === 'team';
    const profileType = isTeam ? 'equipo' : 'piloto';
    const title = existing
      ? `Editar perfil de ${profileType}`
      : `Crear perfil de ${profileType}`;
    const formHtml = isTeam ? this._teamForm(existing) : this._driverForm(existing);

    this.modalManager.open({
      title,
      contentHtml: formHtml,
      onRender: (container, closeModal) => {
        container.querySelector('#btn-cancel-profile').addEventListener('click', closeModal);
        container.querySelector('#competition-profile-form').addEventListener('submit', event => {
          event.preventDefault();
          const values = Object.fromEntries(new FormData(event.currentTarget).entries());
          try {
            if (isTeam) {
              if (existing) this.profileService.updateTeam(existing.id, values);
              else this.profileService.createTeam(values);
            } else {
              if (existing) this.profileService.updateDriver(existing.id, values);
              else this.profileService.createDriver(values);
            }
            this.toastNotification.success('Perfil guardado', `Se actualizó el perfil del ${profileType}.`);
            closeModal();
          } catch (error) {
            this.toastNotification.error('No se pudo guardar el perfil', error.message);
          }
        });
      }
    });
  }

  _teamForm(team) {
    const escape = value => this.view.escapeHTML(value || '');
    const field = (name, label, value = '', required = false) => `
      <div class="form-group">
        <label for="profile-${name}">${label}${required ? ' *' : ''}</label>
        <input id="profile-${name}" name="${name}" class="form-input" value="${escape(value)}" ${required ? 'required' : ''}>
      </div>`;
    return `
      <form id="competition-profile-form" class="crud-form">
        ${field('nombre', 'Nombre visible', team?.nombre, true)}
        ${field('nombreCompleto', 'Nombre completo', team?.nombreCompleto)}
        ${field('pais', 'País', team?.pais)}
        ${field('sede', 'Sede', team?.sede)}
        ${field('directorEquipo', 'Director del equipo', team?.directorEquipo)}
        ${field('directorTecnico', 'Director técnico', team?.directorTecnico)}
        ${field('chasis', 'Chasis', team?.chasis)}
        ${field('unidadPotencia', 'Unidad de potencia', team?.unidadPotencia)}
        ${field('colorPrimario', 'Color primario', team?.colorPrimario)}
        ${field('colorSecundario', 'Color secundario', team?.colorSecundario)}
        ${field('logoUrl', 'URL del logotipo', team?.logoUrl)}
        <p class="text-muted">Los puntos del campeonato se calculan a partir de los resultados de carrera.</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-profile">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar equipo</button>
        </div>
      </form>
    `;
  }

  _driverForm(driver) {
    const escape = value => this.view.escapeHTML(value || '');
    const field = (name, label, value = '', required = false, type = 'text') => `
      <div class="form-group">
        <label for="profile-${name}">${label}${required ? ' *' : ''}</label>
        <input id="profile-${name}" name="${name}" type="${type}" class="form-input" value="${escape(value)}" ${required ? 'required' : ''}>
      </div>`;
    const teams = this.teamRepository.getAll().filter(team =>
      team.activo || team.id === driver?.escuderiaId
    );
    return `
      <form id="competition-profile-form" class="crud-form">
        ${field('nombre', 'Nombre', driver?.nombre, true)}
        ${field('apellido', 'Apellido', driver?.apellido, true)}
        ${field('numero', 'Número de piloto', driver?.numero ?? '', true, 'number')}
        ${field('sigla', 'Sigla', driver?.sigla)}
        ${field('nacionalidad', 'Nacionalidad', driver?.nacionalidad)}
        ${field('banderaPais', 'Bandera del país', driver?.banderaPais)}
        <div class="form-group">
          <label for="profile-escuderiaId">Equipo *</label>
          <select id="profile-escuderiaId" name="escuderiaId" class="form-select" required>
            <option value="">Seleccione un equipo</option>
            ${teams.map(team => `<option value="${escape(team.id)}" ${team.id === driver?.escuderiaId ? 'selected' : ''}>${escape(team.nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="profile-rol">Rol del piloto</label>
          <select id="profile-rol" name="rol" class="form-select">
            <option value="${DRIVER_ROLES.TITULAR}" ${driver?.rol === DRIVER_ROLES.TITULAR ? 'selected' : ''}>${DRIVER_ROLES.TITULAR}</option>
            <option value="${DRIVER_ROLES.SUPLENTE}" ${driver?.rol === DRIVER_ROLES.SUPLENTE ? 'selected' : ''}>${DRIVER_ROLES.SUPLENTE}</option>
          </select>
        </div>
        ${field('fechaNacimiento', 'Fecha de nacimiento', driver?.fechaNacimiento, false, 'date')}
        ${field('fotoUrl', 'URL de la foto', driver?.fotoUrl)}
        <p class="text-muted">Los puntos, victorias y podios se calculan a partir de los resultados de carrera.</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-profile">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar piloto</button>
        </div>
      </form>
    `;
  }

  async toggleProfile(type, id, action) {
    const archive = action === 'archive';
    const confirmed = await this.modalManager.confirm({
      title: `${archive ? 'Archivar' : 'Restaurar'} perfil de ${type === 'team' ? 'equipo' : 'piloto'}`,
      message: archive
        ? 'El perfil y su historial seguirán disponibles, pero dejará de aparecer en las clasificaciones activas y en la carga de nuevos resultados.'
        : 'El perfil volverá a las clasificaciones activas y estará disponible al cargar nuevos resultados.',
      confirmText: archive ? 'Archivar perfil' : 'Restaurar perfil',
      confirmClass: archive ? 'btn-outline-warning' : 'btn-primary'
    });
    if (!confirmed) return;

    try {
      if (type === 'team') this.profileService.setTeamActive(id, !archive);
      else this.profileService.setDriverActive(id, !archive);
      this.toastNotification.success('Estado actualizado', `Se ${archive ? 'archivó' : 'restauró'} el perfil.`);
    } catch (error) {
      this.toastNotification.error('No se pudo actualizar el perfil', error.message);
    }
  }

  async deleteProfile(type, id) {
    const profile = type === 'team'
      ? this.teamRepository.getById(id)
      : this.driverRepository.getById(id);
    if (!profile) return;

    const confirmed = await this.modalManager.confirm({
      title: `Eliminar definitivamente perfil de ${type === 'team' ? 'equipo' : 'piloto'}`,
      message: 'Se eliminará el perfil y su historial de resultados directamente asociado. Se conservarán los demás perfiles, autos, inspecciones y carreras.',
      confirmText: 'Eliminar definitivamente',
      confirmClass: 'btn-danger'
    });
    if (!confirmed) return;

    try {
      if (type === 'team') this.profileService.deleteTeam(id);
      else this.profileService.deleteDriver(id);
      this.toastNotification.success('Perfil eliminado', 'Se eliminó el perfil y su historial de resultados asociado.');
    } catch (error) {
      this.toastNotification.error('No se pudo eliminar el perfil', error.message);
    }
  }

  openInspectionForm(carId, inspectionId = null) {
    const inspection = inspectionId ? this.inspectionService.getById(inspectionId) : null;
    if (inspectionId && !inspection) {
      this.toastNotification.error('Inspección inexistente', 'El registro seleccionado ya no está disponible.');
      return;
    }
    const selectedCarId = inspection?.autoId || carId;
    const cars = this.carRepository.getAll();
    const escape = value => this.view.escapeHTML(value || '');
    const types = Object.values(INSPECTION_TYPES);
    const outcomes = Object.values(INSPECTION_OUTCOMES);
    const formHtml = `
      <form id="technical-inspection-form" class="crud-form">
        <div class="form-group">
          <label for="inspection-car">Auto *</label>
          <select id="inspection-car" class="form-select" required ${inspection ? 'disabled' : ''}>
            ${cars.map(car => `<option value="${escape(car.id)}" ${car.id === selectedCarId ? 'selected' : ''}>#${car.numeroAuto} ${escape(car.modelo)} — ${escape(car.escuderiaNombre)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="inspection-date">Fecha *</label>
          <input id="inspection-date" type="date" class="form-input" value="${escape(inspection?.fecha || new Date().toISOString().slice(0, 10))}" required>
        </div>
        <div class="form-group">
          <label for="inspection-type">Tipo *</label>
          <select id="inspection-type" class="form-select" required>
            ${types.map(type => `<option value="${escape(type)}" ${type === inspection?.tipoInspeccion ? 'selected' : ''}>${escape(type)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="inspection-outcome">Resultado *</label>
          <select id="inspection-outcome" class="form-select" required>
            ${outcomes.map(outcome => `<option value="${escape(outcome)}" ${outcome === inspection?.resultado ? 'selected' : ''}>${escape(outcome)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="inspection-notes">Observaciones</label>
          <textarea id="inspection-notes" class="form-textarea" rows="3">${escape(inspection?.observaciones)}</textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-inspection">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar inspección</button>
        </div>
      </form>
    `;

    this.modalManager.open({
      title: inspection ? 'Editar inspección técnica' : 'Registrar inspección técnica',
      contentHtml: formHtml,
      onRender: (container, closeModal) => {
        container.querySelector('#btn-cancel-inspection').addEventListener('click', closeModal);
        container.querySelector('#technical-inspection-form').addEventListener('submit', event => {
          event.preventDefault();
          const values = {
            autoId: container.querySelector('#inspection-car').value,
            fecha: container.querySelector('#inspection-date').value,
            tipoInspeccion: container.querySelector('#inspection-type').value,
            resultado: container.querySelector('#inspection-outcome').value,
            observaciones: container.querySelector('#inspection-notes').value.trim()
          };
          try {
            if (inspection) this.inspectionService.update(inspection.id, values);
            else this.inspectionService.create(values);
            this.toastNotification.success('Inspección guardada', 'Se guardó el registro de inspección técnica.');
            closeModal();
          } catch (error) {
            this.toastNotification.error('No se pudo guardar la inspección', error.message);
          }
        });
      }
    });
  }

  async deleteInspection(id) {
    const inspection = this.inspectionService.getById(id);
    if (!inspection) return;
    const confirmed = await this.modalManager.confirm({
      title: 'Eliminar registro de inspección',
      message: `¿Eliminar definitivamente la inspección "${inspection.tipoInspeccion}" del ${inspection.fecha}?`,
      confirmText: 'Eliminar inspección',
      confirmClass: 'btn-danger'
    });
    if (!confirmed) return;
    try {
      this.inspectionService.delete(id);
      this.toastNotification.success('Inspección eliminada', 'Se eliminó el registro de inspección.');
    } catch (error) {
      this.toastNotification.error('No se pudo eliminar la inspección', error.message);
    }
  }
}
