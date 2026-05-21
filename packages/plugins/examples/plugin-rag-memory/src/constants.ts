export const PLUGIN_ID = "paperclip-rag-memory";
export const PLUGIN_VERSION = "0.1.0";

export const TOOL_NAMES = {
  refreshIndex: "refresh-memory-index",
  searchMemory: "search-company-memory",
  issueBrief: "issue-context-brief",
} as const;

export const SLOT_IDS = {
  settingsPage: "rag-memory-settings-page",
  dashboardWidget: "rag-memory-dashboard-widget",
} as const;

export const EXPORT_NAMES = {
  settingsPage: "RagMemorySettingsPage",
  dashboardWidget: "RagMemoryDashboardWidget",
} as const;

export const DEFAULT_CONFIG = {
  maxIssues: 120,
  maxCommentsPerIssue: 4,
  chunkSize: 700,
  maxResults: 5,
} as const;
