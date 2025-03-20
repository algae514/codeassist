class ActionParser {
  /**
   * Extract action requests from LLM responses
   * @param {string} text - The LLM response text
   * @returns {Array} - Array of action objects
   */
  extractActions(text) {
    const actions = [];
    // Updated regex to be more flexible in matching actions
    const actionRegex = /\[\[\s*(.*?)\s*\]\]/g;
    let match;

    // Supported action types
    const supportedActions = ['EXECUTE', 'READ', 'WRITE', 'APPEND', 'DELETE'];

    while ((match = actionRegex.exec(text)) !== null) {
      const actionString = match[1];
      const colonIndex = actionString.indexOf(':');
      
      if (colonIndex !== -1) {
        const actionType = actionString.substring(0, colonIndex).trim().toUpperCase();
        const parameters = actionString.substring(colonIndex + 1).trim();
        
        // Validate action type
        if (supportedActions.includes(actionType)) {
          actions.push({
            type: actionType,
            parameters: parameters,
            originalText: match[0]
          });
        } else {
          console.warn(`Unsupported action type detected: ${actionType}`);
        }
      } else {
        console.warn(`Malformed action request detected: ${actionString}`);
      }
    }

    // Add validation for specific action types
    return actions.map(action => {
      // Validate parameters based on action type
      switch(action.type) {
        case 'WRITE':
        case 'APPEND':
          // Check if there's a comma to separate file path and content
          if (!action.parameters.includes(',')) {
            action.error = `Invalid format for ${action.type}. Expected: ${action.type}: file_path, content`;
          }
          break;
        
        case 'READ':
        case 'DELETE':
        case 'EXECUTE':
          // These just need a non-empty parameter
          if (!action.parameters.trim()) {
            action.error = `Empty parameters for ${action.type} action`;
          }
          break;
      }
      
      return action;
    });
  }

  /**
   * Formats the result for sending back to the LLM
   * @param {string} actionType - The type of action
   * @param {string} parameters - The parameters used
   * @param {string} result - The result of the action
   * @returns {string} - Formatted result message
   */
  formatResult(actionType, parameters, result) {
    return `[MCP_RESULT] The ${actionType.toLowerCase()} action with parameters "${parameters}" returned:\n${result}`;
  }

  /**
   * Formats an error for sending back to the LLM
   * @param {string} actionType - The type of action
   * @param {string} parameters - The parameters used
   * @param {string} error - The error message
   * @returns {string} - Formatted error message
   */
  formatError(actionType, parameters, error) {
    return `[MCP_ERROR] The ${actionType.toLowerCase()} action with parameters "${parameters}" failed with error:\n${error}`;
  }
}

module.exports = { ActionParser };
