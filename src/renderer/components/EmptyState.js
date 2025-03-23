import React from 'react';
import ExpressServerExample from './ExpressServerExample';

const EmptyState = ({ onCreateChat }) => {
  return (
    <div className="empty-state">
      <h1 className="empty-state-title">Welcome to codeX</h1>
      <p className="empty-state-text">
        Your intelligent coding assistant. Get help with coding tasks, ask questions, and explore examples.
      </p>
      <ExpressServerExample />
      <button className="empty-state-button" onClick={onCreateChat}>
        Start a new chat
      </button>
    </div>
  );
};

export default EmptyState;
