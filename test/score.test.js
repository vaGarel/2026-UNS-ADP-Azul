import { describe, expect, it, vi, beforeEach } from 'vitest';
import { F1ScoringStrategy } from '../src/services/strategies/F1ScoringStrategy.js';
import { ScoreService } from '../src/services/ScoreService.js';
import { ScoreRepository } from '../src/repositories/ScoreRepository.js';
import { EventRepository } from '../src/repositories/EventRepository.js';
import { TeamRepository } from '../src/repositories/TeamRepository.js';
import { DriverRepository } from '../src/repositories/DriverRepository.js';
import { AdminFIA } from '../src/models/AdminFIA.js';
import { AdminEscuderia } from '../src/models/AdminEscuderia.js';
import { PublicUser } from '../src/models/PublicUser.js';
import { SportEvent } from '../src/models/SportEvent.js';
import { Team } from '../src/models/Team.js';
import { Driver, DRIVER_ROLES } from '../src/models/Driver.js';
import { RACE_STATUS } from '../src/models/RaceResult.js';

const createMemoryStorage = () => {
  const store = {};
  return {
    getItem(key, defaultValue = null) {
      if (!(key in store)) return defaultValue;
      return JSON.parse(JSON.stringify(store[key]));
    },
    setItem(key, value) {
      store[key] = JSON.parse(JSON.stringify(value));
    },
    removeItem(key) {
      delete store[key];
    }
  };
};

describe('F1ScoringStrategy (Reglamento 2026)', () => {
  const strategy = new F1ScoringStrategy();

  it('otorga la puntuacion estandar FIA para los 10 primeros clasificados', () => {
    expect(strategy.calculatePoints(1)).toBe(25);
    expect(strategy.calculatePoints(2)).toBe(18);
    expect(strategy.calculatePoints(3)).toBe(15);
    expect(strategy.calculatePoints(4)).toBe(12);
    expect(strategy.calculatePoints(5)).toBe(10);
    expect(strategy.calculatePoints(6)).toBe(8);
    expect(strategy.calculatePoints(7)).toBe(6);
    expect(strategy.calculatePoints(8)).toBe(4);
    expect(strategy.calculatePoints(9)).toBe(2);
    expect(strategy.calculatePoints(10)).toBe(1);
    expect(strategy.calculatePoints(11)).toBe(0);
  });

  it('NO suma punto extra por vuelta rapida al estar derogado en 2026', () => {
    // En 2026 P1 con vuelta rápida sigue siendo 25 puntos
    expect(strategy.calculatePoints(1, true)).toBe(25);
    expect(strategy.calculatePoints(10, true)).toBe(1);
  });

  it('devuelve 0 puntos si el piloto no finalizo clasificado', () => {
    expect(strategy.calculatePoints(1, false, false)).toBe(0);
  });
});

describe('ScoreService', () => {
  let scoreService;
  let scoreRepo;
  let eventRepo;
  let teamRepo;
  let driverRepo;
  let authService;
  let eventEmitter;
  let storage;

  beforeEach(() => {
    storage = createMemoryStorage();
    scoreRepo = new ScoreRepository(storage);
    eventRepo = new EventRepository(storage);
    teamRepo = new TeamRepository(storage);
    driverRepo = new DriverRepository(storage);

    const currentUser = new AdminFIA({ id: 'usr-admin-fia', nombre: 'Admin FIA' });
    authService = {
      getCurrentUser: vi.fn(() => currentUser)
    };
    eventEmitter = {
      emit: vi.fn()
    };

    scoreService = new ScoreService(
      scoreRepo,
      eventRepo,
      teamRepo,
      driverRepo,
      authService,
      eventEmitter,
      new F1ScoringStrategy()
    );

    // Seed mock data
    eventRepo.create(new SportEvent({ id: 'evt-01', nombre: 'GP Bahrain 2026' }));
    teamRepo.create(new Team({ id: 'team-ferrari', nombre: 'Scuderia Ferrari' }));
    driverRepo.create(new Driver({
      id: 'drv-lec',
      nombre: 'Charles',
      apellido: 'Leclerc',
      numero: 16,
      escuderiaId: 'team-ferrari',
      escuderiaNombre: 'Scuderia Ferrari',
      rol: DRIVER_ROLES.TITULAR
    }));
  });

  it('registra puntaje correctamente segun la posicion sin bonificar vuelta rapida', () => {
    const result = scoreService.registerRaceScore({
      eventoId: 'evt-01',
      pilotoId: 'drv-lec',
      escuderiaId: 'team-ferrari',
      posicion: 1,
      tiempoTotal: '1:30:00.000',
      vueltaRapida: true,
      estadoFinal: RACE_STATUS.FINISHED
    });

    expect(result.puntos).toBe(25);
    expect(result.puntosEscuderia).toBe(25);
    expect(eventEmitter.emit).toHaveBeenCalledWith('scores:updated', expect.anything());
  });

  it('permite a la escuderia asentar notificacion del resultado', () => {
    const score = scoreService.registerRaceScore({
      eventoId: 'evt-01',
      pilotoId: 'drv-lec',
      escuderiaId: 'team-ferrari',
      posicion: 2,
      estadoFinal: RACE_STATUS.FINISHED
    });

    // Switch to team admin
    authService.getCurrentUser.mockReturnValue(new AdminEscuderia({
      id: 'usr-ferrari',
      nombre: 'Fred Vasseur',
      escuderiaId: 'team-ferrari'
    }));

    const acknowledged = scoreService.acknowledgeScoreNotification(score.id);
    expect(acknowledged.notificadoEscuderia).toBe(true);
    expect(acknowledged.fechaNotificacion).toBeTruthy();
  });

  it('bloquea la carga de puntajes a usuarios no administrativos de la FIA', () => {
    authService.getCurrentUser.mockReturnValue(new PublicUser({ nombre: 'Fan' }));

    expect(() => scoreService.registerRaceScore({
      eventoId: 'evt-01',
      pilotoId: 'drv-lec',
      escuderiaId: 'team-ferrari',
      posicion: 1
    })).toThrow('Permiso denegado');
  });
});
