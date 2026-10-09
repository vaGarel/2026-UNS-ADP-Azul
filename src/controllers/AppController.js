import { StorageService } from '../services/StorageService.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { ToastNotification } from '../utils/ToastNotification.js';
import { ModalManager } from '../utils/ModalManager.js';

// Repositories
import { EventRepository } from '../repositories/EventRepository.js';
import { TeamRepository } from '../repositories/TeamRepository.js';
import { DriverRepository } from '../repositories/DriverRepository.js';
import { CarRepository } from '../repositories/CarRepository.js';
import { ScoreRepository } from '../repositories/ScoreRepository.js';
import { TechnicalInspectionRepository } from '../repositories/TechnicalInspectionRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';

// Services
import { AuthService } from '../services/AuthService.js';
import { CalendarService } from '../services/CalendarService.js';
import { ScoreService } from '../services/ScoreService.js';
import { F1ScoringStrategy } from '../services/strategies/F1ScoringStrategy.js';
import { CompetitionProfileService } from '../services/CompetitionProfileService.js';
import { TechnicalInspectionService } from '../services/TechnicalInspectionService.js';

// Views
import { NavbarView } from '../views/NavbarView.js';
import { LoginView } from '../views/LoginView.js';
import { CalendarView } from '../views/CalendarView.js';
import { ScoreView } from '../views/ScoreView.js';
import { CompetitionManagementView } from '../views/CompetitionManagementView.js';

// Controllers
import { AuthController } from './AuthController.js';
import { CalendarController } from './CalendarController.js';
import { ScoreController } from './ScoreController.js';
import { CompetitionManagementController } from './CompetitionManagementController.js';

/**
 * Controlador Principal de la Aplicación (Root Orchestrator & Dependency Injection Container)
 * Cumple con el Principio de Inversión de Dependencias (DIP) y coordina el ciclo de vida MVC
 */
export class AppController {
  constructor() {
    this.currentSection = 'calendar'; // 'calendar' | 'scores' | 'competition'
    this._initializeDIContainer();
  }

  _initializeDIContainer() {
    // 1. Infraestructura y Utilidades Compartidas
    this.eventEmitter = new EventEmitter();
    this.storageService = new StorageService();
    this.toastNotification = new ToastNotification();
    this.modalManager = new ModalManager();

    // 2. Capa de Repositorios (Persistencia)
    this.userRepository = new UserRepository(this.storageService);
    this.technicalInspectionRepository = new TechnicalInspectionRepository(this.storageService);
    this.eventRepository = new EventRepository(this.storageService);
    this.teamRepository = new TeamRepository(this.storageService);
    this.driverRepository = new DriverRepository(this.storageService);
    this.carRepository = new CarRepository(this.storageService);
    this.scoreRepository = new ScoreRepository(this.storageService);

    // 3. Capa de Servicios de Negocio
    this.authService = new AuthService(this.storageService, this.userRepository, this.eventEmitter);
    this.calendarService = new CalendarService(this.eventRepository, this.authService, this.eventEmitter);
    this.scoreService = new ScoreService(
      this.scoreRepository,
      this.eventRepository,
      this.teamRepository,
      this.driverRepository,
      this.authService,
      this.eventEmitter,
      new F1ScoringStrategy()
    );
    this.competitionProfileService = new CompetitionProfileService(
      this.teamRepository,
      this.driverRepository,
      this.carRepository,
      this.scoreRepository,
      this.scoreService,
      this.authService,
      this.eventEmitter
    );
    this.technicalInspectionService = new TechnicalInspectionService(
      this.technicalInspectionRepository,
      this.carRepository,
      this.authService,
      this.eventEmitter
    );

    // 4. Capa de Vistas
    this.navbarView = new NavbarView('navbar-container');
    this.loginView = new LoginView('main-content');
    this.calendarView = new CalendarView('main-content');
    this.scoreView = new ScoreView('main-content');
    this.competitionManagementView = new CompetitionManagementView('main-content');

    // 5. Capa de Controladores Especializados (MVC)
    this.authController = new AuthController(
      this.authService,
      this.loginView,
      this.toastNotification
    );
    this.calendarController = new CalendarController(
      this.calendarService,
      this.authService,
      this.calendarView,
      this.modalManager,
      this.toastNotification,
      this.eventEmitter
    );
    this.scoreController = new ScoreController(
      this.scoreService,
      this.eventRepository,
      this.teamRepository,
      this.driverRepository,
      this.authService,
      this.scoreView,
      this.modalManager,
      this.toastNotification,
      this.eventEmitter,
      () => this.currentSection === 'scores'
    );
    this.competitionManagementController = new CompetitionManagementController(
      this.competitionProfileService,
      this.technicalInspectionService,
      this.teamRepository,
      this.driverRepository,
      this.carRepository,
      this.authService,
      this.competitionManagementView,
      this.modalManager,
      this.toastNotification,
      this.eventEmitter
    );

    this._bindNavigationEvents();
  }

  _bindNavigationEvents() {
    this.navbarView.setNavigationHandler((section) => this.navigateTo(section));
    this.navbarView.setLogoutHandler(() => this.authController.logout());
    this.loginView.setSubmitHandler((email, password) => this.authController.login(email, password));

    this.eventEmitter.on('auth:userChanged', () => {
      this.render();
    });
  }

  start() {
    this.render();
  }

  navigateTo(section) {
    this.currentSection = section;
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  render() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.navbarView.render({ currentUser: null, currentSection: this.currentSection });
      this.authController.renderLogin();
      return;
    }

    // 1. Render Navbar
    this.navbarView.render({
      currentUser,
      currentSection: this.currentSection
    });

    // 2. Render Active View
    switch (this.currentSection) {
      case 'calendar':
        this.calendarController.render();
        break;
      case 'scores':
        this.scoreController.render();
        break;
      case 'competition':
        this.competitionManagementController.render();
        break;
      default:
        this.calendarController.render();
        break;
    }
  }
}
