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
    const supportedActions = [
      // Standard actions
      'EXECUTE', 'READ', 'WRITE', 'APPEND', 'DELETE',
      // Enhanced file operations
      'VIEW', 'REPLACE', 'INSERT', 'UNDO', 'INFO', 'MKDIR', 'RMDIR', 'EXISTS',
      // Browser operations
      'BROWSE', 'CLICK', 'TYPE', 'EXTRACT', 'SCREENSHOT', 'SCROLL',
      'TABS', 'NEW_TAB', 'CLOSE_TAB', 'SWITCH_TAB', 'LIST_TABS', 'ELEMENTS'
    ];

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
        
        case 'REPLACE':
          // Validate REPLACE format: path, oldString, newString
          const replaceParams = action.parameters.split(',');
          if (replaceParams.length < 3) {
            console.log(`\n[LOG] ActionParser: Validation failed for ${action.type} - incorrect format`);
            action.error = `Invalid format for ${action.type}. Expected: ${action.type}: file_path, old_string, new_string`;
          }
          break;
          
        case 'INSERT':
          // Validate INSERT format: path, lineNumber, content
          const insertParams = action.parameters.split(',');
          if (insertParams.length < 3) {
            console.log(`\n[LOG] ActionParser: Validation failed for ${action.type} - incorrect format`);
            action.error = `Invalid format for ${action.type}. Expected: ${action.type}: file_path, line_number, content`;
          } else {
            // Check if second parameter is a number
            const lineNumber = parseInt(insertParams[1].trim());
            if (isNaN(lineNumber)) {
              action.error = `Invalid line number for ${action.type}. Expected a number.`;
            }
          }
          break;
          
        case 'VIEW':
          // Check if there's a line range specified
          const viewParams = action.parameters.split(',');
          if (viewParams.length > 1) {
            // Try to parse the line range
            try {
              const rangeString = viewParams[1].trim();
              // Support [1, 10] or 1-10 format
              if (rangeString.includes('[') && rangeString.includes(']')) {
                const range = JSON.parse(rangeString);
                if (!Array.isArray(range) || range.length !== 2) {
                  action.error = `Invalid line range format for ${action.type}. Expected: [start, end]`;
                }
              } else if (rangeString.includes('-')) {
                const rangeParts = rangeString.split('-');
                if (rangeParts.length !== 2 || isNaN(parseInt(rangeParts[0])) || isNaN(parseInt(rangeParts[1]))) {
                  action.error = `Invalid line range format for ${action.type}. Expected: start-end`;
                }
              }
            } catch (e) {
              action.error = `Invalid line range format for ${action.type}: ${e.message}`;
            }
          }
          break;
        
        case 'READ':
        case 'DELETE':
        case 'EXECUTE':
        case 'MKDIR':
        case 'RMDIR':
        case 'INFO':
        case 'UNDO':
        case 'EXISTS':
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
    // Fix common issues with file content display
    let processedResult = result;
    
    // Check if this is a file content and has escaped newlines
    if (typeof processedResult === 'string' && (actionType === 'READ' || actionType === 'VIEW')) {
      // Ensure proper newline formatting
      processedResult = this._normalizeOutput(processedResult);
    }
    
    return `[MCP_RESULT] The ${actionType.toLowerCase()} action with parameters "${parameters}" returned:\n${processedResult}`;
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
  /**
   * Normalize output to ensure proper display in responses
   * @param {string} output - The text to normalize
   * @returns {string} - Normalized text
   * @private
   */
  _normalizeOutput(output) {
    if (typeof output !== 'string') return output;
    
    // Log the original output for debugging
    console.log(`[LOG] Original output length: ${output.length}`);
    if (output.length < 100) {
      console.log(`[LOG] Original output: ${output}`);
    }
    
    // Fix common issues
    let normalized = output;
    
    // Replace escaped newlines with actual newlines
    // This is for cases where the string contains literal '\n' instead of actual newlines
    normalized = normalized.replace(/\\n/g, '\n');
    
    // Replace escaped tabs with actual tabs
    normalized = normalized.replace(/\\t/g, '\t');
    
    // Log the normalized output for debugging
    console.log(`[LOG] Normalized output length: ${normalized.length}`);
    return normalized;
  }
}

module.exports = { ActionParser };
