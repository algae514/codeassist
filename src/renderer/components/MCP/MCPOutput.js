import React from 'react';

/**
 * MCPOutput component - Formats MCP output in a Claude Desktop style
 * 
 * @param {Object} props
 * @param {string} props.content - The MCP result content
 * @param {boolean} props.isError - If true, formats as an error message
 */
const MCPOutput = ({ content, isError = false }) => {
  // Parse MCP output to extract action and result
  const parseMCPContent = (content) => {
    // Pattern for MCP output: [MCP_RESULT] or [MCP_ERROR] followed by "The action_name action with parameters..."
    const pattern = isError
      ? /\[MCP_ERROR\] The (.*?) action with parameters "(.*?)" failed with error:/
      : /\[MCP_RESULT\] The (.*?) action with parameters "(.*?)" returned:/;
    
    const match = content.match(pattern);
    
    if (match) {
      const [fullMatch, actionName, parameters] = match;
      // Get the result/error message (everything after the header)
      const resultText = content.substring(fullMatch.length).trim();
      
      return {
        actionName,
        parameters,
        resultText
      };
    }
    
    // If pattern doesn't match, return the full content
    return {
      actionName: isError ? 'error' : 'action',
      parameters: '',
      resultText: content
    };
  };

  const { actionName, parameters, resultText } = parseMCPContent(content);
  
  return (
    <div className="mcp-output">
      <div className={`mcp-header ${isError ? 'mcp-error' : ''}`}>
        <div className="mcp-action-tag">
          {isError ? 'ERROR' : actionName.toUpperCase()}
        </div>
        {parameters && (
          <div className="mcp-parameters">
            {parameters}
          </div>
        )}
      </div>
      <div className="mcp-content">
        <pre>{resultText}</pre>
      </div>
    </div>
  );
};

export default MCPOutput;
