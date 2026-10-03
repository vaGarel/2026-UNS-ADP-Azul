import { BaseView } from './BaseView.js';
import { DateFormatter } from '../utils/DateFormatter.js';
import { SANCTION_SEVERITY } from '../models/Sanction.js';

export class SanctionView extends BaseView {
  constructor(containerId = 'main-content') {
    super(containerId);
  }

  render({ sanctions = [], currentUser }) {
    const container = this.getContainer();
    if (!container) return;

    const canManage = currentUser.canManageSanctions();
    const canAcknowledge = currentUser.canAcknowledgeNotifications() || currentUser.isAdminFIA();

    container.innerHTML = `
      <section class="section-container animate-fade-in" id="sanctions-section">
        <div class="section-hero">
          <div class="hero-text">
            <div class="hero-badge">COMISARIOS DEPORTIVOS FIA</div>
            <h2 class="hero-title">Registro Oficial de Sanciones y Penalizaciones</h2>
            <p class="hero-subtitle">Resoluciones oficiales sobre incidentes de carrera, cambios no autorizados en monoplazas y trabajos fuera de horario reglamentario con trazabilidad legal de notificación.</p>
          </div>
          <div class="hero-actions">
            ${canManage ? `
              <button class="btn btn-primary btn-glow" id="btn-create-sanction">
                <span class="btn-icon">🚩➕</span> Aplicar Nueva Sanción (FIA)
              </button>
            ` : ''}
          </div>
        </div>

        <div class="sanctions-list-container">
          ${sanctions.length === 0 ? `
            <div class="empty-state-card">
              <div class="empty-icon">⚖️</div>
              <h3>No hay sanciones registradas</h3>
              <p>El campeonato se encuentra limpio de infracciones reglamentarias.</p>
            </div>
          ` : sanctions.map(s => {
            const isAck = s.notificadoEscuderia;
            const isMyTeam = currentUser.isAdminEscuderia() && currentUser.isAuthorizedForTeam(s.escuderiaId);
            const canAckThis = canAcknowledge && (currentUser.isAdminFIA() || isMyTeam);

            let severityClass = 'badge-severity-low';
            if (s.gravedad === SANCTION_SEVERITY.MEDIUM) severityClass = 'badge-severity-med';
            if (s.gravedad === SANCTION_SEVERITY.HIGH) severityClass = 'badge-severity-high';

            return `
              <div class="sanction-card ${isAck ? 'sanction-card-ack' : 'sanction-card-pending'}">
                <div class="sanction-header">
                  <div class="sanction-title-row">
                    <span class="sanction-icon">🚩</span>
                    <div>
                      <h3 class="sanction-subject">${this.escapeHTML(s.tipoSancion)}: <span class="penalty-value">${this.escapeHTML(s.valorPenalidad)}</span></h3>
                      <span class="sanction-meta-sub">${this.escapeHTML(s.eventoNombre)} | Fecha: ${DateFormatter.formatDate(s.fecha)}</span>
                    </div>
                  </div>
                  <div class="sanction-badges-group">
                    <span class="badge-severity ${severityClass}">${this.escapeHTML(s.gravedad)}</span>
                    <span class="badge-status ${isAck ? 'badge-status-finished' : 'badge-status-danger'}">
                      ${isAck ? '✓ Notificado' : '⏳ Pendiente de Asentamiento'}
                    </span>
                  </div>
                </div>

                <div class="sanction-body">
                  <div class="sanction-parties">
                    <div class="party-box">
                      <span class="party-label">Sancionado:</span>
                      <strong>${this.escapeHTML(s.pilotoNombre || s.escuderiaNombre)}</strong>
                      <small class="text-muted d-block">${this.escapeHTML(s.escuderiaNombre)}</small>
                    </div>
                    <div class="party-box">
                      <span class="party-label">Base Reglamentaria:</span>
                      <code>${this.escapeHTML(s.articuloReglamento)}</code>
                    </div>
                  </div>

                  <div class="sanction-motivo-box">
                    <strong>Motivo de la Decisión de los Comisarios:</strong>
                    <p class="motivo-text">${this.escapeHTML(s.motivo)}</p>
                  </div>

                  ${isAck ? `
                    <div class="sanction-ack-receipt">
                      <span>✓ Notificación formal asentada por: <strong>${this.escapeHTML(s.responsableNotificacion || 'Director de Escudería')}</strong> el ${DateFormatter.formatDateTime(s.fechaNotificacion)}</span>
                    </div>
                  ` : ''}
                </div>

                <div class="sanction-footer">
                  ${!isAck && canAckThis ? `
                    <button class="btn btn-sm btn-success btn-ack-sanction" data-sanction-id="${s.id}">
                      ✍️ Asentar y Confirmar Notificación de Sanción
                    </button>
                  ` : ''}
                  ${canManage ? `
                    <button class="btn btn-sm btn-outline-danger btn-delete-sanction" data-sanction-id="${s.id}">
                      🗑️ Eliminar Registro
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;

    this._bindEvents(canManage);
  }

  _bindEvents(canManage) {
    const container = this.getContainer();
    if (!container) return;

    const createBtn = container.querySelector('#btn-create-sanction');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        if (this.onCreateSanction) this.onCreateSanction();
      });
    }

    container.querySelectorAll('.btn-ack-sanction').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.sanctionId;
        if (this.onAcknowledgeSanction) this.onAcknowledgeSanction(id);
      });
    });

    if (canManage) {
      container.querySelectorAll('.btn-delete-sanction').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.sanctionId;
          if (this.onDeleteSanction) this.onDeleteSanction(id);
        });
      });
    }
  }

  setCreateHandler(h) { this.onCreateSanction = h; }
  setAcknowledgeHandler(h) { this.onAcknowledgeSanction = h; }
  setDeleteHandler(h) { this.onDeleteSanction = h; }
}
