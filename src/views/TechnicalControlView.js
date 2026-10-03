import { BaseView } from './BaseView.js';
import { DateFormatter } from '../utils/DateFormatter.js';
import { CONTROL_STATUS } from '../models/TechnicalControl.js';

export class TechnicalControlView extends BaseView {
  constructor(containerId = 'main-content') {
    super(containerId);
  }

  render({ controls = [], currentUser }) {
    const container = this.getContainer();
    if (!container) return;

    const canManage = currentUser.canManageTechnicalControls();

    container.innerHTML = `
      <section class="section-container animate-fade-in" id="technical-section">
        <div class="section-hero">
          <div class="hero-text">
            <div class="hero-badge">VERIFICACIONES TÉCNICAS Y PARQUE CERRADO</div>
            <h2 class="hero-title">Controles Técnicos Oficiales FIA</h2>
            <p class="hero-subtitle">Registro y fiscalización de inspecciones técnicas a monoplazas (peso mínimo, alerones, unidad de potencia, combustible y desgaste de plancha).</p>
          </div>
          <div class="hero-actions">
            ${canManage ? `
              <button class="btn btn-primary btn-glow" id="btn-create-control">
                <span class="btn-icon">🔬➕</span> Registrar Control Técnico (FIA)
              </button>
            ` : ''}
          </div>
        </div>

        <div class="table-responsive-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Monoplaza / Escudería</th>
                <th>Tipo de Control</th>
                <th>Mediciones & Comisario</th>
                <th>Dictamen</th>
                ${canManage ? '<th class="text-right">Acciones</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${controls.length === 0 ? `
                <tr><td colspan="6" class="text-center py-4">No hay controles técnicos registrados.</td></tr>
              ` : controls.map(c => {
                const isPassed = c.estado === CONTROL_STATUS.PASSED;
                return `
                  <tr>
                    <td>
                      <span class="date-text">${DateFormatter.formatDate(c.fecha)}</span>
                      <small class="text-muted d-block">${this.escapeHTML(c.eventoNombre)}</small>
                    </td>
                    <td>
                      <div class="table-car-cell">
                        <strong>Auto #${c.autoNumero}</strong>
                        <span class="team-sub">${this.escapeHTML(c.escuderiaNombre)} (${this.escapeHTML(c.pilotoNombre || '-')})</span>
                      </div>
                    </td>
                    <td>
                      <span class="control-type-badge">${this.escapeHTML(c.tipoControl)}</span>
                    </td>
                    <td>
                      <div>${this.escapeHTML(c.mediciones || '-')}</div>
                      <small class="text-muted">Fiscal: ${this.escapeHTML(c.comisarioTecnico || 'FIA')}</small>
                    </td>
                    <td>
                      <span class="badge-status ${isPassed ? 'badge-status-finished' : 'badge-status-danger'}">
                        ${isPassed ? '✓ Aprobado' : '✕ No Aprobado / Rechazado'}
                      </span>
                    </td>
                    ${canManage ? `
                      <td class="text-right">
                        <button class="btn btn-sm btn-outline-danger btn-delete-control" data-control-id="${c.id}">
                          🗑️ Eliminar
                        </button>
                      </td>
                    ` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;

    this._bindEvents(canManage);
  }

  _bindEvents(canManage) {
    const container = this.getContainer();
    if (!container) return;

    const createBtn = container.querySelector('#btn-create-control');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        if (this.onCreateControl) this.onCreateControl();
      });
    }

    if (canManage) {
      container.querySelectorAll('.btn-delete-control').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.controlId;
          if (this.onDeleteControl) this.onDeleteControl(id);
        });
      });
    }
  }

  setCreateHandler(h) { this.onCreateControl = h; }
  setDeleteHandler(h) { this.onDeleteControl = h; }
}
