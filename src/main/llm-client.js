const axios = require('axios');

class LLMClient {
  constructor() {
    this.apiKey = '';
    this.model = 'gpt-3.5-turbo';
    this.systemPrompt = {
      role: 'system',
      content: `You are an AI assistant that can interact with the local system using a Model Context Protocol (MCP).

When you need to perform actions on the local system, you MUST use the following format:
[[ACTION_TYPE: parameters]]

Supported action types:
- EXECUTE: Run a terminal command, e.g., [[EXECUTE: ls -l]]
- READ: Read a file, e.g., [[READ: /path/to/file.txt]]
- WRITE: Write to a file, e.g., [[WRITE: /path/to/file.txt, content to write]]
- APPEND: Append to a file, e.g., [[APPEND: /path/to/file.txt, content to append]]
- DELETE: Delete a file, e.g., [[DELETE: /path/to/file.txt]]

IMPORTANT RULES:
1. Place each command on its own line
2. Do not include explanatory text within the [[ ]] brackets
3. Wait for the result of one command before issuing another related command
4. Results of commands will be provided in the next message
5. Never pretend to execute commands - always use the proper MCP format

Example of correct usage:
I'll check the contents of the directory.
[[EXECUTE: ls -l /path/to/directory]]

Examples of incorrect usage:
1. I'll check the contents of the directory [[EXECUTE: ls -l /path/to/directory]] and then we can proceed.
2. Let me execute this command. [[EXECUTE: ls -l /path/to/directory]] The results will help us.

How to handle command failures:
If a command fails or gives too much output:

1. If the output is too large: 
   [[EXECUTE: ls -l /path/to/directory]]
   [MCP_RESULT] Output too large.

   Then try a more specific command instead:
   [[EXECUTE: ls -l /path/to/directory | head -n 20]]

Follow these protocol rules strictly to ensure commands are properly executed.`
    };
  }

  /**
   * Check if the model is from Anthropic
   * @returns {boolean} - True if the model is from Anthropic
   */
  isAnthropicModel() {
    return this.model.startsWith('claude');
  }

  /**
   * Get the appropriate API URL based on the model provider
   * @returns {string} - The API URL
   */
  getApiUrl() {
    return this.isAnthropicModel() 
      ? 'https://api.anthropic.com/v1/messages'
      : 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * Update settings for the LLM client
   * @param {string} apiKey - The API key (OpenAI or Anthropic)
   * @param {string} model - The model to use (OpenAI or Anthropic)
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
      const isAnthropicModel = this.isAnthropicModel();
      const apiUrl = this.getApiUrl();
      
      // Add system prompt if not already present
      const conversationWithSystemPrompt = [];
      
      // Check if first message is already a system message
      if (messages.length === 0 || messages[0].role !== 'system') {
        conversationWithSystemPrompt.push(this.systemPrompt);
      }

      // Add all messages from conversation history
      conversationWithSystemPrompt.push(...messages);

      let requestData;
      let headers = {
        'Content-Type': 'application/json',
      };

      if (isAnthropicModel) {
        // Format for Anthropic API
        const systemPrompt = conversationWithSystemPrompt.find(msg => msg.role === 'system')?.content || '';
        const nonSystemMessages = conversationWithSystemPrompt.filter(msg => msg.role !== 'system');
        
        requestData = {
          model: this.model,
          messages: nonSystemMessages,
          system: systemPrompt,
          max_tokens: 4096,
          temperature: 0.7
        };
        
        headers['x-api-key'] = this.apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        // Format for OpenAI API
        requestData = {
          model: this.model,
          messages: conversationWithSystemPrompt,
          temperature: 0.7
        };
        
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await axios.post(apiUrl, requestData, { headers });

      if (isAnthropicModel) {
        if (response.data && response.data.content && response.data.content.length > 0) {
          return response.data.content[0].text;
        } else {
          throw new Error('Invalid response from Anthropic API');
        }
      } else {
        if (response.data && response.data.choices && response.data.choices.length > 0) {
          return response.data.choices[0].message.content;
        } else {
          throw new Error('Invalid response from OpenAI API');
        }
      }
    } catch (error) {
      const provider = this.isAnthropicModel() ? 'Anthropic' : 'OpenAI';
      
      if (error.response) {
        // API error with response
        const errorMessage = error.response.data.error?.message || 'Unknown API error';
        throw new Error(`${provider} API error: ${errorMessage}`);
      } else if (error.request) {
        // Network error
        throw new Error(`Network error: Unable to reach ${provider} API`);
      } else {
        // Other errors
        throw error;
      }
    }
  }
}

module.exports = { LLMClient };
