import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { STORAGE_KEYS } from '../src/config/constants.js';
import { INITIAL_USERS, INITIAL_TEAMS } from '../src/config/seedData.js';
import { UserRepository } from '../src/repositories/UserRepository.js';
import { TeamRepository } from '../src/repositories/TeamRepository.js';
import { AuthService } from '../src/services/AuthService.js';
import { UserService } from '../src/services/UserService.js';
import { USER_ROLES } from '../src/models/User.js';

const DEMO_PASSWORD = 'FIA2026Demo!';

const createMemoryStorage = initialData => {
  const store = structuredClone(initialData);
  return {
    getItem(key, defaultValue = null) {
      return key in store ? structuredClone(store[key]) : defaultValue;
    },
    setItem(key, value) {
      store[key] = structuredClone(value);
    },
    removeItem(key) {
      delete store[key];
    }
  };
};

describe('UserService & User Story 23 (CRUD de Usuarios)', () => {
  let storage;
  let userRepository;
  let teamRepository;
  let eventEmitter;
  let authService;
  let userService;

  beforeEach(async () => {
    vi.stubGlobal('crypto', webcrypto);
    storage = createMemoryStorage({
      [STORAGE_KEYS.USERS]: INITIAL_USERS,
      [STORAGE_KEYS.TEAMS]: INITIAL_TEAMS
    });
    userRepository = new UserRepository(storage);
    teamRepository = new TeamRepository(storage);
    eventEmitter = { emit: vi.fn() };
    authService = new AuthService(storage, userRepository, eventEmitter);
    userService = new UserService(userRepository, teamRepository, authService, eventEmitter);

    // Iniciar sesión por defecto con Admin FIA (race.director@fia.com)
    await authService.login('race.director@fia.com', DEMO_PASSWORD);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Criterio de Aceptación 1: Crear, modificar y eliminar cuentas', () => {
    it('permite al usuario administrativo de la FIA crear un nuevo responsable de escudería', async () => {
      const newEscuderiaData = {
        nombre: 'Andrea Stella',
        username: 'astella_mclaren',
        email: 'astella@mclarenf1.com',
        password: 'Password2026!',
        rol: USER_ROLES.ADMIN_ESCUDERIA,
        escuderiaId: 'team-mclaren',
        cargoEquipo: 'Team Principal'
      };

      const created = await userService.createUser(newEscuderiaData);

      expect(created).toBeDefined();
      expect(created.nombre).toBe('Andrea Stella');
      expect(created.username).toBe('astella_mclaren');
      expect(created.email).toBe('astella@mclarenf1.com');
      expect(created.rol).toBe(USER_ROLES.ADMIN_ESCUDERIA);
      expect(created.escuderiaId).toBe('team-mclaren');
      expect(created.escuderiaNombre).toBe('McLaren Formula 1 Team');
      expect(created.cargoEquipo).toBe('Team Principal');
      expect(created.activo).toBe(true);

      // El objeto devuelto no expone passwordHash en claro
      expect(JSON.stringify(created)).not.toContain('passwordHash');

      // Se emite evento reactivo
      expect(eventEmitter.emit).toHaveBeenCalledWith('users:updated', expect.objectContaining({
        action: 'create',
        user: expect.objectContaining({ id: created.id })
      }));
    });

    it('permite al usuario administrativo de la FIA crear un nuevo comisario/personal FIA', async () => {
      const newFiaData = {
        nombre: 'Garry Connelly',
        username: 'garry_steward',
        email: 'garry.connelly@fia.com',
        password: 'StewardSecure2026!',
        rol: USER_ROLES.ADMIN_FIA,
        cargo: 'Presidente del Colegio de Comisarios',
        departamento: 'Comisariato Deportivo',
        licenciaFIA: 'FIA-STEWARD-042'
      };

      const created = await userService.createUser(newFiaData);

      expect(created.rol).toBe(USER_ROLES.ADMIN_FIA);
      expect(created.licenciaFIA).toBe('FIA-STEWARD-042');
      expect(created.cargo).toBe('Presidente del Colegio de Comisarios');
      expect(created.isAdminFIA()).toBe(true);
      expect(created.canManageUsers()).toBe(true);
    });

    it('permite modificar la información de un usuario existente', async () => {
      const users = userService.getAllUsers();
      const ferrariAdmin = users.find(u => u.username === 'ferrari_team');

      const updated = await userService.updateUser(ferrariAdmin.id, {
        nombre: 'Frédéric Vasseur Senior',
        cargoEquipo: 'General Team Principal & CEO'
      });

      expect(updated.nombre).toBe('Frédéric Vasseur Senior');
      expect(updated.cargoEquipo).toBe('General Team Principal & CEO');
      expect(eventEmitter.emit).toHaveBeenCalledWith('users:updated', expect.objectContaining({
        action: 'update'
      }));
    });

    it('permite eliminar una cuenta de responsable de escudería', async () => {
      const users = userService.getAllUsers();
      const redbullAdmin = users.find(u => u.username === 'redbull_team');

      const result = userService.deleteUser(redbullAdmin.id);

      expect(result).toBe(true);
      expect(userRepository.getById(redbullAdmin.id)).toBeNull();
      expect(eventEmitter.emit).toHaveBeenCalledWith('users:updated', expect.objectContaining({
        action: 'delete',
        userId: redbullAdmin.id
      }));
    });

    it('impide a un administrador FIA eliminar su propia cuenta activa', async () => {
      const currentUser = authService.getCurrentUser();
      expect(() => userService.deleteUser(currentUser.id)).toThrow(/No puedes eliminar tu propia cuenta/);
    });

    it('impide eliminar al único administrador FIA activo del sistema', async () => {
      // Dejar un solo admin FIA
      const users = storage.getItem(STORAGE_KEYS.USERS);
      const singleFiaUsers = users.filter(u => u.rol !== USER_ROLES.ADMIN_FIA || u.id === 'usr-admin-fia');
      storage.setItem(STORAGE_KEYS.USERS, singleFiaUsers);

      // Crear otro usuario para poder intentar eliminar el admin FIA sin ser auto-eliminación
      const secondAdmin = await userService.createUser({
        nombre: 'Segundo Admin FIA',
        username: 'fia_second',
        email: 'second@fia.com',
        password: 'Password2026!',
        rol: USER_ROLES.ADMIN_FIA
      });

      // Ahora nos logueamos como el segundo
      await authService.login('second@fia.com', 'Password2026!');

      // Intentamos eliminar el primer admin FIA (ahora quedan 2, debería permitir)
      expect(userService.deleteUser('usr-admin-fia')).toBe(true);

      // Ahora solo queda 1 admin FIA (second@fia.com). Si se intenta eliminar, debe fallar
      expect(() => userService.deleteUser(secondAdmin.id)).toThrow();
    });
  });

  describe('Criterio de Aceptación 2: Autenticación de usuarios registrados y vistas específicas', () => {
    it('un usuario recién creado puede autenticarse con sus credenciales y acceder a sus vistas', async () => {
      // 1. Crear nuevo usuario de escudería
      await userService.createUser({
        nombre: 'Toto Wolff',
        username: 'toto_mercedes',
        email: 'toto@mercedesf1.com',
        password: 'SilverArrows2026!',
        rol: USER_ROLES.ADMIN_ESCUDERIA,
        escuderiaId: 'team-mercedes',
        cargoEquipo: 'Team Principal & CEO'
      });

      // 2. Cerrar sesión del admin FIA
      authService.logout();
      expect(authService.getCurrentUser()).toBeNull();

      // 3. Iniciar sesión con el nuevo usuario
      const loggedUser = await authService.login('toto@mercedesf1.com', 'SilverArrows2026!');
      expect(loggedUser).toBeDefined();
      expect(loggedUser.username).toBe('toto_mercedes');
      expect(loggedUser.isAdminEscuderia()).toBe(true);
      expect(loggedUser.canAcknowledgeNotifications()).toBe(true);
      expect(loggedUser.canManageUsers()).toBe(false);
      expect(loggedUser.canManageCalendar()).toBe(false);
      expect(loggedUser.getRoleLabel()).toContain('Mercedes-AMG PETRONAS');
    });

    it('un usuario modificado con nueva contraseña puede autenticarse con la nueva y no con la anterior', async () => {
      const ferrariAdmin = userRepository.getByEmail('fvasseur@ferrari.com');

      // Modificar contraseña
      await userService.updateUser(ferrariAdmin.id, {
        password: 'NuevaPassword2026!'
      });

      // La contraseña antigua debe ser rechazada
      expect(await authService.login('fvasseur@ferrari.com', DEMO_PASSWORD)).toBeNull();

      // La nueva contraseña debe autenticar exitosamente
      const user = await authService.login('fvasseur@ferrari.com', 'NuevaPassword2026!');
      expect(user).toBeDefined();
      expect(user.username).toBe('ferrari_team');
    });

    it('un usuario eliminado no puede volver a autenticarse', async () => {
      const redbullAdmin = userRepository.getByEmail('chorner@redbullracing.com');
      userService.deleteUser(redbullAdmin.id);

      authService.logout();
      const loginAttempt = await authService.login('chorner@redbullracing.com', DEMO_PASSWORD);
      expect(loginAttempt).toBeNull();
    });

    it('un usuario desactivado no puede autenticarse', async () => {
      const ferrariAdmin = userRepository.getByEmail('fvasseur@ferrari.com');
      await userService.updateUser(ferrariAdmin.id, { activo: false });

      authService.logout();
      const loginAttempt = await authService.login('fvasseur@ferrari.com', DEMO_PASSWORD);
      expect(loginAttempt).toBeNull();
    });
  });

  describe('Criterio de Aceptación 3: Validaciones y restricción de perfiles no autorizados', () => {
    it('restringe la creación de usuarios si el usuario activo no es Administrativo de la FIA', async () => {
      // Iniciar sesión con responsable de escudería
      await authService.login('fvasseur@ferrari.com', DEMO_PASSWORD);

      await expect(userService.createUser({
        nombre: 'Intruso',
        username: 'intruso',
        email: 'intruso@fia.com',
        password: 'Password123!',
        rol: USER_ROLES.ADMIN_FIA
      })).rejects.toThrow(/No autorizado/);
    });

    it('restringe la creación de perfiles no autorizados (ej. Público u otros roles)', async () => {
      await expect(userService.createUser({
        nombre: 'Usuario Fan',
        username: 'fan_user',
        email: 'fan@motorsport.com',
        password: 'Password123!',
        rol: USER_ROLES.PUBLICO
      })).rejects.toThrow(/Perfil no autorizado/);

      await expect(userService.createUser({
        nombre: 'Rol Invalido',
        username: 'hacker',
        email: 'hack@motorsport.com',
        password: 'Password123!',
        rol: 'SUPER_ADMIN_CUSTOM'
      })).rejects.toThrow(/Perfil no autorizado/);
    });

    it('valida datos obligatorios: nombre, username, email y contraseña', async () => {
      // Nombre muy corto
      await expect(userService.createUser({
        nombre: 'A',
        username: 'valid_user',
        email: 'user@fia.com',
        password: 'Password123!',
        rol: USER_ROLES.ADMIN_FIA
      })).rejects.toThrow(/El nombre es obligatorio/);

      // Username con caracteres inválidos
      await expect(userService.createUser({
        nombre: 'Usuario Valido',
        username: 'user with spaces!',
        email: 'user@fia.com',
        password: 'Password123!',
        rol: USER_ROLES.ADMIN_FIA
      })).rejects.toThrow(/El nombre de usuario solo puede contener/);

      // Email inválido
      await expect(userService.createUser({
        nombre: 'Usuario Valido',
        username: 'valid_user',
        email: 'no-es-un-email',
        password: 'Password123!',
        rol: USER_ROLES.ADMIN_FIA
      })).rejects.toThrow(/correo electrónico no posee un formato válido/);

      // Contraseña muy corta
      await expect(userService.createUser({
        nombre: 'Usuario Valido',
        username: 'valid_user',
        email: 'user@fia.com',
        password: '123',
        rol: USER_ROLES.ADMIN_FIA
      })).rejects.toThrow(/La contraseña es obligatoria/);
    });

    it('valida unicidad de username y email', async () => {
      // Intentar crear con username ya existente
      await expect(userService.createUser({
        nombre: 'Duplicado Username',
        username: 'fia_admin', // Ya existe en seed
        email: 'otro@fia.com',
        password: 'Password123!',
        rol: USER_ROLES.ADMIN_FIA
      })).rejects.toThrow(/ya se encuentra registrado/);

      // Intentar crear con email ya existente
      await expect(userService.createUser({
        nombre: 'Duplicado Email',
        username: 'nuevo_username',
        email: 'race.director@fia.com', // Ya existe en seed
        password: 'Password123!',
        rol: USER_ROLES.ADMIN_FIA
      })).rejects.toThrow(/ya se encuentra registrado/);
    });

    it('valida que un responsable de escudería tenga una escudería existente asignada', async () => {
      // Sin escudería
      await expect(userService.createUser({
        nombre: 'Responsable Sin Equipo',
        username: 'sin_equipo',
        email: 'sin_equipo@gp.com',
        password: 'Password123!',
        rol: USER_ROLES.ADMIN_ESCUDERIA
      })).rejects.toThrow(/Debe seleccionar la escudería/);

      // Con escudería inexistente
      await expect(userService.createUser({
        nombre: 'Responsable Equipo Fantasma',
        username: 'equipo_fantasma',
        email: 'fantasma@gp.com',
        password: 'Password123!',
        rol: USER_ROLES.ADMIN_ESCUDERIA,
        escuderiaId: 'team-inexistente-999'
      })).rejects.toThrow(/La escudería seleccionada no existe/);
    });
  });
});

