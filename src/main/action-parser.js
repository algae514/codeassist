class ActionParser {
  /**
   * Extract action requests from LLM responses
   * @param {string} text - The LLM response text
   * @returns {Array} - Array of action objects
   */
  extractActions(text) {
    const actions = [];
    const actionRegex = /\[\[(.*?)\]\]/g;
    let match;

    while ((match = actionRegex.exec(text)) !== null) {
      const actionString = match[1];
      const colonIndex = actionString.indexOf(':');
      
      if (colonIndex !== -1) {
        const actionType = actionString.substring(0, colonIndex).trim();
        const parameters = actionString.substring(colonIndex + 1).trim();
        
        actions.push({
          type: actionType,
          parameters: parameters
        });
      }
    }

    return actions;
  }
}

module.exports = { ActionParser };
