import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { STORAGE_KEYS } from '../src/config/constants.js';
import { INITIAL_USERS } from '../src/config/seedData.js';
import { UserRepository } from '../src/repositories/UserRepository.js';
import { AuthService } from '../src/services/AuthService.js';
import { StorageService } from '../src/services/StorageService.js';
import { AuthController } from '../src/controllers/AuthController.js';
import { LoginView } from '../src/views/LoginView.js';
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

describe('AuthService', () => {
  let storage;
  let userRepository;
  let eventEmitter;
  let authService;

  beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto);
    storage = createMemoryStorage({ [STORAGE_KEYS.USERS]: INITIAL_USERS });
    userRepository = new UserRepository(storage);
    eventEmitter = { emit: vi.fn() };
    authService = new AuthService(storage, userRepository, eventEmitter);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['race.director@fia.com', USER_ROLES.ADMIN_FIA, 'fia_admin'],
    ['fvasseur@ferrari.com', USER_ROLES.ADMIN_ESCUDERIA, 'ferrari_team'],
    ['fan.motorsport@grandprix.com', USER_ROLES.PUBLICO, 'f1_fan']
  ])('authenticates %s as %s', async (email, role, username) => {
    const user = await authService.login(email, DEMO_PASSWORD);

    expect(user.rol).toBe(role);
    expect(user.username).toBe(username);
    expect(authService.getCurrentUser()).toBe(user);
    expect(eventEmitter.emit).toHaveBeenCalledWith('auth:userChanged', user);
  });

  it('rejects invalid credentials without creating a session', async () => {
    expect(await authService.login('race.director@fia.com', 'wrong-password')).toBeNull();
    expect(await authService.login('missing@fia.com', DEMO_PASSWORD)).toBeNull();
    expect(authService.getCurrentUser()).toBeNull();
    expect(storage.getItem(STORAGE_KEYS.CURRENT_USER)).toBeNull();
  });

  it('does not authenticate inactive accounts', async () => {
    const users = storage.getItem(STORAGE_KEYS.USERS);
    users[0].activo = false;
    storage.setItem(STORAGE_KEYS.USERS, users);

    expect(await authService.login('race.director@fia.com', DEMO_PASSWORD)).toBeNull();
  });

  it('restores a session from its user id and clears it on logout', async () => {
    const user = await authService.login('race.director@fia.com', DEMO_PASSWORD);
    expect(storage.getItem(STORAGE_KEYS.CURRENT_USER)).toEqual({ id: user.id });
    expect(JSON.stringify(user)).not.toContain('passwordHash');

    const restoredAuthService = new AuthService(storage, userRepository, eventEmitter);
    expect(restoredAuthService.getCurrentUser().username).toBe('fia_admin');

    restoredAuthService.logout();
    expect(restoredAuthService.getCurrentUser()).toBeNull();
    expect(storage.getItem(STORAGE_KEYS.CURRENT_USER)).toBeNull();
    expect(eventEmitter.emit).toHaveBeenLastCalledWith('auth:userChanged', null);
  });

  it('permite el acceso directo sin credenciales con rol de Público General (loginAsGuest)', () => {
    const user = authService.loginAsGuest();

    expect(user).toBeDefined();
    expect(user.rol).toBe(USER_ROLES.PUBLICO);
    expect(user.isPublico()).toBe(true);
    expect(user.isAdminFIA()).toBe(false);
    expect(user.isAdminEscuderia()).toBe(false);
    expect(user.canManageCalendar()).toBe(false);
    expect(user.canManageScores()).toBe(false);
    expect(authService.getCurrentUser()).toBe(user);
    expect(storage.getItem(STORAGE_KEYS.CURRENT_USER)).toEqual({ id: user.id });
    expect(eventEmitter.emit).toHaveBeenCalledWith('auth:userChanged', user);
  });
});

describe('LoginView y AuthController acceso de público general', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renderiza el botón de acceso sin credenciales para público general', () => {
    const fakeContainer = {
      innerHTML: '',
      querySelectorAll: vi.fn(() => []),
      querySelector: vi.fn(() => ({ addEventListener: vi.fn() }))
    };
    vi.stubGlobal('document', {
      getElementById: vi.fn(() => fakeContainer)
    });

    const loginView = new LoginView('main-content');
    loginView.render();

    expect(fakeContainer.innerHTML).toContain('id="btn-guest-login"');
    expect(fakeContainer.innerHTML).toContain('Ingresar sin iniciar sesión (Público General)');
  });

  it('AuthController ejecuta loginAsGuest y notifica al usuario', () => {
    const authServiceMock = {
      loginAsGuest: vi.fn(() => ({ id: 'guest-1', nombre: 'Aficionado F1' }))
    };
    const loginViewMock = {
      render: vi.fn(),
      setSubmitHandler: vi.fn(),
      setGuestHandler: vi.fn(),
      setError: vi.fn()
    };
    const toastMock = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn()
    };

    const controller = new AuthController(authServiceMock, loginViewMock, toastMock);
    controller.loginAsGuest();

    expect(authServiceMock.loginAsGuest).toHaveBeenCalled();
    expect(toastMock.info).toHaveBeenCalledWith(
      expect.stringContaining('Acceso Público'),
      expect.stringContaining('Aficionado F1')
    );
  });
});

describe('StorageService auth migration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds seeded demo credentials and clears legacy auto-login without resetting app data', () => {
    const legacyUsers = INITIAL_USERS.map(({ username, passwordHash, ...user }) => user);
    const entries = new Map([
      [STORAGE_KEYS.SEEDED, JSON.stringify(true)],
      [STORAGE_KEYS.USERS, JSON.stringify(legacyUsers)],
      [STORAGE_KEYS.CURRENT_USER, JSON.stringify({ id: 'usr-admin-fia' })],
      [STORAGE_KEYS.EVENTS, JSON.stringify([{ id: 'existing-event' }])]
    ]);

    vi.stubGlobal('localStorage', {
      getItem: key => entries.get(key) ?? null,
      setItem: (key, value) => entries.set(key, value),
      removeItem: key => entries.delete(key)
    });

    const storage = new StorageService();
    const migratedUsers = storage.getItem(STORAGE_KEYS.USERS);
    expect(migratedUsers[0].username).toBe('fia_admin');
    expect(migratedUsers[0].passwordHash).toBeTruthy();
    expect(storage.getItem(STORAGE_KEYS.CURRENT_USER)).toBeNull();
    expect(storage.getItem(STORAGE_KEYS.EVENTS)).toEqual([{ id: 'existing-event' }]);
  });
});
