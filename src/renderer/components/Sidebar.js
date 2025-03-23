import React from 'react';

const Sidebar = ({ chats, currentChatId, onCreateChat, onSelectChat, onOpenSettings, onDeleteChat }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">LLM MCP Client</div>
        <button className="new-chat-btn" onClick={onCreateChat}>
          New Chat
        </button>
      </div>
      <div className="chat-list">
        {Object.values(chats)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map(chat => (
            <div
              key={chat.id}
              className={`chat-item ${chat.id === currentChatId ? 'active' : ''}`}
            >
              <div className="chat-item-content" onClick={() => onSelectChat(chat.id)}>
                {chat.title}
              </div>
              <button 
                className="delete-chat-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
      </div>
      <div className="sidebar-footer">
        <button className="settings-btn" onClick={onOpenSettings}>
          Settings
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
