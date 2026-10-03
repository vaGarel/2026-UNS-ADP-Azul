import { BaseView } from './BaseView.js';
import { DateFormatter } from '../utils/DateFormatter.js';
import { MESSAGE_PRIORITY } from '../models/Message.js';

export class MessagingView extends BaseView {
  constructor(containerId = 'main-content') {
    super(containerId);
    this.selectedConversationId = null;
  }

  render({ conversations = [], activeMessages = [], currentUser, teams = [] }) {
    const container = this.getContainer();
    if (!container) return;

    if (!this.selectedConversationId && conversations.length > 0) {
      this.selectedConversationId = conversations[0].id;
    }

    const activeConv = conversations.find(c => c.id === this.selectedConversationId);

    container.innerHTML = `
      <section class="section-container animate-fade-in" id="messaging-section">
        <div class="section-hero">
          <div class="hero-text">
            <div class="hero-badge">SISTEMA ENCRIPTADO DE MENSAJERÍA FIA</div>
            <h2 class="hero-title">Comunicaciones Oficiales FIA & Escuderías</h2>
            <p class="hero-subtitle">Canal prioritario y seguro para notificaciones técnicas, aclaraciones reglamentarias y solicitudes de comisarios.</p>
          </div>
          <div class="hero-actions">
            <button class="btn btn-primary btn-glow" id="btn-new-conversation">
              <span class="btn-icon">✉️</span> Nueva Comunicación
            </button>
          </div>
        </div>

        <div class="chat-layout-grid">
          <!-- Columna de Conversaciones -->
          <div class="conversations-sidebar">
            <div class="sidebar-header">
              <h3 class="sidebar-title">Hilos de Discusión Activos</h3>
              <span class="badge-count">${conversations.length}</span>
            </div>

            <div class="conversations-list">
              ${conversations.length === 0 ? `
                <div class="empty-state-mini">
                  <p>No hay conversaciones abiertas.</p>
                </div>
              ` : conversations.map(conv => {
                const isSelected = conv.id === this.selectedConversationId;
                return `
                  <div class="conv-item ${isSelected ? 'active' : ''}" data-conv-id="${conv.id}">
                    <div class="conv-item-top">
                      <span class="conv-team-pill">${this.escapeHTML(conv.escuderiaNombre)}</span>
                      <span class="conv-time">${DateFormatter.formatDateTime(conv.ultimoMensajeFecha)}</span>
                    </div>
                    <h4 class="conv-subject">${this.escapeHTML(conv.asunto)}</h4>
                    <p class="conv-snippet">${this.escapeHTML(conv.ultimoMensajeTexto || 'Sin mensajes')}</p>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Columna del Chat / Mensajes -->
          <div class="chat-main-panel">
            ${activeConv ? `
              <div class="chat-header">
                <div class="chat-header-info">
                  <span class="category-tag">${this.escapeHTML(activeConv.categoria)}</span>
                  <h3 class="chat-active-title">${this.escapeHTML(activeConv.asunto)}</h3>
                  <span class="chat-participants">
                    Participantes: <strong>${this.escapeHTML(activeConv.participanteFIANombre)}</strong> & <strong>${this.escapeHTML(activeConv.escuderiaNombre)}</strong>
                  </span>
                </div>
                <div class="security-seal">
                  <span>🔒 Encriptado TLS FIA</span>
                </div>
              </div>

              <div class="messages-stream" id="messages-stream">
                ${activeMessages.length === 0 ? `
                  <div class="empty-state-mini py-5">
                    <p>No hay mensajes en este hilo aún.</p>
                  </div>
                ` : activeMessages.map(msg => {
                  const isMe = msg.emisorId === currentUser.id;
                  const isUrgent = msg.prioridad === MESSAGE_PRIORITY.URGENT;

                  return `
                    <div class="message-bubble-wrapper ${isMe ? 'msg-outgoing' : 'msg-incoming'}">
                      <div class="message-bubble ${isUrgent ? 'bubble-urgent' : ''}">
                        <div class="msg-author-row">
                          <span class="msg-author">${this.escapeHTML(msg.emisorNombre)}</span>
                          <span class="msg-timestamp">${DateFormatter.formatDateTime(msg.timestamp)}</span>
                        </div>
                        ${isUrgent ? '<div class="msg-urgent-badge">🚨 NOTIFICACIÓN PRIORIDAD MÁXIMA</div>' : ''}
                        <div class="msg-content-text">${this.escapeHTML(msg.cuerpo)}</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <div class="chat-input-container">
                <form id="form-send-message" class="chat-form">
                  <div class="input-controls-row">
                    <input type="text" id="input-message-body" class="form-input chat-input" placeholder="Escribir mensaje formal al equipo..." required autocomplete="off">
                    <select id="select-message-priority" class="form-select select-priority">
                      <option value="${MESSAGE_PRIORITY.NORMAL}">Prioridad Normal</option>
                      <option value="${MESSAGE_PRIORITY.URGENT}">🚨 Urgente / Oficial</option>
                    </select>
                    <button type="submit" class="btn btn-primary btn-send">
                      <span>Enviar</span> 🚀
                    </button>
                  </div>
                </form>
              </div>
            ` : `
              <div class="empty-state-card mt-5">
                <p>Selecciona una conversación de la izquierda o crea una nueva.</p>
              </div>
            `}
          </div>
        </div>
      </section>
    `;

    this._bindEvents();
    this._scrollToBottom();
  }

  _bindEvents() {
    const container = this.getContainer();
    if (!container) return;

    container.querySelectorAll('.conv-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.convId;
        this.selectedConversationId = id;
        if (this.onSelectConversation) this.onSelectConversation(id);
      });
    });

    const newConvBtn = container.querySelector('#btn-new-conversation');
    if (newConvBtn) {
      newConvBtn.addEventListener('click', () => {
        if (this.onOpenNewConversation) this.onOpenNewConversation();
      });
    }

    const formSend = container.querySelector('#form-send-message');
    if (formSend) {
      formSend.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = formSend.querySelector('#input-message-body');
        const prioritySelect = formSend.querySelector('#select-message-priority');
        const text = input.value.trim();
        if (text && this.onSendMessage) {
          this.onSendMessage({
            conversacionId: this.selectedConversationId,
            cuerpo: text,
            prioridad: prioritySelect ? prioritySelect.value : MESSAGE_PRIORITY.NORMAL
          });
          input.value = '';
        }
      });
    }
  }

  _scrollToBottom() {
    setTimeout(() => {
      const stream = document.getElementById('messages-stream');
      if (stream) {
        stream.scrollTop = stream.scrollHeight;
      }
    }, 50);
  }

  setSelectConversationHandler(h) { this.onSelectConversation = h; }
  setNewConversationHandler(h) { this.onOpenNewConversation = h; }
  setSendMessageHandler(h) { this.onSendMessage = h; }
}
