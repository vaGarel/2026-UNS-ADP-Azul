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
import { Driver } from '../src/models/Driver.js';
import { Car } from '../src/models/Car.js';
import { INSPECTION_OUTCOMES, INSPECTION_TYPES } from '../src/models/TechnicalInspection.js';

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
  let eventEmitter;
  let authService;
  let scoreService;
  let profileService;
  let inspectionService;

  beforeEach(() => {
    storage = createMemoryStorage();
    teams = new TeamRepository(storage);
    drivers = new DriverRepository(storage);
    cars = new CarRepository(storage);
    scores = new ScoreRepository(storage);
    events = new EventRepository(storage);
    inspections = new TechnicalInspectionRepository(storage);
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
    profileService.setTeamActive('team-1', false);
    profileService.setDriverActive('driver-1', false);
    expect(teams.getStandings()).toHaveLength(0);
    expect(drivers.getStandings()).toHaveLength(0);
    expect(teams.getById('team-1').activo).toBe(false);
    expect(drivers.getById('driver-1').activo).toBe(false);

    profileService.setTeamActive('team-1', true);
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

    profileService.setDriverActive('driver-1', false);
    expect(() => scoreService.registerRaceScore(resultData)).toThrow('piloto archivado');
    profileService.setDriverActive('driver-1', true);

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
});
