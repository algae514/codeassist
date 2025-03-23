const { exec } = require('child_process');

class TerminalServer {
  /**
   * Execute a terminal command
   * @param {string} command - The command to execute
   * @returns {Promise<string>} - The command output
   */
  executeCommand(command) {
    return new Promise((resolve, reject) => {
      // Set maximum buffer size to handle larger outputs (increased to 10MB)
      const maxBuffer = 10 * 1024 * 1024;
      
      exec(command, { maxBuffer }, (error, stdout, stderr) => {
        if (error) {
          if (error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
            resolve('[WARNING] Command output exceeded maximum buffer size. The result is too large for the LLM to process effectively. Try a more specific command or add filters like "| head -n 50" or "| grep [pattern]" to reduce output size.');
          } else {
            // Return the error message as output
            resolve(stderr || error.message);
          }
        } else {
          // Truncate extremely large outputs to prevent issues
          const MAX_OUTPUT_LENGTH = 100000; // ~100KB max output
          if (stdout.length > MAX_OUTPUT_LENGTH) {
            resolve('[WARNING] Command produced very large output. The result has been truncated as it is too large for the LLM to process effectively. Here is the beginning:\n\n' + 
                   stdout.substring(0, 10000) + // Show just first 10KB for really large outputs
                   '\n\n[...Output truncated. Try using a more specific command or add filters to reduce output size.]');
          } else if (stdout.length > 50000) { // For moderately large outputs (50KB - 100KB)
            resolve('[CAUTION] Command produced large output that may be difficult to process. Consider using more specific commands in the future.\n\n' + stdout);
          } else {
            resolve(stdout);
          }
        }
      });
    });
  }
}

module.exports = { TerminalServer };
