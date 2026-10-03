import { MESSAGE_PRIORITY } from '../models/Message.js';

export class MessagingController {
  constructor(
    messagingService,
    teamRepository,
    authService,
    messagingView,
    modalManager,
    toastNotification,
    eventEmitter
  ) {
    this.messagingService = messagingService;
    this.teamRepository = teamRepository;
    this.authService = authService;
    this.messagingView = messagingView;
    this.modalManager = modalManager;
    this.toastNotification = toastNotification;
    this.eventEmitter = eventEmitter;

    this.selectedConversationId = null;

    this._bindViewHandlers();
    this._subscribeToEvents();
  }

  _bindViewHandlers() {
    this.messagingView.setSelectConversationHandler((id) => {
      this.selectedConversationId = id;
      this.refreshView();
    });

    this.messagingView.setNewConversationHandler(() => this.handleNewConversation());
    this.messagingView.setSendMessageHandler((data) => this.handleSendMessage(data));
  }

  _subscribeToEvents() {
    this.eventEmitter.on('messaging:conversationCreated', (conv) => {
      this.selectedConversationId = conv.id;
      this.refreshView();
    });
    this.eventEmitter.on('messaging:messageSent', () => this.refreshView());
    this.eventEmitter.on('auth:userChanged', () => {
      this.selectedConversationId = null;
      this.refreshView();
    });
  }

  render() {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser.isPublico()) {
      return;
    }

    const conversations = this.messagingService.getConversationsForCurrentRole();
    if (!this.selectedConversationId && conversations.length > 0) {
      this.selectedConversationId = conversations[0].id;
    }

    const activeMessages = this.selectedConversationId
      ? this.messagingService.getMessagesByConversation(this.selectedConversationId)
      : [];

    const teams = this.teamRepository.getAll();

    this.messagingView.render({
      conversations,
      activeMessages,
      currentUser,
      teams
    });
  }

  refreshView() {
    this.render();
  }

  handleSendMessage({ conversacionId, cuerpo, prioridad }) {
    try {
      this.messagingService.sendMessage({ conversacionId, cuerpo, prioridad });
      this.toastNotification.info('Mensaje Enviado', 'Transmitido a través del canal oficial seguro.');
    } catch (err) {
      this.toastNotification.error('Error al enviar', err.message);
    }
  }

  handleNewConversation() {
    const teams = this.teamRepository.getAll();
    const currentUser = this.authService.getCurrentUser();

    const formHtml = `
      <form id="form-new-conv" class="crud-form">
        <div class="form-row">
          <div class="form-group flex-2">
            <label for="conv-team">Escudería Destino / Origen *</label>
            <select id="conv-team" class="form-select" ${currentUser.isAdminEscuderia() ? 'disabled' : ''}>
              ${teams.map(t => `<option value="${t.id}" ${t.id === currentUser.escuderiaId ? 'selected' : ''}>${t.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="form-group flex-1">
            <label for="conv-cat">Categoría del Hilo *</label>
            <select id="conv-cat" class="form-select">
              <option value="Técnico / Homologación">Técnico / Homologación</option>
              <option value="Sanción / Comisarios">Sanción / Comisarios</option>
              <option value="Calendario / Logística">Calendario / Logística</option>
              <option value="Neumáticos Pirelli">Neumáticos Pirelli</option>
              <option value="Urgente Dirección">🚨 Urgente Dirección</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="conv-asunto">Asunto Oficial *</label>
          <input type="text" id="conv-asunto" class="form-input" required placeholder="Ej. Solicitud de cambio de unidad de potencia para FP2">
        </div>

        <div class="form-group">
          <label for="conv-msg">Mensaje Inicial *</label>
          <textarea id="conv-msg" class="form-textarea" rows="3" required placeholder="Redactar comunicación formal..."></textarea>
        </div>

        <div class="form-group">
          <label for="conv-prio">Prioridad</label>
          <select id="conv-prio" class="form-select">
            <option value="${MESSAGE_PRIORITY.NORMAL}">Prioridad Normal</option>
            <option value="${MESSAGE_PRIORITY.URGENT}">🚨 Urgente / Notificación Inmediata</option>
          </select>
        </div>

        <div class="modal-actions mt-4">
          <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">Iniciar Comunicación Segura</button>
        </div>
      </form>
    `;

    this.modalManager.open({
      title: '✉️ Iniciar Nueva Comunicación Oficial',
      contentHtml: formHtml,
      onRender: (container, closeModal) => {
        container.querySelector('#btn-cancel-modal').addEventListener('click', closeModal);
        const form = container.querySelector('#form-new-conv');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          try {
            const teamId = currentUser.isAdminEscuderia() ? currentUser.escuderiaId : form.querySelector('#conv-team').value;
            const data = {
              escuderiaId: teamId,
              categoria: form.querySelector('#conv-cat').value,
              asunto: form.querySelector('#conv-asunto').value,
              mensajeInicial: form.querySelector('#conv-msg').value,
              prioridad: form.querySelector('#conv-prio').value
            };

            this.messagingService.createConversation(data);
            this.toastNotification.success('Comunicación Iniciada', 'El hilo ha sido registrado en el sistema de mensajería FIA.');
            closeModal();
          } catch (err) {
            this.toastNotification.error('Error', err.message);
          }
        });
      }
    });
  }
}
