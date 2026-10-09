import { Team } from '../models/Team.js';
import { Driver, DRIVER_ROLES } from '../models/Driver.js';

const TEAM_FIELDS = [
  'nombre', 'nombreCompleto', 'pais', 'sede', 'directorEquipo',
  'directorTecnico', 'chasis', 'unidadPotencia', 'colorPrimario',
  'colorSecundario', 'logoUrl'
];
const DRIVER_FIELDS = [
  'nombre', 'apellido', 'numero', 'sigla', 'nacionalidad',
  'banderaPais', 'escuderiaId', 'rol', 'fechaNacimiento', 'fotoUrl'
];

export class CompetitionProfileService {
  constructor(teamRepository, driverRepository, carRepository, scoreRepository, scoreService, authService, eventEmitter) {
    this.teamRepository = teamRepository;
    this.driverRepository = driverRepository;
    this.carRepository = carRepository;
    this.scoreRepository = scoreRepository;
    this.scoreService = scoreService;
    this.authService = authService;
    this.eventEmitter = eventEmitter;
  }

  createTeam(data) {
    this._assertCanManage();
    const values = this._pickFields(data, TEAM_FIELDS);
    this._validateTeam(values);
    const team = this.teamRepository.create(new Team({ ...values, activo: true }));
    this.eventEmitter.emit('competition:profilesUpdated', { action: 'create-team', team });
    return team;
  }

  updateTeam(id, data) {
    this._assertCanManage();
    const existing = this._requireTeam(id);
    const values = this._pickFields(data, TEAM_FIELDS);
    this._validateTeam({ ...existing, ...values }, id);
    const updated = this.teamRepository.update(id, values);
    this._syncTeamName(updated);
    this.eventEmitter.emit('competition:profilesUpdated', { action: 'update-team', team: updated });
    return updated;
  }

  setTeamActive(id, active) {
    this._assertCanManage();
    if (typeof active !== 'boolean') throw new Error('El estado del equipo no es válido.');
    const team = this.teamRepository.update(id, { activo: active });
    this.eventEmitter.emit('competition:profilesUpdated', { action: 'team-status', team });
    return team;
  }

  deleteTeam(id) {
    this._assertCanManage();
    const team = this._requireTeam(id);
    this.scoreRepository.deleteByTeam(id);
    this.teamRepository.delete(id);
    this.scoreService.recalculateChampionshipStandings();
    this.eventEmitter.emit('competition:profilesUpdated', { action: 'delete-team', teamId: id });
    this.eventEmitter.emit('scores:updated', { action: 'profile-deletion', teamId: id });
    return team;
  }

  createDriver(data) {
    this._assertCanManage();
    const values = this._pickFields(data, DRIVER_FIELDS);
    this._validateDriver(values);
    const team = this.teamRepository.getById(values.escuderiaId);
    const driver = this.driverRepository.create(new Driver({
      ...values,
      escuderiaNombre: team.nombre,
      activo: true,
      puntos: 0,
      podios: 0,
      victorias: 0,
      campeonatos: 0
    }));
    this.eventEmitter.emit('competition:profilesUpdated', { action: 'create-driver', driver });
    return driver;
  }

  updateDriver(id, data) {
    this._assertCanManage();
    const existing = this._requireDriver(id);
    const values = this._pickFields(data, DRIVER_FIELDS);
    this._validateDriver({ ...existing, ...values }, id);
    const team = this.teamRepository.getById(values.escuderiaId || existing.escuderiaId);
    const updated = this.driverRepository.update(id, {
      ...values,
      escuderiaNombre: team?.nombre || existing.escuderiaNombre
    });
    this._syncDriverCars(updated);
    this.eventEmitter.emit('competition:profilesUpdated', { action: 'update-driver', driver: updated });
    return updated;
  }

