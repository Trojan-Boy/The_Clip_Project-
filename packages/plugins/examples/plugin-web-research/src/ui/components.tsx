import React from "react";
import { usePluginData, usePluginAction } from "@paperclipai/plugin-sdk/ui";

const STAGE_COLORS: Record<string, string> = {
  intelligence: "#6366f1",
  decision: "#f59e0b",
  build: "#10b981",
  launch: "#ec4899",
};

const STAGE_ICONS: Record<string, string> = {
  intelligence: "🔍",
  decision: "⚖️",
  build: "🔨",
  launch: "🚀",
};

type PipelineStage = {
  key: string;
  label: string;
  rangeStart: number;
  rangeEnd: number;
};

type ProgressData = {
  progress: {
    stage: string;
    percent: number;
    message: string;
    updatedAt: string;
    updatedBy: string;
  };
  stages: PipelineStage[];
};

export function WebResearchProgressWidget() {
  const { data, loading, error, refresh } = usePluginData<ProgressData>("progress");
  const updateAction = usePluginAction("update-progress");
  const resetAction = usePluginAction("reset-progress");

  if (loading) {
    return React.createElement(
      "div",
      { style: { padding: "16px", color: "#94a3b8", fontSize: "13px" } },
      "Loading progress..."
    );
  }

  if (error || !data) {
    return React.createElement(
      "div",
      { style: { padding: "16px", color: "#ef4444", fontSize: "13px" } },
      "Failed to load progress"
    );
  }

  const { progress, stages } = data;
  const currentColor = STAGE_COLORS[progress.stage] ?? "#6366f1";
  const currentIcon = STAGE_ICONS[progress.stage] ?? "📊";

  const containerStyle: React.CSSProperties = {
    padding: "16px",
    fontFamily: "'Inter', -apple-system, sans-serif",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 600,
    color: "#e2e8f0",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };

  const percentStyle: React.CSSProperties = {
    fontSize: "20px",
    fontWeight: 700,
    color: currentColor,
  };

  const trackStyle: React.CSSProperties = {
    width: "100%",
    height: "8px",
    backgroundColor: "#1e293b",
    borderRadius: "4px",
    overflow: "hidden",
    marginBottom: "8px",
  };

  const barStyle: React.CSSProperties = {
    height: "100%",
    width: `${progress.percent}%`,
    backgroundColor: currentColor,
    borderRadius: "4px",
    transition: "width 0.5s ease-in-out",
  };

  const stagesRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "12px",
  };

  const messageStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "#94a3b8",
    marginBottom: "4px",
  };

  const timeStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "#64748b",
  };

  return React.createElement("div", { style: containerStyle }, [
    // Header
    React.createElement("div", { key: "header", style: headerStyle }, [
      React.createElement("div", { key: "title", style: titleStyle }, [
        React.createElement("span", { key: "icon" }, currentIcon),
        "Pipeline Progress",
      ]),
      React.createElement(
        "span",
        { key: "pct", style: percentStyle },
        `${progress.percent}%`
      ),
    ]),

    // Progress bar track
    React.createElement(
      "div",
      { key: "track", style: trackStyle },
      React.createElement("div", { style: barStyle })
    ),

    // Stage labels
    React.createElement(
      "div",
      { key: "stages", style: stagesRowStyle },
      stages.map((s: PipelineStage) => {
        const isActive = s.key === progress.stage;
        const isPast =
          stages.findIndex((x: PipelineStage) => x.key === progress.stage) >
          stages.findIndex((x: PipelineStage) => x.key === s.key);
        return React.createElement(
          "span",
          {
            key: s.key,
            style: {
              fontSize: "11px",
              fontWeight: isActive ? 700 : 400,
              color: isActive
                ? currentColor
                : isPast
                  ? "#e2e8f0"
                  : "#475569",
            },
          },
          `${STAGE_ICONS[s.key] ?? ""} ${s.label}`
        );
      })
    ),

    // Message
    React.createElement("div", { key: "msg", style: messageStyle }, progress.message),

    // Timestamp
    React.createElement(
      "div",
      { key: "time", style: timeStyle },
      `Updated ${new Date(progress.updatedAt).toLocaleString()} by ${progress.updatedBy}`
    ),
  ]);
}

export function WebResearchSettingsPage() {
  return React.createElement(
    "div",
    { style: { padding: "24px", color: "#e2e8f0" } },
    [
      React.createElement(
        "h2",
        { key: "title", style: { fontSize: "18px", fontWeight: 600, marginBottom: "8px" } },
        "Web Research Settings"
      ),
      React.createElement(
        "p",
        { key: "desc", style: { fontSize: "14px", color: "#94a3b8" } },
        "Configure search result limits, scrape character limits, and timeouts from the instance configuration panel."
      ),
    ]
  );
}
