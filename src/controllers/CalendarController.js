import { FIA_CATEGORIES, EVENT_TYPES, EVENT_STATUS } from '../models/SportEvent.js';
import { PIRELLI_COMPOUNDS } from '../models/TireTestEvent.js';
import { DateFormatter } from '../utils/DateFormatter.js';
import { Exporter } from '../utils/Exporter.js';

/**
 * Controlador de Calendario Deportivo (US 04)
 * Patrón MVC - Coordina CalendarView y CalendarService
 */
export class CalendarController {
  constructor(calendarService, authService, calendarView, modalManager, toastNotification, eventEmitter) {
    this.calendarService = calendarService;
    this.authService = authService;
    this.calendarView = calendarView;
    this.modalManager = modalManager;
    this.toastNotification = toastNotification;
    this.eventEmitter = eventEmitter;

    this.currentFilters = {
      category: 'ALL',
      eventType: 'ALL',
      status: 'ALL',
      searchQuery: ''
    };

    this._bindViewHandlers();
    this._subscribeToEvents();
  }

  _bindViewHandlers() {
    this.calendarView.setFilterHandler((filters) => this.handleFilterChange(filters));
    this.calendarView.setCreateHandler(() => this.handleCreateEvent());
    this.calendarView.setEditHandler((id) => this.handleEditEvent(id));
    this.calendarView.setDeleteHandler((id) => this.handleDeleteEvent(id));
    this.calendarView.setViewDetailHandler((id) => this.handleViewDetail(id));
    this.calendarView.setExportICSHandler(() => this.handleExportICS());
    this.calendarView.setExportJSONHandler(() => this.handleExportJSON());
  }

  _subscribeToEvents() {
    this.eventEmitter.on('calendar:updated', () => this.refreshView());
    this.eventEmitter.on('auth:userChanged', () => this.refreshView());
  }

  render() {
    const events = this.calendarService.getEvents(this.currentFilters);
    const currentUser = this.authService.getCurrentUser();
    this.calendarView.render({
      events,
      currentUser,
      filters: this.currentFilters
    });
  }

  refreshView() {
    this.render();
  }

  handleFilterChange(newFilters) {
    this.currentFilters = { ...this.currentFilters, ...newFilters };
    this.render();
  }

