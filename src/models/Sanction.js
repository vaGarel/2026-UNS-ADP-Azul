import { BaseEntity } from './BaseEntity.js';

export const SANCTION_TYPES = {
  TIME_PENALTY: 'Penalización de Tiempo (+5s / +10s)',
  GRID_PENALTY: 'Pérdida de Posiciones en Grilla',
  FINANCIAL_FINE: 'Multa Económica',
  DISQUALIFICATION: 'Descalificación de Sesión / Carrera (DSQ)',
  REPRIMAND: 'Reprimenda Oficial / Puntos en Superlicencia',
  PIT_LANE_START: 'Salida desde el Pit Lane'
};

export const SANCTION_SEVERITY = {
  LOW: 'Leve',
  MEDIUM: 'Moderada',
  HIGH: 'Grave'
};

/**
 * Entidad Sanción
 */
export class Sanction extends BaseEntity {
  constructor({
    id = null,
    fecha = '',
    eventoId = '',
    eventoNombre = '',
    pilotoId = null,
    pilotoNombre = '',
    escuderiaId = '',
    escuderiaNombre = '',
    tipoSancion = SANCTION_TYPES.TIME_PENALTY,
    valorPenalidad = '+5 Segundos',
    gravedad = SANCTION_SEVERITY.MEDIUM,
    motivo = '',
    articuloReglamento = 'Art. 33.4 Reglamento Deportivo FIA',
    notificadoEscuderia = false,
    fechaNotificacion = null,
    responsableNotificacion = '',
    createdAt = null,
    updatedAt = null
  } = {}) {
    super(id, createdAt, updatedAt);
    this.fecha = fecha || new Date().toISOString().split('T')[0];
    this.eventoId = eventoId;
    this.eventoNombre = eventoNombre;
    this.pilotoId = pilotoId;
    this.pilotoNombre = pilotoNombre;
    this.escuderiaId = escuderiaId;
    this.escuderiaNombre = escuderiaNombre;
    this.tipoSancion = tipoSancion;
    this.valorPenalidad = valorPenalidad;
    this.gravedad = gravedad;
    this.motivo = motivo;
    this.articuloReglamento = articuloReglamento;
    this.notificadoEscuderia = Boolean(notificadoEscuderia);
    this.fechaNotificacion = fechaNotificacion;
    this.responsableNotificacion = responsableNotificacion;
  }

  acknowledgeNotification(responsibleName = 'Team Manager') {
    this.notificadoEscuderia = true;
    this.fechaNotificacion = new Date().toISOString();
    this.responsableNotificacion = responsibleName;
    this.touch();
  }
}
