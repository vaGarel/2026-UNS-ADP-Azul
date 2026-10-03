import { BaseRepository } from './BaseRepository.js';
import { Message } from '../models/Message.js';

export class MessageRepository extends BaseRepository {
  constructor(storageService) {
    super('fia_messages', Message, storageService);
  }

  getByConversation(conversationId) {
    return this.find(m => m.conversacionId === conversationId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  getUnreadCountForConversation(conversationId) {
    return this.find(m => m.conversacionId === conversationId && !m.leido).length;
  }
}
