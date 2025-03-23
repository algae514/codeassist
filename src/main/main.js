const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const url = require('url');
const Store = require('electron-store');
const { TerminalServer } = require('./servers/terminal-server');
const { FilesystemServer } = require('./servers/filesystem-server');
const { BrowserServer } = require('./servers/browser-server');
const { LLMClient } = require('./llm-client');
const { ActionParser } = require('./action-parser');
const { ConversationManager } = require('./conversation-manager');

// Initialize storage
const store = new Store();

// Create servers
const terminalServer = new TerminalServer();
const filesystemServer = new FilesystemServer({
  workspaceRoot: process.env.WORKSPACE_ROOT || path.join(app.getPath('userData'), 'workspace'),
  enableWorkspaceContainment: true // Re-enable workspace containment with our smarter path handling
});
const browserServer = new BrowserServer();

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
  
  // Handle external URLs to open in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
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

// Cleanup browser resources when quitting
app.on('before-quit', async function() {
  await browserServer.cleanup();
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
  // Add permission property to track if user has already granted permission
  conversationManager.chats[chatId].permissionGranted = false;
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
      
      // Check if we've already asked for permission in this chat session
      // Storing the permission in the chat object itself
      const chatData = conversationManager.getChat(chatId);
      const hasPermission = chatData.permissionGranted;
      
      let confirmed = !!hasPermission;
      
      // If we haven't asked for permission yet, do it once per chat
      if (!confirmed) {
        console.log('\n[LOG] Requesting user confirmation for actions...');
        
        // Determine the most restrictive permission needed
        let permissionType = 'READ';
        if (actions.some(a => ['WRITE', 'APPEND', 'DELETE', 'REPLACE', 'INSERT', 'UNDO', 'MKDIR', 'RMDIR'].includes(a.type))) {
          permissionType = 'WRITE';
        }
        if (actions.some(a => a.type === 'EXECUTE')) {
          permissionType = 'EXECUTE';
        }
        
        const confirmOptions = {
          type: 'question',
          buttons: ['Allow', 'Deny'],
          defaultId: 1, // Default to "Deny"
          title: 'Permission',
          message: `Allow ${permissionType.toLowerCase()} permissions?`,
          detail: `The AI assistant is requesting ${permissionType.toLowerCase()} permission for this chat session.`
        };
        
        const confirmation = await dialog.showMessageBox(mainWindow, confirmOptions);
        confirmed = confirmation.response === 0; // 0 = "Allow", 1 = "Deny"
        
        // Store the permission result in the chat data
        chatData.permissionGranted = confirmed;
      }
      
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
            // Terminal operations
            case 'EXECUTE':
              result = await terminalServer.executeCommand(action.parameters);
              break;
              
            // Standard file operations
            case 'READ':
              console.log(`[LOG] Reading file: ${action.parameters}`);
              // First attempt with debug info to help diagnose issues
              if (action.firstAttempt !== false) {
                console.log(`[LOG] First attempt at reading with debug info`);
                action.firstAttempt = false;
                result = await filesystemServer.readFile(action.parameters, { debug: true });
              } else {
                console.log(`[LOG] Regular read without debug info`);
                result = await filesystemServer.readFile(action.parameters);
              }
              break;
            case 'WRITE':
              console.log(`[LOG] Writing to file, parameters length: ${action.parameters.length}`);
              
              // Find the first comma to split parameters properly
              const firstCommaIndex = action.parameters.indexOf(',');
              if (firstCommaIndex === -1) {
                throw new Error('Invalid WRITE parameters: missing comma separator');
              }
              
              const filePath = action.parameters.substring(0, firstCommaIndex).trim();
              const content = action.parameters.substring(firstCommaIndex + 1).trim();
              
              console.log(`[LOG] Writing to file: ${filePath}, content length: ${content.length}`);
              if (content.length < 100) {
                console.log(`[LOG] Content: ${content}`);
              }
              
              result = await filesystemServer.writeFile(filePath, content);
              break;
            case 'APPEND':
              console.log(`[LOG] Appending to file, parameters length: ${action.parameters.length}`);
              
              // Find the first comma to split parameters properly
              const appendCommaIndex = action.parameters.indexOf(',');
              if (appendCommaIndex === -1) {
                throw new Error('Invalid APPEND parameters: missing comma separator');
              }
              
              const appendPath = action.parameters.substring(0, appendCommaIndex).trim();
              const appendContent = action.parameters.substring(appendCommaIndex + 1).trim();
              
              console.log(`[LOG] Appending to file: ${appendPath}, content length: ${appendContent.length}`);
              if (appendContent.length < 100) {
                console.log(`[LOG] Content: ${appendContent}`);
              }
              
              result = await filesystemServer.appendFile(appendPath, appendContent);
              break;
            case 'DELETE':
              result = await filesystemServer.deleteFile(action.parameters);
              break;
              
            // Enhanced file operations
            case 'VIEW':
              const viewParams = action.parameters.split(',').map(p => p.trim());
              const viewPath = viewParams[0];
              let viewRange = null;
              
              if (viewParams.length > 1) {
                try {
                  const rangeString = viewParams[1];
                  console.log(`[LOG] Processing view range: ${rangeString}`);
                  
                  // Better parsing of range parameters with error handling
                  if (rangeString.includes('[') && rangeString.includes(']')) {
                    // Fix potentially malformed JSON by ensuring brackets are properly closed
                    const fixedRangeString = rangeString.replace(/\[\s*(\d+)\s*,\s*(\d+)\s*\]?/, '[$1,$2]');
                    console.log(`[LOG] Fixed range string: ${fixedRangeString}`);
                    viewRange = JSON.parse(fixedRangeString);
                  } else if (rangeString.includes('-')) {
                    const [start, end] = rangeString.split('-').map(n => parseInt(n.trim()));
                    viewRange = [start, end];
                  }
                  
                  console.log(`[LOG] Parsed view range: ${JSON.stringify(viewRange)}`);
                } catch (e) {
                  console.error(`[ERROR] Error parsing view range: ${e.message}`);
                }
              }
              
              // First try with debug info to diagnose possible issues
              if (action.firstAttempt !== false) {
                console.log(`[LOG] First attempt at viewing file with debug info`);
                action.firstAttempt = false;
                result = await filesystemServer.readFile(viewPath, {
                  viewRange: viewRange,
                  withLineNumbers: true,
                  debug: true
                });
              } else {
                console.log(`[LOG] Regular view without debug info`);
                result = await filesystemServer.readFile(viewPath, {
                  viewRange: viewRange,
                  withLineNumbers: true
                });
              }
              break;
              
            case 'REPLACE':
              const replaceParams = action.parameters.split(',');
              // The first parameter is the file path
              const replacePath = replaceParams[0].trim();
              // The content after the first comma up to the last comma is the oldStr
              // (this handles commas within the strings)
              const oldStrEndIndex = action.parameters.lastIndexOf(',');
              const afterFirstComma = action.parameters.indexOf(',') + 1;
              const oldStr = action.parameters.substring(afterFirstComma, oldStrEndIndex).trim();
              // The content after the last comma is the newStr
              const newStr = action.parameters.substring(oldStrEndIndex + 1).trim();
              
              result = await filesystemServer.strReplace(replacePath, oldStr, newStr);
              break;
              
            case 'INSERT':
              const insertParams = action.parameters.split(',');
              const insertPath = insertParams[0].trim();
              const lineNumber = parseInt(insertParams[1].trim());
              // Get everything after the second comma as the content to insert
              const secondCommaIndex = action.parameters.indexOf(',', action.parameters.indexOf(',') + 1);
              const contentToInsert = action.parameters.substring(secondCommaIndex + 1).trim();
              
              result = await filesystemServer.insertAtLine(insertPath, lineNumber, contentToInsert);
              break;
              
            case 'UNDO':
              result = await filesystemServer.undoEdit(action.parameters);
              break;
              
            case 'INFO':
              const fileInfo = await filesystemServer.getFileInfo(action.parameters);
              result = JSON.stringify(fileInfo, null, 2);
              break;
              
            case 'MKDIR':
              result = await filesystemServer.createDirectory(action.parameters);
              break;
              
            case 'RMDIR':
              result = await filesystemServer.deleteDirectory(action.parameters, { recursive: true });
              break;
              
            case 'EXISTS':
              const exists = await filesystemServer.exists(action.parameters);
              result = exists ? 'The path exists.' : 'The path does not exist.';
              break;
              
            // Browser operations
            case 'BROWSE':
              result = await browserServer.navigateToUrl(action.parameters);
              break;
            case 'CLICK':
              result = await browserServer.clickElement(action.parameters);
              break;
            case 'TYPE':
              const [selector, inputText] = action.parameters.split(',').map(p => p.trim());
              result = await browserServer.inputText(selector, inputText);
              break;
            case 'EXTRACT':
              const extractResult = await browserServer.extractContent(action.parameters);
              // Format the result for display in the chat
              result = JSON.stringify(extractResult, null, 2);
              break;
            case 'SCREENSHOT':
              const screenshotPath = await browserServer.takeScreenshot();
              result = `Screenshot saved to: ${screenshotPath}`;
              break;
            case 'SCROLL':
              const scrollParams = action.parameters.split(',').map(p => p.trim());
              const direction = scrollParams[0] || 'down';
              const amount = parseInt(scrollParams[1]) || 300;
              result = await browserServer.scroll(direction, amount);
              break;
            case 'ELEMENTS':
              const elements = await browserServer.getInteractiveElements();
              result = JSON.stringify(elements, null, 2);
              break;
              
            // Tab management
            case 'NEW_TAB':
              const tabInfo = await browserServer.createTab(action.parameters);
              result = JSON.stringify(tabInfo, null, 2);
              break;
            case 'SWITCH_TAB':
              result = await browserServer.switchTab(parseInt(action.parameters));
              break;
            case 'CLOSE_TAB':
              const tabIdToClose = action.parameters.trim() ? parseInt(action.parameters) : null;
              result = await browserServer.closeTab(tabIdToClose);
              break;
            case 'LIST_TABS':
              const tabs = await browserServer.listTabs();
              result = JSON.stringify(tabs, null, 2);
              break;
            default:
              result = `Unknown action type: ${action.type}`;
          }
          
          // Add result to conversation
          console.log(`\n[LOG] Action completed successfully. Result length: ${result ? result.length : 0} chars`);
          if (result) {
            console.log(`\n[LOG] First 200 chars of result: ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`);
          }
          
          const resultMessage = actionParser.formatResult(action.type, action.parameters, result);
          conversationManager.addSystemMessage(chatId, resultMessage);
          
        } catch (error) {
          // Add error message to conversation
          console.log(`\n[LOG] Action failed with error: ${error.message}`);
          const errorMessage = actionParser.formatError(action.type, action.parameters, error.message);
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
