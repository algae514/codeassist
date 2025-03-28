import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import SettingsModal from './SettingsModal';
import EmptyState from './EmptyState';

const App = () => {
  const [chats, setChats] = useState({});
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({ apiKey: '', model: 'gpt-3.5-turbo' });
  const [loading, setLoading] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      window.ipcRenderer.send('get-settings');
      
      window.ipcRenderer.once('settings-response', (storedSettings) => {
        console.log('Received settings from main process:', storedSettings);
        setSettings(storedSettings);
      });
    };

    loadSettings();
  }, []);

  // Load chats on mount
  useEffect(() => {
    const loadChats = async () => {
      window.ipcRenderer.send('get-chats');
      
      window.ipcRenderer.once('chats-response', (storedChats) => {
        setChats(storedChats);
        
        // If there are chats, select the most recent one
        const chatIds = Object.keys(storedChats);
        if (chatIds.length > 0) {
          // Sort chats by creation date (most recent first)
          const sortedChats = chatIds.sort((a, b) => {
            return new Date(storedChats[b].createdAt) - new Date(storedChats[a].createdAt);
          });
          
          setCurrentChatId(sortedChats[0]);
          setCurrentChat(storedChats[sortedChats[0]]);
        }
      });
    };

    loadChats();
  }, []);

  const handleCreateChat = () => {
    window.ipcRenderer.send('new-chat');
    
    window.ipcRenderer.once('chat-created', ({ id }) => {
      window.ipcRenderer.send('get-chats');
      
      window.ipcRenderer.once('chats-response', (updatedChats) => {
        setChats(updatedChats);
        setCurrentChatId(id);
        setCurrentChat(updatedChats[id]);
      });
    });
  };

  const handleSelectChat = (chatId) => {
    window.ipcRenderer.send('select-chat', chatId);
    
    window.ipcRenderer.once('chat-selected', (chat) => {
      setCurrentChatId(chatId);
      setCurrentChat(chat);
    });
  };

  const handleDeleteChat = (chatId) => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      window.ipcRenderer.send('delete-chat', chatId);
      
      window.ipcRenderer.once('chat-deleted', ({ success, chatId }) => {
        if (success) {
          // Remove from local state
          const updatedChats = { ...chats };
          delete updatedChats[chatId];
          setChats(updatedChats);
          
          // If the deleted chat was the current one, select another chat or show empty state
          if (chatId === currentChatId) {
            const remainingChats = Object.keys(updatedChats);
            if (remainingChats.length > 0) {
              // Sort by creation date (most recent first)
              const sortedChats = remainingChats.sort((a, b) => {
                return new Date(updatedChats[b].createdAt) - new Date(updatedChats[a].createdAt);
              });
              handleSelectChat(sortedChats[0]);
            } else {
              setCurrentChatId(null);
              setCurrentChat(null);
            }
          }
        }
      });
    }
  };

  const handleSendMessage = async (message) => {
    try {
      // Check if API key is set
      if (!settings.apiKey) {
        setShowSettings(true);
        throw new Error('API key not set. Please configure in settings.');
      }
      
      // Clear any previous error state
      setLoading(true);
      
      if (!currentChatId) {
        // Create a new chat if none exists
        window.ipcRenderer.send('new-chat');
        
        window.ipcRenderer.once('chat-created', async ({ id }) => {
          const result = await window.ipcRenderer.invoke('send-message', {
            chatId: id,
            message
          });
          
          setChats((prevChats) => ({
            ...prevChats,
            [id]: result
          }));
          
          setCurrentChatId(id);
          setCurrentChat(result);
          setLoading(false);
        });
      } else {
        // Send message to existing chat
        const result = await window.ipcRenderer.invoke('send-message', {
          chatId: currentChatId,
          message
        });
        
        setChats((prevChats) => ({
          ...prevChats,
          [currentChatId]: result
        }));
        
        setCurrentChat(result);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message to chat
      if (currentChatId) {
        // If we have a chat, add error message to it
        setCurrentChat(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [
              ...prev.messages,
              { role: 'system', content: `Error: ${error.message}` }
            ]
          };
        });
      } else {
        // If no chat exists, show an alert
        alert(`Error: ${error.message}`);
      }
      setLoading(false);
    }
  };

  const handleSaveSettings = (newSettings) => {
    window.ipcRenderer.send('save-settings', newSettings);
    
    window.ipcRenderer.once('settings-saved', () => {
      setSettings(newSettings);
      setShowSettings(false);
    });
  };

  return (
    <div className="app-container">
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onCreateChat={handleCreateChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setShowSettings(true)}
      />
      <div className="main-content">
        {currentChat ? (
          <ChatWindow
            chat={currentChat}
            onSendMessage={handleSendMessage}
            loading={loading}
          />
        ) : (
          <EmptyState onCreateChat={handleCreateChat} />
        )}
      </div>
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default App;
