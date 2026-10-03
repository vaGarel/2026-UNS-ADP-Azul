import { BaseEntity } from './BaseEntity.js';

export const FIA_CATEGORIES = {
  F1: 'Fórmula 1',
  F2: 'Fórmula 2',
  F3: 'Fórmula 3',
  F1_ACADEMY: 'F1 Academy'
};

export const EVENT_TYPES = {
  GRAND_PRIX: 'Grand Prix (Carrera)',
  SPRINT_WEEKEND: 'Fin de Semana Sprint',
  TIRE_TEST: 'Prueba Oficial de Neumáticos',
  PRE_SEASON_TEST: 'Test de Pretemporada',
  TECHNICAL_SCRUTINEERING: 'Verificaciones Técnicas'
};

export const EVENT_STATUS = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En Curso',
  COMPLETED: 'Finalizado',
  POSTPONED: 'Postergado',
  CANCELLED: 'Cancelado'
};

/**
 * Entidad Evento Deportivo
 * Cumple SRP y OCP
 */
export class SportEvent extends BaseEntity {
  constructor({
    id = null,
    nombre = '',
    categoria = FIA_CATEGORIES.F1,
    circuito = '',
    ciudad = '',
    pais = '',
    banderaPais = '🏁',
    fechaInicio = '',
    fechaFin = '',
    tipoEvento = EVENT_TYPES.GRAND_PRIX,
    estado = EVENT_STATUS.SCHEDULED,
    roundNumero = 1,
    distanciaKm = 305.0,
    vueltas = 53,
    longitudCircuitoKm = 5.793,
    recordVuelta = '',
    recordPiloto = '',
    descripcion = '',
    imagenCircuito = '',
    puntajesRegistrados = false,
    createdAt = null,
    updatedAt = null
  } = {}) {
    super(id, createdAt, updatedAt);
    this.nombre = nombre;
    this.categoria = categoria;
    this.circuito = circuito;
    this.ciudad = ciudad;
    this.pais = pais;
    this.banderaPais = banderaPais;
    this.fechaInicio = fechaInicio;
    this.fechaFin = fechaFin || fechaInicio;
    this.tipoEvento = tipoEvento;
    this.estado = estado;
    this.roundNumero = roundNumero;
    this.distanciaKm = Number(distanciaKm) || 0;
    this.vueltas = Number(vueltas) || 0;
    this.longitudCircuitoKm = Number(longitudCircuitoKm) || 0;
    this.recordVuelta = recordVuelta;
    this.recordPiloto = recordPiloto;
    this.descripcion = descripcion;
    this.imagenCircuito = imagenCircuito || 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=60';
    this.puntajesRegistrados = Boolean(puntajesRegistrados);
  }

  isTireTest() {
    return this.tipoEvento === EVENT_TYPES.TIRE_TEST;
  }

  isCompleted() {
    return this.estado === EVENT_STATUS.COMPLETED;
  }

  validate() {
    const errors = [];
    if (!this.nombre || this.nombre.trim().length < 3) {
      errors.push('El nombre del evento debe tener al menos 3 caracteres.');
    }
    if (!this.circuito || this.circuito.trim().length < 3) {
      errors.push('El nombre del circuito es obligatorio.');
    }
    if (!this.fechaInicio) {
      errors.push('La fecha de inicio es obligatoria.');
    }
    if (this.fechaFin && new Date(this.fechaFin) < new Date(this.fechaInicio)) {
      errors.push('La fecha de fin no puede ser anterior a la de inicio.');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
