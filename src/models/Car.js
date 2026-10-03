import { BaseEntity } from './BaseEntity.js';

export const CAR_STATUS = {
  HOMOLOGATED: 'Homologado FIA',
  INSPECTION_PENDING: 'Inspección Pendiente',
  REJECTED: 'Rechazado Técnicamente'
};

/**
 * Entidad Auto / Monoplaza
 */
export class Car extends BaseEntity {
  constructor({
    id = null,
    numeroAuto = 1,
    modelo = '',
    chasisCodigo = '',
    motorCodigo = '',
    escuderiaId = '',
    escuderiaNombre = '',
    pilotoId = '',
    pilotoNombre = '',
    pesoKg = 798,
    estado = CAR_STATUS.HOMOLOGATED,
    observacionesTecnicas = '',
    createdAt = null,
    updatedAt = null
  } = {}) {
    super(id, createdAt, updatedAt);
    this.numeroAuto = Number(numeroAuto) || 0;
    this.modelo = modelo;
    this.chasisCodigo = chasisCodigo;
    this.motorCodigo = motorCodigo;
    this.escuderiaId = escuderiaId;
    this.escuderiaNombre = escuderiaNombre;
    this.pilotoId = pilotoId;
    this.pilotoNombre = pilotoNombre;
    this.pesoKg = Number(pesoKg) || 798;
    this.estado = estado;
    this.observacionesTecnicas = observacionesTecnicas;
  }
}
