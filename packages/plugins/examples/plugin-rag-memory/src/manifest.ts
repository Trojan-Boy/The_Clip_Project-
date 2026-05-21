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
  displayName: "RAG Memory",
  description:
    "Indexes company tasks, goals, comments, and agent metadata into a searchable memory layer for local-first agents.",
  author: "Idea Factory",
  categories: ["automation", "ui"],
  capabilities: [
    "issues.read",
    "issue.comments.read",
    "agents.read",
    "goals.read",
    "plugin.state.read",
    "plugin.state.write",
    "activity.log.write",
    "metrics.write",
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
      maxIssues: {
        type: "number",
        title: "Max Issues",
        description: "Maximum number of recent issues to index per company.",
        default: DEFAULT_CONFIG.maxIssues,
      },
      maxCommentsPerIssue: {
        type: "number",
        title: "Comments Per Issue",
        description: "Maximum number of recent comments to index for each issue.",
        default: DEFAULT_CONFIG.maxCommentsPerIssue,
      },
      chunkSize: {
        type: "number",
        title: "Chunk Size",
        description: "Approximate character size for each memory chunk.",
        default: DEFAULT_CONFIG.chunkSize,
      },
      maxResults: {
        type: "number",
        title: "Max Results",
        description: "Default number of search results returned to agents.",
        default: DEFAULT_CONFIG.maxResults,
      },
    },
  },
  tools: [
    {
      name: TOOL_NAMES.refreshIndex,
      displayName: "Refresh Memory Index",
      description: "Rebuild the company memory index from issues, comments, goals, and agent metadata.",
      parametersSchema: {
        type: "object",
        properties: {
          companyId: { type: "string", description: "Optional company ID override." },
        },
      },
    },
    {
      name: TOOL_NAMES.searchMemory,
      displayName: "Search Company Memory",
      description: "Search indexed company memory for relevant issues, goals, comments, and agent context.",
      parametersSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Natural-language search query." },
          limit: { type: "number", description: "Maximum results to return." },
        },
        required: ["query"],
      },
    },
    {
      name: TOOL_NAMES.issueBrief,
      displayName: "Issue Context Brief",
      description: "Build a concise context brief for an issue using its description and recent comments.",
      parametersSchema: {
        type: "object",
        properties: {
          issueId: { type: "string", description: "The target issue ID." },
        },
        required: ["issueId"],
      },
    },
  ],
  ui: {
    slots: [
      {
        type: "settingsPage",
        id: SLOT_IDS.settingsPage,
        displayName: "RAG Memory Settings",
        exportName: EXPORT_NAMES.settingsPage,
      },
      {
        type: "dashboardWidget",
        id: SLOT_IDS.dashboardWidget,
        displayName: "RAG Memory",
        exportName: EXPORT_NAMES.dashboardWidget,
      },
    ],
  },
};

export default manifest;
