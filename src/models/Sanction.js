import { BaseEntity } from './BaseEntity.js';

export const SANCTION_STATUS = Object.freeze({
  APLICADA: 'Aplicada',
  APELADA: 'Apelada',
  ANULADA: 'Anulada'
});

export const SANCTION_TYPES = Object.freeze({
  TIME_5S: '5 segundos de recargo',
  TIME_10S: '10 segundos de recargo',
  STOP_AND_GO: 'Stop and Go de 10 segundos',
  DRIVE_THROUGH: 'Drive-through',
  GRID_PENALTY: 'Pérdida de 3 puestos en parrilla',
  GRID_PENALTY_5: 'Pérdida de 5 puestos en parrilla',
  REPRIMAND: 'Reprimenda oficial',
  DISQUALIFICATION: 'Descalificación de carrera',
  FINE: 'Multa económica'
});

/**
 * Entidad Sanción / Penalización deportiva
 */
export class Sanction extends BaseEntity {
  constructor({
    id = null,
    pilotoId = '',
    pilotoNombre = '',
    escuderiaId = '',
    escuderiaNombre = '',
    eventoId = '',
    granPremio = '',
    fecha = '',
    motivo = '',
    tipoSancion = SANCTION_TYPES.TIME_5S,
    puntosPenalizacion = 0,
    estado = SANCTION_STATUS.APLICADA,
    createdAt = null,
    updatedAt = null
  } = {}) {
    super(id, createdAt, updatedAt);
    this.pilotoId = pilotoId;
    this.pilotoNombre = pilotoNombre;
    this.escuderiaId = escuderiaId;
    this.escuderiaNombre = escuderiaNombre;
    this.eventoId = eventoId;
    this.granPremio = granPremio;
    this.fecha = fecha;
    this.motivo = motivo;
    this.tipoSancion = tipoSancion;
    this.puntosPenalizacion = Number(puntosPenalizacion) || 0;
    this.estado = estado;
  }
}
