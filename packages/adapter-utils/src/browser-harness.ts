// ---------------------------------------------------------------------------
// Browser Harness — managed Puppeteer browser pool for agent tool use
// Provides lazy-launched headless Chrome with page pooling and auto-cleanup
// ---------------------------------------------------------------------------

import puppeteer, { type Browser, type Page } from "puppeteer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ManagedPage {
  /** The Puppeteer page instance */
  page: Page;
  /** Unique page ID */
  id: string;
  /** Epoch ms when the page was created */
  createdAt: number;
  /** Epoch ms of last activity */
  lastUsedAt: number;
}

export interface BrowserHarnessOptions {
  /** Max concurrent pages in the pool (default: 3) */
  maxPages?: number;
  /** Page idle timeout in ms before auto-close (default: 60_000) */
  pageIdleMs?: number;
  /** Browser idle timeout in ms before shutdown (default: 300_000) */
  browserIdleMs?: number;
  /** Navigation timeout in ms (default: 30_000) */
  navigationTimeoutMs?: number;
  /** Whether to run in headless mode (default: true) */
  headless?: boolean;
}

const DEFAULT_OPTIONS: Required<BrowserHarnessOptions> = {
  maxPages: 3,
  pageIdleMs: 60_000,
  browserIdleMs: 300_000,
  navigationTimeoutMs: 30_000,
  headless: true,
};

// ---------------------------------------------------------------------------
// Browser Harness Class
// ---------------------------------------------------------------------------

export class BrowserHarness {
  private browser: Browser | null = null;
  private pages: Map<string, ManagedPage> = new Map();
  private options: Required<BrowserHarnessOptions>;
  private launching: Promise<Browser> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private pageCounter = 0;
  private _shuttingDown = false;

  constructor(options?: BrowserHarnessOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // -----------------------------------------------------------------------
  // Browser lifecycle
  // -----------------------------------------------------------------------

  private async ensureBrowser(): Promise<Browser> {
    if (this._shuttingDown) {
      throw new Error("Browser harness is shutting down");
    }

    // Return existing browser
    if (this.browser?.connected) {
      this.resetIdleTimer();
      return this.browser;
    }

    // Join an in-flight launch
    if (this.launching) {
      return this.launching;
    }

    // Launch new browser
    this.launching = puppeteer.launch({
      headless: this.options.headless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-popup-blocking",
        "--no-first-run",
        "--no-default-browser-check",
        "--single-process",
      ],
      defaultViewport: { width: 1280, height: 800 },
    });

    try {
      this.browser = await this.launching;
      this.launching = null;

      // Listen for disconnect
      this.browser.on("disconnected", () => {
        this.browser = null;
        this.pages.clear();
      });

      // Start cleanup interval
      this.startCleanupInterval();
      this.resetIdleTimer();

      return this.browser;
    } catch (err) {
      this.launching = null;
      throw err;
    }
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.idleTimer = setTimeout(() => {
      if (this.pages.size === 0) {
        void this.closeBrowser();
      }
    }, this.options.browserIdleMs);
  }

