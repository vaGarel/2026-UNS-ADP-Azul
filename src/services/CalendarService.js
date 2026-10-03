import { SportEvent, EVENT_TYPES } from '../models/SportEvent.js';
import { TireTestEvent as TireTestModel } from '../models/TireTestEvent.js';

/**
 * Servicio de Negocio para la Gestión del Calendario Deportivo FIA (US 04)
 * Aplica Principio de Responsabilidad Única (SRP) e Inversión de Dependencias (DIP)
 */
export class CalendarService {
  constructor(eventRepository, authService, eventEmitter) {
    this.eventRepository = eventRepository;
    this.authService = authService;
    this.eventEmitter = eventEmitter;
  }

  getEvents(filters = {}) {
    let events = this.eventRepository.getAll();

    if (filters.category && filters.category !== 'ALL') {
      events = events.filter(e => e.categoria === filters.category);
    }

    if (filters.eventType && filters.eventType !== 'ALL') {
      events = events.filter(e => e.tipoEvento === filters.eventType);
    }

    if (filters.status && filters.status !== 'ALL') {
      events = events.filter(e => e.estado === filters.status);
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      events = events.filter(e =>
        e.nombre.toLowerCase().includes(q) ||
        e.circuito.toLowerCase().includes(q) ||
        e.pais.toLowerCase().includes(q) ||
        e.ciudad.toLowerCase().includes(q)
      );
    }

    return events.sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));
  }

  getEventById(id) {
    return this.eventRepository.getById(id);
  }

  getTireTests() {
    return this.eventRepository.getTireTests();
  }

  createEvent(eventData) {
    this._assertCanManageCalendar();

    let newEvent;
    if (eventData.tipoEvento === EVENT_TYPES.TIRE_TEST) {
      newEvent = new TireTestModel(eventData);
    } else {
      newEvent = new SportEvent(eventData);
    }

    const validation = newEvent.validate();
    if (!validation.isValid) {
      throw new Error(`Error de validación: ${validation.errors.join(' ')}`);
    }

    const created = this.eventRepository.create(newEvent);
    this.eventEmitter.emit('calendar:updated', { action: 'create', event: created });
    return created;
  }

  updateEvent(id, updatedData) {
    this._assertCanManageCalendar();

    const existing = this.eventRepository.getById(id);
    if (!existing) {
      throw new Error(`Evento con ID ${id} no encontrado.`);
    }

    let updatedEntity;
    if (updatedData.tipoEvento === EVENT_TYPES.TIRE_TEST || existing.tipoEvento === EVENT_TYPES.TIRE_TEST) {
      updatedEntity = new TireTestModel({ ...existing.toJSON(), ...updatedData });
    } else {
      updatedEntity = new SportEvent({ ...existing.toJSON(), ...updatedData });
    }

    const validation = updatedEntity.validate();
    if (!validation.isValid) {
      throw new Error(`Error de validación: ${validation.errors.join(' ')}`);
    }

    const saved = this.eventRepository.update(id, updatedData);
    this.eventEmitter.emit('calendar:updated', { action: 'update', event: saved });
    return saved;
  }

  deleteEvent(id) {
    this._assertCanManageCalendar();

    const existing = this.eventRepository.getById(id);
    if (!existing) {
      throw new Error(`Evento con ID ${id} no encontrado.`);
    }

    const success = this.eventRepository.delete(id);
    if (success) {
      this.eventEmitter.emit('calendar:updated', { action: 'delete', eventId: id });
    }
    return success;
  }

  _assertCanManageCalendar() {
    const user = this.authService.getCurrentUser();
    if (!user || !user.canManageCalendar()) {
      throw new Error('Permiso denegado: Solo el personal Administrativo de la FIA puede gestionar fechas en el calendario.');
    }
  }

  exportCalendarToICS() {
    const events = this.getEvents();
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FIA//FIA Sports Calendar 2026//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Calendario Oficial FIA 2026',
      'X-WR-TIMEZONE:UTC'
    ];

    events.forEach(evt => {
      const start = evt.fechaInicio.replace(/-/g, '') + 'T090000Z';
      const end = (evt.fechaFin || evt.fechaInicio).replace(/-/g, '') + 'T180000Z';
      ics.push(
        'BEGIN:VEVENT',
        `UID:${evt.id}@fia.com`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${evt.banderaPais || ''} ${evt.nombre}`,
        `LOCATION:${evt.circuito}, ${evt.ciudad}, ${evt.pais}`,
        `DESCRIPTION:${evt.descripcion || evt.tipoEvento} - Categoría: ${evt.categoria}`,
        `STATUS:${evt.estado === 'Cancelado' ? 'CANCELLED' : 'CONFIRMED'}`,
        'END:VEVENT'
      );
    });

    ics.push('END:VCALENDAR');
    return ics.join('\r\n');
  }

  exportCalendarToJSON() {
    const events = this.getEvents();
    return JSON.stringify(events.map(e => e.toJSON()), null, 2);
  }
}
