export const PLUGIN_ID = "paperclip-graph-search";
export const PLUGIN_VERSION = "0.1.0";

export const TOOL_NAMES = {
  refreshGraph: "refresh-company-graph",
  neighborhood: "graph-neighborhood",
  shortestPath: "graph-shortest-path",
  exportMermaid: "graph-export-mermaid",
} as const;

export const SLOT_IDS = {
  settingsPage: "graph-search-settings-page",
  dashboardWidget: "graph-search-dashboard-widget",
} as const;

export const EXPORT_NAMES = {
  settingsPage: "GraphSearchSettingsPage",
  dashboardWidget: "GraphSearchDashboardWidget",
} as const;

export const DEFAULT_CONFIG = {
  maxIssues: 150,
} as const;
