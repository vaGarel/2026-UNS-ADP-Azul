import { Sanction, SANCTION_TYPES, SANCTION_SEVERITY } from '../models/Sanction.js';

/**
 * Servicio de Negocio para Sanciones FIA
 */
export class SanctionService {
  constructor(
    sanctionRepository,
    driverRepository,
    teamRepository,
    eventRepository,
    authService,
    eventEmitter
  ) {
    this.sanctionRepository = sanctionRepository;
    this.driverRepository = driverRepository;
    this.teamRepository = teamRepository;
    this.eventRepository = eventRepository;
    this.authService = authService;
    this.eventEmitter = eventEmitter;
  }

  getSanctions(filters = {}) {
    let sanctions = this.sanctionRepository.getAll();

    if (filters.teamId && filters.teamId !== 'ALL') {
      sanctions = sanctions.filter(s => s.escuderiaId === filters.teamId);
    }
    if (filters.eventId && filters.eventId !== 'ALL') {
      sanctions = sanctions.filter(s => s.eventoId === filters.eventId);
    }
    if (filters.severity && filters.severity !== 'ALL') {
      sanctions = sanctions.filter(s => s.gravedad === filters.severity);
    }
    if (filters.onlyPendingAck) {
      sanctions = sanctions.filter(s => !s.notificadoEscuderia);
    }

    return sanctions.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }

  createSanction(sanctionData) {
    this._assertCanManageSanctions();

    const team = this.teamRepository.getById(sanctionData.escuderiaId);
    if (!team) throw new Error('Escudería no encontrada.');

    let pilotoNombre = 'Escudería (Sanción a Equipo)';
    if (sanctionData.pilotoId) {
      const driver = this.driverRepository.getById(sanctionData.pilotoId);
      if (driver) pilotoNombre = driver.getNombreCompleto();
    }

    const event = this.eventRepository.getById(sanctionData.eventoId);

    const newSanction = new Sanction({
      ...sanctionData,
      escuderiaNombre: team.nombre,
      pilotoNombre,
      eventoNombre: event ? event.nombre : 'Evento FIA',
      notificadoEscuderia: false,
      fechaNotificacion: null
    });

    const saved = this.sanctionRepository.create(newSanction);
    this.eventEmitter.emit('sanctions:updated', { action: 'create', sanction: saved });
    return saved;
  }

  acknowledgeSanction(sanctionId) {
    const user = this.authService.getCurrentUser();
    if (!user || (!user.isAdminEscuderia() && !user.isAdminFIA())) {
      throw new Error('Permiso denegado: Solo el responsable de la escudería o FIA puede asentar la notificación.');
    }

    const sanction = this.sanctionRepository.getById(sanctionId);
    if (!sanction) throw new Error('Sanción no encontrada.');

    if (user.isAdminEscuderia() && !user.isAuthorizedForTeam(sanction.escuderiaId)) {
      throw new Error(`Permiso denegado: No pertenece a la escudería ${sanction.escuderiaNombre}.`);
    }

    const responsibleName = user.nombre || 'Director de Equipo';
    const updated = this.sanctionRepository.update(sanctionId, {
      notificadoEscuderia: true,
      fechaNotificacion: new Date().toISOString(),
      responsableNotificacion: responsibleName
    });

    this.eventEmitter.emit('sanctions:acknowledged', { sanctionId, updated });
    return updated;
  }

  deleteSanction(id) {
    this._assertCanManageSanctions();
    const success = this.sanctionRepository.delete(id);
    if (success) {
      this.eventEmitter.emit('sanctions:updated', { action: 'delete', sanctionId: id });
    }
    return success;
  }

  _assertCanManageSanctions() {
    const user = this.authService.getCurrentUser();
    if (!user || !user.canManageSanctions()) {
      throw new Error('Permiso denegado: Solo el personal Administrativo de la FIA puede registrar sanciones.');
    }
  }
}
