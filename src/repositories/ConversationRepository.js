import { BaseRepository } from './BaseRepository.js';
import { Conversation } from '../models/Conversation.js';

export class ConversationRepository extends BaseRepository {
  constructor(storageService) {
    super('fia_conversations', Conversation, storageService);
  }

  getByTeam(teamId) {
    return this.find(c => c.escuderiaId === teamId);
  }
}
