export class AuthController {
  constructor(authService, loginView, toastNotification) {
    this.authService = authService;
    this.loginView = loginView;
    this.toastNotification = toastNotification;
  }

  renderLogin() {
    this.loginView.render();
    this.loginView.setSubmitHandler((email, password) => this.login(email, password));
    this.loginView.setGuestHandler(() => this.loginAsGuest());
  }

  async login(email, password) {
    this.loginView.setError('');
    try {
      const user = await this.authService.login(email, password);
      if (!user) {
        this.loginView.setError('Email o contraseña incorrectos.');
        return;
      }

      this.toastNotification.success('Sesión iniciada', `Bienvenido, ${user.username}.`);
    } catch (error) {
      console.error('No se pudo validar la sesión:', error);
      this.loginView.setError('No se pudo validar la sesión. Intente nuevamente.');
    }
  }

  loginAsGuest() {
    try {
      const user = this.authService.loginAsGuest();
      this.toastNotification.info('Acceso Público General', `Bienvenido, has ingresado como ${user.nombre || 'Aficionado'}.`);
    } catch (error) {
      console.error('No se pudo ingresar como público:', error);
      this.loginView.setError('No se pudo acceder como invitado.');
    }
  }

  logout() {
    this.authService.logout();
  }
}
