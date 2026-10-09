import { STORAGE_KEYS } from '../config/constants.js';
import {
  INITIAL_TEAMS,
  INITIAL_DRIVERS,
  INITIAL_CARS,
  INITIAL_EVENTS,
  INITIAL_RACE_RESULTS,
  INITIAL_USERS
} from '../config/seedData.js';

/**
 * Servicio de Almacenamiento Local
 * Encapsula la persistencia y asegura la inicialización de datos de prueba
 */
export class StorageService {
  constructor() {
    this._initializeDatabase();
  }

  _initializeDatabase() {
    const isSeeded = this.getItem(STORAGE_KEYS.SEEDED, false);
    if (!isSeeded) {
      this.resetDatabase();
    }
    this._migrateAuthData();
  }

  resetDatabase() {
    this.setItem(STORAGE_KEYS.TEAMS, INITIAL_TEAMS);
    this.setItem(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
    this.setItem(STORAGE_KEYS.CARS, INITIAL_CARS);
    this.setItem(STORAGE_KEYS.CAR_INSPECTIONS, []);
    this.setItem(STORAGE_KEYS.EVENTS, INITIAL_EVENTS);
    this.setItem(STORAGE_KEYS.RACE_RESULTS, INITIAL_RACE_RESULTS);
    this.setItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    this.removeItem(STORAGE_KEYS.CURRENT_USER);
    this.setItem(STORAGE_KEYS.SEEDED, true);
  }

  _migrateAuthData() {
    const storedUsers = this.getItem(STORAGE_KEYS.USERS, []);
    if (Array.isArray(storedUsers)) {
      const migratedUsers = storedUsers.map(user => {
        const seededUser = INITIAL_USERS.find(candidate => candidate.id === user.id);
        return seededUser
          ? {
              ...user,
              username: user.username || seededUser.username,
              passwordHash: user.passwordHash || seededUser.passwordHash
            }
          : user;
      });
      this.setItem(STORAGE_KEYS.USERS, migratedUsers);
    }

    if (!this.getItem(STORAGE_KEYS.AUTH_MIGRATED, false)) {
      this.removeItem(STORAGE_KEYS.CURRENT_USER);
      this.setItem(STORAGE_KEYS.AUTH_MIGRATED, true);
    }
  }

  getItem(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error(`Error reading from localStorage key "${key}":`, e);
      return defaultValue;
    }
  }

  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing to localStorage key "${key}":`, e);
    }
  }

  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing localStorage key "${key}":`, e);
    }
  }
}
