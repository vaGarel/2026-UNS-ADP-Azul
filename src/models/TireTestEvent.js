import { SportEvent, EVENT_TYPES, FIA_CATEGORIES } from './SportEvent.js';

export const PIRELLI_COMPOUNDS = {
  C1: 'C1 (Duro Extremo)',
  C2: 'C2 (Duro)',
  C3: 'C3 (Medio)',
  C4: 'C4 (Blando)',
  C5: 'C5 (Blando Extremo)',
  INTERMEDIATE: 'Intermedio (Cinturato Verde)',
  WET: 'Lluvia Extrema (Cinturato Azul)',
  PROTOTYPE: 'Prototipo FIA 2027'
};

/**
 * Especialización de Evento: Prueba Oficial de Neumáticos
 * Hereda de SportEvent aplicando LSP
 */
export class TireTestEvent extends SportEvent {
  constructor(params = {}) {
    super({
      ...params,
      tipoEvento: EVENT_TYPES.TIRE_TEST,
      categoria: params.categoria || FIA_CATEGORIES.F1
    });
    this.proveedorOficial = params.proveedorOficial || 'Pirelli Motorsport';
    this.compuestosEvaluados = params.compuestosEvaluados || [PIRELLI_COMPOUNDS.C2, PIRELLI_COMPOUNDS.C3, PIRELLI_COMPOUNDS.C4];
    this.objetivoPrueba = params.objetivoPrueba || 'Evaluación de degradación térmica y compuestos ciegos FIA';
    this.temperaturaPistaObjetivoC = Number(params.temperaturaPistaObjetivoC) || 35;
    this.escuderiasParticipantes = params.escuderiasParticipantes || ['Todas las escuderías registradas'];
    this.sesionesPorDia = Number(params.sesionesPorDia) || 2;
    this.blindTest = params.blindTest ?? true;
  }
}