  setDriverActive(id, active) {
    this._assertCanManage();
    if (typeof active !== 'boolean') throw new Error('El estado del piloto no es válido.');
    const driver = this.driverRepository.update(id, { activo: active });
    this.eventEmitter.emit('competition:profilesUpdated', { action: 'driver-status', driver });
    return driver;
  }

  deleteDriver(id) {
    this._assertCanManage();
    const driver = this._requireDriver(id);
    this.scoreRepository.deleteByDriver(id);
    this.driverRepository.delete(id);
    this.scoreService.recalculateChampionshipStandings();
    this.eventEmitter.emit('competition:profilesUpdated', { action: 'delete-driver', driverId: id });
    this.eventEmitter.emit('scores:updated', { action: 'profile-deletion', driverId: id });
    return driver;
  }

  _validateTeam(data, currentId = null) {
    if (typeof data.nombre !== 'string' || !data.nombre.trim()) {
      throw new Error('El nombre del equipo es obligatorio.');
    }
    const normalizedName = data.nombre.trim().toLocaleLowerCase();
    const duplicate = this.teamRepository.findOne(team =>
      team.id !== currentId && team.nombre.trim().toLocaleLowerCase() === normalizedName
    );
    if (duplicate) throw new Error('Ya existe un equipo con ese nombre.');
  }

  _validateDriver(data, currentId = null) {
    if (typeof data.nombre !== 'string' || !data.nombre.trim() ||
        typeof data.apellido !== 'string' || !data.apellido.trim()) {
      throw new Error('El nombre y el apellido del piloto son obligatorios.');
    }

    const number = Number(data.numero);
    if (!Number.isInteger(number) || number < 1 || number > 99) {
      throw new Error('El número de piloto debe ser un entero entre 1 y 99.');
    }
    if (data.rol && !Object.values(DRIVER_ROLES).includes(data.rol)) {
      throw new Error('Seleccione un rol de piloto válido.');
    }

    const team = this.teamRepository.getById(data.escuderiaId);
    const currentDriver = currentId ? this.driverRepository.getById(currentId) : null;
    if (!team || (!team.activo && currentDriver?.escuderiaId !== team.id)) {
      throw new Error('Seleccione un equipo activo existente.');
    }

    const duplicateNumber = this.driverRepository.findOne(driver =>
      driver.id !== currentId && driver.activo && driver.numero === number
    );
    if (duplicateNumber) throw new Error('Ese número ya está asignado a otro piloto activo.');
  }

  _syncTeamName(team) {
    this.driverRepository.getByTeam(team.id).forEach(driver => {
      this.driverRepository.update(driver.id, { escuderiaNombre: team.nombre });
    });
    this.carRepository.getByTeam(team.id).forEach(car => {
      this.carRepository.update(car.id, { escuderiaNombre: team.nombre });
    });
  }

  _syncDriverCars(driver) {
    this.carRepository.find(car => car.pilotoId === driver.id).forEach(car => {
      this.carRepository.update(car.id, {
        pilotoNombre: driver.getNombreCompleto(),
        escuderiaId: driver.escuderiaId,
        escuderiaNombre: driver.escuderiaNombre
      });
    });
  }

  _requireTeam(id) {
    const team = this.teamRepository.getById(id);
    if (!team) throw new Error(`Equipo con ID ${id} no encontrado.`);
    return team;
  }

  _requireDriver(id) {
    const driver = this.driverRepository.getById(id);
    if (!driver) throw new Error(`Piloto con ID ${id} no encontrado.`);
    return driver;
  }

  _pickFields(data, allowedFields) {
    return Object.fromEntries(allowedFields
      .filter(field => data?.[field] !== undefined)
      .map(field => [field, typeof data[field] === 'string' ? data[field].trim() : data[field]]));
  }

  _assertCanManage() {
    const user = this.authService.getCurrentUser();
    if (!user?.canManageCompetitionProfiles()) {
      throw new Error('Permiso denegado: solo el personal FIA puede gestionar perfiles de competición.');
    }
  }
}
