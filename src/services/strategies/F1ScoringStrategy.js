import { IScoringStrategy } from './IScoringStrategy.js';

/**
 * Estrategia oficial de puntuación para FIA Formula 1 (Reglamento 2026)
 * P1=25, P2=18, P3=15, P4=12, P5=10, P6=8, P7=6, P8=4, P9=2, P10=1
 * Nota: El punto por Vuelta Rápida ya no está vigente según la normativa FIA 2026.
 */
export class F1ScoringStrategy extends IScoringStrategy {
  constructor() {
    super();
    this.pointsMap = {
      1: 25,
      2: 18,
      3: 15,
      4: 12,
      5: 10,
      6: 8,
      7: 6,
      8: 4,
      9: 2,
      10: 1
    };
  }

  calculatePoints(position, hasFastestLap = false, isFinished = true) {
    if (!isFinished) return 0;
    const pos = Number(position);
    return this.pointsMap[pos] || 0;
  }

  getPointsTable() {
    return { ...this.pointsMap };
  }
}