  handleCreateEvent() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser.canManageCalendar()) {
      this.toastNotification.error('Permiso denegado', 'Solo administradores FIA pueden crear eventos.');
      return;
    }

    const formHtml = `
      <form id="form-event-crud" class="crud-form">
        <div class="form-row">
          <div class="form-group flex-2">
            <label for="evt-nombre">Nombre Oficial del Gran Premio / Evento *</label>
            <input type="text" id="evt-nombre" class="form-input" required placeholder="Ej. FORMULA 1 GRAN PREMIO DE ESPAÑA 2026">
          </div>
          <div class="form-group flex-1">
            <label for="evt-categoria">Categoría FIA *</label>
            <select id="evt-categoria" class="form-select">
              <option value="${FIA_CATEGORIES.F1}">Fórmula 1</option>
              <option value="${FIA_CATEGORIES.F2}">Fórmula 2</option>
              <option value="${FIA_CATEGORIES.F3}">Fórmula 3</option>
              <option value="${FIA_CATEGORIES.F1_ACADEMY}">F1 Academy</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label for="evt-tipo">Tipo de Evento Deportivo *</label>
            <select id="evt-tipo" class="form-select">
              <option value="${EVENT_TYPES.GRAND_PRIX}">Grand Prix (Carrera)</option>
              <option value="${EVENT_TYPES.TIRE_TEST}">Prueba Oficial de Neumáticos (Pirelli)</option>
              <option value="${EVENT_TYPES.SPRINT_WEEKEND}">Fin de Semana Sprint</option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label for="evt-estado">Estado *</label>
            <select id="evt-estado" class="form-select">
              <option value="${EVENT_STATUS.SCHEDULED}">Programado</option>
              <option value="${EVENT_STATUS.IN_PROGRESS}">En Curso</option>
              <option value="${EVENT_STATUS.COMPLETED}">Finalizado</option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label for="evt-round">Número de Round / Ronda</label>
            <input type="number" id="evt-round" class="form-input" min="1" max="30" value="1">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-2">
            <label for="evt-circuito">Nombre del Autódromo / Circuito *</label>
            <input type="text" id="evt-circuito" class="form-input" required placeholder="Ej. Circuit de Barcelona-Catalunya">
          </div>
          <div class="form-group flex-1">
            <label for="evt-ciudad">Ciudad *</label>
            <input type="text" id="evt-ciudad" class="form-input" required placeholder="Ej. Barcelona">
          </div>
          <div class="form-group flex-1">
            <label for="evt-pais">País *</label>
            <input type="text" id="evt-pais" class="form-input" required placeholder="Ej. España">
          </div>
          <div class="form-group" style="width: 80px;">
            <label for="evt-bandera">Bandera</label>
            <input type="text" id="evt-bandera" class="form-input" value="🇪🇸">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label for="evt-fecha-inicio">Fecha de Inicio *</label>
            <input type="date" id="evt-fecha-inicio" class="form-input" required value="2026-06-12">
          </div>
          <div class="form-group flex-1">
            <label for="evt-fecha-fin">Fecha de Fin *</label>
            <input type="date" id="evt-fecha-fin" class="form-input" required value="2026-06-14">
          </div>
          <div class="form-group flex-1">
            <label for="evt-vueltas">Vueltas</label>
            <input type="number" id="evt-vueltas" class="form-input" value="66">
          </div>
          <div class="form-group flex-1">
            <label for="evt-distancia">Distancia (km)</label>
            <input type="number" step="0.1" id="evt-distancia" class="form-input" value="307.2">
          </div>
        </div>

        <div class="form-group">
          <label for="evt-desc">Descripción / Observaciones Oficiales</label>
          <textarea id="evt-desc" class="form-textarea" rows="2" placeholder="Detalles de la ronda, normativas especiales o configuración de trazado..."></textarea>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar Evento</button>
        </div>
      </form>
    `;

    this.modalManager.open({
      title: '➕ Registrar Nuevo Evento Deportivo en el Calendario',
      contentHtml: formHtml,
      onRender: (container, closeModal) => {
        container.querySelector('#btn-cancel-modal').addEventListener('click', closeModal);
        const form = container.querySelector('#form-event-crud');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          try {
            const data = {
              nombre: form.querySelector('#evt-nombre').value,
              categoria: form.querySelector('#evt-categoria').value,
              tipoEvento: form.querySelector('#evt-tipo').value,
              estado: form.querySelector('#evt-estado').value,
              roundNumero: Number(form.querySelector('#evt-round').value) || 1,
              circuito: form.querySelector('#evt-circuito').value,
              ciudad: form.querySelector('#evt-ciudad').value,
              pais: form.querySelector('#evt-pais').value,
              banderaPais: form.querySelector('#evt-bandera').value,
              fechaInicio: form.querySelector('#evt-fecha-inicio').value,
              fechaFin: form.querySelector('#evt-fecha-fin').value,
              vueltas: Number(form.querySelector('#evt-vueltas').value) || 0,
              distanciaKm: Number(form.querySelector('#evt-distancia').value) || 0,
              descripcion: form.querySelector('#evt-desc').value
            };

            this.calendarService.createEvent(data);
            this.toastNotification.success('Evento Creado', 'La fecha deportiva se ha registrado con éxito en el calendario FIA.');
            closeModal();
          } catch (err) {
            this.toastNotification.error('Error al Crear', err.message);
          }
        });
      }
    });
  }

  handleEditEvent(id) {
    const event = this.calendarService.getEventById(id);
    if (!event) return;

    const formHtml = `
      <form id="form-event-edit" class="crud-form">
        <div class="form-row">
          <div class="form-group flex-2">
            <label for="evt-edit-nombre">Nombre Oficial *</label>
            <input type="text" id="evt-edit-nombre" class="form-input" required value="${this.calendarView.escapeHTML(event.nombre)}">
          </div>
          <div class="form-group flex-1">
            <label for="evt-edit-categoria">Categoría FIA *</label>
            <select id="evt-edit-categoria" class="form-select">
              <option value="${FIA_CATEGORIES.F1}" ${event.categoria === FIA_CATEGORIES.F1 ? 'selected' : ''}>Fórmula 1</option>
              <option value="${FIA_CATEGORIES.F2}" ${event.categoria === FIA_CATEGORIES.F2 ? 'selected' : ''}>Fórmula 2</option>
              <option value="${FIA_CATEGORIES.F3}" ${event.categoria === FIA_CATEGORIES.F3 ? 'selected' : ''}>Fórmula 3</option>
              <option value="${FIA_CATEGORIES.F1_ACADEMY}" ${event.categoria === FIA_CATEGORIES.F1_ACADEMY ? 'selected' : ''}>F1 Academy</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label for="evt-edit-tipo">Tipo de Evento</label>
            <select id="evt-edit-tipo" class="form-select">
              <option value="${EVENT_TYPES.GRAND_PRIX}" ${event.tipoEvento === EVENT_TYPES.GRAND_PRIX ? 'selected' : ''}>Grand Prix (Carrera)</option>
              <option value="${EVENT_TYPES.TIRE_TEST}" ${event.tipoEvento === EVENT_TYPES.TIRE_TEST ? 'selected' : ''}>Prueba Oficial de Neumáticos (Pirelli)</option>
              <option value="${EVENT_TYPES.SPRINT_WEEKEND}" ${event.tipoEvento === EVENT_TYPES.SPRINT_WEEKEND ? 'selected' : ''}>Fin de Semana Sprint</option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label for="evt-edit-estado">Estado</label>
            <select id="evt-edit-estado" class="form-select">
              <option value="${EVENT_STATUS.SCHEDULED}" ${event.estado === EVENT_STATUS.SCHEDULED ? 'selected' : ''}>Programado</option>
              <option value="${EVENT_STATUS.IN_PROGRESS}" ${event.estado === EVENT_STATUS.IN_PROGRESS ? 'selected' : ''}>En Curso</option>
              <option value="${EVENT_STATUS.COMPLETED}" ${event.estado === EVENT_STATUS.COMPLETED ? 'selected' : ''}>Finalizado</option>
              <option value="${EVENT_STATUS.CANCELLED}" ${event.estado === EVENT_STATUS.CANCELLED ? 'selected' : ''}>Cancelado</option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label for="evt-edit-round">Ronda / Round</label>
            <input type="number" id="evt-edit-round" class="form-input" value="${event.roundNumero || 1}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-2">
            <label for="evt-edit-circuito">Circuito *</label>
            <input type="text" id="evt-edit-circuito" class="form-input" required value="${this.calendarView.escapeHTML(event.circuito)}">
          </div>
          <div class="form-group flex-1">
            <label for="evt-edit-ciudad">Ciudad *</label>
            <input type="text" id="evt-edit-ciudad" class="form-input" required value="${this.calendarView.escapeHTML(event.ciudad)}">
          </div>
          <div class="form-group flex-1">
            <label for="evt-edit-pais">País *</label>
            <input type="text" id="evt-edit-pais" class="form-input" required value="${this.calendarView.escapeHTML(event.pais)}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label for="evt-edit-fecha-inicio">Fecha de Inicio *</label>
            <input type="date" id="evt-edit-fecha-inicio" class="form-input" required value="${event.fechaInicio}">
          </div>
          <div class="form-group flex-1">
            <label for="evt-edit-fecha-fin">Fecha de Fin *</label>
            <input type="date" id="evt-edit-fecha-fin" class="form-input" required value="${event.fechaFin || event.fechaInicio}">
          </div>
          <div class="form-group flex-1">
            <label for="evt-edit-vueltas">Vueltas</label>
            <input type="number" id="evt-edit-vueltas" class="form-input" value="${event.vueltas || 0}">
          </div>
          <div class="form-group flex-1">
            <label for="evt-edit-distancia">Distancia (km)</label>
            <input type="number" step="0.1" id="evt-edit-distancia" class="form-input" value="${event.distanciaKm || 0}">
          </div>
        </div>

        <div class="form-group">
          <label for="evt-edit-desc">Descripción</label>
          <textarea id="evt-edit-desc" class="form-textarea" rows="2">${this.calendarView.escapeHTML(event.descripcion || '')}</textarea>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">Actualizar Evento</button>
        </div>
      </form>
    `;

    this.modalManager.open({
      title: `✏️ Modificar Evento: ${event.nombre}`,
      contentHtml: formHtml,
      onRender: (container, closeModal) => {
        container.querySelector('#btn-cancel-modal').addEventListener('click', closeModal);
        const form = container.querySelector('#form-event-edit');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          try {
            const data = {
              nombre: form.querySelector('#evt-edit-nombre').value,
              categoria: form.querySelector('#evt-edit-categoria').value,
              tipoEvento: form.querySelector('#evt-edit-tipo').value,
              estado: form.querySelector('#evt-edit-estado').value,
              roundNumero: Number(form.querySelector('#evt-edit-round').value) || 1,
              circuito: form.querySelector('#evt-edit-circuito').value,
              ciudad: form.querySelector('#evt-edit-ciudad').value,
              pais: form.querySelector('#evt-edit-pais').value,
              fechaInicio: form.querySelector('#evt-edit-fecha-inicio').value,
              fechaFin: form.querySelector('#evt-edit-fecha-fin').value,
              vueltas: Number(form.querySelector('#evt-edit-vueltas').value) || 0,
              distanciaKm: Number(form.querySelector('#evt-edit-distancia').value) || 0,
              descripcion: form.querySelector('#evt-edit-desc').value
            };

            this.calendarService.updateEvent(id, data);
            this.toastNotification.success('Evento Actualizado', 'Los datos del evento se guardaron satisfactoriamente.');
            closeModal();
          } catch (err) {
            this.toastNotification.error('Error al Modificar', err.message);
          }
        });
      }
    });
  }

  async handleDeleteEvent(id) {
    const event = this.calendarService.getEventById(id);
    if (!event) return;

    const confirmed = await this.modalManager.confirm({
      title: '🗑️ Confirmar Eliminación de Evento',
      message: `¿Está seguro de que desea eliminar definitivamente <strong>"${this.calendarView.escapeHTML(event.nombre)}"</strong> del calendario oficial FIA?`,
      confirmText: 'Sí, Eliminar del Calendario',
      confirmClass: 'btn-danger'
    });

    if (confirmed) {
      try {
        this.calendarService.deleteEvent(id);
        this.toastNotification.success('Evento Eliminado', 'La fecha deportiva ha sido retirada del calendario.');
      } catch (err) {
        this.toastNotification.error('Error al Eliminar', err.message);
      }
    }
  }

  handleViewDetail(id) {
    const evt = this.calendarService.getEventById(id);
    if (!evt) return;

    const isTireTest = evt.tipoEvento === EVENT_TYPES.TIRE_TEST;

    const contentHtml = `
      <div class="event-detail-modal">
        <div class="detail-banner-card">
          <div class="detail-header-badge">${evt.categoria} | ${evt.tipoEvento}</div>
          <h2 class="detail-event-name">${this.calendarView.escapeHTML(evt.nombre)}</h2>
          <div class="detail-loc-line">
            <span>${evt.banderaPais || '🏁'}</span>
            <strong>${this.calendarView.escapeHTML(evt.circuito)}</strong>
            <span>(${this.calendarView.escapeHTML(evt.ciudad)}, ${this.calendarView.escapeHTML(evt.pais)})</span>
          </div>
        </div>

        <div class="detail-metrics-grid">
          <div class="metric-card">
            <span class="m-label">Fechas Oficiales</span>
            <strong class="m-val">${DateFormatter.formatDateRange(evt.fechaInicio, evt.fechaFin)}</strong>
          </div>
          <div class="metric-card">
            <span class="m-label">Estado de la Ronda</span>
            <strong class="m-val">${evt.estado}</strong>
          </div>
          <div class="metric-card">
            <span class="m-label">Longitud Circuito</span>
            <strong class="m-val">${evt.longitudCircuitoKm ? `${evt.longitudCircuitoKm} km` : '5.8 km'}</strong>
          </div>
          <div class="metric-card">
            <span class="m-label">Vueltas de Carrera</span>
            <strong class="m-val">${evt.vueltas || 'N/A'}</strong>
          </div>
        </div>

        ${isTireTest ? `
          <div class="detail-special-box tire-box">
            <h4>🟡 Especificaciones de la Prueba de Neumáticos (Pirelli Motorsport)</h4>
            <p><strong>Proveedor Exclusivo:</strong> ${this.calendarView.escapeHTML(evt.proveedorOficial || 'Pirelli')}</p>
            <p><strong>Compuestos Evaluados:</strong> ${(evt.compuestosEvaluados || []).join(', ') || 'Compuestos experimentales FIA'}</p>
            <p><strong>Objetivo de Prueba:</strong> ${this.calendarView.escapeHTML(evt.objetivoPrueba || evt.descripcion)}</p>
            <p><strong>Condiciones de Temperatura Objetivo:</strong> ${evt.temperaturaPistaObjetivoC || 35}°C en asfalto</p>
          </div>
        ` : `
          <div class="detail-special-box">
            <h4>📋 Información del Gran Premio</h4>
            <p>${this.calendarView.escapeHTML(evt.descripcion || 'Sin observaciones especiales.')}</p>
            ${evt.recordVuelta ? `<p class="mt-2"><strong>Récord de Vuelta:</strong> ${evt.recordVuelta} (${evt.recordPiloto})</p>` : ''}
          </div>
        `}

        <div class="modal-actions mt-4">
          <button class="btn btn-secondary" id="btn-close-detail">Cerrar</button>
        </div>
      </div>
    `;

    this.modalManager.open({
      title: '🏁 Ficha Técnica del Evento FIA',
      contentHtml,
      onRender: (container, closeModal) => {
        container.querySelector('#btn-close-detail').addEventListener('click', closeModal);
      }
    });
  }

  handleExportICS() {
    try {
      const ics = this.calendarService.exportCalendarToICS();
      Exporter.downloadICS('Calendario_Oficial_FIA_2026.ics', ics);
      this.toastNotification.info('Descarga Iniciada', 'El archivo iCalendar (.ics) está listo para importar en Google Calendar / Outlook.');
    } catch (err) {
      this.toastNotification.error('Error al Exportar', err.message);
    }
  }

  handleExportJSON() {
    try {
      const json = this.calendarService.exportCalendarToJSON();
      Exporter.downloadJSON('Calendario_Oficial_FIA_2026.json', json);
      this.toastNotification.info('Exportación Exitosa', 'El calendario completo ha sido descargado en formato JSON.');
    } catch (err) {
      this.toastNotification.error('Error al Exportar', err.message);
    }
  }
}
