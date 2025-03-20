import React from 'react';

const EmptyState = ({ onCreateChat }) => {
  return (
    <div className="empty-state">
      <h1 className="empty-state-title">Welcome to LLM MCP Client</h1>
      <p className="empty-state-text">
        This application allows you to interact with OpenAI models and enable them
        to execute terminal commands and file operations on your local system.
      </p>
      <button className="empty-state-button" onClick={onCreateChat}>
        Start a New Chat
      </button>
    </div>
  );
};

export default EmptyState;
