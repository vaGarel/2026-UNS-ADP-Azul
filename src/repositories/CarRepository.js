import { BaseRepository } from './BaseRepository.js';
import { Car } from '../models/Car.js';

export class CarRepository extends BaseRepository {
  constructor(storageService) {
    super('fia_cars', Car, storageService);
  }

  getByTeam(teamId) {
    return this.find(c => c.escuderiaId === teamId);
  }
}
