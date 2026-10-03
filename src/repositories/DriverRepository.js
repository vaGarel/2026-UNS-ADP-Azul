import { BaseRepository } from './BaseRepository.js';
import { Driver } from '../models/Driver.js';

export class DriverRepository extends BaseRepository {
  constructor(storageService) {
    super('fia_drivers', Driver, storageService);
  }

  getByTeam(teamId) {
    return this.find(d => d.escuderiaId === teamId);
  }

  getStandings() {
    return this.getAll().sort((a, b) => b.puntos - a.puntos);
  }
}
