import { BaseView } from './BaseView.js';
import { DateFormatter } from '../utils/DateFormatter.js';
import { FIA_CATEGORIES, EVENT_TYPES, EVENT_STATUS } from '../models/SportEvent.js';
import { PIRELLI_COMPOUNDS } from '../models/TireTestEvent.js';

export class CalendarView extends BaseView {
  constructor(containerId = 'main-content') {
    super(containerId);
    this.currentViewMode = 'grid'; // 'grid' | 'table'
    this.activeFilters = {
      category: 'ALL',
      eventType: 'ALL',
      status: 'ALL',
      searchQuery: ''
    };
  }

  render({ events = [], currentUser, filters = {} }) {
    this.activeFilters = { ...this.activeFilters, ...filters };
    const container = this.getContainer();
    if (!container) return;

    const canEdit = currentUser.canManageCalendar();

    container.innerHTML = `
      <section class="section-container animate-fade-in" id="calendar-section">
        <!-- Banner Principal de la Sección -->
        <div class="section-hero">
          <div class="hero-text">
            <div class="hero-badge">CAMPEONATO MUNDIAL FIA 2026</div>
            <h2 class="hero-title">Calendario Oficial de Eventos Deportivos</h2>
            <p class="hero-subtitle">Gestión centralizada de Grandes Premios, Pruebas Oficiales de Neumáticos y rondas de soporte (F1, F2, F3 y F1 Academy).</p>
          </div>
          <div class="hero-actions">
            ${canEdit ? `
              <button class="btn btn-primary btn-glow" id="btn-create-event">
                <span class="btn-icon">➕</span> Nuevo Evento Deportivo
              </button>
            ` : `
              <div class="public-notice-pill">
                <span>🔒 Modo Lectura y Descarga Oficial</span>
              </div>
            `}
            <div class="export-dropdown-group">
              <button class="btn btn-outline" id="btn-export-ics" title="Descargar archivo .ics compatible con Google/Outlook Calendar">
                <span class="btn-icon">📥</span> Descargar (.ICS)
              </button>
              <button class="btn btn-outline" id="btn-export-json" title="Exportar calendario en formato JSON">
                <span class="btn-icon">📋</span> JSON
              </button>
            </div>
          </div>
        </div>

        <!-- Barra de Filtros y Búsqueda -->
        <div class="filters-bar-card">
          <div class="filter-group category-chips">
            <button class="chip ${this.activeFilters.category === 'ALL' ? 'active' : ''}" data-filter-cat="ALL">Todas las Categorías</button>
            <button class="chip ${this.activeFilters.category === FIA_CATEGORIES.F1 ? 'active' : ''}" data-filter-cat="${FIA_CATEGORIES.F1}">Fórmula 1</button>
            <button class="chip ${this.activeFilters.category === FIA_CATEGORIES.F2 ? 'active' : ''}" data-filter-cat="${FIA_CATEGORIES.F2}">Fórmula 2</button>
            <button class="chip ${this.activeFilters.category === FIA_CATEGORIES.F3 ? 'active' : ''}" data-filter-cat="${FIA_CATEGORIES.F3}">Fórmula 3</button>
            <button class="chip ${this.activeFilters.category === FIA_CATEGORIES.F1_ACADEMY ? 'active' : ''}" data-filter-cat="${FIA_CATEGORIES.F1_ACADEMY}">F1 Academy</button>
          </div>

          <div class="filters-row">
            <div class="search-input-wrapper">
              <span class="search-icon">🔍</span>
              <input type="text" id="calendar-search-input" class="form-input" placeholder="Buscar por Gran Premio, circuito, país o ciudad..." value="${this.escapeHTML(this.activeFilters.searchQuery)}">
            </div>

            <div class="select-wrapper">
              <label for="filter-event-type" class="sr-only">Tipo de Evento</label>
              <select id="filter-event-type" class="form-select">
                <option value="ALL" ${this.activeFilters.eventType === 'ALL' ? 'selected' : ''}>Todos los Tipos de Eventos</option>
                <option value="${EVENT_TYPES.GRAND_PRIX}" ${this.activeFilters.eventType === EVENT_TYPES.GRAND_PRIX ? 'selected' : ''}>Grandes Premios</option>
                <option value="${EVENT_TYPES.TIRE_TEST}" ${this.activeFilters.eventType === EVENT_TYPES.TIRE_TEST ? 'selected' : ''}>Pruebas de Neumáticos (Pirelli)</option>
                <option value="${EVENT_TYPES.SPRINT_WEEKEND}" ${this.activeFilters.eventType === EVENT_TYPES.SPRINT_WEEKEND ? 'selected' : ''}>Fines de Semana Sprint</option>
              </select>
            </div>

            <div class="view-toggle-group">
              <button class="btn-icon-toggle ${this.currentViewMode === 'grid' ? 'active' : ''}" id="btn-view-grid" title="Vista en Cuadrícula">🔲</button>
              <button class="btn-icon-toggle ${this.currentViewMode === 'table' ? 'active' : ''}" id="btn-view-table" title="Vista en Tabla Cronológica">☰</button>
            </div>
          </div>
        </div>

        <!-- Lista de Eventos -->
        ${events.length === 0 ? `
          <div class="empty-state-card">
            <div class="empty-icon">🏎️</div>
            <h3>No se encontraron eventos con los filtros seleccionados</h3>
            <p>Intenta ajustar la categoría o el término de búsqueda.</p>
            ${canEdit ? `<button class="btn btn-secondary mt-3" id="btn-create-first-event">Crear Evento Ahora</button>` : ''}
          </div>
        ` : (this.currentViewMode === 'grid' ? this._renderEventsGrid(events, canEdit) : this._renderEventsTable(events, canEdit))}
      </section>
    `;

    this._bindEvents(events, canEdit);
  }

