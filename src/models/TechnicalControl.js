import { BaseEntity } from './BaseEntity.js';

export const CONTROL_TYPES = {
  WEIGHT_LIMIT: 'Verificación de Peso Mínimo (798 kg)',
  FUEL_FLOW: 'Flujo y Muestra de Combustible',
  AERO_FLEXIBILITY: 'Flexibilidad de Alerones y Suelo',
  POWER_UNIT: 'Parámetros Eléctricos y MGU-K',
  TIRE_PRESSURE: 'Presión y Temperatura de Neumáticos',
  PLANK_WEAR: 'Desgaste de Plancha de Titanio / Madera',
  SAFETY_EQUIPMENT: 'Equipamiento de Seguridad y Halo'
};

export const CONTROL_STATUS = {
  PASSED: 'Aprobado',
  FAILED: 'No Aprobado',
  UNDER_REVIEW: 'En Revisión'
};

/**
 * Entidad Control Técnico
 */
export class TechnicalControl extends BaseEntity {
  constructor({
    id = null,
    fecha = '',
    eventoId = '',
    eventoNombre = '',
    autoId = '',
    autoNumero = 0,
    escuderiaId = '',
    escuderiaNombre = '',
    pilotoNombre = '',
    tipoControl = CONTROL_TYPES.WEIGHT_LIMIT,
    estado = CONTROL_STATUS.PASSED,
    aprobado = true,
    mediciones = '',
    comisarioTecnico = 'Jo Bauer (Delegado Técnico FIA)',
    observaciones = '',
    createdAt = null,
    updatedAt = null
  } = {}) {
    super(id, createdAt, updatedAt);
    this.fecha = fecha || new Date().toISOString().split('T')[0];
    this.eventoId = eventoId;
    this.eventoNombre = eventoNombre;
    this.autoId = autoId;
    this.autoNumero = Number(autoNumero) || 0;
    this.escuderiaId = escuderiaId;
    this.escuderiaNombre = escuderiaNombre;
    this.pilotoNombre = pilotoNombre;
    this.tipoControl = tipoControl;
    this.estado = estado;
    this.aprobado = aprobado;
    this.mediciones = mediciones;
    this.comisarioTecnico = comisarioTecnico;
    this.observaciones = observaciones;
  }
}
