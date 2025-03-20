const { exec } = require('child_process');

class TerminalServer {
  /**
   * Execute a terminal command
   * @param {string} command - The command to execute
   * @returns {Promise<string>} - The command output
   */
  executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          // Return the error message as output
          resolve(stderr || error.message);
        } else {
          resolve(stdout);
        }
      });
    });
  }
}

module.exports = { TerminalServer };
