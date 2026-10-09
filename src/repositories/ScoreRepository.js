import { BaseRepository } from './BaseRepository.js';
import { RaceResult } from '../models/RaceResult.js';

export class ScoreRepository extends BaseRepository {
  constructor(storageService) {
    super('fia_race_results', RaceResult, storageService);
  }

  getByEvent(eventId) {
    return this.find(r => r.eventoId === eventId)
      .sort((a, b) => a.posicion - b.posicion);
  }

  getByDriver(driverId) {
    return this.find(r => r.pilotoId === driverId);
  }

  getByTeam(teamId) {
    return this.find(r => r.escuderiaId === teamId);
  }

  deleteByDriver(driverId) {
    return this._deleteMatching(result => result.pilotoId === driverId);
  }

  deleteByTeam(teamId) {
    return this._deleteMatching(result => result.escuderiaId === teamId);
  }

  _deleteMatching(predicate) {
    const results = this.getAll();
    const remaining = results.filter(result => !predicate(result));
    const deletedCount = results.length - remaining.length;
    if (deletedCount > 0) this._persist(remaining);
    return deletedCount;
  }

  getPendingAcks(teamId = null) {
    return this.find(r => {
      const matchTeam = teamId ? r.escuderiaId === teamId : true;
      return matchTeam && !r.notificadoEscuderia;
    });
  }
}
