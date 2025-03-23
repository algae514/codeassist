const { chromium } = require('playwright');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

class BrowserServer {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.initialized = false;
    this.tabs = new Map(); // Map to store multiple tabs
    this.activeTabId = null;
    this.screenshotDir = path.join(os.tmpdir(), 'llm-mcp-browser-screenshots');
  }

  /**
   * Initialize the browser if not already initialized
   */
  async initialize() {
    if (!this.initialized) {
      console.log('[BrowserServer] Initializing browser...');
      
      // Create screenshot directory if it doesn't exist
      try {
        await fs.mkdir(this.screenshotDir, { recursive: true });
        console.log(`[BrowserServer] Screenshot directory created at ${this.screenshotDir}`);
      } catch (error) {
        console.error(`[BrowserServer] Error creating screenshot directory: ${error.message}`);
      }
      
      // Launch browser
      this.browser = await chromium.launch({ 
        headless: false,
        args: ['--disable-web-security']
      });
      
      // Create initial context and page
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
      });
      
      // Create first tab
      const page = await this.context.newPage();
      const tabId = 0; // First tab is 0
      this.tabs.set(tabId, page);
      this.activeTabId = tabId;
      
      this.initialized = true;
      console.log('[BrowserServer] Browser initialized with first tab (ID: 0)');
    }
  }

  /**
   * Get the active page/tab
   */
  async getActivePage() {
    await this.initialize();
    const page = this.tabs.get(this.activeTabId);
    if (!page) {
      throw new Error(`Active tab (ID: ${this.activeTabId}) not found`);
    }
    return page;
  }

  /**
   * Navigate to a URL
   * @param {string} url - The URL to navigate to
   * @returns {Promise<string>} - Success message
   */
  async navigateToUrl(url) {
    await this.initialize();
    try {
      console.log(`[BrowserServer] Navigating to ${url}`);
      const page = await this.getActivePage();
      
      // Add http:// prefix if missing and not a local file path
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
        url = 'https://' + url;
      }
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle').catch(() => console.log('Navigation continued after timeout'));
      
      const pageTitle = await page.title();
      return `Successfully navigated to ${url} (Title: ${pageTitle})`;
    } catch (error) {
      throw new Error(`Failed to navigate to ${url}: ${error.message}`);
    }
  }

  /**
   * Click an element using various selector strategies
   * @param {string} selector - CSS selector, XPath, or text content
   * @returns {Promise<string>} - Success message
   */
  async clickElement(selector) {
    await this.initialize();
    try {
      console.log(`[BrowserServer] Clicking element: ${selector}`);
      const page = await this.getActivePage();

      // Try different selector strategies
      try {
        // First try as a CSS selector
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        return `Successfully clicked element with CSS selector: ${selector}`;
      } catch (cssError) {
        try {
          // Try by text content
          const textElement = page.getByText(selector);
          await textElement.click({ timeout: 5000 });
          return `Successfully clicked element with text: ${selector}`;
        } catch (textError) {
          try {
            // Try as XPath
            await page.waitForSelector(`xpath=${selector}`, { timeout: 5000 });
            await page.click(`xpath=${selector}`);
            return `Successfully clicked element with XPath: ${selector}`;
          } catch (xpathError) {
            // If all strategies fail, throw the original error
            throw cssError;
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to click element "${selector}": ${error.message}`);
    }
  }

  /**
   * Input text into a form element
   * @param {string} selector - The element selector
   * @param {string} text - The text to input
   * @returns {Promise<string>} - Success message
   */
  async inputText(selector, text) {
    await this.initialize();
    try {
      console.log(`[BrowserServer] Inputting text into: ${selector}`);
      const page = await this.getActivePage();

      // Try different selector strategies
      try {
        // First try as a CSS selector
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.fill(selector, text);
        return `Successfully input text into element with CSS selector: ${selector}`;
      } catch (cssError) {
        try {
          // Try by placeholder or label
          const placeholderElement = page.getByPlaceholder(selector);
          await placeholderElement.fill(text, { timeout: 5000 });
          return `Successfully input text into element with placeholder: ${selector}`;
        } catch (placeholderError) {
          try {
            // Try as XPath
            await page.waitForSelector(`xpath=${selector}`, { timeout: 5000 });
            await page.fill(`xpath=${selector}`, text);
            return `Successfully input text into element with XPath: ${selector}`;
          } catch (xpathError) {
            // If all strategies fail, throw the original error
            throw cssError;
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to input text into element "${selector}": ${error.message}`);
    }
  }

  /**
   * Extract content from the page based on a goal or selector
   * @param {string} goal - The extraction goal or selector
   * @returns {Promise<object>} - Extracted content
   */
  async extractContent(goal) {
    await this.initialize();
    try {
      console.log(`[BrowserServer] Extracting content with goal: ${goal}`);
      const page = await this.getActivePage();
      
      const title = await page.title();
      const url = page.url();
      
      // Try to extract content based on the goal
      let content = '';
      let links = [];
      
      // If the goal appears to be a selector, extract content from those elements
      if (goal.includes('.') || goal.includes('#') || goal.includes('[')) {
        try {
          // Try as a selector
          await page.waitForSelector(goal, { timeout: 2000 });
          const elements = await page.$$(goal);
          const texts = await Promise.all(elements.map(el => el.textContent()));
          content = texts.join('\n');
        } catch (error) {
          // If selector fails, extract all visible text
          content = await page.evaluate(() => document.body.innerText);
        }
      } else {
        // Extract all visible text as default
        content = await page.evaluate(() => document.body.innerText);
        
        // Extract links
        links = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a[href]'))
            .map(a => ({
              text: a.innerText.trim(),
              href: a.href
            }))
            .filter(link => link.text && link.href);
        });
      }
      
      // Truncate content if too large
      const MAX_CONTENT_LENGTH = 10000;
      if (content.length > MAX_CONTENT_LENGTH) {
        content = content.substring(0, MAX_CONTENT_LENGTH) + '... [content truncated]';
      }
      
      // Take a screenshot for reference
      const screenshotPath = await this.takeScreenshot();
      
      return {
        title,
        url,
        extractionGoal: goal,
        content,
        links: links.slice(0, 20), // Limit to first 20 links
        contentLength: content.length,
        screenshotPath
      };
    } catch (error) {
      throw new Error(`Failed to extract content: ${error.message}`);
    }
  }

  /**
   * Take a screenshot of the current page
   * @returns {Promise<string>} - Path to the screenshot file
   */
  async takeScreenshot() {
    await this.initialize();
    try {
      console.log('[BrowserServer] Taking screenshot');
      const page = await this.getActivePage();
      
      // Create unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;
      const filepath = path.join(this.screenshotDir, filename);
      
      // Take screenshot
      await page.screenshot({ path: filepath, fullPage: true });
      console.log(`[BrowserServer] Screenshot saved to: ${filepath}`);
      
      return filepath;
    } catch (error) {
      throw new Error(`Failed to take screenshot: ${error.message}`);
    }
  }

  /**
   * Scroll the page
   * @param {string} direction - The scroll direction ('down' or 'up')
   * @param {number} amount - The amount to scroll in pixels
   * @returns {Promise<string>} - Success message
   */
  async scroll(direction, amount = 300) {
    await this.initialize();
    try {
      console.log(`[BrowserServer] Scrolling ${direction} by ${amount} pixels`);
      const page = await this.getActivePage();
      
      await page.evaluate(({direction, amount}) => {
        window.scrollBy(0, direction.toLowerCase() === 'down' ? amount : -amount);
      }, {direction, amount});
      
      return `Scrolled ${direction} by ${amount} pixels`;
    } catch (error) {
      throw new Error(`Failed to scroll ${direction}: ${error.message}`);
    }
  }

  /**
   * Create a new tab with optional URL
   * @param {string} url - Optional URL to navigate to
   * @returns {Promise<object>} - Tab info
   */
  async createTab(url = null) {
    await this.initialize();
    try {
      console.log(`[BrowserServer] Creating new tab ${url ? 'with URL: ' + url : ''}`);
      
      // Create a new tab
      const page = await this.context.newPage();
      const tabId = this.tabs.size;
      this.tabs.set(tabId, page);
      
      // Navigate to URL if provided
      if (url) {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
      }
      
      // Switch to the new tab
      this.activeTabId = tabId;
      
      return {
        message: `Created new tab (ID: ${tabId})${url ? ' and navigated to ' + url : ''}`,
        tabId: tabId
      };
    } catch (error) {
      throw new Error(`Failed to create new tab: ${error.message}`);
    }
  }

  /**
   * Switch to a different tab
   * @param {number} tabId - The ID of the tab to switch to
   * @returns {Promise<string>} - Success message
   */
  async switchTab(tabId) {
    await this.initialize();
    try {
      console.log(`[BrowserServer] Switching to tab: ${tabId}`);
      
      // Check if tab exists
      if (!this.tabs.has(tabId)) {
        throw new Error(`Tab with ID ${tabId} not found`);
      }
      
      // Switch to the tab
      this.activeTabId = tabId;
      const page = await this.getActivePage();
      await page.bringToFront();
      
      // Get tab info
      const title = await page.title();
      const url = page.url();
      
      return `Switched to tab ${tabId} (Title: ${title}, URL: ${url})`;
    } catch (error) {
      throw new Error(`Failed to switch to tab ${tabId}: ${error.message}`);
    }
  }

  /**
   * Close a tab
   * @param {number} tabId - The ID of the tab to close (defaults to active tab)
   * @returns {Promise<string>} - Success message
   */
  async closeTab(tabId = null) {
    await this.initialize();
    try {
      // Use active tab if no tabId provided
      const targetTabId = tabId !== null ? tabId : this.activeTabId;
      console.log(`[BrowserServer] Closing tab: ${targetTabId}`);
      
      // Check if tab exists
      if (!this.tabs.has(targetTabId)) {
        throw new Error(`Tab with ID ${targetTabId} not found`);
      }
      
      // Close the tab
      const page = this.tabs.get(targetTabId);
      await page.close();
      this.tabs.delete(targetTabId);
      
      // If we closed the active tab, switch to first available tab
      if (targetTabId === this.activeTabId) {
        if (this.tabs.size > 0) {
          this.activeTabId = this.tabs.keys().next().value;
        } else {
          // Create a new tab if we closed the last one
          await this.createTab();
        }
      }
      
      return `Closed tab ${targetTabId}`;
    } catch (error) {
      throw new Error(`Failed to close tab ${tabId}: ${error.message}`);
    }
  }

  /**
   * List all open tabs
   * @returns {Promise<Array>} - List of tabs with their IDs, titles, and URLs
   */
  async listTabs() {
    await this.initialize();
    try {
      console.log('[BrowserServer] Listing all tabs');
      
      const tabInfo = [];
      for (const [id, page] of this.tabs.entries()) {
        try {
          const title = await page.title();
          const url = page.url();
          tabInfo.push({
            id,
            title,
            url,
            isActive: id === this.activeTabId
          });
        } catch (error) {
          // Tab might be closed or in error state
          tabInfo.push({
            id,
            title: 'Error',
            url: 'Error',
            isActive: id === this.activeTabId,
            error: error.message
          });
        }
      }
      
      return tabInfo;
    } catch (error) {
      throw new Error(`Failed to list tabs: ${error.message}`);
    }
  }

  /**
   * Get all interactive elements on the page
   * @returns {Promise<Array>} - List of interactive elements with their selectors and text
   */
  async getInteractiveElements() {
    await this.initialize();
    try {
      console.log('[BrowserServer] Getting interactive elements');
      const page = await this.getActivePage();
      
      // Get all clickable elements
      const elements = await page.evaluate(() => {
        const interactiveElements = [];
        let index = 0;
        
        // Helper function to add elements with a specific tag
        const addElements = (tagName, type) => {
          const elements = document.querySelectorAll(tagName);
          elements.forEach(el => {
            // Check if element is visible
            const rect = el.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0 &&
                            window.getComputedStyle(el).visibility !== 'hidden' &&
                            window.getComputedStyle(el).display !== 'none';
            
            if (isVisible) {
              let text = el.innerText || el.value || el.placeholder || '';
              text = text.trim().substring(0, 50);
              
              interactiveElements.push({
                index: index++,
                type,
                text,
                tag: el.tagName.toLowerCase(),
                id: el.id || '',
                className: el.className || '',
              });
            }
          });
        };
        
        // Add various interactive elements
        addElements('a', 'link');
        addElements('button', 'button');
        addElements('input[type="text"]', 'text input');
        addElements('input[type="password"]', 'password input');
        addElements('input[type="email"]', 'email input');
        addElements('input[type="checkbox"]', 'checkbox');
        addElements('input[type="radio"]', 'radio button');
        addElements('input[type="submit"]', 'submit button');
        addElements('textarea', 'textarea');
        addElements('select', 'dropdown');
        
        return interactiveElements;
      });
      
      return elements;
    } catch (error) {
      throw new Error(`Failed to get interactive elements: ${error.message}`);
    }
  }

  /**
   * Clean up browser resources
   */
  async cleanup() {
    if (this.browser) {
      console.log('[BrowserServer] Cleaning up browser resources...');
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.tabs.clear();
      this.initialized = false;
      console.log('[BrowserServer] Browser resources cleaned up');
    }
  }
}

module.exports = { BrowserServer };
