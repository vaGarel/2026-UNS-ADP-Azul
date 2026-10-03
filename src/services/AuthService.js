import { STORAGE_KEYS } from '../config/constants.js';
import { User, USER_ROLES } from '../models/User.js';
import { AdminFIA } from '../models/AdminFIA.js';
import { AdminEscuderia } from '../models/AdminEscuderia.js';
import { PublicUser } from '../models/PublicUser.js';

/**
 * Servicio de Autenticación y Gestión de Sesión Activa
 */
export class AuthService {
  constructor(storageService, userRepository, eventEmitter) {
    this.storageService = storageService;
    this.userRepository = userRepository;
    this.eventEmitter = eventEmitter;
    this.currentUser = this._loadCurrentUser();
  }

  _loadCurrentUser() {
    const raw = this.storageService.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) {
      const users = this.userRepository.getAll();
      return users[0] || new AdminFIA({ nombre: 'Admin FIA Oficial' });
    }
    return this._hydrateUser(raw);
  }

  _hydrateUser(raw) {
    switch (raw.rol) {
      case USER_ROLES.ADMIN_FIA:
        return new AdminFIA(raw);
      case USER_ROLES.ADMIN_ESCUDERIA:
        return new AdminEscuderia(raw);
      case USER_ROLES.PUBLICO:
      default:
        return new PublicUser(raw);
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  switchUser(userId) {
    const user = this.userRepository.getById(userId);
    if (!user) {
      throw new Error(`Usuario con ID ${userId} no encontrado.`);
    }

    this.currentUser = user;
    this.storageService.setItem(STORAGE_KEYS.CURRENT_USER, user.toJSON());
    this.eventEmitter.emit('auth:userChanged', this.currentUser);
    return this.currentUser;
  }

  getAvailableUsers() {
    return this.userRepository.getAll();
  }
}
