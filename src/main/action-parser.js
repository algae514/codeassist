class ActionParser {
  /**
   * Extract action requests from LLM responses
   * @param {string} text - The LLM response text
   * @returns {Array} - Array of action objects
   */
  extractActions(text) {
    console.log('\n[LOG] ActionParser: Starting to extract actions from text...');
    console.log(`\n[LOG] ActionParser: Text length: ${text.length} chars`);
    
    const actions = [];
    // Updated regex to specifically capture action type and parameters directly
    const actionRegex = /\[\[(\w+)\s*:\s*([\s\S]*?)\]\]/g;
    let match;

    // Supported action types
    const supportedActions = ['EXECUTE', 'READ', 'WRITE', 'APPEND', 'DELETE'];

    while ((match = actionRegex.exec(text)) !== null) {
      console.log(`\n[LOG] ActionParser: Found potential action match: ${match[0].substring(0, 100)}${match[0].length > 100 ? '...' : ''}`);
      
      // Directly extract action type and parameters from capture groups
      const actionType = match[1].toUpperCase();
      const parameters = match[2].trim();
      
      console.log(`\n[LOG] ActionParser: Extracted action type: ${actionType}, parameters: ${parameters.substring(0, 50)}${parameters.length > 50 ? '...' : ''}`);
      
      // Validate action type
      if (supportedActions.includes(actionType)) {
        console.log(`\n[LOG] ActionParser: Action type ${actionType} is valid and supported`);
        actions.push({
          type: actionType,
          parameters: parameters,
          originalText: match[0]
        });
      } else {
        console.warn(`Unsupported action type detected: ${actionType}`);
      }
    }

    // Add validation for specific action types
    const validatedActions = actions.map(action => {
      // Validate parameters based on action type
      switch(action.type) {
        case 'WRITE':
        case 'APPEND':
          // Check if there's a comma to separate file path and content
          if (!action.parameters.includes(',')) {
            console.log(`\n[LOG] ActionParser: Validation failed for ${action.type} - missing comma separator`);
            action.error = `Invalid format for ${action.type}. Expected: ${action.type}: file_path, content`;
          }
          break;
        
        case 'READ':
        case 'DELETE':
        case 'EXECUTE':
          // These just need a non-empty parameter
          if (!action.parameters.trim()) {
            console.log(`\n[LOG] ActionParser: Validation failed for ${action.type} - empty parameters`);
            action.error = `Empty parameters for ${action.type} action`;
          }
          break;
      }
      
      return action;
    });

    console.log(`\n[LOG] ActionParser: Extraction complete. Found ${validatedActions.length} valid actions.`);
    return validatedActions;
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
