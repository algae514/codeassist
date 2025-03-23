import React, { useState, useEffect, useRef, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ExpressServerExample from './ExpressServerExample';

const ChatWindow = ({ chat, onSendMessage, loading }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const textAreaRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages]);

  // Cleanup effect for event listeners
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (message.trim() && !loading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  // Auto-resize textarea
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Mouse events for dragging
  const handleMouseDown = useCallback((e) => {
    // Only trigger for the resize handle area
    const rect = textAreaRef.current.getBoundingClientRect();
    const bottomArea = rect.bottom - 10; // 10px from the bottom
    
    if (e.clientY >= bottomArea) {
      setIsDragging(true);
      setStartY(e.clientY);
      setStartHeight(textAreaRef.current.offsetHeight);
      // Add event listeners to window
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isDragging && textAreaRef.current) {
      const newHeight = startHeight + (e.clientY - startY);
      // Apply min/max constraints
      const appliedHeight = Math.max(40, Math.min(300, newHeight));
      textAreaRef.current.style.height = `${appliedHeight}px`;
    }
  }, [isDragging, startHeight, startY]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    // Remove event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  return (
    <>
      <div className="chat-container">
        {chat?.messages.length > 0 ? (
          <>
            {chat?.messages.map((msg, index) => (
              <MessageBubble
                key={index}
                role={msg.role}
                content={msg.content}
                isSystem={msg.isSystem}
                systemMessage={msg.systemMessage}
              />
            ))}
          </>
        ) : (
          <ExpressServerExample />
        )}
        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>
      <form className="input-container" onSubmit={handleSubmit}>
        <textarea
          ref={textAreaRef}
          className={`message-input ${isDragging ? 'dragging' : ''}`}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
          placeholder="Type a message..."
          disabled={loading}
          style={{ cursor: isDragging ? 'ns-resize' : 'text' }}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!message.trim() || loading}
        >
          →
        </button>
      </form>
    </>
  );
};

export default ChatWindow;
