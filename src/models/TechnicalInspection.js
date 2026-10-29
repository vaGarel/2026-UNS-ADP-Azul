import { BaseEntity } from './BaseEntity.js';

export const INSPECTION_TYPES = Object.freeze({
  WEIGHT: 'Weight compliance',
  SAFETY: 'Safety',
  REGULATIONS: 'Technical regulations',
  CHASSIS_AERO: 'Chassis/aerodynamics',
  POWERTRAIN: 'Powertrain/electrical'
});

export const INSPECTION_OUTCOMES = Object.freeze({
  PASS: 'Pass',
  FAIL: 'Fail'
});

export class TechnicalInspection extends BaseEntity {
  constructor({
    id = null,
    autoId = '',
    eventoId = '',
    granPremio = '',
    fecha = '',
    tipoInspeccion = '',
    resultado = '',
    observaciones = '',
    createdAt = null,
    updatedAt = null
  } = {}) {
    super(id, createdAt, updatedAt);
    this.autoId = autoId;
    this.eventoId = eventoId;
    this.granPremio = granPremio;
    this.fecha = fecha;
    this.tipoInspeccion = tipoInspeccion;
    this.resultado = resultado;
    this.observaciones = observaciones;
  }
}
