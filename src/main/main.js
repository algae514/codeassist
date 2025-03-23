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

ipcMain.on('delete-chat', (event, chatId) => {
  const success = conversationManager.deleteChat(chatId);
  event.reply('chat-deleted', { success, chatId });
});

ipcMain.handle('send-message', async (event, { chatId, message }) => {
  try {
    // Add user message to conversation
    conversationManager.addUserMessage(chatId, message);
    
    // Begin conversation loop
    let continueProcessing = true;
    
    while (continueProcessing) {
      // Get the current conversation
      const conversation = conversationManager.getConversation(chatId);
      
      // Send to LLM for response
      console.log('\n[LOG] Sending conversation to LLM...');
      const llmResponse = await llmClient.getCompletion(conversation);
      console.log(`\n[LOG] Received LLM response (${llmResponse.length} chars):\n${llmResponse.substring(0, 300)}${llmResponse.length > 300 ? '...' : ''}`);
      
      // Add assistant response to conversation
      conversationManager.addAssistantMessage(chatId, llmResponse);
      
      // Parse actions from response
      console.log('\n[LOG] Starting to parse response for actions...');
      const actions = actionParser.extractActions(llmResponse);
      console.log(`\n[LOG] Parser found ${actions.length} actions in response`);
      if (actions.length > 0) {
        console.log('\n[LOG] Actions found:');
        actions.forEach((action, index) => {
          console.log(`[LOG] Action ${index + 1}: ${action.type} - ${action.parameters.substring(0, 100)}${action.parameters.length > 100 ? '...' : ''}`);
        });
      } else {
        console.log('\n[LOG] No actions found in the response');
      }
      
      // If no actions found, stop processing and wait for user input
      if (actions.length === 0) {
        console.log('No actions found, waiting for user input');
        continueProcessing = false;
        continue;
      }
      
      // Request user confirmation for all actions at once
      console.log('\n[LOG] Requesting user confirmation for actions...');
      
      // Create a more concise actions list for display
      let actionsList = '';
      
      // Count the number of each action type
      const actionCounts = {};
      actions.forEach(action => {
        actionCounts[action.type] = (actionCounts[action.type] || 0) + 1;
      });
      
      // If there's only one action, show it in detail
      if (actions.length === 1) {
        const action = actions[0];
        if (action.type === 'WRITE') {
          const pathEnd = action.parameters.indexOf(',');
          const filePath = pathEnd !== -1 ? action.parameters.substring(0, pathEnd).trim() : action.parameters.trim();
          actionsList = `${action.type}: ${filePath}`;
        } else {
          actionsList = `${action.type}: ${action.parameters.substring(0, 200)}${action.parameters.length > 200 ? '...' : ''}`;
        }
      } 
      // If there are multiple actions, summarize them
      else {
        // Create a summary of action types
        actionsList = Object.entries(actionCounts).map(([type, count]) => {
          return `${type}: ${count} action${count > 1 ? 's' : ''}`;
        }).join('\n');
        
        // For the first action of each type, add an example
        actionsList += '\n\nExamples:';
        Object.keys(actionCounts).forEach(type => {
          const example = actions.find(a => a.type === type);
          if (example) {
            if (type === 'WRITE') {
              const pathEnd = example.parameters.indexOf(',');
              const filePath = pathEnd !== -1 ? 
                example.parameters.substring(0, pathEnd).trim() : 
                example.parameters.trim();
              actionsList += `\n${type}: ${filePath}`;
            } else {
              actionsList += `\n${type}: ${example.parameters.substring(0, 100)}${example.parameters.length > 100 ? '...' : ''}`;
            }
          }
        });
      }
      
      const confirmOptions = {
        type: 'question',
        buttons: ['Allow', 'Deny'],
        defaultId: 1, // Default to "Deny"
        title: 'Permission',
        message: actions.every(a => a.type === 'READ' || a.type === 'EXECUTE') ? 'Allow read?' : 'Allow write?'
      };
      
      const confirmation = await dialog.showMessageBox(mainWindow, confirmOptions);
      const confirmed = confirmation.response === 0; // 0 = "Allow", 1 = "Deny"
      console.log(`\n[LOG] User ${confirmed ? 'ALLOWED' : 'DENIED'} actions`);
      
      if (!confirmed) {
        // If user denies actions, add rejection message and stop processing
        const rejectionMessage = '[MCP_ERROR] Action was denied by user.';
        conversationManager.addSystemMessage(chatId, rejectionMessage);
        continueProcessing = false;
        continue;
      }
      
      // Execute all confirmed actions
      console.log('\n[LOG] Beginning execution of confirmed actions...');
      for (const action of actions) {
        console.log(`\n[LOG] Executing action: ${action.type} - ${action.parameters.substring(0, 100)}${action.parameters.length > 100 ? '...' : ''}`);
        try {
          let result;
          
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
          
          // Add result to conversation
          console.log(`\n[LOG] Action completed successfully. Result length: ${result ? result.length : 0} chars`);
          if (result) {
            console.log(`\n[LOG] First 200 chars of result: ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`);
          }
          
          const resultMessage = `[MCP_RESULT] The ${action.type.toLowerCase()} action with parameters "${action.parameters}" returned:\n${result}`;
          conversationManager.addSystemMessage(chatId, resultMessage);
          
        } catch (error) {
          // Add error message to conversation
          console.log(`\n[LOG] Action failed with error: ${error.message}`);
          const errorMessage = `[MCP_ERROR] The ${action.type.toLowerCase()} action with parameters "${action.parameters}" failed with error:\n${error.message}`;
          conversationManager.addSystemMessage(chatId, errorMessage);
        }
      }
      
      // We continue the loop to let the LLM respond to the action results
      console.log('\n[LOG] Completed action execution. Continuing to next iteration of response loop...');
    }
    
    // Return the updated conversation
    return conversationManager.getChat(chatId);
  } catch (error) {
    console.error('Error processing message:', error);
    conversationManager.addSystemMessage(chatId, `Error: ${error.message}`);
    return conversationManager.getChat(chatId);
  }
});
