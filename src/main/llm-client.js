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

Standard File Operations:
- READ: Read a file, e.g., [[READ: /path/to/file.txt]]
- WRITE: Write to a file, e.g., [[WRITE: /path/to/file.txt, content to write]]
- APPEND: Append to a file, e.g., [[APPEND: /path/to/file.txt, content to append]]
- DELETE: Delete a file, e.g., [[DELETE: /path/to/file.txt]]

Enhanced File Operations:
- VIEW: View file with line numbers and optional range, e.g., [[VIEW: /path/to/file.txt]] or [[VIEW: /path/to/file.txt, [10, 20]]]
- REPLACE: Replace a specific string in a file, e.g., [[REPLACE: /path/to/file.txt, old string to replace, new string]]
- INSERT: Insert text at a specific line, e.g., [[INSERT: /path/to/file.txt, 10, content to insert]]
- UNDO: Undo the last edit to a file, e.g., [[UNDO: /path/to/file.txt]]
- INFO: Get file information, e.g., [[INFO: /path/to/file.txt]]
- EXISTS: Check if a path exists, e.g., [[EXISTS: /path/to/file.txt]]
- MKDIR: Create a directory, e.g., [[MKDIR: /path/to/directory]]
- RMDIR: Delete a directory, e.g., [[RMDIR: /path/to/directory]]

Terminal Operations:
- EXECUTE: Run a terminal command, e.g., [[EXECUTE: ls -l]]

Browser Operations:
- BROWSE: Navigate to a URL, e.g., [[BROWSE: https://example.com]]
- CLICK: Click on an element, e.g., [[CLICK: button.submit-btn]] or [[CLICK: Sign in]]
- TYPE: Input text into a field, e.g., [[TYPE: input#search, search term]]
- EXTRACT: Extract content from page, e.g., [[EXTRACT: product prices]]
- SCREENSHOT: Take a screenshot, e.g., [[SCREENSHOT: ]]
- SCROLL: Scroll the page, e.g., [[SCROLL: down, 500]]
- ELEMENTS: List all interactive elements, e.g., [[ELEMENTS: ]]

Tab Management:
- LIST_TABS: List all open tabs, e.g., [[LIST_TABS: ]]
- NEW_TAB: Open a new tab, e.g., [[NEW_TAB: https://example.com]]
- SWITCH_TAB: Switch to another tab, e.g., [[SWITCH_TAB: 1]]
- CLOSE_TAB: Close a tab, e.g., [[CLOSE_TAB: ]] or [[CLOSE_TAB: 2]]

IMPORTANT FORMATTING RULES:
1. Place each command on its own line OR with a space before the [[ symbols
2. Separate the command from surrounding text with spaces
3. Do not include explanatory text within the [[ ]] brackets
4. Results of commands will be provided in the next message
5. If you need to execute another command after seeing the results, include that command in your next response
6. If you have no more commands to execute, simply provide your final response without any [[ ]] syntax

Advanced File Operation Guidelines:
- When using the REPLACE command, ensure the string to replace is EXACT and unique in the file
- For multiple occurrences, use VIEW with line numbers to identify the specific text, then use more context in your REPLACE
- Use INSERT to add content at specific line positions (0-based indexing)
- Use VIEW with line numbers to see file content with line numbers for easier reference

Example of correct usage for multi-step workflows:

1. You can view a file with line numbers:
   Let me check the contents of the file with line numbers.
   [[VIEW: /path/to/file.txt]]

2. You will receive the result with line numbers:
   [MCP_RESULT] The view action with parameters "/path/to/file.txt" returned:
   (file content with line numbers)

3. You can make a precise text replacement:
   I'll fix the typo on line 15.
   [[REPLACE: /path/to/file.txt, function getName(), function getFullName()]]

4. You can check the file information:
   Let me check when this file was last modified.
   [[INFO: /path/to/file.txt]]

5. When you're done with all commands, provide your final response without any [[ ]] syntax.

Examples of incorrect usage:
1. I'll check the contents of the directory[[EXECUTE: ls -l /path/to/directory]] and then we can proceed.  <-- Missing space before [[
2. Let me execute this command. [[EXECUTE: ls -l /path/to/directory]] The results will help us.

The system will automatically process your follow-up commands without requiring user intervention.

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
        
        // Clean up messages for Anthropic API - remove isSystem property and include only role and content
        const cleanMessages = conversationWithSystemPrompt
          .filter(msg => msg.role !== 'system')
          .map(({ role, content }) => ({ role, content }));
        
        requestData = {
          model: this.model,
          messages: cleanMessages,
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
