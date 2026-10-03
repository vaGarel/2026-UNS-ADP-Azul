/**
 * Clase Base para las Vistas de la aplicación (Patrón MVC)
 */
export class BaseView {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
  }

  getContainer() {
    if (!this.container) {
      this.container = document.getElementById(this.containerId);
    }
    return this.container;
  }

  render(data = {}) {
    throw new Error('El método render debe ser implementado por la vista concreta');
  }

  bindEvents(handlers = {}) {
    // Override in subclasses
  }

  escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
