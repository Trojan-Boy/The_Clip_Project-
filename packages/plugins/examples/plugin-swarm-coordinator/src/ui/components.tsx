import React from "react";
import { usePluginAction, usePluginData } from "@paperclipai/plugin-sdk/ui";

type WorkClaim = {
  issueId: string;
  issueTitle: string;
  agentName: string;
  expiresAt: string;
};

type SwarmOverview = {
  claims: WorkClaim[];
  lastSweep: {
    sweptAt: string;
    pendingIssueCount: number;
    wokenAgents: Array<{ agentName: string }>;
  } | null;
};

export function SwarmCoordinatorDashboardWidget() {
  const { data, loading } = usePluginData<SwarmOverview>("swarm-overview");
  const runLeaderSweep = usePluginAction("run-leader-sweep");

  if (loading) {
    return React.createElement("div", { style: { padding: 16, color: "#94a3b8", fontSize: 13 } }, "Loading swarm...");
  }

  return React.createElement("div", { style: { padding: 16, color: "#e2e8f0", fontFamily: "'Inter', sans-serif" } }, [
    React.createElement("div", {
      key: "header",
      style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    }, [
      React.createElement("strong", { key: "label", style: { fontSize: 14 } }, "Swarm Coordinator"),
      React.createElement("button", {
        key: "sweep",
        onClick: () => void runLeaderSweep({}),
        style: {
          border: "1px solid #334155",
          background: "#0f172a",
          color: "#cbd5e1",
          borderRadius: 6,
          fontSize: 11,
          padding: "4px 8px",
          cursor: "pointer",
        },
      }, "Sweep"),
    ]),
    React.createElement("div", { key: "counts", style: { fontSize: 12, color: "#94a3b8", lineHeight: 1.7 } }, [
      `Active claims: ${data?.claims?.length ?? 0}`,
      React.createElement("br", { key: "br1" }),
      `Pending at last sweep: ${data?.lastSweep?.pendingIssueCount ?? 0}`,
      React.createElement("br", { key: "br2" }),
      data?.lastSweep?.sweptAt ? `Swept ${new Date(data.lastSweep.sweptAt).toLocaleString()}` : "No sweep yet",
    ]),
    React.createElement("div", {
      key: "claims",
      style: { marginTop: 10, fontSize: 11, color: "#cbd5e1", lineHeight: 1.6 },
    }, (data?.claims ?? []).slice(0, 4).map((claim) =>
      React.createElement("div", { key: claim.issueId }, `${claim.issueTitle} -> ${claim.agentName}`),
    )),
  ]);
}

export function SwarmCoordinatorSettingsPage() {
  return React.createElement("div", { style: { padding: 24, color: "#e2e8f0" } }, [
    React.createElement("h2", { key: "title", style: { fontSize: 18, marginBottom: 8 } }, "Swarm Coordinator Settings"),
    React.createElement("p", { key: "copy", style: { fontSize: 14, color: "#94a3b8" } },
      "Use instance settings to tune claim TTLs, sweep fan-out, and which roles are treated as leaders for proactive coordination.",
    ),
  ]);
}
