import React from "react";
import { usePluginAction, usePluginData } from "@paperclipai/plugin-sdk/ui";

type GraphOverview = {
  builtAt: string;
  nodes: Array<unknown>;
  edges: Array<unknown>;
};

export function GraphSearchDashboardWidget() {
  const { data, loading } = usePluginData<GraphOverview>("graph-overview");
  const refreshGraph = usePluginAction("refresh-graph");

  if (loading) {
    return React.createElement("div", { style: { padding: 16, color: "#94a3b8", fontSize: 13 } }, "Loading graph...");
  }

  return React.createElement("div", { style: { padding: 16, color: "#e2e8f0", fontFamily: "'Inter', sans-serif" } }, [
    React.createElement("div", {
      key: "header",
      style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    }, [
      React.createElement("strong", { key: "label", style: { fontSize: 14 } }, "Graph Search"),
      React.createElement("button", {
        key: "refresh",
        onClick: () => void refreshGraph({}),
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
    React.createElement("div", { key: "body", style: { fontSize: 12, color: "#94a3b8", lineHeight: 1.7 } }, [
      `Nodes: ${data?.nodes?.length ?? 0}`,
      React.createElement("br", { key: "br1" }),
      `Edges: ${data?.edges?.length ?? 0}`,
      React.createElement("br", { key: "br2" }),
      data?.builtAt ? `Updated ${new Date(data.builtAt).toLocaleString()}` : "No graph built yet",
    ]),
  ]);
}

export function GraphSearchSettingsPage() {
  return React.createElement("div", { style: { padding: 24, color: "#e2e8f0" } }, [
    React.createElement("h2", { key: "title", style: { fontSize: 18, marginBottom: 8 } }, "Graph Search Settings"),
    React.createElement("p", { key: "copy", style: { fontSize: 14, color: "#94a3b8" } },
      "Use the instance settings panel to control how many issues are folded into the relationship graph.",
    ),
  ]);
}
