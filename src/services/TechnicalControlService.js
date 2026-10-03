import { TechnicalControl, CONTROL_STATUS } from '../models/TechnicalControl.js';

/**
 * Servicio de Negocio para Controles Técnicos FIA
 */
export class TechnicalControlService {
  constructor(
    technicalControlRepository,
    carRepository,
    teamRepository,
    eventRepository,
    authService,
    eventEmitter
  ) {
    this.technicalControlRepository = technicalControlRepository;
    this.carRepository = carRepository;
    this.teamRepository = teamRepository;
    this.eventRepository = eventRepository;
    this.authService = authService;
    this.eventEmitter = eventEmitter;
  }

  getTechnicalControls(filters = {}) {
    let controls = this.technicalControlRepository.getAll();

    if (filters.teamId && filters.teamId !== 'ALL') {
      controls = controls.filter(c => c.escuderiaId === filters.teamId);
    }
    if (filters.eventId && filters.eventId !== 'ALL') {
      controls = controls.filter(c => c.eventoId === filters.eventId);
    }
    if (filters.status && filters.status !== 'ALL') {
      controls = controls.filter(c => c.estado === filters.status);
    }

    return controls.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }

  createTechnicalControl(controlData) {
    this._assertCanManageTechnicalControls();

    const car = this.carRepository.getById(controlData.autoId);
    if (!car) throw new Error('Auto no encontrado.');

    const team = this.teamRepository.getById(car.escuderiaId);
    const event = this.eventRepository.getById(controlData.eventoId);

    const isPassed = controlData.estado === CONTROL_STATUS.PASSED;

    const newControl = new TechnicalControl({
      ...controlData,
      autoNumero: car.numeroAuto,
      escuderiaId: car.escuderiaId,
      escuderiaNombre: team ? team.nombre : car.escuderiaNombre,
      pilotoNombre: car.pilotoNombre,
      eventoNombre: event ? event.nombre : 'Evento Oficial FIA',
      aprobado: isPassed
    });

    const saved = this.technicalControlRepository.create(newControl);
    this.eventEmitter.emit('technicalControls:updated', { action: 'create', control: saved });
    return saved;
  }

  deleteTechnicalControl(id) {
    this._assertCanManageTechnicalControls();
    const success = this.technicalControlRepository.delete(id);
    if (success) {
      this.eventEmitter.emit('technicalControls:updated', { action: 'delete', controlId: id });
    }
    return success;
  }

  _assertCanManageTechnicalControls() {
    const user = this.authService.getCurrentUser();
    if (!user || !user.canManageTechnicalControls()) {
      throw new Error('Permiso denegado: Solo el personal Administrativo de la FIA puede registrar controles técnicos.');
    }
  }
}
