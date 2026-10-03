import { BaseEntity } from './BaseEntity.js';

export const RACE_STATUS = {
  FINISHED: 'Clasificado',
  DNF: 'Retirado (DNF)',
  DSQ: 'Descalificado (DSQ)',
  DNS: 'No Largó (DNS)'
};

/**
 * Entidad Resultado y Puntaje de Carrera
 */
export class RaceResult extends BaseEntity {
  constructor({
    id = null,
    eventoId = '',
    eventoNombre = '',
    pilotoId = '',
    pilotoNombre = '',
    pilotoNumero = 0,
    escuderiaId = '',
    escuderiaNombre = '',
    posicion = 1,
    tiempoTotal = '',
    puntos = 0,
    puntosEscuderia = 0,
    vueltaRapida = false,
    estadoFinal = RACE_STATUS.FINISHED,
    notificadoEscuderia = false,
    fechaNotificacion = null,
    createdAt = null,
    updatedAt = null
  } = {}) {
    super(id, createdAt, updatedAt);
    this.eventoId = eventoId;
    this.eventoNombre = eventoNombre;
    this.pilotoId = pilotoId;
    this.pilotoNombre = pilotoNombre;
    this.pilotoNumero = Number(pilotoNumero) || 0;
    this.escuderiaId = escuderiaId;
    this.escuderiaNombre = escuderiaNombre;
    this.posicion = Number(posicion) || 1;
    this.tiempoTotal = tiempoTotal;
    this.puntos = Number(puntos) || 0;
    this.puntosEscuderia = Number(puntosEscuderia) || this.puntos;
    this.vueltaRapida = Boolean(vueltaRapida);
    this.estadoFinal = estadoFinal;
    this.notificadoEscuderia = Boolean(notificadoEscuderia);
    this.fechaNotificacion = fechaNotificacion;
  }

  acknowledgePoints() {
    this.notificadoEscuderia = true;
    this.fechaNotificacion = new Date().toISOString();
    this.touch();
  }
}
