# LLM MCP Client

A desktop application that allows Large Language Models to interact with your local system using a Model Context Protocol (MCP).

## Features

- Connect to OpenAI or Anthropic LLMs
- Execute terminal commands
- Read, write, and manipulate files
- Browse web pages
- Multi-tab conversations
- Persist conversation history

## Enhanced File System Capabilities

The LLM MCP Client includes robust file handling capabilities inspired by OpenManus, including:

### Core File Operations

- Read files with line numbers and selective ranges: `VIEW: path/to/file.txt, [10, 20]`
- Precise string replacement: `REPLACE: path/to/file.txt, old string, new string`
- Line-based insertion: `INSERT: path/to/file.txt, 10, new content`
- Edit history with undo capability: `UNDO: path/to/file.txt`
- Directory operations: `MKDIR: path/to/dir` and `RMDIR: path/to/dir`
- File information: `INFO: path/to/file.txt`
- Path checking: `EXISTS: path/to/file.txt`

### Benefits

- **More Precise Editing**: Edit specific portions of files without rewriting the entire file
- **Better Context**: Line numbers and file info provide better context for LLM
- **Safer Operations**: Path validation and workspace containment prevent errors
- **Undo Capability**: Track history to undo changes when needed
- **Enhanced Directory Support**: Better support for working with directories

### Example Usage

```
// View a file with line numbers
[[VIEW: path/to/file.txt]]

// View specific lines
[[VIEW: path/to/file.txt, [10, 20]]]

// Replace a specific string
[[REPLACE: path/to/file.txt, old string, new string]]

// Insert at line number
[[INSERT: path/to/file.txt, 5, new content]]

// Undo last edit
[[UNDO: path/to/file.txt]]

// Get file information
[[INFO: path/to/file.txt]]

// Check if path exists
[[EXISTS: path/to/file.txt]]

// Create directory
[[MKDIR: path/to/directory]]

// Delete directory
[[RMDIR: path/to/directory]]
```

## Standard Operations

### File Operations

- `READ`: Read a file
- `WRITE`: Write content to a file
- `APPEND`: Append content to a file
- `DELETE`: Delete a file

### Terminal Operations

- `EXECUTE`: Run a terminal command

### Browser Operations

- `BROWSE`: Navigate to a URL
- `CLICK`: Click on an element
- `TYPE`: Input text into a field
- `EXTRACT`: Extract content from page
- `SCREENSHOT`: Take a screenshot
- `SCROLL`: Scroll the page
- `ELEMENTS`: List all interactive elements

### Tab Management

- `LIST_TABS`: List all open tabs
- `NEW_TAB`: Open a new tab
- `SWITCH_TAB`: Switch to another tab
- `CLOSE_TAB`: Close a tab

## Setup & Usage

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm start` to start the application
4. Enter your OpenAI API key in the settings
5. Start chatting with the LLM

## Development

- `npm run start` - Start the electron app in development mode
- `npm run build` - Build the electron app for production
- `npm run package` - Package the app for distribution
