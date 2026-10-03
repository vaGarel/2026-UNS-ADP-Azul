import { BaseRepository } from './BaseRepository.js';
import { User, USER_ROLES } from '../models/User.js';
import { AdminFIA } from '../models/AdminFIA.js';
import { AdminEscuderia } from '../models/AdminEscuderia.js';
import { PublicUser } from '../models/PublicUser.js';

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
    return this.findOne(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getByRole(role) {
    return this.find(u => u.rol === role);
  }
}
