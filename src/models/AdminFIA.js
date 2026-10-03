import { User, USER_ROLES } from './User.js';

/**
 * Especialización de Usuario: Administrador de la FIA
 * Aplica Liskov Substitution Principle (LSP)
 */
export class AdminFIA extends User {
  constructor(params = {}) {
    super({
      ...params,
      rol: USER_ROLES.ADMIN_FIA
    });
    this.cargo = params.cargo || 'Comisario Deportivo FIA';
    this.departamento = params.departamento || 'Dirección de Carrera y Reglamentación';
    this.licenciaFIA = params.licenciaFIA || 'FIA-SUPER-COMM-2026';
  }

  getRoleLabel() {
    return 'Administrador FIA';
  }
}
