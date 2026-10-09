import { BaseRepository } from './BaseRepository.js';
import { STORAGE_KEYS } from '../config/constants.js';
import { TechnicalInspection } from '../models/TechnicalInspection.js';

export class TechnicalInspectionRepository extends BaseRepository {
  constructor(storageService) {
    super(STORAGE_KEYS.CAR_INSPECTIONS, TechnicalInspection, storageService);
  }

  getByCar(carId) {
    return this.find(inspection => inspection.autoId === carId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
}
