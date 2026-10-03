import { Conversation, CONVERSATION_STATUS } from '../models/Conversation.js';
import { Message, MESSAGE_PRIORITY } from '../models/Message.js';

/**
 * Servicio de Mensajería Interna y Notificaciones Seguras (FIA <-> Escuderías)
 */
export class MessagingService {
  constructor(
    conversationRepository,
    messageRepository,
    teamRepository,
    authService,
    eventEmitter
  ) {
    this.conversationRepository = conversationRepository;
    this.messageRepository = messageRepository;
    this.teamRepository = teamRepository;
    this.authService = authService;
    this.eventEmitter = eventEmitter;
  }

  getConversationsForCurrentRole() {
    const user = this.authService.getCurrentUser();
    if (!user || user.isPublico()) return [];

    if (user.isAdminFIA()) {
      return this.conversationRepository.getAll()
        .sort((a, b) => new Date(b.ultimoMensajeFecha) - new Date(a.ultimoMensajeFecha));
    }

    if (user.isAdminEscuderia()) {
      return this.conversationRepository.getByTeam(user.escuderiaId)
        .sort((a, b) => new Date(b.ultimoMensajeFecha) - new Date(a.ultimoMensajeFecha));
    }

    return [];
  }

  getMessagesByConversation(conversationId) {
    const user = this.authService.getCurrentUser();
    if (!user || user.isPublico()) return [];

    const conv = this.conversationRepository.getById(conversationId);
    if (!conv) return [];

    if (user.isAdminEscuderia() && !user.isAuthorizedForTeam(conv.escuderiaId)) {
      throw new Error('Permiso denegado: Esta conversación pertenece a otra escudería.');
    }

    return this.messageRepository.getByConversation(conversationId);
  }

  createConversation({ asunto, categoria, escuderiaId, mensajeInicial, prioridad = MESSAGE_PRIORITY.NORMAL }) {
    const user = this.authService.getCurrentUser();
    if (!user || user.isPublico()) {
      throw new Error('Permiso denegado: El público no tiene acceso al sistema de mensajería interna.');
    }

    const team = this.teamRepository.getById(escuderiaId);
    if (!team) throw new Error('Escudería destino no encontrada.');

    const newConv = new Conversation({
      asunto,
      categoria,
      participanteFIAId: user.isAdminFIA() ? user.id : 'usr-admin-fia',
      participanteFIANombre: user.isAdminFIA() ? user.nombre : 'Dirección Técnica FIA',
      escuderiaId,
      escuderiaNombre: team.nombre,
      estado: CONVERSATION_STATUS.ACTIVE,
      mensajesCount: 1,
      ultimoMensajeTexto: mensajeInicial,
      ultimoMensajeFecha: new Date().toISOString()
    });

    const savedConv = this.conversationRepository.create(newConv);

    // Guardar primer mensaje
    const newMsg = new Message({
      conversacionId: savedConv.id,
      emisorId: user.id,
      emisorNombre: user.nombre,
      emisorRol: user.rol,
      cuerpo: mensajeInicial,
      prioridad,
      leido: true
    });
    this.messageRepository.create(newMsg);

    this.eventEmitter.emit('messaging:conversationCreated', savedConv);
    return savedConv;
  }

  sendMessage({ conversacionId, cuerpo, prioridad = MESSAGE_PRIORITY.NORMAL }) {
    const user = this.authService.getCurrentUser();
    if (!user || user.isPublico()) {
      throw new Error('Permiso denegado.');
    }

    const conv = this.conversationRepository.getById(conversacionId);
    if (!conv) throw new Error('Conversación no encontrada.');

    if (user.isAdminEscuderia() && !user.isAuthorizedForTeam(conv.escuderiaId)) {
      throw new Error('Permiso denegado para esta conversación.');
    }

    const newMsg = new Message({
      conversacionId,
      emisorId: user.id,
      emisorNombre: user.nombre,
      emisorRol: user.rol,
      cuerpo,
      prioridad,
      leido: true
    });

    const savedMsg = this.messageRepository.create(newMsg);

    // Actualizar conversación
    this.conversationRepository.update(conversacionId, {
      mensajesCount: conv.mensajesCount + 1,
      ultimoMensajeTexto: cuerpo,
      ultimoMensajeFecha: new Date().toISOString()
    });

    this.eventEmitter.emit('messaging:messageSent', { conversationId: conversacionId, message: savedMsg });
    return savedMsg;
  }
}
