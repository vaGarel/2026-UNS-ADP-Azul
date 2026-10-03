/**
 * Repositorio Base Genérico
 * Aplica Principio de Responsabilidad Única (SRP), Inversión de Dependencias (DIP)
 * y Abierto/Cerrado (OCP)
 */
export class BaseRepository {
  constructor(storageKey, ModelClass, storageService) {
    if (!storageKey) throw new Error('storageKey es requerido');
    if (!ModelClass) throw new Error('ModelClass es requerido');
    if (!storageService) throw new Error('storageService es requerido');

    this.storageKey = storageKey;
    this.ModelClass = ModelClass;
    this.storageService = storageService;
  }

  getAll() {
    const rawData = this.storageService.getItem(this.storageKey, []);
    return rawData.map(item => new this.ModelClass(item));
  }

  getById(id) {
    if (!id) return null;
    const items = this.getAll();
    return items.find(item => item.id === id) || null;
  }

  create(entity) {
    if (!entity) throw new Error('Entidad inválida para creación');
    const items = this.getAll();
    items.push(entity);
    this._persist(items);
    return entity;
  }

  update(id, updatedData) {
    const items = this.getAll();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error(`Entidad con id ${id} no encontrada para actualización`);
    }

    const currentItem = items[index];
    const updatedEntity = new this.ModelClass({
      ...currentItem.toJSON(),
      ...updatedData,
      id: currentItem.id,
      createdAt: currentItem.createdAt
    });
    updatedEntity.touch();

    items[index] = updatedEntity;
    this._persist(items);
    return updatedEntity;
  }

  delete(id) {
    const items = this.getAll();
    const initialLength = items.length;
    const filtered = items.filter(item => item.id !== id);
    if (filtered.length === initialLength) {
      return false;
    }
    this._persist(filtered);
    return true;
  }

  find(predicate) {
    const items = this.getAll();
    return items.filter(predicate);
  }

  findOne(predicate) {
    const items = this.getAll();
    return items.find(predicate) || null;
  }

  _persist(entities) {
    const rawData = entities.map(e => (typeof e.toJSON === 'function' ? e.toJSON() : e));
    this.storageService.setItem(this.storageKey, rawData);
  }
}
