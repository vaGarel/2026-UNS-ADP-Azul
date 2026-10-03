/**
 * Gestor de Notificaciones Toast Flotantes
 */
export class ToastNotification {
  constructor() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  show({ title = 'Notificación', message = '', type = 'info', duration = 4000 }) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slide-in`;

    const iconMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <div class="toast-icon">${iconMap[type] || 'ℹ'}</div>
      <div class="toast-body">
        <div class="toast-title">${this._escapeHTML(title)}</div>
        <div class="toast-message">${this._escapeHTML(message)}</div>
      </div>
      <button class="toast-close" aria-label="Cerrar">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    const removeToast = () => {
      toast.classList.add('animate-fade-out');
      setTimeout(() => toast.remove(), 300);
    };

    closeBtn.addEventListener('click', removeToast);

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(removeToast, duration);
    }
  }

  success(title, message, duration) {
    this.show({ title, message, type: 'success', duration });
  }

  error(title, message, duration) {
    this.show({ title, message, type: 'error', duration });
  }

  warning(title, message, duration) {
    this.show({ title, message, type: 'warning', duration });
  }

  info(title, message, duration) {
    this.show({ title, message, type: 'info', duration });
  }

  _escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
