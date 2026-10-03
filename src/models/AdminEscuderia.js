import { User, USER_ROLES } from './User.js';

/**
 * Especialización de Usuario: Administrador / Responsable de Escudería
 * Aplica Liskov Substitution Principle (LSP)
 */
export class AdminEscuderia extends User {
  constructor(params = {}) {
    super({
      ...params,
      rol: USER_ROLES.ADMIN_ESCUDERIA
    });
    this.escuderiaId = params.escuderiaId || null;
    this.escuderiaNombre = params.escuderiaNombre || 'Escudería no asignada';
    this.cargoEquipo = params.cargoEquipo || 'Team Principal / Director Deportivo';
  }

  getRoleLabel() {
    return `Admin Escudería (${this.escuderiaNombre})`;
  }

  isAuthorizedForTeam(targetTeamId) {
    return this.escuderiaId === targetTeamId;
  }
}
