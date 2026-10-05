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
    email = '',
    rol = USER_ROLES.PUBLICO,
    avatar = '',
    activo = true,
    createdAt = null,
    updatedAt = null
  } = {}) {
    super(id, createdAt, updatedAt);
    this.nombre = nombre;
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


  canAcknowledgeNotifications() {
    return this.isAdminEscuderia();
  }
}
