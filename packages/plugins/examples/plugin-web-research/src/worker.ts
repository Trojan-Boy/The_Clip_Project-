import {
  definePlugin,
  runWorker,
  type PaperclipPlugin,
  type PluginContext,
  type PluginHealthDiagnostics,
  type ToolResult,
  type ToolRunContext,
} from "@paperclipai/plugin-sdk";
import {
  DEFAULT_CONFIG,
  PIPELINE_STAGES,
  PLUGIN_ID,
  TOOL_NAMES,
} from "./constants.js";
import {
  getBrowserHarness,
  extractPageText,
} from "@paperclipai/adapter-utils/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WebResearchConfig = {
  maxSearchResults?: number;
  maxScrapeChars?: number;
  scrapeTimeoutSec?: number;
};

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

type PipelineProgress = {
  stage: string;
  percent: number;
  message: string;
  updatedAt: string;
  updatedBy: string;
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentContext: PluginContext | null = null;
let searchCount = 0;
let scrapeCount = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getConfig(ctx: PluginContext): Promise<WebResearchConfig> {
  const config = await ctx.config.get();
  return { ...DEFAULT_CONFIG, ...(config as WebResearchConfig) };
}

/**
 * Strip HTML tags from a string, returning clean readable text.
 */
function stripHtml(html: string): string {
  // Remove script and style blocks entirely
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  // Replace <br>, <p>, <div>, <li>, <h*> with newlines for readability
  text = text.replace(/<(?:br|p|div|li|h[1-6])[^>]*>/gi, "\n");
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&#x27;/g, "'");
  text = text.replace(/&#(\d+);/g, (_match, code) =>
    String.fromCharCode(Number(code)),
  );
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n/g, "\n\n");
  return text.trim();
}

/**
 * Parse DuckDuckGo HTML search results into structured results.
 */
function parseDuckDuckGoResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // DuckDuckGo HTML results are in <a class="result__a" ...> tags
  // and snippets in <a class="result__snippet" ...> tags
  // We use a simpler pattern-based approach since we don't have a DOM parser
  const resultBlocks = html.split(/class="result__body"/i);

  for (let i = 1; i < resultBlocks.length; i++) {
    const block = resultBlocks[i]!;

    // Extract URL from result__a href
    const urlMatch = block.match(
      /class="result__a"[^>]*href="([^"]+)"/i,
    );
    // Also try the uddg redirect pattern
    const uddgMatch = block.match(/uddg=([^&"]+)/i);
    const rawUrl = uddgMatch
      ? decodeURIComponent(uddgMatch[1]!)
      : urlMatch
        ? urlMatch[1]!
        : "";

    // Extract title text from result__a
    const titleMatch = block.match(
      /class="result__a"[^>]*>([^<]+)</i,
    );
    const title = titleMatch ? stripHtml(titleMatch[1]!) : "";

    // Extract snippet from result__snippet
    const snippetMatch = block.match(
      /class="result__snippet"[^>]*>([\s\S]*?)(?:<\/a>|<\/td>)/i,
    );
    const snippet = snippetMatch ? stripHtml(snippetMatch[1]!) : "";

    if (rawUrl && title) {
      results.push({ title, url: rawUrl, snippet });
    }
  }

  return results;
}

/**
 * Alternative parsing for DuckDuckGo Lite
 */
function parseDuckDuckGoLiteResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // DuckDuckGo Lite uses simpler HTML — look for result links
  const linkRegex =
    /<a[^>]+rel="nofollow"[^>]+class="result-link"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<td[^>]+class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;

  const links: { url: string; title: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    links.push({
      url: match[1]!,
      title: stripHtml(match[2]!),
    });
  }

  const snippets: string[] = [];
  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(stripHtml(match[1]!));
  }

  for (let i = 0; i < links.length; i++) {
    results.push({
      title: links[i]!.title,
      url: links[i]!.url,
      snippet: snippets[i] ?? "",
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function handleWebSearch(
  ctx: PluginContext,
  params: unknown,
  _runCtx: ToolRunContext,
): Promise<ToolResult> {
  const payload = params as { query?: string; numResults?: number };
  if (!payload.query || payload.query.trim().length === 0) {
    return { error: "query parameter is required" };
  }

  const config = await getConfig(ctx);
  const numResults = Math.min(
    payload.numResults ?? config.maxSearchResults ?? 5,
    10,
  );
  const query = payload.query.trim();

  ctx.logger.info("Web search starting", { query, numResults });

  try {
    // Use DuckDuckGo HTML (no API key needed)
    const encoded = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encoded}`;
    const response = await ctx.http.fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      return {
        error: `Search request failed with status ${response.status}`,
      };
    }

    const html = await response.text();
    let results = parseDuckDuckGoResults(html);

    // Fallback to lite parser if main one found nothing
    if (results.length === 0) {
      results = parseDuckDuckGoLiteResults(html);
    }

    // Trim to requested count
    results = results.slice(0, numResults);
    searchCount++;

    await ctx.metrics.write("web.search", 1, { query_length: String(query.length) });

    if (results.length === 0) {
      return {
        content: `No results found for "${query}". Try a different or more specific query.`,
        data: { query, results: [] },
      };
    }

    // Format results as readable text for the agent
    const formatted = results
      .map(
        (r, i) =>
          `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.snippet}`,
      )
      .join("\n\n");

    return {
      content: `Found ${results.length} results for "${query}":\n\n${formatted}`,
      data: { query, results },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    ctx.logger.error("Web search failed", { query, error: msg });
    return { error: `Web search failed: ${msg}` };
  }
}

async function handleWebScrape(
  ctx: PluginContext,
  params: unknown,
  _runCtx: ToolRunContext,
): Promise<ToolResult> {
  const payload = params as { url?: string; maxChars?: number };
  if (!payload.url || payload.url.trim().length === 0) {
    return { error: "url parameter is required" };
  }

  const config = await getConfig(ctx);
  const maxChars = payload.maxChars ?? config.maxScrapeChars ?? 8000;
  const url = payload.url.trim();

  // Basic URL validation
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return { error: "URL must start with http:// or https://" };
  }

  ctx.logger.info("Web scrape starting", { url, maxChars });

  try {
    const response = await ctx.http.fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,text/plain",
      },
    });

    if (!response.ok) {
      return {
        error: `Failed to fetch ${url}: HTTP ${response.status}`,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const rawBody = await response.text();

    let text: string;
    if (contentType.includes("text/html") || contentType.includes("xhtml")) {
      // Extract title
      const titleMatch = rawBody.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? stripHtml(titleMatch[1]!) : "";

      // Extract main content (try <main>, <article>, then <body>)
      const mainMatch = rawBody.match(
        /<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i,
      );
      const bodyMatch = rawBody.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const contentHtml = mainMatch
        ? mainMatch[1]!
        : bodyMatch
          ? bodyMatch[1]!
          : rawBody;

      text = stripHtml(contentHtml);
      if (title) {
        text = `Title: ${title}\n\n${text}`;
      }
    } else {
      // Plain text or other
      text = rawBody;
    }

    // Truncate to max chars
    if (text.length > maxChars) {
      text = text.slice(0, maxChars) + "\n\n[... content truncated]";
    }
    
    // If we got very little text, it might be a JS-rendered SPA. Fall back to browser harness.
    if (text.length < 500) {
      ctx.logger.info("Web scrape returned < 500 chars, falling back to browser navigate", { url, charCount: text.length });
      return handleBrowserNavigate(ctx, params, _runCtx);
    }

    scrapeCount++;
    await ctx.metrics.write("web.scrape", 1, {
      domain: new URL(url).hostname,
    });

    return {
      content: text,
      data: {
        url,
        charCount: text.length,
        contentType,
        truncated: text.length >= maxChars,
        fallback: false,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    ctx.logger.error("Web scrape failed", { url, error: msg });
    return { error: `Web scrape failed: ${msg}` };
  }
}

async function handleBrowserNavigate(
  ctx: PluginContext,
  params: unknown,
  _runCtx: ToolRunContext,
): Promise<ToolResult> {
  const payload = params as { url?: string };
  if (!payload.url || payload.url.trim().length === 0) {
    return { error: "url parameter is required" };
  }
  
  const url = payload.url.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return { error: "URL must start with http:// or https://" };
  }
  
  ctx.logger.info("Browser navigate starting", { url });
  const harness = getBrowserHarness();
  let managed;
  try {
    managed = await harness.getPage();
    await managed.page.goto(url, { waitUntil: "networkidle2" });
    const title = await managed.page.title();
    const text = await extractPageText(managed.page);
    
    scrapeCount++;
    await ctx.metrics.write("browser.navigate", 1, {
      domain: new URL(url).hostname,
    });
    
    return {
      content: `Navigated to ${title}\n\nContent:\n${text}`,
      data: { url, title, charCount: text.length },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    ctx.logger.error("Browser navigate failed", { url, error: msg });
    return { error: `Browser navigate failed: ${msg}` };
  } finally {
    if (managed) harness.releasePage(managed);
  }
}

async function handleBrowserScreenshot(
  ctx: PluginContext,
  params: unknown,
  _runCtx: ToolRunContext,
): Promise<ToolResult> {
  const payload = params as { fullPage?: boolean };
  const harness = getBrowserHarness();
  
  if (!harness.isRunning || harness.activePageCount === 0) {
    return { error: "Browser is not running. Navigate to a page first." };
  }
  
  ctx.logger.info("Browser screenshot starting", { fullPage: !!payload.fullPage });
  let managed;
  try {
    managed = await harness.getPage();
    const buffer = await managed.page.screenshot({ fullPage: payload.fullPage ?? false, encoding: "base64" });
    
    await ctx.metrics.write("browser.screenshot", 1);
    
    return {
      content: `data:image/png;base64,${buffer}`,
      data: { fullPage: !!payload.fullPage },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    ctx.logger.error("Browser screenshot failed", { error: msg });
    return { error: `Browser screenshot failed: ${msg}` };
  } finally {
    if (managed) harness.releasePage(managed);
  }
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

async function registerTools(ctx: PluginContext): Promise<void> {
  ctx.tools.register(
    TOOL_NAMES.webSearch,
    {
      displayName: "Web Search",
      description:
        "Search the web for a query. Returns titles, URLs, and snippets. Use for market research, trend analysis, and idea discovery.",
      parametersSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query.",
          },
          numResults: {
            type: "number",
            description: "Number of results (default 5, max 10).",
          },
        },
        required: ["query"],
      },
    },
    (params, runCtx) => handleWebSearch(ctx, params, runCtx),
  );

  ctx.tools.register(
    TOOL_NAMES.webScrape,
    {
      displayName: "Web Scrape",
      description:
        "Fetch a URL and extract its readable text content. Strips HTML. Use to read articles, docs, product pages.",
      parametersSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The web page URL to scrape.",
          },
          maxChars: {
            type: "number",
            description: "Max characters to return (default 8000).",
          },
        },
        required: ["url"],
      },
    },
    (params, runCtx) => handleWebScrape(ctx, params, runCtx),
  );

  ctx.tools.register(
    TOOL_NAMES.browserNavigate,
    {
      displayName: "Browser Navigate",
      description: "Navigate a real browser to a URL and return the rendered text content. Works on JS-rendered pages and SPA sites that fail with regular web scraping.",
      parametersSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to navigate to." }
        },
        required: ["url"],
      },
    },
    (params, runCtx) => handleBrowserNavigate(ctx, params, runCtx),
  );

  ctx.tools.register(
    TOOL_NAMES.browserScreenshot,
    {
      displayName: "Browser Screenshot",
      description: "Take a screenshot of the current browser page. Returns a base64 encoded PNG.",
      parametersSchema: {
        type: "object",
        properties: {
          fullPage: { type: "boolean", description: "Whether to capture the full scrollable page (default: false)" }
        },
        required: [],
      },
    },
    (params, runCtx) => handleBrowserScreenshot(ctx, params, runCtx),
  );
}

// ---------------------------------------------------------------------------
// Progress data & actions
// ---------------------------------------------------------------------------

async function registerProgressHandlers(ctx: PluginContext): Promise<void> {
  // Data handler: returns current pipeline progress for the dashboard widget
  ctx.data.register("progress", async (params) => {
    const companyId =
      typeof params.companyId === "string" ? params.companyId : "";
    if (!companyId) return null;

    const progress = (await ctx.state.get({
      scopeKind: "company",
      scopeId: companyId,
      stateKey: "pipeline-progress",
    })) as PipelineProgress | null;

    return {
      progress: progress ?? {
        stage: "intelligence",
        percent: 0,
        message: "Pipeline idle — waiting for tasks",
        updatedAt: new Date().toISOString(),
        updatedBy: "system",
      },
      stages: PIPELINE_STAGES,
    };
  });

  // Action handler: set pipeline progress (typically called by CEO or board)
  ctx.actions.register("update-progress", async (params) => {
    const companyId =
      typeof params.companyId === "string" ? params.companyId : "";
    if (!companyId) throw new Error("companyId is required");

    const stage =
      typeof params.stage === "string" ? params.stage : "intelligence";
    const percent =
      typeof params.percent === "number"
        ? Math.max(0, Math.min(100, params.percent))
        : 0;
    const message =
      typeof params.message === "string" && params.message.length > 0
        ? params.message
        : `Pipeline at ${stage} stage`;
    const updatedBy =
      typeof params.updatedBy === "string" ? params.updatedBy : "board";

    const progress: PipelineProgress = {
      stage,
      percent,
      message,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    await ctx.state.set(
      {
        scopeKind: "company",
        scopeId: companyId,
        stateKey: "pipeline-progress",
      },
      progress,
    );

    await ctx.activity.log({
      companyId,
      message: `Pipeline progress updated: ${stage} — ${percent}% — ${message}`,
      metadata: { plugin: PLUGIN_ID, progress },
    });

    await ctx.metrics.write("progress.update", 1, {
      stage,
      percent: String(percent),
    });

    return { ok: true, progress };
  });

  // Action handler: reset progress back to zero
  ctx.actions.register("reset-progress", async (params) => {
    const companyId =
      typeof params.companyId === "string" ? params.companyId : "";
    if (!companyId) throw new Error("companyId is required");

    await ctx.state.delete({
      scopeKind: "company",
      scopeId: companyId,
      stateKey: "pipeline-progress",
    });

    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Overview data handler
// ---------------------------------------------------------------------------

async function registerDataHandlers(ctx: PluginContext): Promise<void> {
  ctx.data.register("plugin-status", async () => {
    return {
      pluginId: PLUGIN_ID,
      searchCount,
      scrapeCount,
      toolsRegistered: [TOOL_NAMES.webSearch, TOOL_NAMES.webScrape, TOOL_NAMES.browserNavigate, TOOL_NAMES.browserScreenshot],
    };
  });
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const plugin: PaperclipPlugin = definePlugin({
  async setup(ctx) {
    currentContext = ctx;
    ctx.logger.info("Web Research plugin starting up");

    await registerTools(ctx);
    await registerProgressHandlers(ctx);
    await registerDataHandlers(ctx);

    ctx.logger.info("Web Research plugin ready", {
      tools: [TOOL_NAMES.webSearch, TOOL_NAMES.webScrape, TOOL_NAMES.browserNavigate, TOOL_NAMES.browserScreenshot],
    });
  },

  async onHealth(): Promise<PluginHealthDiagnostics> {
    return {
      status: "ok",
      message: "Web Research plugin healthy",
      details: {
        searchCount,
        scrapeCount,
      },
    };
  },

  async onConfigChanged(newConfig) {
    if (currentContext) {
      currentContext.logger.info("Web Research config changed", newConfig);
    }
  },

  async onValidateConfig(config) {
    const errors: string[] = [];
    const typed = config as WebResearchConfig;

    if (
      typed.maxSearchResults !== undefined &&
      (typeof typed.maxSearchResults !== "number" ||
        typed.maxSearchResults < 1 ||
        typed.maxSearchResults > 20)
    ) {
      errors.push("maxSearchResults must be a number between 1 and 20");
    }

    if (
      typed.maxScrapeChars !== undefined &&
      (typeof typed.maxScrapeChars !== "number" ||
        typed.maxScrapeChars < 100 ||
        typed.maxScrapeChars > 50000)
    ) {
      errors.push("maxScrapeChars must be a number between 100 and 50000");
    }

    return { ok: errors.length === 0, errors };
  },

  async onShutdown() {
    if (currentContext) {
      currentContext.logger.info("Web Research plugin shutting down", {
        totalSearches: searchCount,
        totalScrapes: scrapeCount,
      });
    }
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
