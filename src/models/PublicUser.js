import { User, USER_ROLES } from './User.js';

/**
 * Especialización de Usuario: Público General y Aficionados
 * Aplica Liskov Substitution Principle (LSP)
 */
export class PublicUser extends User {
  constructor(params = {}) {
    super({
      ...params,
      rol: USER_ROLES.PUBLICO
    });
    this.escuderiaFavorita = params.escuderiaFavorita || 'Ferrari';
    this.recibirAlertas = params.recibirAlertas ?? true;
  }

  getRoleLabel() {
    return 'Público General / Fan';
  }
}
