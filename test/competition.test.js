import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompetitionProfileService } from '../src/services/CompetitionProfileService.js';
import { TechnicalInspectionService } from '../src/services/TechnicalInspectionService.js';
import { ScoreService } from '../src/services/ScoreService.js';
import { TeamRepository } from '../src/repositories/TeamRepository.js';
import { DriverRepository } from '../src/repositories/DriverRepository.js';
import { CarRepository } from '../src/repositories/CarRepository.js';
import { ScoreRepository } from '../src/repositories/ScoreRepository.js';
import { EventRepository } from '../src/repositories/EventRepository.js';
import { TechnicalInspectionRepository } from '../src/repositories/TechnicalInspectionRepository.js';
import { AdminFIA } from '../src/models/AdminFIA.js';
import { AdminEscuderia } from '../src/models/AdminEscuderia.js';
import { PublicUser } from '../src/models/PublicUser.js';
import { F1ScoringStrategy } from '../src/services/strategies/F1ScoringStrategy.js';
import { SportEvent } from '../src/models/SportEvent.js';
import { Team } from '../src/models/Team.js';
import { Driver, DRIVER_ROLES } from '../src/models/Driver.js';
import { Car } from '../src/models/Car.js';
import { INSPECTION_OUTCOMES, INSPECTION_TYPES, TechnicalInspection } from '../src/models/TechnicalInspection.js';
import { SanctionRepository } from '../src/repositories/SanctionRepository.js';
import { SanctionService } from '../src/services/SanctionService.js';
import { Sanction, SANCTION_STATUS, SANCTION_TYPES } from '../src/models/Sanction.js';
import { CompetitionManagementView } from '../src/views/CompetitionManagementView.js';

