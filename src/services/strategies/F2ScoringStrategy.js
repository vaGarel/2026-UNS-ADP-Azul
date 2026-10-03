import { IScoringStrategy } from './IScoringStrategy.js';

/**
 * Estrategia oficial de puntuación para FIA Formula 2 (Feature Race)
 */
export class F2ScoringStrategy extends IScoringStrategy {
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
    let pts = this.pointsMap[pos] || 0;
    if (hasFastestLap && pos >= 1 && pos <= 10) {
      pts += 1;
    }
    return pts;
  }

  getPointsTable() {
    return { ...this.pointsMap, fastestLapBonus: 1, fastestLapMinPosition: 10 };
  }
}
