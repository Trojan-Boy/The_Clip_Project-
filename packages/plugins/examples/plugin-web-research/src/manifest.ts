import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import {
  DEFAULT_CONFIG,
  EXPORT_NAMES,
  PLUGIN_ID,
  PLUGIN_VERSION,
  SLOT_IDS,
  TOOL_NAMES,
} from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Web Research & Progress",
  description:
    "Gives agents web search and web scraping tools for research. Also adds a CEO-controlled pipeline progress bar on the dashboard.",
  author: "Idea Factory",
  categories: ["automation", "connector"],
  capabilities: [
    "companies.read",
    "projects.read",
    "issues.read",
    "agents.read",
    "goals.read",
    "activity.log.write",
    "metrics.write",
    "plugin.state.read",
    "plugin.state.write",
    "events.subscribe",
    "http.outbound",
    "agent.tools.register",
    "instance.settings.register",
    "ui.dashboardWidget.register",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  instanceConfigSchema: {
    type: "object",
    properties: {
      maxSearchResults: {
        type: "number",
        title: "Max Search Results",
        description: "Maximum number of search results to return per query.",
        default: DEFAULT_CONFIG.maxSearchResults,
      },
      maxScrapeChars: {
        type: "number",
        title: "Max Scrape Characters",
        description:
          "Maximum number of characters to return from a scraped page.",
        default: DEFAULT_CONFIG.maxScrapeChars,
      },
      scrapeTimeoutSec: {
        type: "number",
        title: "Scrape Timeout (seconds)",
        description: "Timeout for web scrape requests.",
        default: DEFAULT_CONFIG.scrapeTimeoutSec,
      },
    },
  },
  tools: [
    {
      name: TOOL_NAMES.webSearch,
      displayName: "Web Search",
      description:
        "Search the web using a query string. Returns a list of results with titles, URLs, and text snippets. Use this to research startup ideas, market trends, competitor analysis, and technology landscapes.",
      parametersSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to look up on the web.",
          },
          numResults: {
            type: "number",
            description: "Number of results to return (default: 5, max: 10).",
          },
        },
        required: ["query"],
      },
    },
    {
      name: TOOL_NAMES.webScrape,
      displayName: "Web Scrape",
      description:
        "Fetch a web page and extract its readable text content. Strips HTML tags, scripts, and styles. Use this to read full articles, documentation, product pages, and landing pages.",
      parametersSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The URL of the web page to scrape.",
          },
          maxChars: {
            type: "number",
            description:
              "Maximum characters to return from the page (default: 8000).",
          },
        },
        required: ["url"],
      },
    },
    {
      name: TOOL_NAMES.browserNavigate,
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
    {
      name: TOOL_NAMES.browserScreenshot,
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
  ],
  ui: {
    slots: [
      {
        type: "settingsPage",
        id: SLOT_IDS.settingsPage,
        displayName: "Web Research Settings",
        exportName: EXPORT_NAMES.settingsPage,
      },
      {
        type: "dashboardWidget",
        id: SLOT_IDS.dashboardWidget,
        displayName: "Pipeline Progress",
        exportName: EXPORT_NAMES.dashboardWidget,
      },
    ],
  },
};

export default manifest;
