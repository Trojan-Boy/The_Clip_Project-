export const PLUGIN_ID = "paperclip-web-research";
export const PLUGIN_VERSION = "0.1.0";

export const TOOL_NAMES = {
  webSearch: "web-search",
  webScrape: "web-scrape",
  browserNavigate: "browser-navigate",
  browserScreenshot: "browser-screenshot",
} as const;

export const SLOT_IDS = {
  settingsPage: "web-research-settings-page",
  dashboardWidget: "web-research-progress-widget",
} as const;

export const EXPORT_NAMES = {
  settingsPage: "WebResearchSettingsPage",
  dashboardWidget: "WebResearchProgressWidget",
} as const;

export const STREAM_CHANNELS = {
  scrape: "scrape-progress",
} as const;

export const DEFAULT_CONFIG = {
  maxSearchResults: 5,
  maxScrapeChars: 8000,
  scrapeTimeoutSec: 30,
} as const;

/** Pipeline stages for the CEO-controlled progress bar */
export const PIPELINE_STAGES = [
  { key: "intelligence", label: "Intelligence", rangeStart: 0, rangeEnd: 20 },
  { key: "decision", label: "Decision", rangeStart: 20, rangeEnd: 40 },
  { key: "build", label: "Build", rangeStart: 40, rangeEnd: 80 },
  { key: "launch", label: "Launch", rangeStart: 80, rangeEnd: 100 },
] as const;
