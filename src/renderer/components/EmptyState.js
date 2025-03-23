import React from 'react';
import WelcomeMessage from './WelcomeMessage';

const EmptyState = ({ onCreateChat }) => {
  return (
    <div className="empty-state">
      <h1 className="empty-state-title">Welcome to codeX</h1>
      <p className="empty-state-text">
        Your intelligent coding assistant. Get help with coding tasks, ask questions, and explore examples.
      </p>
      <WelcomeMessage onSuggestionClick={(suggestion) => {
        onCreateChat();
        // We need to wait a bit for the chat to be created and selected
        setTimeout(() => {
          // We need to get the textArea element and set its value
          const textArea = document.querySelector('.message-input');
          if (textArea) {
            textArea.value = suggestion;
            // Trigger an input event to update the state
            const event = new Event('input', { bubbles: true });
            textArea.dispatchEvent(event);
          }
        }, 100);
      }} />
      <button className="empty-state-button" onClick={onCreateChat}>
        Start a new chat
      </button>
    </div>
  );
};

export default EmptyState;
