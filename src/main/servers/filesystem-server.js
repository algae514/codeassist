const fs = require('fs/promises');
const path = require('path');
const fsSync = require('fs');

/**
 * FilesystemServer - A robust file system manager with advanced capabilities
 * Supports operations like selective text replacement, line-based insertion,
 * file viewing with line numbers, and more.
 */
class FilesystemServer {
  constructor(config = {}) {
    // Configuration with defaults
    this.config = {
      maxFileSize: 1024 * 1024, // 1MB
      encoding: 'utf8',
      workspaceRoot: process.env.WORKSPACE_ROOT || path.join(process.cwd(), 'workspace'),
      enableWorkspaceContainment: true,
      snippetLines: 4, // Number of lines before/after for context in string replacements
      ...config
    };

    // Map to track file history for undo operations
    this.fileHistory = new Map();
    
    // Ensure workspace directory exists
    this._ensureWorkspaceExists();
  }

  /**
   * Ensure workspace directory exists
   * @private
   */
  _ensureWorkspaceExists() {
    try {
      if (!fsSync.existsSync(this.config.workspaceRoot)) {
        fsSync.mkdirSync(this.config.workspaceRoot, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create workspace directory:', error);
    }
  }

  /**
   * Resolve path ensuring it's absolute and respecting workspace containment
   * @param {string} filePath - Original path
   * @returns {string} - Resolved and validated path
   * @private
   */
  _resolvePath(filePath) {
    // If the path is provided explicitly (absolute path or contains a directory separator)
    const isExplicitPath = path.isAbsolute(filePath) || filePath.includes(path.sep);
    
    // Convert to absolute path if not already
    const resolvedPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.resolve(process.cwd(), filePath);

    // Apply workspace containment if enabled AND path is not explicitly provided
    if (this.config.enableWorkspaceContainment && !isExplicitPath) {
      // If path is outside workspace, redirect to workspace
      if (!resolvedPath.startsWith(this.config.workspaceRoot)) {
        // Extract the base filename and place in workspace
        const baseName = path.basename(resolvedPath);
        const redirectedPath = path.join(this.config.workspaceRoot, baseName);
        
        // Log the redirection for debugging
        console.log(`[LOG] Path redirected (no explicit path): ${resolvedPath} -> ${redirectedPath}`);
        return redirectedPath;
      }
    }

    // For explicit paths, log that we're using it directly
    if (isExplicitPath) {
      console.log(`[LOG] Using explicit path directly: ${resolvedPath}`);
    }

    return resolvedPath;
  }

  /**
   * Enhanced file reading with line numbers and range support
   * @param {string} filePath - Path to the file
   * @param {Object} options - Reading options
   * @param {number[]} options.viewRange - Optional line range [start, end] (1-indexed)
   * @param {boolean} options.withLineNumbers - Whether to include line numbers
   * @param {boolean} options.debug - Whether to include diagnostic information
   * @returns {Promise<string>} - The file contents
   */
  async readFile(filePath, options = {}) {
    try {
      const resolvedPath = this._resolvePath(filePath);
      
      // Validate path exists
      await this._validatePathExists(resolvedPath);
      
      // Check if it's a directory
      const isDir = await this.isDirectory(resolvedPath);
      if (isDir) {
        return this.viewDirectory(resolvedPath);
      }
      
      // Get file stats for size check
      const stats = await fs.stat(resolvedPath);
      
      // Add diagnostic information if requested
      let diagnosticInfo = '';
      if (options.debug) {
        diagnosticInfo = `File path: ${resolvedPath}\nSize: ${stats.size} bytes\nEncoding: ${this.config.encoding}\n\n`;
      }
      
      if (stats.size > this.config.maxFileSize) {
        // For large files, provide a summary or first part
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        const fileExt = path.extname(resolvedPath).toLowerCase();
        
        // Detect text files
        const textFileExtensions = ['.txt', '.md', '.js', '.py', '.html', '.css', '.json', '.csv', '.log'];
        if (textFileExtensions.includes(fileExt)) {
          // For text files, provide the first part
          const data = await fs.readFile(resolvedPath, { encoding: this.config.encoding, length: 10000 });
          return `${diagnosticInfo}[WARNING] File is too large (${fileSizeInMB}MB) for complete processing. Here's the beginning of the file:\n\n${data}\n\n[...file truncated. Size: ${fileSizeInMB}MB. Try using a more specific command with VIEW and a line range.]`;
        } else {
          // For binary or unknown files, just return the metadata
          return `${diagnosticInfo}[WARNING] File is too large (${fileSizeInMB}MB) for complete processing. This file is likely binary or not suitable for direct text analysis. Try using system commands to examine it instead.`;
        }
      }
      
      // Read the full file
      let content = await fs.readFile(resolvedPath, this.config.encoding);
      
      // Fix potential escaped newlines in the content
      // This happens when the file content contains literal '\n' strings instead of actual newlines
      if (content.includes('\\n')) {
        console.log('[LOG] Detected possible escaped newlines in file content');
        try {
          // Try to normalize newlines - this is a heuristic approach
          content = content.replace(/\\n/g, '\n');
        } catch (e) {
          console.log(`[LOG] Error normalizing newlines: ${e.message}`);
        }
      }
      
      // Apply line range if specified
      if (options.viewRange && Array.isArray(options.viewRange) && options.viewRange.length === 2) {
        const lines = content.split('\n');
        const [startLine, endLine] = options.viewRange;
        
        // Validate line range
        if (startLine < 1) {
          throw new Error(`Invalid view range: start line ${startLine} must be >= 1`);
        }
        
        const finalEndLine = endLine === -1 ? lines.length : endLine;
        
        if (finalEndLine > lines.length) {
          throw new Error(`Invalid view range: end line ${finalEndLine} exceeds file line count ${lines.length}`);
        }
        
        if (endLine !== -1 && finalEndLine < startLine) {
          throw new Error(`Invalid view range: end line ${finalEndLine} must be >= start line ${startLine}`);
        }
        
        // Apply the range
        content = lines.slice(startLine - 1, endLine === -1 ? undefined : finalEndLine).join('\n');
      }
      
      // Add line numbers if requested
      if (options.withLineNumbers) {
        const startLine = options.viewRange?.[0] || 1;
        content = content.split('\n').map((line, index) => {
          const lineNumber = index + startLine;
          // Present actual line content without escaped newlines
          return `${lineNumber.toString().padStart(6)}\t${line}`;
        }).join('\n');
        
        content = `Here's the content of ${resolvedPath} with line numbers:\n${content}`;
      }
      
      // Add diagnostic info before returning the content
      return diagnosticInfo + content;
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Write content to a file with enhanced safety
   * @param {string} filePath - Path to the file
   * @param {string} content - Content to write
   * @param {Object} options - Additional options
   * @param {boolean} options.overwrite - Whether to overwrite existing files
   * @returns {Promise<string>} - Success message
   */
  async writeFile(filePath, content, options = {}) {
    try {
      const resolvedPath = this._resolvePath(filePath);
      
      // Check if file exists when overwrite is false
      if (!options.overwrite) {
        const exists = await this._pathExists(resolvedPath);
        if (exists) {
          throw new Error(`File already exists at ${resolvedPath}. Use overwrite option to replace or use appendFile method.`);
        }
      }
      
      // Save current content for history if file exists
      await this._saveToHistory(resolvedPath);
      
      // Create directory if it doesn't exist
      const directory = path.dirname(resolvedPath);
      await fs.mkdir(directory, { recursive: true });
      
      // Normalize escaped newlines in the content if it's a string
      let normalizedContent = content;
      if (typeof content === 'string' && content.includes('\\n')) {
        console.log('[LOG] Normalizing escaped newlines in content before writing');
        normalizedContent = content.replace(/\\n/g, '\n');
      }
      
      // Write the file
      await fs.writeFile(resolvedPath, normalizedContent, this.config.encoding);
      
      return `Successfully wrote to ${resolvedPath}`;
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
      const resolvedPath = this._resolvePath(filePath);
      
      // Save current content for history if file exists
      await this._saveToHistory(resolvedPath);
      
      // Create directory if it doesn't exist
      const directory = path.dirname(resolvedPath);
      await fs.mkdir(directory, { recursive: true });
      
      // Normalize escaped newlines in the content if it's a string
      let normalizedContent = content;
      if (typeof content === 'string' && content.includes('\\n')) {
        console.log('[LOG] Normalizing escaped newlines in content before appending');
        normalizedContent = content.replace(/\\n/g, '\n');
      }
      
      // Append to the file
      await fs.appendFile(resolvedPath, normalizedContent, this.config.encoding);
      
      return `Successfully appended to ${resolvedPath}`;
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
      const resolvedPath = this._resolvePath(filePath);
      
      // Check if path exists
      await this._validatePathExists(resolvedPath);
      
      // Check if it's a directory
      const isDir = await this.isDirectory(resolvedPath);
      if (isDir) {
        throw new Error(`Cannot delete directory ${resolvedPath} with deleteFile. Use deleteDirectory instead.`);
      }
      
      // Save current content for history
      await this._saveToHistory(resolvedPath);
      
      // Delete the file
      await fs.unlink(resolvedPath);
      
      return `Successfully deleted ${resolvedPath}`;
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }

  /**
   * String replacement in a file
   * @param {string} filePath - Path to the file
   * @param {string} oldStr - String to replace
   * @param {string} newStr - Replacement string
   * @returns {Promise<string>} - Success message with snippet
   */
  async strReplace(filePath, oldStr, newStr) {
    try {
      const resolvedPath = this._resolvePath(filePath);
      
      // Validate path exists
      await this._validatePathExists(resolvedPath);
      
      // Check if it's a directory
      const isDir = await this.isDirectory(resolvedPath);
      if (isDir) {
        throw new Error(`Cannot perform string replacement on directory ${resolvedPath}`);
      }
      
      // Read file content
      const fileContent = await fs.readFile(resolvedPath, this.config.encoding);
      
      // Check if oldStr is unique in the file
      const occurrences = fileContent.split(oldStr).length - 1;
      
      if (occurrences === 0) {
        throw new Error(`No replacement was performed, oldStr did not appear verbatim in ${resolvedPath}`);
      }
      
      if (occurrences > 1) {
        // Provide line numbers for occurrences to help user
        const lines = fileContent.split('\n');
        const occurrenceLines = [];
        
        let position = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (position + line.length >= fileContent.indexOf(oldStr, position) && 
              position <= fileContent.indexOf(oldStr, position) + oldStr.length) {
            occurrenceLines.push(i + 1);
          }
          position += line.length + 1; // +1 for the newline
        }
        
        throw new Error(`Multiple occurrences (${occurrences}) of oldStr found in lines ${occurrenceLines.join(', ')}. Please ensure the string to replace is unique.`);
      }
      
      // Save current content for history
      this.fileHistory.set(resolvedPath, fileContent);
      
      // Replace oldStr with newStr
      const newContent = fileContent.replace(oldStr, newStr);
      
      // Write the new content
      await fs.writeFile(resolvedPath, newContent, this.config.encoding);
      
      // Create a snippet of the edited section for the result message
      const replacementLineIndex = fileContent.split('\n').findIndex(line => line.includes(oldStr));
      const lines = newContent.split('\n');
      const snippetStart = Math.max(0, replacementLineIndex - this.config.snippetLines);
      const snippetEnd = Math.min(lines.length, replacementLineIndex + this.config.snippetLines + (newStr.match(/\n/g) || []).length);
      
      const snippet = lines.slice(snippetStart, snippetEnd)
        .map((line, index) => `${(snippetStart + index + 1).toString().padStart(6)}\t${line}`)
        .join('\n');
      
      return `Successfully replaced string in ${resolvedPath}. Here's a snippet of the edited section:\n\n${snippet}`;
    } catch (error) {
      throw new Error(`Failed to replace string in file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Insert text at a specific line in a file
   * @param {string} filePath - Path to the file
   * @param {number} insertLine - Line number to insert after (0-indexed)
   * @param {string} newStr - Text to insert
   * @returns {Promise<string>} - Success message with snippet
   */
  async insertAtLine(filePath, insertLine, newStr) {
    try {
      const resolvedPath = this._resolvePath(filePath);
      
      // Validate path exists
      await this._validatePathExists(resolvedPath);
      
      // Check if it's a directory
      const isDir = await this.isDirectory(resolvedPath);
      if (isDir) {
        throw new Error(`Cannot perform line insertion on directory ${resolvedPath}`);
      }
      
      // Read file content
      const fileContent = await fs.readFile(resolvedPath, this.config.encoding);
      const lines = fileContent.split('\n');
      
      // Validate insert line
      if (insertLine < 0 || insertLine > lines.length) {
        throw new Error(`Invalid insert line ${insertLine}. Must be between 0 and ${lines.length}`);
      }
      
      // Save current content for history
      this.fileHistory.set(resolvedPath, fileContent);
      
      // Perform insertion
      const newLines = newStr.split('\n');
      const updatedLines = [
        ...lines.slice(0, insertLine),
        ...newLines,
        ...lines.slice(insertLine)
      ];
      
      // Write the new content
      const newContent = updatedLines.join('\n');
      await fs.writeFile(resolvedPath, newContent, this.config.encoding);
      
      // Create a snippet for the result message
      const snippetStart = Math.max(0, insertLine - this.config.snippetLines);
      const snippetEnd = Math.min(updatedLines.length, insertLine + newLines.length + this.config.snippetLines);
      
      const snippet = updatedLines.slice(snippetStart, snippetEnd)
        .map((line, index) => `${(snippetStart + index + 1).toString().padStart(6)}\t${line}`)
        .join('\n');
      
      return `Successfully inserted text at line ${insertLine} in ${resolvedPath}. Here's a snippet of the edited section:\n\n${snippet}`;
    } catch (error) {
      throw new Error(`Failed to insert text at line ${insertLine} in file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Undo the last edit to a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} - Success message
   */
  async undoEdit(filePath) {
    try {
      const resolvedPath = this._resolvePath(filePath);
      
      // Check if there's a history for this file
      if (!this.fileHistory.has(resolvedPath)) {
        throw new Error(`No edit history found for ${resolvedPath}`);
      }
      
      // Get the previous content
      const previousContent = this.fileHistory.get(resolvedPath);
      
      // Write the previous content back
      await fs.writeFile(resolvedPath, previousContent, this.config.encoding);
      
      // Remove the history entry
      this.fileHistory.delete(resolvedPath);
      
      return `Successfully undid last edit to ${resolvedPath}`;
    } catch (error) {
      throw new Error(`Failed to undo edit to file ${filePath}: ${error.message}`);
    }
  }

  /**
   * View directory contents
   * @param {string} dirPath - Path to the directory
   * @param {Object} options - Options
   * @param {number} options.maxDepth - Maximum recursive depth
   * @returns {Promise<string>} - Directory listing
   */
  async viewDirectory(dirPath, options = { maxDepth: 2 }) {
    try {
      const resolvedPath = this._resolvePath(dirPath);
      
      // Validate path exists
      await this._validatePathExists(resolvedPath);
      
      // Check if it's a directory
      const isDir = await this.isDirectory(resolvedPath);
      if (!isDir) {
        throw new Error(`Path ${resolvedPath} is not a directory`);
      }
      
      // List directory contents using fs.readdir
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      
      // Filter hidden files (starting with .)
      const filteredEntries = entries.filter(entry => !entry.name.startsWith('.'));
      
      // Format the result
      const listing = filteredEntries.map(entry => {
        const type = entry.isDirectory() ? '[DIR]' : '[FILE]';
        return `${type} ${entry.name}`;
      }).join('\n');
      
      return `Contents of directory ${resolvedPath}:\n${listing}`;
    } catch (error) {
      throw new Error(`Failed to view directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Create a directory
   * @param {string} dirPath - Path to the directory
   * @returns {Promise<string>} - Success message
   */
  async createDirectory(dirPath) {
    try {
      const resolvedPath = this._resolvePath(dirPath);
      
      // Create the directory
      await fs.mkdir(resolvedPath, { recursive: true });
      
      return `Successfully created directory ${resolvedPath}`;
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Delete a directory
   * @param {string} dirPath - Path to the directory
   * @param {Object} options - Options
   * @param {boolean} options.recursive - Whether to delete recursively
   * @returns {Promise<string>} - Success message
   */
  async deleteDirectory(dirPath, options = { recursive: false }) {
    try {
      const resolvedPath = this._resolvePath(dirPath);
      
      // Validate path exists
      await this._validatePathExists(resolvedPath);
      
      // Check if it's a directory
      const isDir = await this.isDirectory(resolvedPath);
      if (!isDir) {
        throw new Error(`Path ${resolvedPath} is not a directory`);
      }
      
      // Delete the directory
      if (options.recursive) {
        await fs.rm(resolvedPath, { recursive: true, force: true });
      } else {
        await fs.rmdir(resolvedPath);
      }
      
      return `Successfully deleted directory ${resolvedPath}`;
    } catch (error) {
      throw new Error(`Failed to delete directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Check if a path exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} - Whether the path exists
   */
  async exists(filePath) {
    try {
      const resolvedPath = this._resolvePath(filePath);
      return await this._pathExists(resolvedPath);
    } catch (error) {
      throw new Error(`Failed to check if path ${filePath} exists: ${error.message}`);
    }
  }

  /**
   * Check if a path is a directory
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} - Whether the path is a directory
   */
  async isDirectory(filePath) {
    try {
      const resolvedPath = this._resolvePath(filePath);
      
      // Check if path exists
      const exists = await this._pathExists(resolvedPath);
      if (!exists) {
        return false;
      }
      
      // Check if it's a directory
      const stats = await fs.stat(resolvedPath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file information (metadata)
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} - File information
   */
  async getFileInfo(filePath) {
    try {
      const resolvedPath = this._resolvePath(filePath);
      
      // Validate path exists
      await this._validatePathExists(resolvedPath);
      
      // Get file stats
      const stats = await fs.stat(resolvedPath);
      
      // Format the result
      return {
        path: resolvedPath,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        permissions: stats.mode.toString(8).slice(-3) // Convert to octal
      };
    } catch (error) {
      throw new Error(`Failed to get file information for ${filePath}: ${error.message}`);
    }
  }

  /**
   * Internal utility to save current file content to history
   * @param {string} filePath - Path to the file
   * @private
   */
  async _saveToHistory(filePath) {
    try {
      // Check if file exists
      const exists = await this._pathExists(filePath);
      if (!exists) {
        return; // No need to save history for non-existent files
      }
      
      // Read the current content
      const content = await fs.readFile(filePath, this.config.encoding);
      
      // Save to history
      this.fileHistory.set(filePath, content);
    } catch (error) {
      console.warn(`Failed to save file history for ${filePath}:`, error);
      // Don't throw here, as this is a helper method
    }
  }

  /**
   * Internal utility to check if a path exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} - Whether the path exists
   * @private
   */
  async _pathExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Internal utility to validate that a path exists
   * @param {string} filePath - Path to validate
   * @throws {Error} - If the path does not exist
   * @private
   */
  async _validatePathExists(filePath) {
    const exists = await this._pathExists(filePath);
    if (!exists) {
      throw new Error(`Path ${filePath} does not exist`);
    }
  }
}

module.exports = { FilesystemServer };
