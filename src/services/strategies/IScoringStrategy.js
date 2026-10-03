/**
 * Interfaz / Contrato para Estrategias de Puntuación FIA
 * Aplica Open/Closed Principle (OCP) y Strategy Pattern
 */
export class IScoringStrategy {
  calculatePoints(position, hasFastestLap = false, isFinished = true) {
    throw new Error('El método calculatePoints debe ser implementado por la estrategia concreta');
  }

  getPointsTable() {
    throw new Error('El método getPointsTable debe ser implementado por la estrategia concreta');
  }
}