const createMemoryStorage = () => {
  const store = {};
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

describe('competition profile and car inspection management', () => {
  let storage;
  let teams;
  let drivers;
  let cars;
  let scores;
  let events;
  let inspections;
  let sanctions;
  let eventEmitter;
  let authService;
  let scoreService;
  let profileService;
  let inspectionService;
  let sanctionService;

  beforeEach(() => {
    storage = createMemoryStorage();
    teams = new TeamRepository(storage);
    drivers = new DriverRepository(storage);
    cars = new CarRepository(storage);
    scores = new ScoreRepository(storage);
    events = new EventRepository(storage);
    inspections = new TechnicalInspectionRepository(storage);
    sanctions = new SanctionRepository(storage);
    eventEmitter = { emit: vi.fn() };
    authService = { getCurrentUser: vi.fn(() => new AdminFIA({ id: 'fia-admin' })) };
    scoreService = new ScoreService(
      scores,
      events,
      teams,
      drivers,
      authService,
      eventEmitter,
      new F1ScoringStrategy()
    );
    profileService = new CompetitionProfileService(
      teams, drivers, cars, scores, scoreService, authService, eventEmitter
    );
    inspectionService = new TechnicalInspectionService(
      inspections, cars, authService, eventEmitter
    );
    sanctionService = new SanctionService(
      sanctions, drivers, teams, events, authService, eventEmitter
    );

    teams.create(new Team({ id: 'team-1', nombre: 'Apex Racing', puntosTotales: 12 }));
    drivers.create(new Driver({
      id: 'driver-1', nombre: 'Ari', apellido: 'Fast', numero: 7,
      escuderiaId: 'team-1', escuderiaNombre: 'Apex Racing', puntos: 12
    }));
    cars.create(new Car({
      id: 'car-1', numeroAuto: 7, modelo: 'Apex A1', escuderiaId: 'team-1',
      escuderiaNombre: 'Apex Racing', pilotoId: 'driver-1', pilotoNombre: 'Ari Fast'
    }));
    events.create(new SportEvent({ id: 'event-1', nombre: 'Test Grand Prix' }));
  });

  it('restricts profile and inspection mutations to FIA staff', () => {
    authService.getCurrentUser.mockReturnValue(new AdminEscuderia({
      nombre: 'Team administrator',
      escuderiaId: 'team-1'
    }));

    expect(() => profileService.createTeam({ nombre: 'New team' })).toThrow('Permiso denegado');
    expect(() => inspectionService.create({
      autoId: 'car-1',
      fecha: '2026-10-09',
      tipoInspeccion: INSPECTION_TYPES.SAFETY,
      resultado: INSPECTION_OUTCOMES.PASS
    })).toThrow('Permiso denegado');

    authService.getCurrentUser.mockReturnValue(new PublicUser({ nombre: 'Fan' }));
    expect(() => profileService.setTeamActive('team-1', false)).toThrow('Permiso denegado');
    expect(() => inspectionService.delete('inspection-1')).toThrow('Permiso denegado');
  });

  it('validates profile fields and creates records with derived statistics reset', () => {
    expect(() => profileService.createTeam({ nombre: '  ' })).toThrow('nombre del equipo');

    authService.getCurrentUser.mockReturnValue(new AdminEscuderia({
      id: 'team-admin-1',
      escuderiaId: 'team-1',
      nombre: 'Apex Principal'
    }));

    expect(() => profileService.createDriver({
      nombre: 'Ari',
      apellido: 'Fast',
      numero: 7,
      escuderiaId: 'team-1'
    })).toThrow('número ya está asignado');

    const created = profileService.createDriver({
      nombre: 'Nova',
      apellido: 'Speed',
      numero: 12,
      escuderiaId: 'team-1',
      puntos: 999,
      victorias: 99
    });
    expect(created.puntos).toBe(0);
    expect(created.victorias).toBe(0);
    expect(created.escuderiaNombre).toBe('Apex Racing');
  });

  it('archives and restores profiles while filtering inactive profiles from standings', () => {
    authService.getCurrentUser.mockReturnValue(new AdminFIA({ id: 'fia-admin' }));
    profileService.setTeamActive('team-1', false);

    authService.getCurrentUser.mockReturnValue(new AdminEscuderia({
      id: 'team-admin-1',
      escuderiaId: 'team-1'
    }));
    profileService.setDriverActive('driver-1', false);
    expect(teams.getStandings()).toHaveLength(0);
    expect(drivers.getStandings()).toHaveLength(0);
    expect(teams.getById('team-1').activo).toBe(false);
    expect(drivers.getById('driver-1').activo).toBe(false);

    authService.getCurrentUser.mockReturnValue(new AdminFIA({ id: 'fia-admin' }));
    profileService.setTeamActive('team-1', true);

    authService.getCurrentUser.mockReturnValue(new AdminEscuderia({
      id: 'team-admin-1',
      escuderiaId: 'team-1'
    }));
    profileService.setDriverActive('driver-1', true);
    expect(teams.getStandings()).toHaveLength(1);
    expect(drivers.getStandings()).toHaveLength(1);
  });

  it('prevents adding race scores for archived drivers or teams', () => {
    const resultData = {
      eventoId: 'event-1',
      pilotoId: 'driver-1',
      escuderiaId: 'team-1',
      posicion: 1
    };

    authService.getCurrentUser.mockReturnValue(new AdminEscuderia({
      id: 'team-admin-1',
      escuderiaId: 'team-1'
    }));
    profileService.setDriverActive('driver-1', false);

    authService.getCurrentUser.mockReturnValue(new AdminFIA({ id: 'fia-admin' }));
    expect(() => scoreService.registerRaceScore(resultData)).toThrow('piloto archivado');

    authService.getCurrentUser.mockReturnValue(new AdminEscuderia({
      id: 'team-admin-1',
      escuderiaId: 'team-1'
    }));
    profileService.setDriverActive('driver-1', true);

    authService.getCurrentUser.mockReturnValue(new AdminFIA({ id: 'fia-admin' }));
    profileService.setTeamActive('team-1', false);
    expect(() => scoreService.registerRaceScore(resultData)).toThrow('equipo archivado');
  });

  it('removes directly linked driver scores but preserves its team, car, inspection, and event', () => {
    const inspection = inspectionService.create({
      autoId: 'car-1',
      fecha: '2026-10-09',
      tipoInspeccion: INSPECTION_TYPES.WEIGHT,
      resultado: INSPECTION_OUTCOMES.PASS,
      observaciones: 'Within limits'
    });
    scoreService.registerRaceScore({
      eventoId: 'event-1',
      pilotoId: 'driver-1',
      escuderiaId: 'team-1',
      posicion: 1
    });
    expect(teams.getById('team-1').puntosTotales).toBe(25);

    authService.getCurrentUser.mockReturnValue(new AdminEscuderia({
      id: 'team-admin-1',
      escuderiaId: 'team-1'
    }));
    profileService.deleteDriver('driver-1');

    expect(drivers.getById('driver-1')).toBeNull();
    expect(scores.getByDriver('driver-1')).toHaveLength(0);
    expect(teams.getById('team-1').puntosTotales).toBe(0);
    expect(cars.getById('car-1')).not.toBeNull();
    expect(inspections.getById(inspection.id)).not.toBeNull();
    expect(events.getById('event-1')).not.toBeNull();
  });

  it('removes team-linked score history without deleting related profiles, cars, inspections, or events', () => {
    const inspection = inspectionService.create({
      autoId: 'car-1',
      fecha: '2026-10-09',
      tipoInspeccion: INSPECTION_TYPES.SAFETY,
      resultado: INSPECTION_OUTCOMES.FAIL
    });
    scoreService.registerRaceScore({
      eventoId: 'event-1',
      pilotoId: 'driver-1',
      escuderiaId: 'team-1',
      posicion: 1
    });

    profileService.deleteTeam('team-1');

    expect(teams.getById('team-1')).toBeNull();
    expect(scores.getByTeam('team-1')).toHaveLength(0);
    expect(drivers.getById('driver-1')).not.toBeNull();
    expect(cars.getById('car-1')).not.toBeNull();
    expect(inspections.getById(inspection.id)).not.toBeNull();
    expect(events.getById('event-1')).not.toBeNull();
  });

  it('validates and maintains dated per-car inspection records', () => {
    expect(() => inspectionService.create({
      autoId: 'car-1',
      fecha: '2026-99-42',
      tipoInspeccion: INSPECTION_TYPES.SAFETY,
      resultado: INSPECTION_OUTCOMES.PASS
    })).toThrow('fecha de inspección válida');
    expect(() => inspectionService.create({
      autoId: 'car-1',
      fecha: Symbol('invalid'),
      tipoInspeccion: INSPECTION_TYPES.SAFETY,
      resultado: INSPECTION_OUTCOMES.PASS
    })).toThrow('fecha de inspección válida');

    expect(() => inspectionService.create({
      autoId: 'car-1',
      fecha: '2026-10-09',
      tipoInspeccion: 'Custom inspection',
      resultado: INSPECTION_OUTCOMES.PASS
    })).toThrow('tipo de inspección válido');

    const inspection = inspectionService.create({
      autoId: 'car-1',
      fecha: '2026-10-09',
      tipoInspeccion: INSPECTION_TYPES.CHASSIS_AERO,
      resultado: INSPECTION_OUTCOMES.PASS,
      observaciones: 'Initial check'
    });
    expect(inspectionService.getByCar('car-1')).toHaveLength(1);

    const updated = inspectionService.update(inspection.id, {
      fecha: '2026-10-10',
      tipoInspeccion: INSPECTION_TYPES.CHASSIS_AERO,
      resultado: INSPECTION_OUTCOMES.FAIL,
      observaciones: 'Repair required'
    });
    expect(updated.resultado).toBe(INSPECTION_OUTCOMES.FAIL);
    expect(updated.observaciones).toBe('Repair required');

    inspectionService.delete(inspection.id);
    expect(inspectionService.getByCar('car-1')).toHaveLength(0);
  });

  describe('User Story 10: Registro y gestión de pilotos por Responsable de Escudería', () => {
    it('allows team admin to create, edit, archive and delete drivers for their own team', () => {
      authService.getCurrentUser.mockReturnValue(new AdminEscuderia({
        id: 'team-admin-1',
        escuderiaId: 'team-1',
        nombre: 'Team Principal Apex'
      }));

      // 1. Create a titular driver
      const titular = profileService.createDriver({
        nombre: 'Carlos',
        apellido: 'Veloz',
        numero: 14,
        escuderiaId: 'team-1',
        rol: DRIVER_ROLES.TITULAR,
        nacionalidad: 'España'
      });
      expect(titular.id).toBeDefined();
      expect(titular.isTitular()).toBe(true);
      expect(titular.escuderiaId).toBe('team-1');
      expect(drivers.getById(titular.id)).not.toBeNull();

      // 2. Create a reserve / suplente driver
      const suplente = profileService.createDriver({
        nombre: 'Mateo',
        apellido: 'Reserva',
        numero: 88,
        escuderiaId: 'team-1',
        rol: DRIVER_ROLES.SUPLENTE,
        nacionalidad: 'Argentina'
      });
      expect(suplente.isTitular()).toBe(false);
      expect(suplente.rol).toBe(DRIVER_ROLES.SUPLENTE);

      // 3. Edit their own driver
      const updated = profileService.updateDriver(titular.id, {
        nombre: 'Carlos Alberto',
        apellido: 'Veloz',
        numero: 14,
        rol: DRIVER_ROLES.TITULAR
      });
      expect(updated.nombre).toBe('Carlos Alberto');

      // 4. Archive their own driver
      profileService.setDriverActive(titular.id, false);
      expect(drivers.getById(titular.id).activo).toBe(false);

      // 5. Delete their own driver
      profileService.deleteDriver(suplente.id);
      expect(drivers.getById(suplente.id)).toBeNull();
    });

    it('prevents team admin from creating or modifying drivers belonging to other teams', () => {
      teams.create(new Team({ id: 'team-2', nombre: 'Rival Racing' }));
      drivers.create(new Driver({
        id: 'driver-rival',
        nombre: 'Rival',
        apellido: 'Pilot',
        numero: 99,
        escuderiaId: 'team-2',
        escuderiaNombre: 'Rival Racing'
      }));

      authService.getCurrentUser.mockReturnValue(new AdminEscuderia({
        id: 'team-admin-1',
        escuderiaId: 'team-1'
      }));

      // Cannot create driver for another team
      expect(() => profileService.createDriver({
        nombre: 'Intruder',
        apellido: 'Driver',
        numero: 15,
        escuderiaId: 'team-2'
      })).toThrow('solo puedes gestionar pilotos de tu propia escudería');

      // Cannot update another team's driver
      expect(() => profileService.updateDriver('driver-rival', {
        nombre: 'Hacked'
      })).toThrow('solo puedes gestionar pilotos de tu propia escudería');

      // Cannot delete another team's driver
      expect(() => profileService.deleteDriver('driver-rival'))
        .toThrow('solo puedes gestionar pilotos de tu propia escudería');
    });

    it('prevents public users from creating or modifying drivers', () => {
      authService.getCurrentUser.mockReturnValue(new PublicUser({ nombre: 'Fan' }));

      expect(() => profileService.createDriver({
        nombre: 'Fan',
        apellido: 'Driver',
        numero: 10,
        escuderiaId: 'team-1'
      })).toThrow('Permiso denegado');

      expect(() => profileService.updateDriver('driver-1', {
        nombre: 'Fan Edited'
      })).toThrow('Permiso denegado');
    });

    it('strictly forbids FIA admin from adding or modifying drivers', () => {
      authService.getCurrentUser.mockReturnValue(new AdminFIA({ id: 'fia-director' }));

      // FIA cannot create driver
      expect(() => profileService.createDriver({
        nombre: 'FIA Created',
        apellido: 'Driver',
        numero: 11,
        escuderiaId: 'team-1'
      })).toThrow('el personal FIA no puede agregar ni gestionar pilotos');

      // FIA cannot update driver
      expect(() => profileService.updateDriver('driver-1', {
        nombre: 'FIA Mod'
      })).toThrow('el personal FIA no puede agregar ni gestionar pilotos');

      // FIA cannot archive driver
      expect(() => profileService.setDriverActive('driver-1', false))
        .toThrow('el personal FIA no puede agregar ni gestionar pilotos');

      // FIA cannot delete driver
      expect(() => profileService.deleteDriver('driver-1'))
        .toThrow('el personal FIA no puede agregar ni gestionar pilotos');
    });
  });

  describe('User Stories 11 & 22: Visualización de pilotos titulares y suplentes por público y FIA', () => {
    it('accurately distinguishes titulares and suplentes and organizes them by team', () => {
      const titular = new Driver({
        id: 'drv-t',
        nombre: 'Lewis',
        apellido: 'Hamilton',
        rol: DRIVER_ROLES.TITULAR,
        escuderiaId: 'team-1'
      });
      const suplente = new Driver({
        id: 'drv-s',
        nombre: 'Oliver',
        apellido: 'Bearman',
        rol: DRIVER_ROLES.SUPLENTE,
        escuderiaId: 'team-1'
      });

      expect(titular.isTitular()).toBe(true);
      expect(suplente.isTitular()).toBe(false);
      expect(titular.rol).toBe('Piloto Titular');
      expect(suplente.rol).toBe('Piloto Reserva / Suplente');

      drivers.create(titular);
      drivers.create(suplente);

      const teamDrivers = drivers.getByTeam('team-1');
      expect(teamDrivers.some(d => d.isTitular())).toBe(true);
      expect(teamDrivers.some(d => !d.isTitular())).toBe(true);
    });
  });

  describe('User Stories 13 & 14: Visualización de controles técnicos y confidencialidad', () => {
    it('persists Grand Prix and date for technical inspections', () => {
      const inspection = inspectionService.create({
        autoId: 'car-1',
        granPremio: 'Gran Premio de Australia 2026',
        fecha: '2026-03-14',
        tipoInspeccion: INSPECTION_TYPES.WEIGHT,
        resultado: INSPECTION_OUTCOMES.PASS,
        observaciones: 'Peso total 799.8 kg'
      });

      expect(inspection.granPremio).toBe('Gran Premio de Australia 2026');
      expect(inspection.fecha).toBe('2026-03-14');
      expect(inspection.observaciones).toBe('Peso total 799.8 kg');
    });

    it('enforces confidential technical observation permissions for public vs teams and FIA', () => {
      const publicUser = new PublicUser({ nombre: 'Fan' });
      const teamAdmin = new AdminEscuderia({ escuderiaId: 'team-1' });
      const fiaAdmin = new AdminFIA({ id: 'fia-1' });

      expect(publicUser.canViewConfidentialTechnicalObservations()).toBe(false);
      expect(teamAdmin.canViewConfidentialTechnicalObservations()).toBe(true);
      expect(fiaAdmin.canViewConfidentialTechnicalObservations()).toBe(true);
    });
  });

  describe('User Stories 20 & 21: Visualización y gestión de sanciones deportivas', () => {
    it('allows FIA administrative staff to create, update, and delete sanctions', () => {
      authService.getCurrentUser.mockReturnValue(new AdminFIA({ id: 'fia-official' }));

      const sanction = sanctionService.create({
        pilotoId: 'driver-1',
        granPremio: 'Gran Premio de Australia 2026',
        fecha: '2026-03-15',
        motivo: 'Límites de pista reiterados en curva 4',
        tipoSancion: SANCTION_TYPES.TIME_5S,
        puntosPenalizacion: 1
      });

      expect(sanction.id).toBeDefined();
      expect(sanction.pilotoNombre).toBe('Ari Fast');
      expect(sanction.escuderiaNombre).toBe('Apex Racing');
      expect(sanction.puntosPenalizacion).toBe(1);
      expect(sanctionService.getAll()).toHaveLength(1);

      const updated = sanctionService.update(sanction.id, {
        motivo: 'Límites de pista e ignorar banderas amarillas',
        tipoSancion: SANCTION_TYPES.TIME_10S,
        puntosPenalizacion: 2,
        fecha: '2026-03-15'
      });
      expect(updated.motivo).toBe('Límites de pista e ignorar banderas amarillas');
      expect(updated.puntosPenalizacion).toBe(2);

      sanctionService.delete(sanction.id);
      expect(sanctionService.getAll()).toHaveLength(0);
    });

    it('prevents team administrators and public users from managing sanctions', () => {
      authService.getCurrentUser.mockReturnValue(new AdminEscuderia({ escuderiaId: 'team-1' }));
      expect(() => sanctionService.create({
        pilotoId: 'driver-1',
        fecha: '2026-03-15',
        motivo: 'Infracción',
        tipoSancion: SANCTION_TYPES.TIME_5S
      })).toThrow('solo el personal administrativo de la FIA');

      authService.getCurrentUser.mockReturnValue(new PublicUser({ nombre: 'Fan' }));
      expect(() => sanctionService.create({
        pilotoId: 'driver-1',
        fecha: '2026-03-15',
        motivo: 'Infracción',
        tipoSancion: SANCTION_TYPES.TIME_5S
      })).toThrow('solo el personal administrativo de la FIA');
    });

    it('allows public users and team admins to view sanctions (US20)', () => {
      // Created by FIA
      authService.getCurrentUser.mockReturnValue(new AdminFIA({ id: 'fia-official' }));
      sanctionService.create({
        pilotoId: 'driver-1',
        granPremio: 'Gran Premio de Australia 2026',
        fecha: '2026-03-15',
        motivo: 'Colisión evitable en curva 1',
        tipoSancion: SANCTION_TYPES.GRID_PENALTY,
        puntosPenalizacion: 2
      });

      // Public view
      authService.getCurrentUser.mockReturnValue(new PublicUser({ nombre: 'Fan' }));
      const publicSanctions = sanctionService.getAll();
      expect(publicSanctions).toHaveLength(1);
      expect(publicSanctions[0].pilotoNombre).toBe('Ari Fast');
      expect(publicSanctions[0].motivo).toBe('Colisión evitable en curva 1');

      // Team admin view
      authService.getCurrentUser.mockReturnValue(new AdminEscuderia({ escuderiaId: 'team-1' }));
      const teamSanctions = sanctionService.getByDriver('driver-1');
      expect(teamSanctions).toHaveLength(1);
    });
  });

  describe('Matriz de Permisos por Rol (Modelos User, AdminFIA, AdminEscuderia, PublicUser)', () => {
    it('verifica los permisos y restricciones del Administrador FIA', () => {
      const fia = new AdminFIA({ id: 'fia-user', nombre: 'FIA Director' });
      expect(fia.isAdminFIA()).toBe(true);
      expect(fia.isAdminEscuderia()).toBe(false);
      expect(fia.isPublico()).toBe(false);
      expect(fia.canManageCalendar()).toBe(true);
      expect(fia.canManageScores()).toBe(true);
      expect(fia.canManageCompetitionProfiles()).toBe(true);
      expect(fia.canManageCarInspections()).toBe(true);
      expect(fia.canManageSanctions()).toBe(true);
      expect(fia.canViewConfidentialTechnicalObservations()).toBe(true);
      // Restricción: la FIA NO puede crear ni gestionar pilotos
      expect(fia.canManageDrivers()).toBe(false);
      expect(fia.canCreateDriver()).toBe(false);
      expect(fia.canManageDriverProfile('team-1')).toBe(false);
    });

    it('verifica los permisos y restricciones del Responsable de Escudería', () => {
      const escuderiaAdmin = new AdminEscuderia({
        id: 'team-admin',
        nombre: 'Ferrari Principal',
        escuderiaId: 'team-ferrari',
        escuderiaNombre: 'Ferrari'
      });
      expect(escuderiaAdmin.isAdminFIA()).toBe(false);
      expect(escuderiaAdmin.isAdminEscuderia()).toBe(true);
      expect(escuderiaAdmin.isPublico()).toBe(false);
      expect(escuderiaAdmin.canManageDrivers()).toBe(true);
      expect(escuderiaAdmin.canCreateDriver()).toBe(true);
      expect(escuderiaAdmin.canManageDriverProfile('team-ferrari')).toBe(true);
      expect(escuderiaAdmin.canManageDriverProfile('team-redbull')).toBe(false);
      expect(escuderiaAdmin.canViewConfidentialTechnicalObservations()).toBe(true);
      expect(escuderiaAdmin.canManageSanctions()).toBe(false);
      expect(escuderiaAdmin.canManageCompetitionProfiles()).toBe(false);
      expect(escuderiaAdmin.canManageCarInspections()).toBe(false);
      expect(escuderiaAdmin.canManageCalendar()).toBe(false);
      expect(escuderiaAdmin.canManageScores()).toBe(false);
    });

    it('verifica los permisos y restricciones del Público General / Fan', () => {
      const publicUser = new PublicUser({ nombre: 'F1 Fan' });
      expect(publicUser.isAdminFIA()).toBe(false);
      expect(publicUser.isAdminEscuderia()).toBe(false);
      expect(publicUser.isPublico()).toBe(true);
      expect(publicUser.canManageDrivers()).toBe(false);
      expect(publicUser.canCreateDriver()).toBe(false);
      expect(publicUser.canManageDriverProfile('team-1')).toBe(false);
      expect(publicUser.canManageSanctions()).toBe(false);
      expect(publicUser.canViewConfidentialTechnicalObservations()).toBe(false);
      expect(publicUser.canManageCompetitionProfiles()).toBe(false);
      expect(publicUser.canManageCarInspections()).toBe(false);
      expect(publicUser.canManageCalendar()).toBe(false);
      expect(publicUser.canManageScores()).toBe(false);
    });
  });

  describe('Validaciones y persistencia de Sanciones (Sanction, Repository y Service)', () => {
    it('instancia la entidad Sanction con valores por defecto válidos', () => {
      const sanction = new Sanction({
        pilotoId: 'driver-1',
        motivo: 'Límites de pista'
      });
      expect(sanction.id).toBeDefined();
      expect(sanction.estado).toBe(SANCTION_STATUS.APLICADA);
      expect(sanction.tipoSancion).toBe(SANCTION_TYPES.TIME_5S);
      expect(sanction.puntosPenalizacion).toBe(0);
    });

    it('valida campos obligatorios y formato de fecha al crear sanciones', () => {
      authService.getCurrentUser.mockReturnValue(new AdminFIA({ id: 'fia-official' }));

      // Piloto inexistente
      expect(() => sanctionService.create({
        pilotoId: 'non-existent',
        motivo: 'Infracción',
        tipoSancion: SANCTION_TYPES.TIME_5S,
        fecha: '2026-03-15'
      })).toThrow('Seleccione un piloto registrado válido');

      // Motivo vacío
      expect(() => sanctionService.create({
        pilotoId: 'driver-1',
        motivo: '   ',
        tipoSancion: SANCTION_TYPES.TIME_5S,
        fecha: '2026-03-15'
      })).toThrow('El motivo de la sanción es obligatorio');

      // Tipo vacío
      expect(() => sanctionService.create({
        pilotoId: 'driver-1',
        motivo: 'Colisión',
        tipoSancion: '   ',
        fecha: '2026-03-15'
      })).toThrow('El tipo de sanción es obligatorio');

      // Fecha inválida
      expect(() => sanctionService.create({
        pilotoId: 'driver-1',
        motivo: 'Colisión',
        tipoSancion: SANCTION_TYPES.TIME_5S,
        fecha: '15/03/2026'
      })).toThrow('Ingrese una fecha de sanción válida');
    });

    it('rechaza actualizar o eliminar sanciones con IDs inexistentes', () => {
      authService.getCurrentUser.mockReturnValue(new AdminFIA({ id: 'fia-official' }));

      expect(() => sanctionService.update('non-existent-id', {
        pilotoId: 'driver-1',
        motivo: 'Modificado',
        tipoSancion: SANCTION_TYPES.TIME_5S,
        fecha: '2026-03-15'
      })).toThrow('Sanción con ID non-existent-id no encontrada');

      expect(() => sanctionService.delete('non-existent-id'))
        .toThrow('Sanción con ID non-existent-id no encontrada');
    });

    it('filtra sanciones por equipo y por evento en el repositorio', () => {
      authService.getCurrentUser.mockReturnValue(new AdminFIA({ id: 'fia-official' }));

      sanctionService.create({
        pilotoId: 'driver-1',
        eventoId: 'event-1',
        granPremio: 'GP Australia',
        fecha: '2026-03-15',
        motivo: 'Límites de pista',
        tipoSancion: SANCTION_TYPES.TIME_5S
      });

      expect(sanctions.getByTeam('team-1')).toHaveLength(1);
      expect(sanctions.getByEvent('event-1')).toHaveLength(1);
      expect(sanctions.getByTeam('team-rival')).toHaveLength(0);
    });
  });

  describe('Inspecciones Técnicas con Gran Premio y fechas', () => {
    it('crea y actualiza inspecciones preservando el Gran Premio y eventoId', () => {
      authService.getCurrentUser.mockReturnValue(new AdminFIA({ id: 'fia-official' }));

      const inspection = inspectionService.create({
        autoId: 'car-1',
        eventoId: 'event-1',
        granPremio: 'Gran Premio de Australia 2026',
        fecha: '2026-03-13',
        tipoInspeccion: INSPECTION_TYPES.SAFETY,
        resultado: INSPECTION_OUTCOMES.PASS,
        observaciones: 'Halo OK'
      });

      expect(inspection.granPremio).toBe('Gran Premio de Australia 2026');
      expect(inspection.eventoId).toBe('event-1');

      const updated = inspectionService.update(inspection.id, {
        fecha: '2026-03-14',
        tipoInspeccion: INSPECTION_TYPES.SAFETY,
        resultado: INSPECTION_OUTCOMES.PASS,
        observaciones: 'Halo OK - Rechequeado'
      });

      expect(updated.granPremio).toBe('Gran Premio de Australia 2026');
      expect(updated.eventoId).toBe('event-1');
      expect(updated.observaciones).toBe('Halo OK - Rechequeado');
    });
  });

  describe('Validación de campos de Pilotos y sincronización de autos', () => {
    it('valida que nombre, apellido, dorsal (1-99) y rol sean correctos', () => {
      authService.getCurrentUser.mockReturnValue(new AdminEscuderia({
        id: 'team-admin-1',
        escuderiaId: 'team-1'
      }));

      // Nombre o apellido vacío
      expect(() => profileService.createDriver({
        nombre: '   ',
        apellido: 'Test',
        numero: 10,
        escuderiaId: 'team-1'
      })).toThrow('El nombre y el apellido del piloto son obligatorios');

      // Dorsal fuera de rango
      expect(() => profileService.createDriver({
        nombre: 'Juan',
        apellido: 'Perez',
        numero: 100,
        escuderiaId: 'team-1'
      })).toThrow('número de piloto debe ser un entero entre 1 y 99');

      expect(() => profileService.createDriver({
        nombre: 'Juan',
        apellido: 'Perez',
        numero: 0,
        escuderiaId: 'team-1'
      })).toThrow('número de piloto debe ser un entero entre 1 y 99');

      // Rol inválido
      expect(() => profileService.createDriver({
        nombre: 'Juan',
        apellido: 'Perez',
        numero: 25,
        rol: 'Rol Inexistente',
        escuderiaId: 'team-1'
      })).toThrow('Seleccione un rol de piloto válido');
    });

    it('sincroniza el nombre del piloto en el auto asignado cuando se actualiza el piloto', () => {
      authService.getCurrentUser.mockReturnValue(new AdminEscuderia({
        id: 'team-admin-1',
        escuderiaId: 'team-1'
      }));

      profileService.updateDriver('driver-1', {
        nombre: 'Ariel',
        apellido: 'Fast',
        numero: 7
      });

      const car = cars.getById('car-1');
      expect(car.pilotoNombre).toBe('Ariel Fast');
    });
  });

  describe('CompetitionManagementView: Renderizado y aislamiento de permisos en UI', () => {
    let fakeContainer;
    let view;

    beforeEach(() => {
      fakeContainer = {
        innerHTML: '',
        querySelectorAll: vi.fn(() => []),
        querySelector: vi.fn(() => null)
      };
      vi.stubGlobal('document', {
        getElementById: vi.fn(() => fakeContainer)
      });
      view = new CompetitionManagementView('main-content');
      view.activeTab = 'drivers';
    });

    it('para cuentas de Público/Fan NO renderiza la columna Acciones, NO muestra "Solo lectura" ni "+ Agregar piloto"', () => {
      const publicUser = new PublicUser({ nombre: 'Fan' });
      view.render({
        teams: teams.getAll(),
        drivers: drivers.getAll(),
        cars: cars.getAll(),
        inspections: inspectionService.getAll(),
        sanctions: sanctionService.getAll(),
        currentUser: publicUser
      });

      expect(fakeContainer.innerHTML).not.toContain('<th>Acciones</th>');
      expect(fakeContainer.innerHTML).not.toContain('Solo lectura');
      expect(fakeContainer.innerHTML).not.toContain('+ Agregar piloto');
    });

    it('para cuentas de Admin FIA NO renderiza la columna Acciones, NO muestra "Solo lectura" ni "+ Agregar piloto"', () => {
      const fiaUser = new AdminFIA({ id: 'fia-1', nombre: 'FIA Comisario' });
      view.render({
        teams: teams.getAll(),
        drivers: drivers.getAll(),
        cars: cars.getAll(),
        inspections: inspectionService.getAll(),
        sanctions: sanctionService.getAll(),
        currentUser: fiaUser
      });

      expect(fakeContainer.innerHTML).not.toContain('<th>Acciones</th>');
      expect(fakeContainer.innerHTML).not.toContain('Solo lectura');
      expect(fakeContainer.innerHTML).not.toContain('+ Agregar piloto');
    });

    it('para Admin Escudería SÍ renderiza columna Acciones y botón para su escudería, sin "Solo lectura" para rivales', () => {
      teams.create(new Team({ id: 'team-2', nombre: 'Rival Racing' }));
      drivers.create(new Driver({
        id: 'driver-rival',
        nombre: 'Rival',
        apellido: 'Driver',
        numero: 99,
        escuderiaId: 'team-2',
        escuderiaNombre: 'Rival Racing'
      }));

      const escuderiaUser = new AdminEscuderia({
        id: 'team-admin-1',
        escuderiaId: 'team-1',
        escuderiaNombre: 'Apex Racing'
      });

      view.render({
        teams: teams.getAll(),
        drivers: drivers.getAll(),
        cars: cars.getAll(),
        inspections: inspectionService.getAll(),
        sanctions: sanctionService.getAll(),
        currentUser: escuderiaUser
      });

      // Muestra la columna Acciones y el botón de agregar para su equipo
      expect(fakeContainer.innerHTML).toContain('<th>Acciones</th>');
      expect(fakeContainer.innerHTML).toContain('+ Agregar piloto (Escudería)');
      // Tiene botones de edición para su piloto (driver-1)
      expect(fakeContainer.innerHTML).toContain('data-profile-edit="driver:driver-1"');
      // NO muestra "Solo lectura" en la fila del piloto rival
      expect(fakeContainer.innerHTML).not.toContain('Solo lectura');
    });

    it('muestra el aviso confidencial en inspecciones técnicas para Público y el detalle real para Escudería/FIA', () => {
      view.activeTab = 'cars';
      view.selectedCarId = 'car-1';
      view.selectedInspectionId = 'insp-test';

      const dummyInspection = new TechnicalInspection({
        id: 'insp-test',
        autoId: 'car-1',
        fecha: '2026-03-14',
        tipoInspeccion: INSPECTION_TYPES.SAFETY,
        resultado: INSPECTION_OUTCOMES.PASS,
        observaciones: 'Halo telemetry analysis confidential'
      });

      // 1. Render para Fan
      view.render({
        teams: teams.getAll(),
        drivers: drivers.getAll(),
        cars: cars.getAll(),
        inspections: [dummyInspection],
        sanctions: [],
        currentUser: new PublicUser({ nombre: 'Fan' })
      });
      expect(fakeContainer.innerHTML).toContain('[Información técnica reservada para la FIA y Escuderías]');
      expect(fakeContainer.innerHTML).not.toContain('Halo telemetry analysis confidential');

      // 2. Render para Escudería
      view.render({
        teams: teams.getAll(),
        drivers: drivers.getAll(),
        cars: cars.getAll(),
        inspections: [dummyInspection],
        sanctions: [],
        currentUser: new AdminEscuderia({ escuderiaId: 'team-1' })
      });
      expect(fakeContainer.innerHTML).toContain('Halo telemetry analysis confidential');
    });

    it('en la pestaña Sanciones muestra el botón "+ Registrar sanción (FIA)" únicamente a la FIA', () => {
      view.activeTab = 'sanctions';

      // Fan: sin botón de registrar
      view.render({
        teams: teams.getAll(),
        drivers: drivers.getAll(),
        cars: cars.getAll(),
        inspections: [],
        sanctions: [],
        currentUser: new PublicUser({ nombre: 'Fan' })
      });
      expect(fakeContainer.innerHTML).not.toContain('+ Registrar sanción (FIA)');

      // Escudería: sin botón de registrar
      view.render({
        teams: teams.getAll(),
        drivers: drivers.getAll(),
        cars: cars.getAll(),
        inspections: [],
        sanctions: [],
        currentUser: new AdminEscuderia({ escuderiaId: 'team-1' })
      });
      expect(fakeContainer.innerHTML).not.toContain('+ Registrar sanción (FIA)');

      // FIA: con botón de registrar
      view.render({
        teams: teams.getAll(),
        drivers: drivers.getAll(),
        cars: cars.getAll(),
        inspections: [],
        sanctions: [],
        currentUser: new AdminFIA({ id: 'fia-1' })
      });
      expect(fakeContainer.innerHTML).toContain('+ Registrar sanción (FIA)');
    });
  });
});

