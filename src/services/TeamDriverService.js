import { Driver, DRIVER_ROLES } from '../models/Driver.js';
import { Team } from '../models/Team.js';
import { Car } from '../models/Car.js';

/**
 * Servicio de Negocio para Escuderías y Pilotos (Titulares y Suplentes)
 */
export class TeamDriverService {
  constructor(teamRepository, driverRepository, carRepository, authService, eventEmitter) {
    this.teamRepository = teamRepository;
    this.driverRepository = driverRepository;
    this.carRepository = carRepository;
    this.authService = authService;
    this.eventEmitter = eventEmitter;
  }

  getTeams() {
    return this.teamRepository.getStandings();
  }

  getTeamById(teamId) {
    return this.teamRepository.getById(teamId);
  }

  getDrivers(teamId = null) {
    if (teamId && teamId !== 'ALL') {
      return this.driverRepository.getByTeam(teamId);
    }
    return this.driverRepository.getStandings();
  }

  getCars(teamId = null) {
    if (teamId && teamId !== 'ALL') {
      return this.carRepository.getByTeam(teamId);
    }
    return this.carRepository.getAll();
  }

  createDriver(driverData) {
    this._assertCanManageDriversForTeam(driverData.escuderiaId);

    const team = this.teamRepository.getById(driverData.escuderiaId);
    if (!team) throw new Error('Escudería seleccionada no existe.');

    const newDriver = new Driver({
      ...driverData,
      escuderiaNombre: team.nombre
    });

    const saved = this.driverRepository.create(newDriver);
    this.eventEmitter.emit('drivers:updated', { action: 'create', driver: saved });
    return saved;
  }

  updateDriver(id, updatedData) {
    const existing = this.driverRepository.getById(id);
    if (!existing) throw new Error(`Piloto con ID ${id} no encontrado.`);

    this._assertCanManageDriversForTeam(existing.escuderiaId);

    if (updatedData.escuderiaId && updatedData.escuderiaId !== existing.escuderiaId) {
      const team = this.teamRepository.getById(updatedData.escuderiaId);
      if (team) updatedData.escuderiaNombre = team.nombre;
    }

    const saved = this.driverRepository.update(id, updatedData);
    this.eventEmitter.emit('drivers:updated', { action: 'update', driver: saved });
    return saved;
  }

  deleteDriver(id) {
    const existing = this.driverRepository.getById(id);
    if (!existing) throw new Error(`Piloto con ID ${id} no encontrado.`);

    this._assertCanManageDriversForTeam(existing.escuderiaId);

    const success = this.driverRepository.delete(id);
    if (success) {
      this.eventEmitter.emit('drivers:updated', { action: 'delete', driverId: id });
    }
    return success;
  }

  _assertCanManageDriversForTeam(teamId) {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado.');

    if (user.isAdminFIA()) return true;

    if (user.isAdminEscuderia()) {
      if (user.isAuthorizedForTeam(teamId)) return true;
      throw new Error('Permiso denegado: Solo puede modificar los pilotos de su propia escudería.');
    }

    throw new Error('Permiso denegado: Público en general tiene acceso de solo lectura.');
  }
}
