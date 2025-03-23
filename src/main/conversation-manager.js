const { v4: uuidv4 } = require('uuid');

class ConversationManager {
  constructor(store) {
    this.store = store;
    this.chats = store.get('chats', {});
    this.currentChatId = null;
  }

  /**
   * Get all chats
   * @returns {Object} - All chat objects
   */
  getChats() {
    return this.chats;
  }

  /**
   * Create a new chat
   * @returns {string} - New chat ID
   */
  createChat() {
    const chatId = uuidv4();
    const newChat = {
      id: chatId,
      title: `Chat ${Object.keys(this.chats).length + 1}`,
      createdAt: new Date().toISOString(),
      messages: []
    };

    this.chats[chatId] = newChat;
    this.currentChatId = chatId;
    this._saveChats();

    return chatId;
  }

  /**
   * Select a chat
   * @param {string} chatId - The chat ID to select
   * @returns {Object} - The selected chat
   */
  selectChat(chatId) {
    if (!this.chats[chatId]) {
      throw new Error(`Chat with id ${chatId} not found`);
    }

    this.currentChatId = chatId;
    return this.chats[chatId];
  }

  /**
   * Get a specific chat
   * @param {string} chatId - The chat ID to get
   * @returns {Object} - The chat object
   */
  getChat(chatId) {
    return this.chats[chatId];
  }

  /**
   * Get the conversation for a chat
   * @param {string} chatId - The chat ID
   * @returns {Array} - The conversation messages
   */
  getConversation(chatId) {
    return this.chats[chatId]?.messages || [];
  }

  /**
   * Add a user message to a chat
   * @param {string} chatId - The chat ID
   * @param {string} content - The message content
   */
  addUserMessage(chatId, content) {
    if (!this.chats[chatId]) {
      throw new Error(`Chat with id ${chatId} not found`);
    }

    this.chats[chatId].messages.push({
      role: 'user',
      content
    });

    this._saveChats();
  }

  /**
   * Add an assistant message to a chat
   * @param {string} chatId - The chat ID
   * @param {string} content - The message content
   */
  addAssistantMessage(chatId, content) {
    if (!this.chats[chatId]) {
      throw new Error(`Chat with id ${chatId} not found`);
    }

    this.chats[chatId].messages.push({
      role: 'assistant',
      content
    });

    // Update chat title based on first message if not set
    if (this.chats[chatId].title === `Chat ${Object.keys(this.chats).length}` && this.chats[chatId].messages.length > 1) {
      const firstUserMessage = this.chats[chatId].messages.find(msg => msg.role === 'user');
      if (firstUserMessage) {
        // Use first 30 characters of first user message as title
        this.chats[chatId].title = firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
      }
    }

    this._saveChats();
  }

  /**
   * Add a system message to a chat
   * @param {string} chatId - The chat ID
   * @param {string} content - The message content
   */
  addSystemMessage(chatId, content) {
    if (!this.chats[chatId]) {
      throw new Error(`Chat with id ${chatId} not found`);
    }

    // For MCP results and errors, we use a special format
    // This should still appear as coming from the system in the UI
    // but will be treated as a user message by the LLM
    this.chats[chatId].messages.push({
      role: 'user',  // Use 'user' role for compatibility with both OpenAI and Anthropic
      content,       // Content remains the same
      systemMessage: true // Rename from isSystem to systemMessage for clarity
    });

    this._saveChats();
  }

  /**
   * Save chats to persistent storage
   * @private
   */
  _saveChats() {
    this.store.set('chats', this.chats);
  }

  /**
   * Delete a chat
   * @param {string} chatId - The chat ID to delete
   * @returns {boolean} - Success status
   */
  deleteChat(chatId) {
    if (!this.chats[chatId]) {
      return false;
    }

    // Delete the chat
    delete this.chats[chatId];
    
    // Reset current chat ID if it was the deleted chat
    if (this.currentChatId === chatId) {
      this.currentChatId = null;
    }

    this._saveChats();
    return true;
  }
}

module.exports = { ConversationManager };
