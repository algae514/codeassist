const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const Store = require('electron-store');
const { TerminalServer } = require('./servers/terminal-server');
const { FilesystemServer } = require('./servers/filesystem-server');
const { LLMClient } = require('./llm-client');
const { ActionParser } = require('./action-parser');
const { ConversationManager } = require('./conversation-manager');

// Initialize storage
const store = new Store();

// Create servers
const terminalServer = new TerminalServer();
const filesystemServer = new FilesystemServer();

// Create conversation manager
const conversationManager = new ConversationManager(store);

// Create LLM client
const llmClient = new LLMClient();

// Create action parser
const actionParser = new ActionParser();

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html file
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, '../../dist/index.html'),
      protocol: 'file:',
      slashes: true
    })
  );

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
    console.log('Running in development mode');
  } else {
    console.log('Running in production mode');
  }

  // Emitted when the window is closed
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
}

// Create window when app is ready
app.on('ready', createWindow);

// Quit when all windows are closed
app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function() {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.on('get-settings', (event) => {
  const settings = {
    apiKey: store.get('apiKey', ''),
    model: store.get('model', 'gpt-3.5-turbo')
  };
  event.reply('settings-response', settings);
});

ipcMain.on('save-settings', (event, settings) => {
  store.set('apiKey', settings.apiKey);
  store.set('model', settings.model);
  llmClient.updateSettings(settings.apiKey, settings.model);
  event.reply('settings-saved', true);
});

ipcMain.on('get-chats', (event) => {
  const chats = conversationManager.getChats();
  event.reply('chats-response', chats);
});

ipcMain.on('new-chat', (event) => {
  const chatId = conversationManager.createChat();
  event.reply('chat-created', { id: chatId });
});

ipcMain.on('select-chat', (event, chatId) => {
  const chat = conversationManager.selectChat(chatId);
  event.reply('chat-selected', chat);
});

ipcMain.handle('send-message', async (event, { chatId, message }) => {
  try {
    // Add user message to conversation
    conversationManager.addUserMessage(chatId, message);
    
    // Get the current conversation
    const conversation = conversationManager.getConversation(chatId);
    
    // Send to LLM for initial response
    const llmResponse = await llmClient.getCompletion(conversation);
    
    // Add assistant response to conversation
    conversationManager.addAssistantMessage(chatId, llmResponse);
    
    // Parse actions from response
    const actions = actionParser.extractActions(llmResponse);
    
    // Execute actions if any
    if (actions.length > 0) {
      for (const action of actions) {
        // Request user confirmation
        const confirmOptions = {
          type: 'question',
          buttons: ['Allow', 'Deny'],
          defaultId: 1, // Default to "Deny"
          title: 'Action Confirmation',
          message: `Allow ${action.type} of "${action.parameters}"?`
        };
        
        const confirmation = await dialog.showMessageBox(mainWindow, confirmOptions);
        const confirmed = confirmation.response === 0; // 0 = "Allow", 1 = "Deny"
        
        if (confirmed) {
          let result;
          try {
            switch (action.type) {
              case 'EXECUTE':
                result = await terminalServer.executeCommand(action.parameters);
                break;
              case 'READ':
                result = await filesystemServer.readFile(action.parameters);
                break;
              case 'WRITE':
                const [filePath, content] = action.parameters.split(',').map(p => p.trim());
                result = await filesystemServer.writeFile(filePath, content);
                break;
              case 'APPEND':
                const [appendPath, appendContent] = action.parameters.split(',').map(p => p.trim());
                result = await filesystemServer.appendFile(appendPath, appendContent);
                break;
              case 'DELETE':
                result = await filesystemServer.deleteFile(action.parameters);
                break;
              default:
                result = `Unknown action type: ${action.type}`;
            }
          } catch (error) {
            result = `Error: ${error.message}`;
          }
          
          // Add action result to conversation
          const resultMessage = `The ${action.type.toLowerCase()} "${action.parameters}" returned: ${result}`;
          conversationManager.addSystemMessage(chatId, resultMessage);
        } else {
          // Add rejection message to conversation
          const rejectionMessage = `The ${action.type.toLowerCase()} "${action.parameters}" was not approved by user.`;
          conversationManager.addSystemMessage(chatId, rejectionMessage);
        }
      }
      
      // Get updated conversation
      const updatedConversation = conversationManager.getConversation(chatId);
      
      // Send updated conversation to LLM for final response
      const finalResponse = await llmClient.getCompletion(updatedConversation);
      
      // Add final assistant message to conversation
      conversationManager.addAssistantMessage(chatId, finalResponse);
    }
    
    // Return the updated conversation
    return conversationManager.getChat(chatId);
  } catch (error) {
    console.error('Error processing message:', error);
    conversationManager.addSystemMessage(chatId, `Error: ${error.message}`);
    return conversationManager.getChat(chatId);
  }
});
