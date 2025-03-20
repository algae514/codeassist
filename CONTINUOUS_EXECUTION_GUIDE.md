# Continuous Execution Mode Guide

## Overview

The LLM-MCP Client has been updated to implement a continuous execution mode. This new mode automatically processes commands in LLM responses without waiting for user input between each step of a multi-step process.

## How It Works

1. **Continuous Response Processing**
   - When the LLM includes a command in its response, the system automatically processes it
   - After processing the command, the result is sent back to the LLM
   - The LLM can then respond with additional commands based on previous results
   - This loop continues until the LLM provides a response with no commands

2. **Single User Confirmation**
   - User is prompted only once with a dialog showing all actions that will be executed
   - User can choose "Allow All" or "Deny All"
   - If denied, the conversation stops and waits for user input

3. **Automatic Command Handling**
   - The LLM determines when to issue a command and when to stop
   - No more commands = final answer has been reached
   - Commands are detected using the standard `[[ACTION_TYPE: parameters]]` syntax

## Benefits

- **Smoother Multi-Step Workflows**: The LLM can now follow a logical sequence of operations without waiting for user intervention between steps
- **Better Handling of Large Outputs**: If a command produces too much output, the LLM can automatically try a more specific approach
- **More Intuitive Interaction**: The conversation flows naturally with the LLM driving the workflow as needed

## Implementation Details

1. **Main Process Loop**
   - Continuous while loop that processes messages until no more commands are found
   - Each iteration: 
     1. Send conversation to LLM
     2. Check for commands in response
     3. Execute commands if found
     4. Continue loop if commands were executed

2. **Buffer Size Improvements**
   - Increased maximum buffer size to 10MB (from 5MB)
   - Increased maximum displayed output to 100KB (from 50KB)
   - Better error handling for extremely large outputs

3. **Updated System Prompt**
   - Clear instructions for multi-step workflows
   - Examples of how to handle command failures
   - Guidance on when to stop issuing commands

## Example Workflow

```
User: "Create a file with the structure of my project"

LLM: "I'll help you create a file with your project structure. Let me first check what's in your project directory.
[[EXECUTE: ls -la /path/to/project]]"

System: "[MCP_RESULT] The execute action returned: (directory listing)"

LLM: "I see several files and directories. Let me get more details about the structure.
[[EXECUTE: find /path/to/project -type d | sort]]"

System: "[MCP_RESULT] The execute action returned: (list of directories)"

LLM: "Now I'll create a file with this information.
[[WRITE: /path/to/project/STRUCTURE.md, # Project Structure\n\n(formatted content)]]"

System: "[MCP_RESULT] The write action returned: Successfully wrote to file"

LLM: "I've successfully created a STRUCTURE.md file in your project directory with a comprehensive overview of your project structure. The file includes all directories and key files organized in a hierarchical format for easy reference."
```

In this example, the system automatically processed all three commands in sequence without requiring user intervention between steps (although the initial set of commands did require user confirmation).

## Usage Tips

- Let the LLM drive the workflow - it will stop issuing commands when it has the information it needs
- For complex operations, consider breaking your request into smaller pieces
- The LLM is now better equipped to handle large outputs, but still try to be specific about what you're looking for
