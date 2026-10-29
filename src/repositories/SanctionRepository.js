import { BaseRepository } from './BaseRepository.js';
import { STORAGE_KEYS } from '../config/constants.js';
import { Sanction } from '../models/Sanction.js';

export class SanctionRepository extends BaseRepository {
  constructor(storageService) {
    super(STORAGE_KEYS.SANCTIONS, Sanction, storageService);
  }

  getByDriver(driverId) {
    return this.find(s => s.pilotoId === driverId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  getByTeam(teamId) {
    return this.find(s => s.escuderiaId === teamId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  getByEvent(eventId) {
    return this.find(s => s.eventoId === eventId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
}
