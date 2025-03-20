# LLM MCP Client

A desktop application that integrates with OpenAI's large language models (LLMs) and includes embedded Micro Command Processor (MCP) servers for terminal and filesystem operations. This allows the LLM to request and execute terminal commands and file operations, with results fed back into the conversation for further processing.

## Key Features

- **Embedded MCP Servers**:
  - Terminal MCP Server: Executes terminal commands on your local machine.
  - Filesystem MCP Server: Performs file operations (read, write, append, delete).

- **LLM Integration**:
  - Uses OpenAI models (GPT-3.5-Turbo, GPT-4).
  - Configurable API key and model selection.

- **Action Requests and Execution**:
  - LLM can request actions using specific syntax (`[[ACTION: parameters]]`).
  - All actions require user confirmation.
  - Results are fed back to the LLM for further processing.

- **Chat Interface**:
  - React-based UI with conversation history display.
  - Multiple chat session management.
  - Settings for API key and model selection.

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/llm-mcp-client.git
   cd llm-mcp-client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the application:
   ```
   npm start
   ```

## Usage

1. Configure your OpenAI API key in the Settings.
2. Start a new chat.
3. Enter your queries.
4. The LLM may request actions (e.g., `[[EXECUTE: ls -l]]`), which will be presented for your approval.
5. Approved actions will be executed, and results will be sent back to the LLM.

## Security Considerations

- All actions require explicit user confirmation.
- Terminal commands and file operations are executed with user permissions.
- Be cautious when approving actions that may modify your system.

## Development

This project is built with:
- Electron: Cross-platform desktop application framework
- React: Frontend UI for the chat interface
- Node.js: Backend logic for MCP servers and API interactions
- OpenAI API: Chat Completion endpoint for LLM communication

## Supported Actions

| Action | Syntax | Description |
|--------|--------|-------------|
| EXECUTE | `[[EXECUTE: command]]` | Runs a terminal command |
| READ | `[[READ: file_path]]` | Reads file contents |
| WRITE | `[[WRITE: file_path, content]]` | Writes content to file |
| APPEND | `[[APPEND: file_path, content]]` | Appends content to file |
| DELETE | `[[DELETE: file_path]]` | Deletes a file |

## License

MIT
