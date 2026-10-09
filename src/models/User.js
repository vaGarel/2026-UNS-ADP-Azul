import { BaseEntity } from './BaseEntity.js';

export const USER_ROLES = {
  ADMIN_FIA: 'ADMIN_FIA',
  ADMIN_ESCUDERIA: 'ADMIN_ESCUDERIA',
  PUBLICO: 'PUBLICO'
};

/**
 * Modelo Base de Usuario
 * Cumple con OCP y LSP para la jerarquía de roles
 */
export class User extends BaseEntity {
  constructor({
    id = null,
    nombre = '',
    username = '',
    email = '',
    rol = USER_ROLES.PUBLICO,
    avatar = '',
    activo = true,
    createdAt = null,
    updatedAt = null
  } = {}) {
    super(id, createdAt, updatedAt);
    this.nombre = nombre;
    this.username = username || (email || '').split('@')[0];
    this.email = email;
    this.rol = rol;
    this.avatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nombre || 'user')}`;
    this.activo = activo;
  }

  isAdminFIA() {
    return this.rol === USER_ROLES.ADMIN_FIA;
  }

  isAdminEscuderia() {
    return this.rol === USER_ROLES.ADMIN_ESCUDERIA;
  }

  isPublico() {
    return this.rol === USER_ROLES.PUBLICO;
  }

  canManageCalendar() {
    return this.isAdminFIA();
  }

  canManageScores() {
    return this.isAdminFIA();
  }

  canManageCompetitionProfiles() {
    return this.isAdminFIA();
  }

  canManageCarInspections() {
    return this.isAdminFIA();
  }

  canAcknowledgeNotifications() {
    return this.isAdminEscuderia();
  }
}
