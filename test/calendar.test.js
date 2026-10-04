import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarService } from '../src/services/CalendarService.js';
import { EventRepository } from '../src/repositories/EventRepository.js';
import { SportEvent, EVENT_STATUS, EVENT_TYPES, FIA_CATEGORIES } from '../src/models/SportEvent.js';
import { TireTestEvent, PIRELLI_COMPOUNDS } from '../src/models/TireTestEvent.js';
import { AdminFIA } from '../src/models/AdminFIA.js';
import { PublicUser } from '../src/models/PublicUser.js';

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

const createCalendarService = ({ currentUser = new AdminFIA({ nombre: 'Admin FIA' }) } = {}) => {
  const repository = new EventRepository(createMemoryStorage());
  const authService = {
    getCurrentUser: vi.fn(() => currentUser)
  };
  const eventEmitter = {
    emit: vi.fn()
  };

  return {
    service: new CalendarService(repository, authService, eventEmitter),
    repository,
    authService,
    eventEmitter
  };
};

const createValidRaceData = (overrides = {}) => ({
  nombre: 'Gran Premio de Argentina',
  categoria: FIA_CATEGORIES.F1,
  circuito: 'Autodromo Oscar y Juan Galvez',
  ciudad: 'Buenos Aires',
  pais: 'Argentina',
  fechaInicio: '2026-11-20',
  fechaFin: '2026-11-22',
  tipoEvento: EVENT_TYPES.GRAND_PRIX,
  estado: EVENT_STATUS.SCHEDULED,
  roundNumero: 1,
  distanciaKm: 305,
  vueltas: 53,
  ...overrides
});

const createValidTireTestData = (overrides = {}) => ({
  ...createValidRaceData({
    nombre: 'Test oficial de neumaticos Buenos Aires',
    tipoEvento: EVENT_TYPES.TIRE_TEST,
    fechaInicio: '2026-12-02',
    fechaFin: '2026-12-03'
  }),
  compuestosEvaluados: [PIRELLI_COMPOUNDS.C2, PIRELLI_COMPOUNDS.C3],
  objetivoPrueba: 'Evaluar degradacion termica',
  escuderiasParticipantes: ['Ferrari', 'McLaren'],
  sesionesPorDia: 2,
  blindTest: true,
  ...overrides
});

describe('SportEvent', () => {
  it('valida correctamente una carrera con datos completos', () => {
    const event = new SportEvent(createValidRaceData());

    expect(event.validate()).toEqual({ isValid: true, errors: [] });
  });

  it('rechaza eventos con datos obligatorios invalidos', () => {
    const event = new SportEvent(createValidRaceData({
      nombre: 'GP',
      circuito: '',
      fechaFin: '2026-11-19'
    }));

    const validation = event.validate();

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('El nombre del evento debe tener al menos 3 caracteres.');
    expect(validation.errors).toContain('El nombre del circuito es obligatorio.');
    expect(validation.errors).toContain('La fecha de fin no puede ser anterior a la de inicio.');
  });
});

describe('TireTestEvent', () => {
  it('mantiene el tipo de evento y valores propios de pruebas de neumaticos', () => {
    const event = new TireTestEvent(createValidTireTestData({
      compuestosEvaluados: [PIRELLI_COMPOUNDS.C4],
      sesionesPorDia: 3
    }));

    expect(event.tipoEvento).toBe(EVENT_TYPES.TIRE_TEST);
    expect(event.compuestosEvaluados).toEqual([PIRELLI_COMPOUNDS.C4]);
    expect(event.sesionesPorDia).toBe(3);
    expect(event.proveedorOficial).toBe('Pirelli Motorsport');
    expect(event.validate().isValid).toBe(true);
  });
});

