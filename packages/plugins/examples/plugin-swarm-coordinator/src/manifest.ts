import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import {
  DEFAULT_CONFIG,
  EXPORT_NAMES,
  JOB_KEYS,
  PLUGIN_ID,
  PLUGIN_VERSION,
  SLOT_IDS,
  TOOL_NAMES,
} from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Swarm Coordinator",
  description:
    "Claim-based parallel coordination for company leaders and agents, with scheduled sweeps that wake idle leaders when work is piling up.",
  author: "Idea Factory",
  categories: ["automation", "ui"],
  capabilities: [
    "companies.read",
    "issues.read",
    "agents.read",
    "agents.invoke",
    "plugin.state.read",
    "plugin.state.write",
    "activity.log.write",
    "metrics.write",
    "jobs.schedule",
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
      claimTtlMinutes: {
        type: "number",
        title: "Claim TTL Minutes",
        description: "How long a work-lane claim stays active before it expires automatically.",
        default: DEFAULT_CONFIG.claimTtlMinutes,
      },
      maxLeadersPerSweep: {
        type: "number",
        title: "Leaders Per Sweep",
        description: "Maximum number of idle leaders to wake during each scheduled sweep.",
        default: DEFAULT_CONFIG.maxLeadersPerSweep,
      },
      wakeIdleLeaders: {
        type: "boolean",
        title: "Wake Idle Leaders",
        description: "Whether the plugin should proactively wake idle leaders when pending work accumulates.",
        default: DEFAULT_CONFIG.wakeIdleLeaders,
      },
      leaderRoleHints: {
        type: "array",
        title: "Leader Role Hints",
        description: "Additional agent roles that should be treated as leaders during sweeps.",
        items: { type: "string" },
        default: DEFAULT_CONFIG.leaderRoleHints,
      },
    },
  },
  jobs: [
    {
      jobKey: JOB_KEYS.leaderSweep,
      displayName: "Leader Sweep",
      description: "Wakes idle leaders and nudges them to coordinate pending work without colliding.",
      schedule: "*/10 * * * *",
    },
  ],
  tools: [
    {
      name: TOOL_NAMES.claimLane,
      displayName: "Claim Work Lane",
      description: "Claim an issue so parallel workers do not collide on the same lane of work.",
      parametersSchema: {
        type: "object",
        properties: {
          issueId: { type: "string" },
          note: { type: "string" },
        },
        required: ["issueId"],
      },
    },
    {
      name: TOOL_NAMES.releaseLane,
      displayName: "Release Work Lane",
      description: "Release a previously claimed issue lane.",
      parametersSchema: {
        type: "object",
        properties: {
          issueId: { type: "string" },
        },
        required: ["issueId"],
      },
    },
    {
      name: TOOL_NAMES.listLanes,
      displayName: "List Work Lanes",
      description: "List currently active work-lane claims in the company.",
      parametersSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: TOOL_NAMES.recommendPlan,
      displayName: "Recommend Parallel Plan",
      description: "Summarize pending work and suggest how leaders can split it into non-colliding lanes.",
      parametersSchema: {
        type: "object",
        properties: {},
      },
    },
  ],
  ui: {
    slots: [
      {
        type: "settingsPage",
        id: SLOT_IDS.settingsPage,
        displayName: "Swarm Coordinator Settings",
        exportName: EXPORT_NAMES.settingsPage,
      },
      {
        type: "dashboardWidget",
        id: SLOT_IDS.dashboardWidget,
        displayName: "Swarm Coordinator",
        exportName: EXPORT_NAMES.dashboardWidget,
      },
    ],
  },
};

export default manifest;
