/**
 * Entidad base para el dominio
 * Aplica Principio de Responsabilidad Única (SRP)
 */
export class BaseEntity {
  constructor(id = null, createdAt = null, updatedAt = null) {
    this.id = id || BaseEntity.generateUUID();
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }

  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  touch() {
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return { ...this };
  }
}
