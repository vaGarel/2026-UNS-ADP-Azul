import { User, USER_ROLES } from '../models/User.js';
import { AdminFIA } from '../models/AdminFIA.js';
import { AdminEscuderia } from '../models/AdminEscuderia.js';
import { PublicUser } from '../models/PublicUser.js';

/**
 * Servicio de Administración de Cuentas y Perfiles de Usuarios
 */
export class UserAdminService {
  constructor(userRepository, authService, eventEmitter) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.eventEmitter = eventEmitter;
  }

  getUsers() {
    return this.userRepository.getAll();
  }

  createUser(userData) {
    this._assertIsFIAAdmin();

    let newUser;
    switch (userData.rol) {
      case USER_ROLES.ADMIN_FIA:
        newUser = new AdminFIA(userData);
        break;
      case USER_ROLES.ADMIN_ESCUDERIA:
        newUser = new AdminEscuderia(userData);
        break;
      case USER_ROLES.PUBLICO:
      default:
        newUser = new PublicUser(userData);
        break;
    }

    const saved = this.userRepository.create(newUser);
    this.eventEmitter.emit('users:updated', { action: 'create', user: saved });
    return saved;
  }

  updateUser(id, updatedData) {
    this._assertIsFIAAdmin();
    const saved = this.userRepository.update(id, updatedData);
    this.eventEmitter.emit('users:updated', { action: 'update', user: saved });
    return saved;
  }

  deleteUser(id) {
    this._assertIsFIAAdmin();
    const current = this.authService.getCurrentUser();
    if (current && current.id === id) {
      throw new Error('No puedes eliminar el usuario activo en sesión.');
    }
    const success = this.userRepository.delete(id);
    if (success) {
      this.eventEmitter.emit('users:updated', { action: 'delete', userId: id });
    }
    return success;
  }

  _assertIsFIAAdmin() {
    const user = this.authService.getCurrentUser();
    if (!user || !user.isAdminFIA()) {
      throw new Error('Permiso denegado: Solo el Administrador de la FIA puede gestionar usuarios del sistema.');
    }
  }
}
