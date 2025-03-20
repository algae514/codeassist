const { exec } = require('child_process');

class TerminalServer {
  /**
   * Execute a terminal command
   * @param {string} command - The command to execute
   * @returns {Promise<string>} - The command output
   */
  executeCommand(command) {
    return new Promise((resolve, reject) => {
      // Set maximum buffer size to handle larger outputs (increased to 5MB)
      const maxBuffer = 5 * 1024 * 1024;
      
      exec(command, { maxBuffer }, (error, stdout, stderr) => {
        if (error) {
          if (error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
            resolve('Output exceeded maximum buffer size. Try a more specific command or add filters like | head -n 50');
          } else {
            // Return the error message as output
            resolve(stderr || error.message);
          }
        } else {
          // Truncate extremely large outputs to prevent issues
          const MAX_OUTPUT_LENGTH = 50000; // ~50KB max output
          if (stdout.length > MAX_OUTPUT_LENGTH) {
            resolve(stdout.substring(0, MAX_OUTPUT_LENGTH) + '\n\n[Output truncated due to size. First 50KB shown.]');
          } else {
            resolve(stdout);
          }
        }
      });
    });
  }
}

module.exports = { TerminalServer };
