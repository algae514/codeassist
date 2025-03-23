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
    this.lastActionTime = null; // To track timing between actions
  }
  
  /**
   * Helper method to introduce random human-like delays
   * @param {number} min - Minimum delay in milliseconds
   * @param {number} max - Maximum delay in milliseconds
   * @returns {Promise<void>}
   */
  async humanDelay(min, max) {
    // Calculate a random delay, with an exponential distribution weighted towards the lower end
    // This is more human-like than a uniform distribution
    let delay;
    if (Math.random() < 0.7) {
      // 70% of the time, use a value in the lower half of the range
      delay = this.randomInt(min, min + (max - min) / 2);
    } else {
      // 30% of the time, use a value in the upper half, with occasional longer pauses
      delay = this.randomInt(min + (max - min) / 2, max * 1.5);
    }
    
    // If we've recently performed an action, ensure minimum gap
    if (this.lastActionTime) {
      const timeSinceLastAction = Date.now() - this.lastActionTime;
      const minTimeBetweenActions = 1200; // At least 1.2s between actions (increased from 500ms)
      
      if (timeSinceLastAction < minTimeBetweenActions) {
        const additionalDelay = minTimeBetweenActions - timeSinceLastAction + this.randomInt(100, 500);
        await new Promise(resolve => setTimeout(resolve, additionalDelay));
      }
    }
    
    // Add occasional longer pauses (simulating human distraction)
    if (Math.random() < 0.1) { // 10% chance of a longer pause
      delay += this.randomInt(1000, 3000);
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    this.lastActionTime = Date.now();
    
    // Very occasionally add a much longer pause (human stepped away)
    if (Math.random() < 0.01) { // 1% chance
      await new Promise(resolve => setTimeout(resolve, this.randomInt(5000, 10000)));
    }
  }
  
  /**
   * Helper method to generate a random integer between min and max (inclusive)
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} - Random integer
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * Helper method to chunk text for more natural typing
   * Humans don't type at a consistent speed - they type in bursts
   * @param {string} text - Text to chunk
   * @returns {string[]} - Array of text chunks
   */
  chunkText(text) {
    if (text.length <= 3) return [text];
    
    const chunks = [];
    let currentIndex = 0;
    
    while (currentIndex < text.length) {
      // Determine random chunk size (typically 1-5 chars, occasionally more)
      let chunkSize;
      const rand = Math.random();
      
      if (rand < 0.6) { // 60% of the time, small chunks (1-3 chars)
        chunkSize = this.randomInt(1, 3);
      } else if (rand < 0.9) { // 30% of the time, medium chunks (3-6 chars)
        chunkSize = this.randomInt(3, 6);
      } else { // 10% of the time, larger chunks (6-10 chars)
        chunkSize = this.randomInt(6, 10);
      }
      
      // Don't go beyond the end of the string
      chunkSize = Math.min(chunkSize, text.length - currentIndex);
      
      // Add the chunk
      chunks.push(text.substring(currentIndex, currentIndex + chunkSize));
      currentIndex += chunkSize;
    }
    
    return chunks;
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
      console.log('[BrowserServer] Launching browser with headless mode: false');
      this.browser = await chromium.launch({ 
        headless: false,
        args: ['--disable-web-security', '--start-maximized'],
        slowMo: 250 // Slows down Playwright operations by 250ms
      });
      console.log('[BrowserServer] Browser launched successfully');
      
      // Create initial context and page
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
      });
      console.log('[BrowserServer] Browser context created with viewport 1920x1080');
      
      // Create first tab
      try {
        console.log('[BrowserServer] Creating first tab');
        const page = await this.context.newPage();
        
        // Navigate to Google as a test
        console.log('[BrowserServer] Navigating to Google as initial page');
        await page.goto('https://www.google.com', { timeout: 30000 });
        
        const tabId = 0; // First tab is 0
        this.tabs.set(tabId, page);
        this.activeTabId = tabId;
        
        this.initialized = true;
        console.log('[BrowserServer] Browser initialized with first tab (ID: 0)');
      } catch (error) {
        console.error(`[BrowserServer] Error creating first tab: ${error.message}`);
        throw error;
      }
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
      
      // Add random pause before navigation (like a human considering)
      await this.humanDelay(1000, 3000);
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Random pause to simulate a human looking at the page loading
      await this.humanDelay(2000, 5000);
      
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

      // Add human-like delay before clicking
      await this.humanDelay(1500, 4000);

      // Try different selector strategies
      try {
        // First try as a CSS selector
        await page.waitForSelector(selector, { timeout: 5000 });
        
        // Move mouse to element before clicking (human-like behavior)
        await page.hover(selector);
        await this.humanDelay(500, 1500);
        
        await page.click(selector, { delay: this.randomInt(50, 150) }); // Random click delay
        
        // Pause after clicking like a human would
        await this.humanDelay(1000, 3000);
        
        return `Successfully clicked element with CSS selector: ${selector}`;
      } catch (cssError) {
        try {
          // Try by text content
          const textElement = page.getByText(selector);
          
          // Move mouse to element before clicking
          await textElement.hover();
          await this.humanDelay(300, 800);
          
          await textElement.click({ timeout: 5000, delay: this.randomInt(50, 150) });
          
          // Pause after clicking
          await this.humanDelay(500, 1500);
          
          return `Successfully clicked element with text: ${selector}`;
        } catch (textError) {
          try {
            // Try as XPath
            await page.waitForSelector(`xpath=${selector}`, { timeout: 5000 });
            
            // Move mouse to element before clicking
            await page.hover(`xpath=${selector}`);
            await this.humanDelay(300, 800);
            
            await page.click(`xpath=${selector}`, { delay: this.randomInt(50, 150) });
            
            // Pause after clicking
            await this.humanDelay(500, 1500);
            
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

      // Add human-like delay before interacting
      await this.humanDelay(1500, 4000);

      // Try different selector strategies
      try {
        // First try as a CSS selector
        await page.waitForSelector(selector, { timeout: 5000 });
        
        // Click the field first like a human would
        await page.click(selector, { delay: this.randomInt(50, 150) });
        await this.humanDelay(800, 1500);
        
        // Clear existing text if any
        await page.fill(selector, '');
        await this.humanDelay(500, 1200);
        
        // Type text with human-like typing speed instead of using fill
        // Type with variable speed - sometimes fast, sometimes slow, like real humans
        const chunks = this.chunkText(text);
        for (const chunk of chunks) {
          await page.type(selector, chunk, { delay: this.randomInt(150, 450) });
          // Occasionally pause while typing, as humans do
          if (Math.random() < 0.2 && chunk.length > 1) {
            await this.humanDelay(300, 1200);
          }
        }
        
        // Pause after typing like a human would (often longer after completing input)
        await this.humanDelay(1200, 3000);
        
        return `Successfully input text into element with CSS selector: ${selector}`;
      } catch (cssError) {
        try {
          // Try by placeholder or label
          const placeholderElement = page.getByPlaceholder(selector);
          
          // Click the field first
          await placeholderElement.click({ delay: this.randomInt(50, 150) });
          await this.humanDelay(300, 700);
          
          // Clear existing text
          await placeholderElement.fill('');
          await this.humanDelay(200, 500);
          
          // Type text with human-like typing speed
          await placeholderElement.type(text, { delay: this.randomInt(100, 300) });
          
          // Pause after typing
          await this.humanDelay(500, 1500);
          
          return `Successfully input text into element with placeholder: ${selector}`;
        } catch (placeholderError) {
          try {
            // Try as XPath
            await page.waitForSelector(`xpath=${selector}`, { timeout: 5000 });
            
            // Click the field first
            await page.click(`xpath=${selector}`, { delay: this.randomInt(50, 150) });
            await this.humanDelay(300, 700);
            
            // Clear existing text
            await page.fill(`xpath=${selector}`, '');
            await this.humanDelay(200, 500);
            
            // Type text with human-like typing speed
            await page.type(`xpath=${selector}`, text, { delay: this.randomInt(100, 300) });
            
            // Pause after typing
            await this.humanDelay(500, 1500);
            
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
      
      // Simulate human behavior - pause before extraction
      await this.humanDelay(1500, 3500);
      
      // Scroll around to look at the page as if reading/scanning content
      for (let i = 0; i < this.randomInt(2, 4); i++) {
        await this.scroll('down', this.randomInt(100, 400));
        await this.humanDelay(800, 2000); // Pause to read
      }
      
      // Sometimes scroll back up a bit
      if (Math.random() < 0.6) {
        await this.scroll('up', this.randomInt(50, 200));
        await this.humanDelay(800, 1500);
      }
      
      const title = await page.title();
      const url = page.url();
      
      // Try to extract content based on the goal
      let content = '';
      let links = [];
      let headings = [];
      
      // If the goal appears to be a selector, extract content from those elements
      if (goal.includes('.') || goal.includes('#') || goal.includes('[')) {
        try {
          // Try as a selector
          await page.waitForSelector(goal, { timeout: 2000 });
          
          // Scroll to the element first like a human would
          await page.evaluate((selector) => {
            const element = document.querySelector(selector);
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, goal);
          
          await this.humanDelay(1000, 2500);
          
          const elements = await page.$(goal);
          const texts = await Promise.all(elements.map(el => el.textContent()));
          content = texts.join('\n');
        } catch (error) {
          // If selector fails, extract all visible text
          content = await page.evaluate(() => {
            // This more closely mimics how humans read a page
            const textNodes = [];
            
            // Get headings first for structure
            const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
            headings.forEach(h => textNodes.push(h.innerText));
            
            // Get paragraphs and lists
            const paragraphs = Array.from(document.querySelectorAll('p, li'));
            paragraphs.forEach(p => textNodes.push(p.innerText));
            
            // Fall back to body text if nothing found
            if (textNodes.length === 0) {
              return document.body.innerText;
            }
            
            return textNodes.join('\n\n');
          });
        }
      } else {
        // Extract content in a more structured, human-like way
        const extractedContent = await page.evaluate(() => {
          // Get headings for structure
          const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
            .map(h => ({ level: parseInt(h.tagName.substring(1)), text: h.innerText.trim() }))
            .filter(h => h.text);
            
          // Get main content using common content containers
          let mainContent = '';
          
          // Try common content containers first
          const contentSelectors = [
            'article', 'main', '.content', '#content', '.post', '.article',
            '.main-content', '[role="main"]', '.post-content'
          ];
          
          for (const selector of contentSelectors) {
            const contentEl = document.querySelector(selector);
            if (contentEl) {
              mainContent = contentEl.innerText;
              break;
            }
          }
          
          // If no common container found, get paragraphs and lists
          if (!mainContent) {
            const paragraphs = Array.from(document.querySelectorAll('p, li'))
              .map(p => p.innerText.trim())
              .filter(p => p.length > 0);
              
            mainContent = paragraphs.join('\n\n');
          }
          
          // If still no content, fall back to body text
          if (!mainContent) {
            mainContent = document.body.innerText;
          }
          
          // Get links
          const links = Array.from(document.querySelectorAll('a[href]'))
            .map(a => ({
              text: a.innerText.trim(),
              href: a.href
            }))
            .filter(link => link.text && link.href);
            
          return { mainContent, headings, links };
        });
        
        content = extractedContent.mainContent;
        headings = extractedContent.headings;
        links = extractedContent.links;
      }
      
      // Truncate content if too large
      const MAX_CONTENT_LENGTH = 10000;
      if (content.length > MAX_CONTENT_LENGTH) {
        content = content.substring(0, MAX_CONTENT_LENGTH) + '... [content truncated]';
      }
      
      // Add another small pause before taking screenshot
      await this.humanDelay(500, 1000);
      
      // Take a screenshot for reference
      const screenshotPath = await this.takeScreenshot();
      
      return {
        title,
        url,
        extractionGoal: goal,
        content,
        headings: headings.slice(0, 10), // Add structure info
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
      
      // Add a delay before scrolling
      await this.humanDelay(800, 2000);
      
      // Instead of a single scroll, divide into multiple smaller scrolls like humans do
      const steps = this.randomInt(4, 10); // More scroll steps for smoother motion
      const stepSize = Math.floor(amount / steps);
      
      for (let i = 0; i < steps; i++) {
        await page.evaluate(({direction, step}) => {
          window.scrollBy(0, direction.toLowerCase() === 'down' ? step : -step);
        }, {direction, step: stepSize});
        
        // Pause between each scroll step like a human would
        // Sometimes quick scrolls, sometimes pausing to read
        if (Math.random() < 0.3) {
          await this.humanDelay(300, 800); // Longer pause (reading)
        } else {
          await this.humanDelay(50, 200); // Quick scroll
        }
      }
      
      // Pause after scrolling to read content
      await this.humanDelay(1000, 3000);
      
      return `Scrolled ${direction} by ${amount} pixels in a human-like manner`;
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
