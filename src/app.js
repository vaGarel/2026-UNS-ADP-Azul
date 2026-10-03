import { AppController } from './controllers/AppController.js';

/**
 * Bootstrap de la aplicación FIA Sports Calendar (Equipo Azul)
 */
document.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new AppController();
    app.start();
    console.log('🏁 FIA Sports Calendar & Management System inicializado con éxito (Arquitectura en Capas + SOLID + MVC).');
  } catch (error) {
    console.error('Error durante la inicialización de la aplicación:', error);
  }
});
