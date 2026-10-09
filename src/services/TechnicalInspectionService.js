import { INSPECTION_OUTCOMES, INSPECTION_TYPES, TechnicalInspection } from '../models/TechnicalInspection.js';

const INSPECTION_TYPE_VALUES = Object.values(INSPECTION_TYPES);
const INSPECTION_OUTCOME_VALUES = Object.values(INSPECTION_OUTCOMES);

export class TechnicalInspectionService {
  constructor(inspectionRepository, carRepository, authService, eventEmitter) {
    this.inspectionRepository = inspectionRepository;
    this.carRepository = carRepository;
    this.authService = authService;
    this.eventEmitter = eventEmitter;
  }

  getAll() {
    return this.inspectionRepository.getAll()
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  getByCar(carId) {
    return this.inspectionRepository.getByCar(carId);
  }

  getById(id) {
    return this.inspectionRepository.getById(id);
  }

  create(data) {
    this._assertCanManage();
    if (!data || typeof data !== 'object') throw new Error('Los datos de inspección no son válidos.');
    this._validate(data);
    const inspection = this.inspectionRepository.create(new TechnicalInspection(data));
    this.eventEmitter.emit('competition:inspectionsUpdated', { action: 'create', inspection });
    return inspection;
  }

  update(id, data) {
    this._assertCanManage();
    if (!data || typeof data !== 'object') throw new Error('Los datos de inspección no son válidos.');
    const existing = this.getById(id);
    if (!existing) throw new Error(`Inspección con ID ${id} no encontrada.`);
    const updatedData = {
      fecha: data.fecha,
      tipoInspeccion: data.tipoInspeccion,
      resultado: data.resultado,
      observaciones: data.observaciones
    };
    this._validate({ ...existing, ...updatedData });
    const updated = this.inspectionRepository.update(id, updatedData);
    this.eventEmitter.emit('competition:inspectionsUpdated', { action: 'update', inspection: updated });
    return updated;
  }

  delete(id) {
    this._assertCanManage();
    const inspection = this.getById(id);
    if (!inspection) throw new Error(`Inspección con ID ${id} no encontrada.`);
    this.inspectionRepository.delete(id);
    this.eventEmitter.emit('competition:inspectionsUpdated', { action: 'delete', inspectionId: id });
    return inspection;
  }

  _validate(data) {
    if (!this.carRepository.getById(data.autoId)) {
      throw new Error('Seleccione un auto existente para la inspección.');
    }

    if (typeof data.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) {
      throw new Error('Ingrese una fecha de inspección válida.');
    }
    const date = new Date(data.fecha);
    if (Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== data.fecha) {
      throw new Error('Ingrese una fecha de inspección válida.');
    }

    if (!INSPECTION_TYPE_VALUES.includes(data.tipoInspeccion)) {
      throw new Error('Seleccione un tipo de inspección válido.');
    }
    if (!INSPECTION_OUTCOME_VALUES.includes(data.resultado)) {
      throw new Error('Seleccione un resultado válido.');
    }
  }

  _assertCanManage() {
    const user = this.authService.getCurrentUser();
    if (!user?.canManageCarInspections()) {
      throw new Error('Permiso denegado: solo el personal FIA puede gestionar inspecciones técnicas.');
    }
  }
}
