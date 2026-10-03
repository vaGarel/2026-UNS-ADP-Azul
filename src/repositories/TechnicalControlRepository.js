import { BaseRepository } from './BaseRepository.js';
import { TechnicalControl } from '../models/TechnicalControl.js';

export class TechnicalControlRepository extends BaseRepository {
  constructor(storageService) {
    super('fia_technical_controls', TechnicalControl, storageService);
  }

  getByEvent(eventId) {
    return this.find(tc => tc.eventoId === eventId);
  }

  getByTeam(teamId) {
    return this.find(tc => tc.escuderiaId === teamId);
  }
}
