import { StorageService } from '../services/StorageService.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { ToastNotification } from '../utils/ToastNotification.js';
import { ModalManager } from '../utils/ModalManager.js';

// Repositories
import { EventRepository } from '../repositories/EventRepository.js';
import { TeamRepository } from '../repositories/TeamRepository.js';
import { DriverRepository } from '../repositories/DriverRepository.js';
import { CarRepository } from '../repositories/CarRepository.js';
import { TechnicalControlRepository } from '../repositories/TechnicalControlRepository.js';
import { SanctionRepository } from '../repositories/SanctionRepository.js';
import { ScoreRepository } from '../repositories/ScoreRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { ConversationRepository } from '../repositories/ConversationRepository.js';
import { MessageRepository } from '../repositories/MessageRepository.js';

// Services
import { AuthService } from '../services/AuthService.js';
import { CalendarService } from '../services/CalendarService.js';
import { ScoreService } from '../services/ScoreService.js';
import { TeamDriverService } from '../services/TeamDriverService.js';
import { TechnicalControlService } from '../services/TechnicalControlService.js';
import { SanctionService } from '../services/SanctionService.js';
import { MessagingService } from '../services/MessagingService.js';
import { UserAdminService } from '../services/UserAdminService.js';
import { F1ScoringStrategy } from '../services/strategies/F1ScoringStrategy.js';

// Views
import { NavbarView } from '../views/NavbarView.js';
import { CalendarView } from '../views/CalendarView.js';
import { ScoreView } from '../views/ScoreView.js';
import { TeamDriverView } from '../views/TeamDriverView.js';
import { TechnicalControlView } from '../views/TechnicalControlView.js';
import { SanctionView } from '../views/SanctionView.js';
import { MessagingView } from '../views/MessagingView.js';
import { UserAdminView } from '../views/UserAdminView.js';

// Controllers
import { AuthController } from './AuthController.js';
import { CalendarController } from './CalendarController.js';
import { ScoreController } from './ScoreController.js';
import { TeamDriverController } from './TeamDriverController.js';
import { TechnicalControlController } from './TechnicalControlController.js';
import { SanctionController } from './SanctionController.js';
import { MessagingController } from './MessagingController.js';
import { UserAdminController } from './UserAdminController.js';

/**
 * Controlador Principal de la Aplicación (Root Orchestrator & Dependency Injection Container)
 * Cumple con el Principio de Inversión de Dependencias (DIP) y coordina el ciclo de vida MVC
 */
export class AppController {
  constructor() {
    this.currentSection = 'calendar'; // 'calendar' | 'scores' | 'teams' | 'technical' | 'sanctions' | 'messages' | 'users' | 'architecture'
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
    this.eventRepository = new EventRepository(this.storageService);
    this.teamRepository = new TeamRepository(this.storageService);
    this.driverRepository = new DriverRepository(this.storageService);
    this.carRepository = new CarRepository(this.storageService);
    this.technicalControlRepository = new TechnicalControlRepository(this.storageService);
    this.sanctionRepository = new SanctionRepository(this.storageService);
    this.scoreRepository = new ScoreRepository(this.storageService);
    this.conversationRepository = new ConversationRepository(this.storageService);
    this.messageRepository = new MessageRepository(this.storageService);

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
    this.teamDriverService = new TeamDriverService(
      this.teamRepository,
      this.driverRepository,
      this.carRepository,
      this.authService,
      this.eventEmitter
    );
    this.technicalControlService = new TechnicalControlService(
      this.technicalControlRepository,
      this.carRepository,
      this.teamRepository,
      this.eventRepository,
      this.authService,
      this.eventEmitter
    );
    this.sanctionService = new SanctionService(
      this.sanctionRepository,
      this.driverRepository,
      this.teamRepository,
      this.eventRepository,
      this.authService,
      this.eventEmitter
    );
    this.messagingService = new MessagingService(
      this.conversationRepository,
      this.messageRepository,
      this.teamRepository,
      this.authService,
      this.eventEmitter
    );
    this.userAdminService = new UserAdminService(
      this.userRepository,
      this.authService,
      this.eventEmitter
    );

    // 4. Capa de Vistas
    this.navbarView = new NavbarView('navbar-container');
    this.calendarView = new CalendarView('main-content');
    this.scoreView = new ScoreView('main-content');
    this.teamDriverView = new TeamDriverView('main-content');
    this.technicalControlView = new TechnicalControlView('main-content');
    this.sanctionView = new SanctionView('main-content');
    this.messagingView = new MessagingView('main-content');
    this.userAdminView = new UserAdminView('main-content');

    // 5. Capa de Controladores Especializados (MVC)
    this.authController = new AuthController(
      this.authService,
      this.modalManager,
      this.toastNotification,
      this.eventEmitter
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
      this.eventEmitter
    );
    this.teamDriverController = new TeamDriverController(
      this.teamDriverService,
      this.authService,
      this.teamDriverView,
      this.modalManager,
      this.toastNotification,
      this.eventEmitter
    );
    this.technicalControlController = new TechnicalControlController(
      this.technicalControlService,
      this.carRepository,
      this.teamRepository,
      this.eventRepository,
      this.authService,
      this.technicalControlView,
      this.modalManager,
      this.toastNotification,
      this.eventEmitter
    );
    this.sanctionController = new SanctionController(
      this.sanctionService,
      this.driverRepository,
      this.teamRepository,
      this.eventRepository,
      this.authService,
      this.sanctionView,
      this.modalManager,
      this.toastNotification,
      this.eventEmitter
    );
    this.messagingController = new MessagingController(
      this.messagingService,
      this.teamRepository,
      this.authService,
      this.messagingView,
      this.modalManager,
      this.toastNotification,
      this.eventEmitter
    );
    this.userAdminController = new UserAdminController(
      this.userAdminService,
      this.teamRepository,
      this.authService,
      this.userAdminView,
      this.modalManager,
      this.toastNotification,
      this.eventEmitter
    );

    this._bindNavigationEvents();
  }

  _bindNavigationEvents() {
    this.navbarView.setNavigationHandler((section) => this.navigateTo(section));
    this.navbarView.setRoleSwitcherHandler(() => this.authController.openRoleSwitcherModal());

    this.eventEmitter.on('auth:userChanged', (user) => {
      // If the user role changes and they were on a restricted view, redirect to calendar
      if (user.isPublico() && (this.currentSection === 'messages' || this.currentSection === 'users')) {
        this.currentSection = 'calendar';
      }
      if (user.isAdminEscuderia() && this.currentSection === 'users') {
        this.currentSection = 'calendar';
      }
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
    const availableUsers = this.authService.getAvailableUsers();

    // 1. Render Navbar
    this.navbarView.render({
      currentUser,
      currentSection: this.currentSection,
      availableUsers
    });

    // 2. Render Active View
    switch (this.currentSection) {
      case 'calendar':
        this.calendarController.render();
        break;
      case 'scores':
        this.scoreController.render();
        break;
      case 'teams':
        this.teamDriverController.render();
        break;
      case 'technical':
        this.technicalControlController.render();
        break;
      case 'sanctions':
        this.sanctionController.render();
        break;
      case 'messages':
        if (!currentUser.isPublico()) {
          this.messagingController.render();
        } else {
          this.calendarController.render();
        }
        break;
      case 'users':
        if (currentUser.isAdminFIA()) {
          this.userAdminController.render();
        } else {
          this.calendarController.render();
        }
        break;
      default:
        this.calendarController.render();
        break;
    }
  }
}
