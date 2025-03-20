const axios = require('axios');

class LLMClient {
  constructor() {
    this.apiKey = '';
    this.model = 'gpt-3.5-turbo';
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    this.systemPrompt = {
      role: 'system',
      content: 'You are an AI assistant that can interact with the local system. Use [[ACTION: parameters]] to request actions. Examples: [[EXECUTE: ls -l]] to run a command, [[READ: file.txt]] to read a file. Results will be provided in the next message.'
    };
  }

  /**
   * Update settings for the LLM client
   * @param {string} apiKey - The OpenAI API key
   * @param {string} model - The OpenAI model to use
   */
  updateSettings(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Get a completion from the LLM
   * @param {Array} messages - The conversation history
   * @returns {Promise<string>} - The LLM response
   */
  async getCompletion(messages) {
    if (!this.apiKey) {
      throw new Error('API key not set. Please configure in settings.');
    }

    try {
      // Add system prompt if not already present
      const conversationWithSystemPrompt = [];
      
      // Check if first message is already a system message
      if (messages.length === 0 || messages[0].role !== 'system') {
        conversationWithSystemPrompt.push(this.systemPrompt);
      }

      // Add all messages from conversation history
      conversationWithSystemPrompt.push(...messages);

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: conversationWithSystemPrompt,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      } else {
        throw new Error('Invalid response from OpenAI API');
      }
    } catch (error) {
      if (error.response) {
        // API error with response
        const errorMessage = error.response.data.error?.message || 'Unknown API error';
        throw new Error(`OpenAI API error: ${errorMessage}`);
      } else if (error.request) {
        // Network error
        throw new Error('Network error: Unable to reach OpenAI API');
      } else {
        // Other errors
        throw error;
      }
    }
  }
}

module.exports = { LLMClient };