  _renderEventsGrid(events, canEdit) {
    return `
      <div class="events-grid">
        ${events.map(evt => {
          const isTireTest = evt.isTireTest ? evt.isTireTest() : evt.tipoEvento === EVENT_TYPES.TIRE_TEST;
          let statusBadgeClass = 'badge-status-scheduled';
          if (evt.estado === EVENT_STATUS.IN_PROGRESS) statusBadgeClass = 'badge-status-live';
          if (evt.estado === EVENT_STATUS.COMPLETED) statusBadgeClass = 'badge-status-finished';

          return `
            <div class="event-card ${isTireTest ? 'event-card-tire-test' : ''}" data-event-id="${evt.id}">
              <div class="event-card-header">
                <div class="event-tags">
                  <span class="badge-category badge-cat-${this._getCategorySlug(evt.categoria)}">${this.escapeHTML(evt.categoria)}</span>
                  ${isTireTest ? `<span class="badge-tire-test">🟡 Test Pirelli</span>` : `<span class="badge-round">Round ${evt.roundNumero || '1'}</span>`}
                </div>
                <span class="badge-status ${statusBadgeClass}">${this.escapeHTML(evt.estado)}</span>
              </div>

              <div class="event-card-body">
                <div class="event-date-row">
                  <span class="event-flag">${evt.banderaPais || '🏁'}</span>
                  <span class="event-dates">${DateFormatter.formatDateRange(evt.fechaInicio, evt.fechaFin)}</span>
                </div>

                <h3 class="event-title">${this.escapeHTML(evt.nombre)}</h3>

                <div class="event-location">
                  <span class="loc-icon">📍</span>
                  <span class="circuit-name">${this.escapeHTML(evt.circuito)}</span>
                  <span class="city-name">(${this.escapeHTML(evt.ciudad)}, ${this.escapeHTML(evt.pais)})</span>
                </div>

                ${isTireTest ? `
                  <div class="tire-test-highlight">
                    <div class="tire-spec-row">
                      <strong>Compuestos en evaluación:</strong>
                      <div class="tire-chips-row">
                        ${(evt.compuestosEvaluados || ['C2', 'C3', 'C4']).map(c => `<span class="tire-pill">${this.escapeHTML(c)}</span>`).join('')}
                      </div>
                    </div>
                    <p class="tire-test-desc">${this.escapeHTML(evt.objetivoPrueba || evt.descripcion)}</p>
                  </div>
                ` : `
                  <div class="event-quick-metrics">
                    <div class="metric-item">
                      <span class="metric-label">Vueltas</span>
                      <span class="metric-value">${evt.vueltas || '-'}</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-label">Distancia</span>
                      <span class="metric-value">${evt.distanciaKm ? `${evt.distanciaKm} km` : '-'}</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-label">Longitud</span>
                      <span class="metric-value">${evt.longitudCircuitoKm ? `${evt.longitudCircuitoKm} km` : '-'}</span>
                    </div>
                  </div>
                `}
              </div>

              <div class="event-card-footer">
                <button class="btn btn-sm btn-outline btn-view-event" data-event-id="${evt.id}">
                  Ver Ficha Técnica
                </button>
                ${canEdit ? `
                  <div class="admin-card-actions">
                    <button class="btn-action-icon btn-edit-event" data-event-id="${evt.id}" title="Editar Evento">✏️</button>
                    <button class="btn-action-icon btn-delete-event text-danger" data-event-id="${evt.id}" title="Eliminar Evento">🗑️</button>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  _renderEventsTable(events, canEdit) {
    return `
      <div class="table-responsive-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Rnd / Tipo</th>
              <th>Categoría</th>
              <th>Fecha</th>
              <th>Gran Premio / Evento</th>
              <th>Circuito & Ubicación</th>
              <th>Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${events.map(evt => {
              const isTireTest = evt.isTireTest ? evt.isTireTest() : evt.tipoEvento === EVENT_TYPES.TIRE_TEST;
              return `
                <tr class="${isTireTest ? 'row-tire-test' : ''}">
                  <td>
                    ${isTireTest ? '<span class="badge-tire-test">🟡 Test Neumáticos</span>' : `<strong>Rnd ${evt.roundNumero || '1'}</strong>`}
                  </td>
                  <td>
                    <span class="badge-category badge-cat-${this._getCategorySlug(evt.categoria)}">${this.escapeHTML(evt.categoria)}</span>
                  </td>
                  <td>
                    <span class="date-text">${DateFormatter.formatDateRange(evt.fechaInicio, evt.fechaFin)}</span>
                  </td>
                  <td>
                    <div class="table-event-name">
                      <span>${evt.banderaPais || '🏁'}</span>
                      <strong>${this.escapeHTML(evt.nombre)}</strong>
                    </div>
                  </td>
                  <td>
                    <div class="table-location">
                      <span>${this.escapeHTML(evt.circuito)}</span>
                      <small class="text-muted">${this.escapeHTML(evt.ciudad)}, ${this.escapeHTML(evt.pais)}</small>
                    </div>
                  </td>
                  <td>
                    <span class="badge-status ${evt.estado === EVENT_STATUS.COMPLETED ? 'badge-status-finished' : 'badge-status-scheduled'}">${this.escapeHTML(evt.estado)}</span>
                  </td>
                  <td class="text-right">
                    <button class="btn btn-sm btn-outline btn-view-event" data-event-id="${evt.id}">Ficha</button>
                    ${canEdit ? `
                      <button class="btn btn-sm btn-outline-warning btn-edit-event" data-event-id="${evt.id}">Editar</button>
                      <button class="btn btn-sm btn-outline-danger btn-delete-event" data-event-id="${evt.id}">Eliminar</button>
                    ` : ''}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  _bindEvents(events, canEdit) {
    const container = this.getContainer();
    if (!container) return;

    // Filter Chips
    container.querySelectorAll('[data-filter-cat]').forEach(chip => {
      chip.addEventListener('click', () => {
        const cat = chip.dataset.filterCat;
        if (this.onFilterChange) this.onFilterChange({ category: cat });
      });
    });

    // Event Type select
    const typeSelect = container.querySelector('#filter-event-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        if (this.onFilterChange) this.onFilterChange({ eventType: e.target.value });
      });
    }

    // Search input
    const searchInput = container.querySelector('#calendar-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        if (this.onFilterChange) this.onFilterChange({ searchQuery: e.target.value });
      });
    }

    // View toggles
    const gridBtn = container.querySelector('#btn-view-grid');
    const tableBtn = container.querySelector('#btn-view-table');
    if (gridBtn) {
      gridBtn.addEventListener('click', () => {
        this.currentViewMode = 'grid';
        if (this.onViewModeChange) this.onViewModeChange('grid');
      });
    }
    if (tableBtn) {
      tableBtn.addEventListener('click', () => {
        this.currentViewMode = 'table';
        if (this.onViewModeChange) this.onViewModeChange('table');
      });
    }

    // Create Event Button
    const createBtn = container.querySelector('#btn-create-event');
    const createFirstBtn = container.querySelector('#btn-create-first-event');
    if (createBtn) createBtn.addEventListener('click', () => this.onCreateEvent && this.onCreateEvent());
    if (createFirstBtn) createFirstBtn.addEventListener('click', () => this.onCreateEvent && this.onCreateEvent());

    // Export Buttons
    const exportIcsBtn = container.querySelector('#btn-export-ics');
    if (exportIcsBtn) exportIcsBtn.addEventListener('click', () => this.onExportICS && this.onExportICS());

    const exportJsonBtn = container.querySelector('#btn-export-json');
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => this.onExportJSON && this.onExportJSON());

    // Action buttons on cards/rows
    container.querySelectorAll('.btn-view-event').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.eventId;
        if (this.onViewDetail) this.onViewDetail(id);
      });
    });

    if (canEdit) {
      container.querySelectorAll('.btn-edit-event').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.eventId;
          if (this.onEditEvent) this.onEditEvent(id);
        });
      });

      container.querySelectorAll('.btn-delete-event').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.eventId;
          if (this.onDeleteEvent) this.onDeleteEvent(id);
        });
      });
    }
  }

  _getCategorySlug(cat) {
    if (!cat) return 'f1';
    if (cat.includes('Fórmula 2') || cat === 'F2') return 'f2';
    if (cat.includes('Fórmula 3') || cat === 'F3') return 'f3';
    if (cat.includes('Academy')) return 'f1a';
    return 'f1';
  }

  // Handlers binding
  setFilterHandler(h) { this.onFilterChange = h; }
  setViewModeHandler(h) { this.onViewModeChange = h; }
  setCreateHandler(h) { this.onCreateEvent = h; }
  setEditHandler(h) { this.onEditEvent = h; }
  setDeleteHandler(h) { this.onDeleteEvent = h; }
  setViewDetailHandler(h) { this.onViewDetail = h; }
  setExportICSHandler(h) { this.onExportICS = h; }
  setExportJSONHandler(h) { this.onExportJSON = h; }
}
