import { BaseRepository } from './BaseRepository.js';
import { Sanction } from '../models/Sanction.js';

export class SanctionRepository extends BaseRepository {
  constructor(storageService) {
    super('fia_sanctions', Sanction, storageService);
  }

  getByEvent(eventId) {
    return this.find(s => s.eventoId === eventId);
  }

  getByTeam(teamId) {
    return this.find(s => s.escuderiaId === teamId);
  }

  getPendingNotifications(teamId = null) {
    return this.find(s => {
      const matchTeam = teamId ? s.escuderiaId === teamId : true;
      return matchTeam && !s.notificadoEscuderia;
    });
  }
}
