/**
 * Gestor Centralizado de Modales y Cuadros de Diálogo
 */
export class ModalManager {
  constructor() {
    this.modalOverlay = document.getElementById('modal-overlay');
    this.modalContainer = document.getElementById('modal-container');

    if (!this.modalOverlay) {
      this.modalOverlay = document.createElement('div');
      this.modalOverlay.id = 'modal-overlay';
      this.modalOverlay.className = 'modal-overlay hidden';
      document.body.appendChild(this.modalOverlay);

      this.modalContainer = document.createElement('div');
      this.modalContainer.id = 'modal-container';
      this.modalContainer.className = 'modal-container';
      this.modalOverlay.appendChild(this.modalContainer);

      this.modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.modalOverlay) {
          this.close();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !this.modalOverlay.classList.contains('hidden')) {
          this.close();
        }
      });
    }
  }

  open({ title = 'Diálogo', contentHtml = '', onRender = null, customClass = '' }) {
    this.modalContainer.className = `modal-container ${customClass}`;
    this.modalContainer.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close-btn" id="modal-close-btn" aria-label="Cerrar">&times;</button>
      </div>
      <div class="modal-body">
        ${contentHtml}
      </div>
    `;

    document.getElementById('modal-close-btn').addEventListener('click', () => this.close());
    this.modalOverlay.classList.remove('hidden');
    document.body.classList.add('modal-open');

    if (typeof onRender === 'function') {
      onRender(this.modalContainer, () => this.close());
    }
  }

  close() {
    this.modalOverlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    this.modalContainer.innerHTML = '';
  }

  confirm({ title = 'Confirmar Acción', message = '¿Está seguro de que desea continuar?', confirmText = 'Confirmar', confirmClass = 'btn-danger' }) {
    return new Promise((resolve) => {
      this.open({
        title,
        contentHtml: `
          <div class="confirm-dialog-content">
            <p class="confirm-message">${message}</p>
            <div class="modal-actions mt-4">
              <button class="btn btn-secondary" id="confirm-cancel-btn">Cancelar</button>
              <button class="btn ${confirmClass}" id="confirm-accept-btn">${confirmText}</button>
            </div>
          </div>
        `,
        onRender: (container) => {
          container.querySelector('#confirm-cancel-btn').addEventListener('click', () => {
            this.close();
            resolve(false);
          });
          container.querySelector('#confirm-accept-btn').addEventListener('click', () => {
            this.close();
            resolve(true);
          });
        }
      });
    });
  }
}