describe('CalendarService', () => {
  let service;
  let eventEmitter;

  beforeEach(() => {
    const setup = createCalendarService();
    service = setup.service;
    eventEmitter = setup.eventEmitter;
  });

  it('permite cargar una nueva carrera al calendario', () => {
    const created = service.createEvent(createValidRaceData());

    expect(created).toBeInstanceOf(SportEvent);
    expect(created.nombre).toBe('Gran Premio de Argentina');
    expect(service.getEvents()).toHaveLength(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'calendar:updated',
      expect.objectContaining({ action: 'create', event: created })
    );
  });

  it('permite cargar una nueva prueba de neumaticos al calendario', () => {
    const created = service.createEvent(createValidTireTestData());

    expect(created).toBeInstanceOf(TireTestEvent);
    expect(created.tipoEvento).toBe(EVENT_TYPES.TIRE_TEST);
    expect(created.compuestosEvaluados).toEqual([PIRELLI_COMPOUNDS.C2, PIRELLI_COMPOUNDS.C3]);
    expect(service.getTireTests()).toHaveLength(1);
  });

  it('rechaza la carga de eventos invalidos', () => {
    expect(() => service.createEvent(createValidRaceData({ fechaInicio: '' })))
      .toThrow('Error de validación');
  });

  it('solo permite administrar calendario a usuarios administrativos de la FIA', () => {
    const { service: publicService } = createCalendarService({
      currentUser: new PublicUser({ nombre: 'Fan publico' })
    });

    expect(() => publicService.createEvent(createValidRaceData()))
      .toThrow('Permiso denegado');
  });

  it('permite editar informacion de una carrera', () => {
    const created = service.createEvent(createValidRaceData());

    const updated = service.updateEvent(created.id, {
      nombre: 'Gran Premio de Argentina actualizado',
      estado: EVENT_STATUS.POSTPONED
    });

    expect(updated.nombre).toBe('Gran Premio de Argentina actualizado');
    expect(updated.estado).toBe(EVENT_STATUS.POSTPONED);
    expect(eventEmitter.emit).toHaveBeenLastCalledWith(
      'calendar:updated',
      expect.objectContaining({ action: 'update', event: updated })
    );
  });

  it('preserva los datos propios de una prueba de neumaticos al editarla', () => {
    const created = service.createEvent(createValidTireTestData());

    const updated = service.updateEvent(created.id, {
      objetivoPrueba: 'Validar compuestos para 2027',
      sesionesPorDia: 4
    });

    expect(updated).toBeInstanceOf(TireTestEvent);
    expect(updated.tipoEvento).toBe(EVENT_TYPES.TIRE_TEST);
    expect(updated.objetivoPrueba).toBe('Validar compuestos para 2027');
    expect(updated.compuestosEvaluados).toEqual([PIRELLI_COMPOUNDS.C2, PIRELLI_COMPOUNDS.C3]);
    expect(updated.escuderiasParticipantes).toEqual(['Ferrari', 'McLaren']);
    expect(updated.sesionesPorDia).toBe(4);
  });

  it('permite eliminar un evento del calendario', () => {
    const created = service.createEvent(createValidRaceData());

    const deleted = service.deleteEvent(created.id);

    expect(deleted).toBe(true);
    expect(service.getEvents()).toHaveLength(0);
    expect(eventEmitter.emit).toHaveBeenLastCalledWith(
      'calendar:updated',
      { action: 'delete', eventId: created.id }
    );
  });

  it('informa error al editar o eliminar un evento inexistente', () => {
    expect(() => service.updateEvent('evento-inexistente', { nombre: 'Nuevo nombre' }))
      .toThrow('Evento con ID evento-inexistente no encontrado.');

    expect(() => service.deleteEvent('evento-inexistente'))
      .toThrow('Evento con ID evento-inexistente no encontrado.');
  });

  it('filtra y ordena eventos para facilitar su seleccion en el calendario', () => {
    service.createEvent(createValidRaceData({
      nombre: 'Gran Premio de Brasil',
      ciudad: 'Sao Paulo',
      pais: 'Brasil',
      fechaInicio: '2026-11-10',
      tipoEvento: EVENT_TYPES.SPRINT_WEEKEND,
      estado: EVENT_STATUS.SCHEDULED
    }));
    service.createEvent(createValidTireTestData({
      nombre: 'Prueba Pirelli Monza',
      ciudad: 'Monza',
      pais: 'Italia',
      fechaInicio: '2026-09-01',
      estado: EVENT_STATUS.COMPLETED
    }));
    service.createEvent(createValidRaceData({
      nombre: 'Gran Premio de Argentina',
      ciudad: 'Buenos Aires',
      pais: 'Argentina',
      fechaInicio: '2026-10-01',
      tipoEvento: EVENT_TYPES.GRAND_PRIX,
      estado: EVENT_STATUS.SCHEDULED
    }));

    const scheduledEvents = service.getEvents({ status: EVENT_STATUS.SCHEDULED });
    const tireTests = service.getEvents({ eventType: EVENT_TYPES.TIRE_TEST });
    const argentinaEvents = service.getEvents({ searchQuery: 'argentina' });

    expect(scheduledEvents.map(e => e.nombre)).toEqual([
      'Gran Premio de Argentina',
      'Gran Premio de Brasil'
    ]);
    expect(tireTests).toHaveLength(1);
    expect(tireTests[0].nombre).toBe('Prueba Pirelli Monza');
    expect(argentinaEvents).toHaveLength(1);
    expect(argentinaEvents[0].pais).toBe('Argentina');
  });
});
