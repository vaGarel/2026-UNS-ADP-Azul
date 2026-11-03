import { STORAGE_KEYS } from '../config/constants.js';
import { hashCredentials } from '../utils/crypto.js';
import { USER_ROLES } from '../models/User.js';
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

  /**
   * Permite el ingreso inmediato sin credenciales con rol de Público General
   */
  loginAsGuest() {
    let publicUser = this.userRepository.getByRole(USER_ROLES.PUBLICO)?.[0];
    if (!publicUser || !publicUser.activo) {
      publicUser = new PublicUser({
        id: 'usr-public-fan',
        nombre: 'Público General / Aficionado',
        username: 'f1_fan',
        email: 'fan.motorsport@grandprix.com',
        activo: true
      });
    }

    this.currentUser = publicUser;
    this.storageService.setItem(STORAGE_KEYS.CURRENT_USER, { id: publicUser.id });
    this.eventEmitter.emit('auth:userChanged', this.currentUser);
    return this.currentUser;
  }

  logout() {
    this.currentUser = null;
    this.storageService.removeItem(STORAGE_KEYS.CURRENT_USER);
    this.eventEmitter.emit('auth:userChanged', null);
  }
}
