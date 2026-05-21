export const PLUGIN_ID = "paperclip-swarm-coordinator";
export const PLUGIN_VERSION = "0.1.0";

export const TOOL_NAMES = {
  claimLane: "claim-work-lane",
  releaseLane: "release-work-lane",
  listLanes: "list-work-lanes",
  recommendPlan: "recommend-parallel-plan",
} as const;

export const JOB_KEYS = {
  leaderSweep: "leader-sweep",
} as const;

export const SLOT_IDS = {
  settingsPage: "swarm-coordinator-settings-page",
  dashboardWidget: "swarm-coordinator-dashboard-widget",
} as const;

export const EXPORT_NAMES = {
  settingsPage: "SwarmCoordinatorSettingsPage",
  dashboardWidget: "SwarmCoordinatorDashboardWidget",
} as const;

export const DEFAULT_CONFIG = {
  claimTtlMinutes: 90,
  maxLeadersPerSweep: 3,
  wakeIdleLeaders: true,
  leaderRoleHints: ["ceo", "cto", "cfo", "cmo", "pm", "general"],
} as const;
