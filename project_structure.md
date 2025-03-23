# LLM MCP Client Project Structure

This document provides an overview of the project structure for the LLM MCP (Model Context Protocol) Client application, outlining key files and their responsibilities. Use this guide to quickly locate relevant files when troubleshooting or implementing new features.

## Overall Architecture

The application follows an Electron architecture with:
- **Main Process**: Node.js backend that handles system operations
- **Renderer Process**: Frontend UI that users interact with
- **IPC Communication**: Bridge between the main and renderer processes

## Directory Structure

```
llm_mcp_client/
├── dist/                  # Build output
├── node_modules/          # Dependencies
├── src/                   # Source code
│   ├── client-integration/# Client integration code
│   ├── main/              # Electron main process
│   │   ├── servers/       # Backend servers
│   │   └── ...            # Main process files
│   └── renderer/          # Electron renderer process (UI)
│       ├── components/    # React components
│       └── ...            # Renderer process files
├── test-workspace/        # Test files
└── workspace/             # User workspace directory
```

## Key Files and Their Purposes

### Main Process Files

#### `/src/main/main.js`
- **Purpose**: Entry point for the Electron application
- **Responsibilities**:
  - Initialize app components (store, servers, conversation manager, LLM client)
  - Set up IPC communication channels
  - Handle window creation and lifecycle
  - Process user messages and LLM responses
  - Manage settings (API keys, model selection)
- **When to modify**: 
  - Adding new IPC handlers
  - Changing app initialization behavior
  - Modifying how settings are stored/retrieved
  - Debugging issues with API key persistence

#### `/src/main/llm-client.js`
- **Purpose**: Handles communication with LLM APIs (OpenAI, Anthropic)
- **Responsibilities**:
  - Store API key and model information
  - Format requests for different LLM providers
  - Send requests to LLM APIs
  - Process responses from LLMs
  - Handle API errors
- **When to modify**:
  - Adding support for new LLM providers
  - Fixing API request formatting issues
  - Modifying the system prompt used for MCP
  - Addressing API authentication issues

#### `/src/main/action-parser.js`
- **Purpose**: Parse LLM responses for action commands
- **Responsibilities**:
  - Extract action commands from LLM text responses
  - Format action results for display
  - Format error messages
- **When to modify**:
  - Adding new action types
  - Changing action syntax
  - Fixing action parsing issues

#### `/src/main/conversation-manager.js`
- **Purpose**: Manage chat conversations
- **Responsibilities**:
  - Create, store, and retrieve conversations
  - Add messages to conversations
  - Manage conversation history
- **When to modify**:
  - Changing how conversations are stored
  - Modifying conversation structure
  - Adding new conversation features

#### `/src/main/preload.js`
- **Purpose**: Bridge between main and renderer processes
- **Responsibilities**:
  - Expose IPC functions to the renderer
  - Set up secure communication channels
- **When to modify**:
  - Adding new IPC functions
  - Changing the IPC communication pattern

### Renderer Process Files

#### `/src/renderer/app.js`
- **Purpose**: Main entry point for the React application
- **Responsibilities**:
  - Render the App component
- **When to modify**:
  - Changing the root component
  - Adding global providers

#### `/src/renderer/components/App.js`
- **Purpose**: Main application component
- **Responsibilities**:
  - Manage application state (chats, settings, UI state)
  - Handle user interactions (creating chats, sending messages)
  - Load and save settings
  - Coordinate between different components
- **When to modify**:
  - Fixing UI-related bugs
  - Adding new high-level features
  - Changing application behavior
  - Modifying settings handling in the UI

#### `/src/renderer/components/SettingsModal.js`
- **Purpose**: Settings UI
- **Responsibilities**:
  - Display and edit API keys and model selection
  - Submit settings changes
- **When to modify**:
  - Adding new settings fields
  - Changing the settings UI
  - Fixing settings-related UI issues

#### `/src/renderer/components/ChatWindow.js`
- **Purpose**: Display chat messages and input box
- **Responsibilities**:
  - Show messages from the conversation
  - Handle user input
  - Submit messages
- **When to modify**:
  - Changing the chat UI
  - Fixing message display issues
  - Enhancing the chat input experience

#### `/src/renderer/components/Sidebar.js`
- **Purpose**: Display chat list and application controls
- **Responsibilities**:
  - Show list of conversations
  - Provide buttons for creating chats and accessing settings
- **When to modify**:
  - Changing the sidebar UI
  - Adding new sidebar features
  - Modifying chat list display

### Server Modules

#### `/src/main/servers/terminal-server.js`
- **Purpose**: Execute terminal commands
- **When to modify**: 
  - Fixing terminal execution issues
  - Enhancing terminal features

#### `/src/main/servers/filesystem-server.js`
- **Purpose**: Handle file operations
- **When to modify**: 
  - Fixing file operation issues
  - Adding new file operations
  - Enhancing file handling capabilities

#### `/src/main/servers/browser-server.js`
- **Purpose**: Control browser automation
- **When to modify**: 
  - Fixing browser automation issues
  - Adding new browser features

#### `/src/main/servers/express-server.js`
- **Purpose**: Provide HTTP endpoints
- **When to modify**: 
  - Adding new API endpoints
  - Fixing server-related issues

## Common Issues and Where to Look

### API Key Not Being Used
- **Files to check**: 
  - `/src/main/main.js` - How API key is stored and retrieved
  - `/src/main/llm-client.js` - How API key is used in requests
  - `/src/renderer/components/App.js` - How settings are saved/loaded

### UI Rendering Issues
- **Files to check**:
  - Corresponding component files in `/src/renderer/components/`
  - CSS in `/src/renderer/styles.css`

### Message Processing Issues
- **Files to check**:
  - `/src/main/main.js` - Message sending handler
  - `/src/main/llm-client.js` - API communication
  - `/src/main/action-parser.js` - Action extraction

### Settings Not Saving
- **Files to check**:
  - `/src/main/main.js` - Settings IPC handlers
  - `/src/renderer/components/App.js` - Settings state management
  - `/src/renderer/components/SettingsModal.js` - Settings UI

### Action Execution Issues
- **Files to check**:
  - `/src/main/main.js` - Action execution logic
  - `/src/main/action-parser.js` - Action parsing
  - Relevant server module in `/src/main/servers/`

## Data Flow

### Settings Flow
1. User inputs settings in `SettingsModal.js`
2. `App.js` sends settings via IPC to main process
3. `main.js` saves settings to the store and updates the LLM client
4. When app starts, `main.js` loads settings from store and initializes the LLM client

### Message Flow
1. User types message in `ChatWindow.js`
2. `App.js` sends message via IPC to main process
3. `main.js` adds message to conversation and sends to LLM client
4. `llm-client.js` sends request to LLM API
5. `action-parser.js` extracts actions from response
6. `main.js` executes actions and adds results to conversation
7. Updated conversation is returned to `App.js`
8. `ChatWindow.js` displays the updated conversation

## Configuration

- API keys and model selection are stored using `electron-store`
- Conversations are also stored using `electron-store`
- The application uses a workspace directory for file operations

## Adding New Features

### Adding a New Setting
1. Add the UI field to `SettingsModal.js`
2. Update the settings state in `App.js`
3. Add the setting to the IPC handlers in `main.js`
4. Use the setting in the relevant module

### Adding a New Action Type
1. Update the system prompt in `llm-client.js`
2. Add the action type to the action handler in `main.js`
3. Implement the action functionality in the appropriate server module

### Adding a New UI Component
1. Create the component file in `/src/renderer/components/`
2. Import and use the component in the relevant parent component
