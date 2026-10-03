import { BaseEntity } from './BaseEntity.js';

export const CONVERSATION_STATUS = {
  ACTIVE: 'Activa',
  RESOLVED: 'Resuelta',
  HIGH_PRIORITY: 'Prioridad Alta / Urgente'
};

/**
 * Entidad Conversación
 */
export class Conversation extends BaseEntity {
  constructor({
    id = null,
    asunto = '',
    categoria = 'General',
    participanteFIAId = '',
    participanteFIANombre = 'Secretaría Técnica FIA',
    escuderiaId = '',
    escuderiaNombre = '',
    estado = CONVERSATION_STATUS.ACTIVE,
    mensajesCount = 0,
    ultimoMensajeTexto = '',
    ultimoMensajeFecha = '',
    createdAt = null,
    updatedAt = null
  } = {}) {
    super(id, createdAt, updatedAt);
    this.asunto = asunto;
    this.categoria = categoria;
    this.participanteFIAId = participanteFIAId;
    this.participanteFIANombre = participanteFIANombre;
    this.escuderiaId = escuderiaId;
    this.escuderiaNombre = escuderiaNombre;
    this.estado = estado;
    this.mensajesCount = Number(mensajesCount) || 0;
    this.ultimoMensajeTexto = ultimoMensajeTexto;
    this.ultimoMensajeFecha = ultimoMensajeFecha || new Date().toISOString();
  }
}
