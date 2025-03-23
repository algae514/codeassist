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
      const MAX_FILE_SIZE = 500 * 1024; // 500KB max size for LLM processing
      
      // First check the file size
      const stats = await fs.stat(filePath);
      
      if (stats.size > MAX_FILE_SIZE) {
        // For large files, provide a summary instead of the full content
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        const fileExt = path.extname(filePath).toLowerCase();
        
        if (fileExt === '.txt' || fileExt === '.md' || fileExt === '.js' || fileExt === '.py' || fileExt === '.html' || fileExt === '.css' || fileExt === '.json') {
          // For text files, provide the first part
          const data = await fs.readFile(filePath, { encoding: 'utf8', length: 10000 }); // First 10KB
          return `[WARNING] File is too large (${fileSizeInMB}MB) for complete processing. Here's the beginning of the file:\n\n${data}\n\n[...file truncated. Size: ${fileSizeInMB}MB. Try using a more specific command or access a smaller portion of the file.]`;
        } else {
          // For binary or unknown files, just return the metadata
          return `[WARNING] File is too large (${fileSizeInMB}MB) for complete processing. This file is likely binary or not suitable for direct text analysis. Try using system commands to examine it instead, or specify a smaller region to read.`;
        }
      }
      
      // For smaller files, read normally
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
