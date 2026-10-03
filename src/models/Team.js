import { BaseEntity } from './BaseEntity.js';

/**
 * Entidad Escudería
 */
export class Team extends BaseEntity {
  constructor({
    id = null,
    nombre = '',
    nombreCompleto = '',
    pais = '',
    sede = '',
    directorEquipo = '',
    directorTecnico = '',
    chasis = '',
    unidadPotencia = '',
    colorPrimario = '#E10600',
    colorSecundario = '#15151E',
    logoUrl = '',
    puntosTotales = 0,
    posicionCampeonato = 1,
    campeonatosConstructores = 0,
    createdAt = null,
    updatedAt = null
  } = {}) {
    super(id, createdAt, updatedAt);
    this.nombre = nombre;
    this.nombreCompleto = nombreCompleto || nombre;
    this.pais = pais;
    this.sede = sede;
    this.directorEquipo = directorEquipo;
    this.directorTecnico = directorTecnico;
    this.chasis = chasis;
    this.unidadPotencia = unidadPotencia;
    this.colorPrimario = colorPrimario;
    this.colorSecundario = colorSecundario;
    this.logoUrl = logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`;
    this.puntosTotales = Number(puntosTotales) || 0;
    this.posicionCampeonato = Number(posicionCampeonato) || 1;
    this.campeonatosConstructores = Number(campeonatosConstructores) || 0;
  }

  addPoints(points) {
    this.puntosTotales += Number(points) || 0;
    this.touch();
  }
}