  private startCleanupInterval(): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, mp] of this.pages) {
        if (now - mp.lastUsedAt > this.options.pageIdleMs) {
          void mp.page.close().catch(() => {});
          this.pages.delete(id);
        }
      }
      // If no pages left and browser idle timer expired, close browser
      if (this.pages.size === 0 && this.browser) {
        this.resetIdleTimer();
      }
    }, 15_000);
  }

  private async closeBrowser(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.browser) {
      const b = this.browser;
      this.browser = null;
      this.pages.clear();
      try {
        await b.close();
      } catch {
        // Already closed
      }
    }
  }

  // -----------------------------------------------------------------------
  // Page management
  // -----------------------------------------------------------------------

  /**
   * Acquire a managed page from the pool.
   * Creates a new page if pool has room, otherwise reuses the oldest idle page.
   */
  async getPage(): Promise<ManagedPage> {
    const browser = await this.ensureBrowser();

    // If under limit, create a new page
    if (this.pages.size < this.options.maxPages) {
      const page = await browser.newPage();

      // Configure page defaults
      page.setDefaultNavigationTimeout(this.options.navigationTimeoutMs);
      page.setDefaultTimeout(this.options.navigationTimeoutMs);

      // Set a realistic user agent
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      const id = `page_${++this.pageCounter}`;
      const now = Date.now();
      const managed: ManagedPage = { page, id, createdAt: now, lastUsedAt: now };
      this.pages.set(id, managed);
      return managed;
    }

    // Reuse the oldest page
    let oldest: ManagedPage | null = null;
    for (const mp of this.pages.values()) {
      if (!oldest || mp.lastUsedAt < oldest.lastUsedAt) {
        oldest = mp;
      }
    }

    if (oldest) {
      oldest.lastUsedAt = Date.now();
      return oldest;
    }

    // Fallback: create anyway (shouldn't happen)
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(this.options.navigationTimeoutMs);
    const id = `page_${++this.pageCounter}`;
    const now = Date.now();
    const managed: ManagedPage = { page, id, createdAt: now, lastUsedAt: now };
    this.pages.set(id, managed);
    return managed;
  }

  /**
   * Mark a page as no longer in active use (updates lastUsedAt for idle tracking).
   */
  releasePage(managed: ManagedPage): void {
    managed.lastUsedAt = Date.now();
    this.resetIdleTimer();
  }

  /**
   * Gracefully shut down the browser and all pages.
   */
  async shutdown(): Promise<void> {
    this._shuttingDown = true;
    await this.closeBrowser();
  }

  /**
   * Whether the browser is currently running.
   */
  get isRunning(): boolean {
    return this.browser?.connected ?? false;
  }

  /**
   * Number of active pages in the pool.
   */
  get activePageCount(): number {
    return this.pages.size;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _instance: BrowserHarness | null = null;

/**
 * Get the shared browser harness singleton.
 * Lazy-initialized — browser only launches on first tool call.
 */
export function getBrowserHarness(options?: BrowserHarnessOptions): BrowserHarness {
  if (!_instance) {
    _instance = new BrowserHarness(options);
  }
  return _instance;
}

/**
 * Shut down the singleton browser harness (for graceful server shutdown).
 */
export async function shutdownBrowserHarness(): Promise<void> {
  if (_instance) {
    await _instance.shutdown();
    _instance = null;
  }
}

// ---------------------------------------------------------------------------
// Helper: Extract readable text from a page
// ---------------------------------------------------------------------------

/**
 * Extract cleaned readable text from the current page using in-page JS evaluation.
 * Much better than raw HTML stripping — gets the rendered DOM content.
 */
export async function extractPageText(page: Page, maxChars = 15000): Promise<string> {
  const text = await page.evaluate(() => {
    // Remove scripts, styles, nav, footer
    const removeSelectors = ["script", "style", "noscript", "nav", "footer", "header", "iframe"];
    for (const sel of removeSelectors) {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    }

    // Try article/main first, then body
    const main =
      document.querySelector("article") ??
      document.querySelector("main") ??
      document.querySelector('[role="main"]') ??
      document.body;

    return (main?.innerText ?? "").trim();
  });

  if (text.length > maxChars) {
    return text.slice(0, maxChars) + "\n\n[... content truncated]";
  }
  return text;
}

/**
 * Extract structured search results from a Google search results page.
 */
export async function extractGoogleResults(
  page: Page,
  maxResults = 8,
): Promise<Array<{ title: string; url: string; snippet: string }>> {
  return page.evaluate((max: number) => {
    const results: Array<{ title: string; url: string; snippet: string }> = [];
    const items = document.querySelectorAll("#search .g, #rso .g");

    for (let i = 0; i < items.length && results.length < max; i++) {
      const item = items[i]!;
      const linkEl = item.querySelector("a[href]");
      const titleEl = item.querySelector("h3");
      const snippetEl =
        item.querySelector('[data-sncf]') ??
        item.querySelector(".VwiC3b") ??
        item.querySelector('[style="-webkit-line-clamp:2"]');

      if (linkEl && titleEl) {
        const href = linkEl.getAttribute("href") ?? "";
        if (href.startsWith("http")) {
          results.push({
            title: titleEl.textContent?.trim() ?? "",
            url: href,
            snippet: snippetEl?.textContent?.trim() ?? "",
          });
        }
      }
    }
    return results;
  }, maxResults);
}
