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
  displayName: "Graph Search",
  description:
    "Builds a company knowledge graph from issues, goals, and reporting lines, then exposes traversal and Mermaid export tools.",
  author: "Idea Factory",
  categories: ["automation", "ui"],
  capabilities: [
    "issues.read",
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
        description: "Maximum number of issues to include when building the graph.",
        default: DEFAULT_CONFIG.maxIssues,
      },
    },
  },
  tools: [
    {
      name: TOOL_NAMES.refreshGraph,
      displayName: "Refresh Company Graph",
      description: "Rebuild the company graph from Paperclip entities.",
      parametersSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
        },
      },
    },
    {
      name: TOOL_NAMES.neighborhood,
      displayName: "Graph Neighborhood",
      description: "Return nearby nodes and relationships around a graph node.",
      parametersSchema: {
        type: "object",
        properties: {
          nodeId: { type: "string" },
          depth: { type: "number" },
        },
        required: ["nodeId"],
      },
    },
    {
      name: TOOL_NAMES.shortestPath,
      displayName: "Graph Shortest Path",
      description: "Find a short relationship path between two graph nodes.",
      parametersSchema: {
        type: "object",
        properties: {
          fromNodeId: { type: "string" },
          toNodeId: { type: "string" },
        },
        required: ["fromNodeId", "toNodeId"],
      },
    },
    {
      name: TOOL_NAMES.exportMermaid,
      displayName: "Graph Export Mermaid",
      description: "Export the current company graph as Mermaid flowchart text.",
      parametersSchema: {
        type: "object",
        properties: {
          nodeId: { type: "string", description: "Optional center node to export a local neighborhood." },
          depth: { type: "number", description: "Depth for a neighborhood export." },
        },
      },
    },
  ],
  ui: {
    slots: [
      {
        type: "settingsPage",
        id: SLOT_IDS.settingsPage,
        displayName: "Graph Search Settings",
        exportName: EXPORT_NAMES.settingsPage,
      },
      {
        type: "dashboardWidget",
        id: SLOT_IDS.dashboardWidget,
        displayName: "Graph Search",
        exportName: EXPORT_NAMES.dashboardWidget,
      },
    ],
  },
};

export default manifest;
