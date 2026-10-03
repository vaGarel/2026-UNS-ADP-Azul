import { BaseEntity } from './BaseEntity.js';

export const DRIVER_ROLES = {
  TITULAR: 'Piloto Titular',
  SUPLENTE: 'Piloto Reserva / Suplente'
};

/**
 * Entidad Piloto
 */
export class Driver extends BaseEntity {
  constructor({
    id = null,
    nombre = '',
    apellido = '',
    numero = 1,
    sigla = '',
    nacionalidad = '',
    banderaPais = '🏁',
    escuderiaId = '',
    escuderiaNombre = '',
    rol = DRIVER_ROLES.TITULAR,
    fechaNacimiento = '',
    puntos = 0,
    podios = 0,
    victorias = 0,
    campeonatos = 0,
    fotoUrl = '',
    activo = true,
    createdAt = null,
    updatedAt = null
  } = {}) {
    super(id, createdAt, updatedAt);
    this.nombre = nombre;
    this.apellido = apellido;
    this.numero = Number(numero) || 0;
    this.sigla = sigla || (apellido ? apellido.substring(0, 3).toUpperCase() : 'DRV');
    this.nacionalidad = nacionalidad;
    this.banderaPais = banderaPais;
    this.escuderiaId = escuderiaId;
    this.escuderiaNombre = escuderiaNombre;
    this.rol = rol;
    this.fechaNacimiento = fechaNacimiento;
    this.puntos = Number(puntos) || 0;
    this.podios = Number(podios) || 0;
    this.victorias = Number(victorias) || 0;
    this.campeonatos = Number(campeonatos) || 0;
    this.fotoUrl = fotoUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=60`;
    this.activo = Boolean(activo);
  }

  getNombreCompleto() {
    return `${this.nombre} ${this.apellido}`.trim();
  }

  isTitular() {
    return this.rol === DRIVER_ROLES.TITULAR;
  }
}
