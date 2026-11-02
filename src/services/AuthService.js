import { STORAGE_KEYS } from '../config/constants.js';
import { hashCredentials } from '../utils/crypto.js';

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
    if (!raw?.id) return null;

    const user = this.userRepository.getById(raw.id);
    return user?.activo ? user : null;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  async login(email, password) {
    if (typeof email !== 'string' || typeof password !== 'string') return null;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) return null;

    const user = this.userRepository.getByEmail(normalizedEmail);
    const passwordHash = this.userRepository.getPasswordHashByEmail(normalizedEmail);
    if (!user?.activo || !passwordHash) return null;

    const submittedHash = await hashCredentials(normalizedEmail, password);
    if (submittedHash !== passwordHash) return null;

    this.currentUser = user;
    this.storageService.setItem(STORAGE_KEYS.CURRENT_USER, { id: user.id });
    this.eventEmitter.emit('auth:userChanged', this.currentUser);
    return this.currentUser;
  }

  logout() {
    this.currentUser = null;
    this.storageService.removeItem(STORAGE_KEYS.CURRENT_USER);
    this.eventEmitter.emit('auth:userChanged', null);
  }
}
