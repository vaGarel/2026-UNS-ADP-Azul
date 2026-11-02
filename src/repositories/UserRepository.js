import { BaseRepository } from './BaseRepository.js';
import { User, USER_ROLES } from '../models/User.js';
import { AdminFIA } from '../models/AdminFIA.js';
import { AdminEscuderia } from '../models/AdminEscuderia.js';
import { PublicUser } from '../models/PublicUser.js';

/**
 * Repositorio de Usuarios FIA
 * Gestiona la persistencia de cuentas y hash de credenciales en almacenamiento
 */
export class UserRepository extends BaseRepository {
  constructor(storageService) {
    super('fia_users', User, storageService);
  }

  getAll() {
    const rawData = this.storageService.getItem(this.storageKey, []);
    return rawData.map(item => {
      switch (item.rol) {
        case USER_ROLES.ADMIN_FIA:
          return new AdminFIA(item);
        case USER_ROLES.ADMIN_ESCUDERIA:
          return new AdminEscuderia(item);
        case USER_ROLES.PUBLICO:
        default:
          return new PublicUser(item);
      }
    });
  }

  getByEmail(email) {
    if (!email) return null;
    const normalizedEmail = email.trim().toLowerCase();
    return this.findOne(u => u.email?.toLowerCase() === normalizedEmail);
  }

  getByUsername(username) {
    if (!username) return null;
    const normalizedUsername = username.trim().toLowerCase();
    return this.findOne(u => u.username?.toLowerCase() === normalizedUsername);
  }

  getPasswordHashByEmail(email) {
    if (!email) return null;
    const normalizedEmail = email.trim().toLowerCase();
    const users = this.storageService.getItem(this.storageKey, []);
    return users.find(user => user.email?.toLowerCase() === normalizedEmail)?.passwordHash || null;
  }

  getPasswordHashById(id) {
    if (!id) return null;
    const users = this.storageService.getItem(this.storageKey, []);
    return users.find(user => user.id === id)?.passwordHash || null;
  }

  getByRole(role) {
    return this.find(u => u.rol === role);
  }

  create(entity, passwordHash = null) {
    if (!entity) throw new Error('Entidad inválida para creación');
    const rawUsers = this.storageService.getItem(this.storageKey, []);
    const entityJson = typeof entity.toJSON === 'function' ? entity.toJSON() : entity;
    const rawRecord = {
      ...entityJson,
      passwordHash: passwordHash || entity.passwordHash || null
    };
    rawUsers.push(rawRecord);
    this.storageService.setItem(this.storageKey, rawUsers);
    return this.getById(entity.id);
  }

  update(id, updatedData, newPasswordHash = null) {
    const rawUsers = this.storageService.getItem(this.storageKey, []);
    const index = rawUsers.findIndex(u => u.id === id);
    if (index === -1) {
      throw new Error(`Usuario con id ${id} no encontrado para actualización`);
    }

    const currentRaw = rawUsers[index];
    const passwordHash = newPasswordHash !== null
      ? newPasswordHash
      : (updatedData.passwordHash || currentRaw.passwordHash || null);

    const { passwordHash: _, ...cleanData } = updatedData;

    const updatedRecord = {
      ...currentRaw,
      ...cleanData,
      id: currentRaw.id,
      createdAt: currentRaw.createdAt,
      updatedAt: new Date().toISOString(),
      passwordHash
    };

    rawUsers[index] = updatedRecord;
    this.storageService.setItem(this.storageKey, rawUsers);
    return this.getById(id);
  }

  delete(id) {
    const rawUsers = this.storageService.getItem(this.storageKey, []);
    const initialLength = rawUsers.length;
    const filtered = rawUsers.filter(u => u.id !== id);
    if (filtered.length === initialLength) {
      return false;
    }
    this.storageService.setItem(this.storageKey, filtered);
    return true;
  }
}
