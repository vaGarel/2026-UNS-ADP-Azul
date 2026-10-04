import { BaseRepository } from './BaseRepository.js';
import { SportEvent, EVENT_TYPES } from '../models/SportEvent.js';
import { TireTestEvent as TireTestModel } from '../models/TireTestEvent.js';

export class EventRepository extends BaseRepository {
  constructor(storageService) {
    super('fia_events', SportEvent, storageService);
  }

  getAll() {
    const rawData = this.storageService.getItem(this.storageKey, []);
    return rawData.map(item => {
      if (item.tipoEvento === EVENT_TYPES.TIRE_TEST) {
        return new TireTestModel(item);
      }
      return new SportEvent(item);
    });
  }

  getByCategory(category) {
    if (!category || category === 'ALL') return this.getAll();
    return this.find(e => e.categoria === category);
  }

  getByType(type) {
    if (!type || type === 'ALL') return this.getAll();
    return this.find(e => e.tipoEvento === type);
  }

  getTireTests() {
    return this.find(e => e.tipoEvento === EVENT_TYPES.TIRE_TEST);
  }

  update(id, updatedData) {
    const items = this.getAll();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error(`Entidad con id ${id} no encontrada para actualización`);
    }

    const currentItem = items[index];
    const mergedData = {
      ...currentItem.toJSON(),
      ...updatedData,
      id: currentItem.id,
      createdAt: currentItem.createdAt
    };
    const EntityClass = mergedData.tipoEvento === EVENT_TYPES.TIRE_TEST ? TireTestModel : SportEvent;
    const updatedEntity = new EntityClass(mergedData);
    updatedEntity.touch();

    items[index] = updatedEntity;
    this._persist(items);
    return updatedEntity;
  }

  getUpcomingEvents() {
    const now = new Date();
    return this.find(e => new Date(e.fechaInicio) >= now)
      .sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));
  }
}
