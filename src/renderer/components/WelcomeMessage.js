import React from 'react';

const WelcomeMessage = ({ onSuggestionClick }) => {
  return (
    <div className="welcome-message">
      <h2>Welcome to codeX</h2>
      <p>I'm your coding assistant. Ask me any coding questions or how I can help with your projects.</p>
    </div>
  );
};

export default WelcomeMessage;
