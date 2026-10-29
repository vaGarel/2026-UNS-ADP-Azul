import { Sanction, SANCTION_STATUS } from '../models/Sanction.js';

export class SanctionService {
  constructor(sanctionRepository, driverRepository, teamRepository, eventRepository, authService, eventEmitter) {
    this.sanctionRepository = sanctionRepository;
    this.driverRepository = driverRepository;
    this.teamRepository = teamRepository;
    this.eventRepository = eventRepository;
    this.authService = authService;
    this.eventEmitter = eventEmitter;
  }

  getAll() {
    return this.sanctionRepository.getAll()
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  getById(id) {
    return this.sanctionRepository.getById(id);
  }

  getByDriver(driverId) {
    return this.sanctionRepository.getByDriver(driverId);
  }

  getByTeam(teamId) {
    return this.sanctionRepository.getByTeam(teamId);
  }

  create(data) {
    this._assertCanManage();
    if (!data || typeof data !== 'object') throw new Error('Los datos de la sanción no son válidos.');
    this._validate(data);

    const driver = this.driverRepository.getById(data.pilotoId);
    const team = driver ? this.teamRepository.getById(driver.escuderiaId) : null;
    let eventName = data.granPremio || '';
    if (data.eventoId && this.eventRepository) {
      const event = this.eventRepository.getById(data.eventoId);
      if (event) eventName = event.nombre;
    }

    const sanction = this.sanctionRepository.create(new Sanction({
      ...data,
      pilotoNombre: driver ? driver.getNombreCompleto() : (data.pilotoNombre || 'Piloto no especificado'),
      escuderiaId: driver ? driver.escuderiaId : (data.escuderiaId || ''),
      escuderiaNombre: team ? team.nombre : (driver?.escuderiaNombre || data.escuderiaNombre || ''),
      granPremio: eventName || data.granPremio || 'Gran Premio Oficial'
    }));

    this.eventEmitter.emit('competition:sanctionsUpdated', { action: 'create', sanction });
    return sanction;
  }

  update(id, data) {
    this._assertCanManage();
    if (!data || typeof data !== 'object') throw new Error('Los datos de la sanción no son válidos.');
    const existing = this.getById(id);
    if (!existing) throw new Error(`Sanción con ID ${id} no encontrada.`);

    this._validate({ ...existing, ...data });

    const driver = data.pilotoId ? this.driverRepository.getById(data.pilotoId) : null;
    const team = driver ? this.teamRepository.getById(driver.escuderiaId) : null;
    let eventName = data.granPremio || existing.granPremio;
    if (data.eventoId && this.eventRepository) {
      const event = this.eventRepository.getById(data.eventoId);
      if (event) eventName = event.nombre;
    }

    const updatedData = {
      ...data,
      pilotoNombre: driver ? driver.getNombreCompleto() : existing.pilotoNombre,
      escuderiaId: driver ? driver.escuderiaId : existing.escuderiaId,
      escuderiaNombre: team ? team.nombre : existing.escuderiaNombre,
      granPremio: eventName
    };

    const updated = this.sanctionRepository.update(id, updatedData);
    this.eventEmitter.emit('competition:sanctionsUpdated', { action: 'update', sanction: updated });
    return updated;
  }

  delete(id) {
    this._assertCanManage();
    const existing = this.getById(id);
    if (!existing) throw new Error(`Sanción con ID ${id} no encontrada.`);
    this.sanctionRepository.delete(id);
    this.eventEmitter.emit('competition:sanctionsUpdated', { action: 'delete', sanctionId: id });
    return existing;
  }

  _validate(data) {
    if (!data.pilotoId || !this.driverRepository.getById(data.pilotoId)) {
      throw new Error('Seleccione un piloto registrado válido para aplicar la sanción.');
    }
    if (typeof data.motivo !== 'string' || !data.motivo.trim()) {
      throw new Error('El motivo de la sanción es obligatorio.');
    }
    if (typeof data.tipoSancion !== 'string' || !data.tipoSancion.trim()) {
      throw new Error('El tipo de sanción es obligatorio.');
    }
    if (typeof data.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) {
      throw new Error('Ingrese una fecha de sanción válida.');
    }
  }

  _assertCanManage() {
    const user = this.authService.getCurrentUser();
    if (!user?.canManageSanctions()) {
      throw new Error('Permiso denegado: solo el personal administrativo de la FIA puede gestionar sanciones.');
    }
  }
}
