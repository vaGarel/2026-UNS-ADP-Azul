import { BaseRepository } from './BaseRepository.js';
import { Team } from '../models/Team.js';

export class TeamRepository extends BaseRepository {
  constructor(storageService) {
    super('fia_teams', Team, storageService);
  }

  getStandings() {
    return this.find(team => team.activo).sort((a, b) => b.puntosTotales - a.puntosTotales);
  }
}
