import { BaseView } from './BaseView.js';

export class LoginView extends BaseView {
  constructor(containerId = 'main-content') {
    super(containerId);
  }

  render() {
    const container = this.getContainer();
    if (!container) return;

    container.innerHTML = `
      <section class="login-page" aria-labelledby="login-title">
        <div class="login-card">
          <div class="login-emblem" aria-hidden="true">FIA</div>
          <p class="login-eyebrow">CUENTA DE USUARIO</p>
          <h2 id="login-title">Iniciar sesión</h2>
          <p class="login-intro">Acceda al calendario y campeonato oficial FIA 2026.</p>
          <form id="login-form" class="login-form">
            <label for="login-email">Email</label>
            <input id="login-email" name="email" type="email" autocomplete="username"
              placeholder="usuario@ejemplo.com" required>
            <label for="login-password">Contraseña</label>
            <input id="login-password" name="password" type="password"
              autocomplete="current-password" required>
            <p id="login-error" class="login-error" role="alert" aria-live="polite"></p>
            <button class="btn btn-primary w-100" type="submit">Ingresar</button>
          </form>
          <p class="login-demo-note">Demo: consulte en el README las cuentas de prueba.</p>
        </div>
      </section>
    `;

    const form = container.querySelector('#login-form');
    form.addEventListener('submit', event => {
      event.preventDefault();
      const email = form.elements.namedItem('email').value;
      const password = form.elements.namedItem('password').value;
      if (this.onSubmit) void this.onSubmit(email, password);
    });
  }

  setError(message) {
    const error = this.getContainer()?.querySelector('#login-error');
    if (error) error.textContent = message;
  }

  setSubmitHandler(handler) {
    this.onSubmit = handler;
  }
}
