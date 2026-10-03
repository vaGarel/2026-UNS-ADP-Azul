import { BaseEntity } from './BaseEntity.js';

export const MESSAGE_PRIORITY = {
  NORMAL: 'Normal',
  URGENT: 'Urgente / Oficial',
  TECHNICAL_ALERT: 'Alerta Técnica Inmediata'
};

/**
 * Entidad Mensaje
 * Atributos según diagrama: timestamp, cuerpo (+ metadatos necesarios)
 */
export class Message extends BaseEntity {
  constructor({
    id = null,
    conversacionId = '',
    emisorId = '',
    emisorNombre = '',
    emisorRol = '',
    timestamp = '',
    cuerpo = '',
    prioridad = MESSAGE_PRIORITY.NORMAL,
    leido = false,
    createdAt = null,
    updatedAt = null
  } = {}) {
    super(id, createdAt, updatedAt);
    this.conversacionId = conversacionId;
    this.emisorId = emisorId;
    this.emisorNombre = emisorNombre;
    this.emisorRol = emisorRol;
    this.timestamp = timestamp || new Date().toISOString();
    this.cuerpo = cuerpo;
    this.prioridad = prioridad;
    this.leido = Boolean(leido);
  }
}
