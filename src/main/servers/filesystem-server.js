const fs = require('fs/promises');
const path = require('path');

class FilesystemServer {
  /**
   * Read a file from the filesystem
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} - The file contents
   */
  async readFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return data;
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Write content to a file
   * @param {string} filePath - Path to the file
   * @param {string} content - Content to write
   * @returns {Promise<string>} - Success message
   */
  async writeFile(filePath, content) {
    try {
      // Create directory if it doesn't exist
      const directory = path.dirname(filePath);
      await fs.mkdir(directory, { recursive: true });
      
      await fs.writeFile(filePath, content, 'utf8');
      return `Successfully wrote to ${filePath}`;
    } catch (error) {
      throw new Error(`Failed to write to file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Append content to a file
   * @param {string} filePath - Path to the file
   * @param {string} content - Content to append
   * @returns {Promise<string>} - Success message
   */
  async appendFile(filePath, content) {
    try {
      // Create directory if it doesn't exist
      const directory = path.dirname(filePath);
      await fs.mkdir(directory, { recursive: true });
      
      await fs.appendFile(filePath, content, 'utf8');
      return `Successfully appended to ${filePath}`;
    } catch (error) {
      throw new Error(`Failed to append to file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Delete a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} - Success message
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return `Successfully deleted ${filePath}`;
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }
}

module.exports = { FilesystemServer };
