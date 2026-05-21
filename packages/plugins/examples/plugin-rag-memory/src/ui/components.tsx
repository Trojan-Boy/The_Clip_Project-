import React from "react";
import { usePluginAction, usePluginData } from "@paperclipai/plugin-sdk/ui";

type MemoryOverview = {
  builtAt: string;
  issueCount: number;
  commentCount: number;
  goalCount: number;
  agentCount: number;
  chunkCount: number;
};

export function RagMemoryDashboardWidget() {
  const { data, loading } = usePluginData<MemoryOverview>("memory-overview");
  const refreshIndex = usePluginAction("refresh-index");

  if (loading) {
    return React.createElement("div", { style: { padding: 16, color: "#94a3b8", fontSize: 13 } }, "Loading memory...");
  }

  return React.createElement("div", { style: { padding: 16, color: "#e2e8f0", fontFamily: "'Inter', sans-serif" } }, [
    React.createElement("div", {
      key: "title",
      style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    }, [
      React.createElement("strong", { key: "label", style: { fontSize: 14 } }, "RAG Memory"),
      React.createElement("button", {
        key: "refresh",
        onClick: () => void refreshIndex({}),
        style: {
          border: "1px solid #334155",
          background: "#0f172a",
          color: "#cbd5e1",
          borderRadius: 6,
          fontSize: 11,
          padding: "4px 8px",
          cursor: "pointer",
        },
      }, "Refresh"),
    ]),
    React.createElement("div", { key: "stats", style: { fontSize: 12, color: "#94a3b8", lineHeight: 1.7 } }, [
      `Chunks: ${data?.chunkCount ?? 0}`,
      React.createElement("br", { key: "br1" }),
      `Issues: ${data?.issueCount ?? 0} | Comments: ${data?.commentCount ?? 0}`,
      React.createElement("br", { key: "br2" }),
      `Goals: ${data?.goalCount ?? 0} | Agents: ${data?.agentCount ?? 0}`,
    ]),
    React.createElement("div", {
      key: "updated",
      style: { marginTop: 10, fontSize: 11, color: "#64748b" },
    }, data?.builtAt ? `Indexed ${new Date(data.builtAt).toLocaleString()}` : "No memory index yet"),
  ]);
}

export function RagMemorySettingsPage() {
  return React.createElement("div", { style: { padding: 24, color: "#e2e8f0" } }, [
    React.createElement("h2", { key: "title", style: { fontSize: 18, marginBottom: 8 } }, "RAG Memory Settings"),
    React.createElement("p", { key: "copy", style: { fontSize: 14, color: "#94a3b8" } },
      "Use the instance settings panel to tune issue limits, comment depth, and chunk size for the memory index.",
    ),
  ]);
}
