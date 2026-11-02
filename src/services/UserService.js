import { USER_ROLES } from '../models/User.js';
import { AdminFIA } from '../models/AdminFIA.js';
import { AdminEscuderia } from '../models/AdminEscuderia.js';
import { hashCredentials } from '../utils/crypto.js';

/**
 * Servicio de Gestión de Usuarios y Accesos FIA (US 23)
 * Aplica Principio de Responsabilidad Única (SRP), Inversión de Dependencias (DIP)
 * y Abierto/Cerrado (OCP).
 */
export class UserService {
  constructor(userRepository, teamRepository, authService, eventEmitter) {
    this.userRepository = userRepository;
    this.teamRepository = teamRepository;
    this.authService = authService;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Verifica que el usuario en sesión sea un Administrador de la FIA
   * @private
   */
  _assertCanManageUsers() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.canManageUsers()) {
      throw new Error('No autorizado: Solo el personal administrativo de la FIA puede gestionar cuentas de usuario.');
    }
    return currentUser;
  }

  /**
   * Restringe la creación y modificación a perfiles autorizados (FIA y Responsables de Escudería)
   * @private
   */
  _assertAuthorizedRole(rol) {
    const authorizedRoles = [USER_ROLES.ADMIN_FIA, USER_ROLES.ADMIN_ESCUDERIA];
    if (!authorizedRoles.includes(rol)) {
      throw new Error('Perfil no autorizado: Solo se permite crear y gestionar cuentas para personal administrativo de la FIA y responsables de escuderías.');
    }
  }

  /**
   * Valida los datos comunes y específicos de la cuenta de usuario
   * @private
   */
  _validateUserData(data, existingId = null, isCreation = false) {
    if (!data || typeof data !== 'object') {
      throw new Error('Los datos del usuario son inválidos.');
    }

    // 1. Validación de Nombre
    const nombre = (data.nombre || '').trim();
    if (!nombre || nombre.length < 2) {
      throw new Error('El nombre es obligatorio y debe contener al menos 2 caracteres.');
    }

    // 2. Validación de Nombre de Usuario
    const username = (data.username || '').trim();
    if (!username || username.length < 3) {
      throw new Error('El nombre de usuario es obligatorio y debe contener al menos 3 caracteres.');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw new Error('El nombre de usuario solo puede contener letras, números, guiones y guiones bajos.');
    }

    // Unicidad de Username
    const existingByUsername = this.userRepository.getByUsername(username);
    if (existingByUsername && existingByUsername.id !== existingId) {
      throw new Error(`El nombre de usuario "${username}" ya se encuentra registrado.`);
    }

    // 3. Validación de Email
    const email = (data.email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error('El correo electrónico no posee un formato válido.');
    }

    // Unicidad de Email
    const existingByEmail = this.userRepository.getByEmail(email);
    if (existingByEmail && existingByEmail.id !== existingId) {
      throw new Error(`El correo electrónico "${email}" ya se encuentra registrado.`);
    }

    // 4. Validación de Rol Autorizado
    this._assertAuthorizedRole(data.rol);

    // 5. Validación de Contraseña
    if (isCreation) {
      if (!data.password || typeof data.password !== 'string' || data.password.trim().length < 6) {
        throw new Error('La contraseña es obligatoria para nuevos usuarios y debe tener al menos 6 caracteres.');
      }
    } else if (data.password !== undefined && data.password !== '') {
      if (typeof data.password !== 'string' || data.password.trim().length < 6) {
        throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
      }
    }

    // 6. Validaciones Específicas por Rol
    if (data.rol === USER_ROLES.ADMIN_ESCUDERIA) {
      if (!data.escuderiaId) {
        throw new Error('Debe seleccionar la escudería a la cual pertenece el responsable.');
      }
      const team = this.teamRepository.getById(data.escuderiaId);
      if (!team) {
        throw new Error('La escudería seleccionada no existe en el sistema.');
      }
    }
  }

  /**
   * Obtiene todos los usuarios registrados
   */
  getAllUsers() {
    this._assertCanManageUsers();
    return this.userRepository.getAll();
  }

  /**
   * Obtiene un usuario por su ID
   */
  getUserById(id) {
    this._assertCanManageUsers();
    return this.userRepository.getById(id);
  }

  /**
   * Crea una nueva cuenta de usuario (Admin FIA o Admin Escudería)
   */
  async createUser(data) {
    this._assertCanManageUsers();
    this._validateUserData(data, null, true);

    const email = data.email.trim().toLowerCase();
    const password = data.password.trim();
    const passwordHash = await hashCredentials(email, password);

    const baseParams = {
      nombre: data.nombre.trim(),
      username: data.username.trim(),
      email: email,
      avatar: (data.avatar || '').trim(),
      activo: data.activo !== false
    };

    let userEntity;
    if (data.rol === USER_ROLES.ADMIN_FIA) {
      userEntity = new AdminFIA({
        ...baseParams,
        cargo: (data.cargo || '').trim() || 'Comisario Deportivo FIA',
        departamento: (data.departamento || '').trim() || 'Dirección de Carrera y Reglamentación',
        licenciaFIA: (data.licenciaFIA || '').trim() || 'FIA-COMM-2026'
      });
    } else if (data.rol === USER_ROLES.ADMIN_ESCUDERIA) {
      const team = this.teamRepository.getById(data.escuderiaId);
      userEntity = new AdminEscuderia({
        ...baseParams,
        escuderiaId: team.id,
        escuderiaNombre: team.nombre,
        cargoEquipo: (data.cargoEquipo || '').trim() || 'Team Principal / Director Deportivo'
      });
    }

    const createdUser = this.userRepository.create(userEntity, passwordHash);
    this.eventEmitter.emit('users:updated', { action: 'create', user: createdUser });
    return createdUser;
  }

  /**
   * Modifica la información de un usuario existente
   */
  async updateUser(id, data) {
    this._assertCanManageUsers();
    const existing = this.userRepository.getById(id);
    if (!existing) {
      throw new Error(`El usuario con ID "${id}" no existe.`);
    }

    this._validateUserData({ ...existing, ...data }, id, false);

    const email = (data.email || existing.email).trim().toLowerCase();
    let newPasswordHash = null;

    if (data.password && data.password.trim().length > 0) {
      newPasswordHash = await hashCredentials(email, data.password.trim());
    } else if (email !== existing.email.toLowerCase()) {
      throw new Error('Al modificar la dirección de correo electrónico, debe ingresar una nueva contraseña para actualizar las credenciales.');
    }

    const updatePayload = {
      nombre: (data.nombre !== undefined ? data.nombre : existing.nombre).trim(),
      username: (data.username !== undefined ? data.username : existing.username).trim(),
      email: email,
      rol: data.rol !== undefined ? data.rol : existing.rol,
      avatar: data.avatar !== undefined ? (data.avatar || '').trim() : existing.avatar,
      activo: data.activo !== undefined ? Boolean(data.activo) : existing.activo
    };

    if (updatePayload.rol === USER_ROLES.ADMIN_FIA) {
      updatePayload.cargo = (data.cargo !== undefined ? data.cargo : existing.cargo || '').trim() || 'Comisario Deportivo FIA';
      updatePayload.departamento = (data.departamento !== undefined ? data.departamento : existing.departamento || '').trim() || 'Dirección de Carrera y Reglamentación';
      updatePayload.licenciaFIA = (data.licenciaFIA !== undefined ? data.licenciaFIA : existing.licenciaFIA || '').trim() || 'FIA-COMM-2026';
    } else if (updatePayload.rol === USER_ROLES.ADMIN_ESCUDERIA) {
      const teamId = data.escuderiaId || existing.escuderiaId;
      const team = this.teamRepository.getById(teamId);
      if (!team) {
        throw new Error('La escudería seleccionada no existe.');
      }
      updatePayload.escuderiaId = team.id;
      updatePayload.escuderiaNombre = team.nombre;
      updatePayload.cargoEquipo = (data.cargoEquipo !== undefined ? data.cargoEquipo : existing.cargoEquipo || '').trim() || 'Team Principal / Director Deportivo';
    }

    // Regla de seguridad: no desactivar propia cuenta o último admin FIA activo
    const currentUser = this.authService.getCurrentUser();
    if (updatePayload.activo === false) {
      if (currentUser?.id === id) {
        throw new Error('No puedes desactivar tu propia cuenta activa de administrador.');
      }
      if (existing.isAdminFIA()) {
        const remainingActiveAdmins = this.userRepository.getAll()
          .filter(u => u.isAdminFIA() && u.activo && u.id !== id);
        if (remainingActiveAdmins.length === 0) {
          throw new Error('No es posible desactivar al único administrador FIA activo en el sistema.');
        }
      }
    }

    const updatedUser = this.userRepository.update(id, updatePayload, newPasswordHash);
    this.eventEmitter.emit('users:updated', { action: 'update', user: updatedUser });
    return updatedUser;
  }

  /**
   * Elimina permanentemente una cuenta de usuario
   */
  deleteUser(id) {
    this._assertCanManageUsers();
    const existing = this.userRepository.getById(id);
    if (!existing) {
      throw new Error(`El usuario con ID "${id}" no existe.`);
    }

    // Regla de seguridad: no auto-eliminación
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id === id) {
      throw new Error('No puedes eliminar tu propia cuenta activa de administrador.');
    }

    // Regla de seguridad: no eliminar último admin FIA activo
    if (existing.isAdminFIA()) {
      const remainingActiveAdmins = this.userRepository.getAll()
        .filter(u => u.isAdminFIA() && u.activo && u.id !== id);
      if (remainingActiveAdmins.length === 0) {
        throw new Error('No es posible eliminar al único administrador FIA activo en el sistema.');
      }
    }

    const deleted = this.userRepository.delete(id);
    this.eventEmitter.emit('users:updated', { action: 'delete', userId: id });
    return deleted;
  }
}

