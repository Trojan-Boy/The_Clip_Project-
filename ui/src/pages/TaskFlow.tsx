import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import {
  GitBranch,
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle,
  Clock,
  Bot,
} from "lucide-react";
import type { Issue, Agent } from "@paperclipai/shared";

// ── Layout constants ─────────────────────────────────────────────────────
const NODE_W = 220;
const NODE_H = 80;
const GAP_X = 50;
const GAP_Y = 70;
const PADDING = 50;

// ── Status colors ────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  done:        { bg: "#0a2e1a", border: "#22c55e", text: "#4ade80", dot: "#22c55e" },
  completed:   { bg: "#0a2e1a", border: "#22c55e", text: "#4ade80", dot: "#22c55e" },
  in_progress: { bg: "#0c1a3a", border: "#6366f1", text: "#818cf8", dot: "#6366f1" },
  in_review:   { bg: "#1a0a3a", border: "#8b5cf6", text: "#a78bfa", dot: "#8b5cf6" },
  todo:        { bg: "#0a1a2e", border: "#3b82f6", text: "#60a5fa", dot: "#3b82f6" },
  backlog:     { bg: "#1a1a1a", border: "#525252", text: "#a3a3a3", dot: "#525252" },
  blocked:     { bg: "#2a0a0a", border: "#ef4444", text: "#f87171", dot: "#ef4444" },
  cancelled:   { bg: "#1a1a1a", border: "#525252", text: "#737373", dot: "#525252" },
};
const DEFAULT_STATUS = { bg: "#1a1a1a", border: "#525252", text: "#a3a3a3", dot: "#525252" };

// ── Priority colors ──────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  urgent:   "#ef4444",
  high:     "#f97316",
  medium:   "#eab308",
  low:      "#3b82f6",
  none:     "#525252",
};

// ── Status icon component ────────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? DEFAULT_STATUS;
  const isRunning = status === "in_progress";

  if (status === "done" || status === "completed") {
    return <CheckCircle2 className="w-3 h-3" style={{ color: colors.dot }} />;
  }
  if (status === "blocked") {
    return <AlertTriangle className="w-3 h-3" style={{ color: colors.dot }} />;
  }
  if (isRunning) {
    return <Loader2 className="w-3 h-3 animate-spin" style={{ color: colors.dot }} />;
  }
  if (status === "backlog" || status === "cancelled") {
    return <Clock className="w-3 h-3" style={{ color: colors.dot }} />;
  }
  return <Circle className="w-3 h-3" style={{ color: colors.dot }} />;
}

// ── DAG Node layout ──────────────────────────────────────────────────────
interface DagNode {
  id: string;
  issue: Issue;
  x: number;
  y: number;
  depth: number;
  children: string[];
  agentName?: string;
}

interface DagEdge {
  from: string;
  to: string;
  label?: string;
}

function buildDag(
  issues: Issue[],
  agentMap: Map<string, Agent>,
): { nodes: DagNode[]; edges: DagEdge[]; width: number; height: number } {
  const issueMap = new Map(issues.map((i) => [i.id, i]));

  // Build parent → children map
  const childrenOf = new Map<string, string[]>();
  const hasParent = new Set<string>();

  for (const issue of issues) {
    if (issue.parentId && issueMap.has(issue.parentId)) {
      hasParent.add(issue.id);
      const siblings = childrenOf.get(issue.parentId) ?? [];
      siblings.push(issue.id);
      childrenOf.set(issue.parentId, siblings);
    }
  }

  // Find roots (issues without parents in the set)
  const roots = issues.filter((i) => !hasParent.has(i.id));

  // Sort by priority, then creation date
  const priorityOrder: Record<string, number> = {
    critical: 0, urgent: 1, high: 2, medium: 3, low: 4, none: 5,
  };
  const sortIssues = (ids: string[]) =>
    ids.sort((a, b) => {
      const ia = issueMap.get(a)!;
      const ib = issueMap.get(b)!;
      const pa = priorityOrder[ia.priority] ?? 5;
      const pb = priorityOrder[ib.priority] ?? 5;
      if (pa !== pb) return pa - pb;
      return new Date(ia.createdAt).getTime() - new Date(ib.createdAt).getTime();
    });

  // BFS to assign depths and positions
  const nodes: DagNode[] = [];
  const depthBuckets = new Map<number, string[]>();

  function walkTree(issueId: string, depth: number) {
    const issue = issueMap.get(issueId);
    if (!issue) return;

    const bucket = depthBuckets.get(depth) ?? [];
    bucket.push(issueId);
    depthBuckets.set(depth, bucket);

    const children = sortIssues(childrenOf.get(issueId) ?? []);
    const agentName = issue.assigneeAgentId
      ? agentMap.get(issue.assigneeAgentId)?.name
      : undefined;

    nodes.push({
      id: issue.id,
      issue,
      x: 0, // assigned later
      y: depth * (NODE_H + GAP_Y) + PADDING,
      depth,
      children,
      agentName,
    });

    for (const childId of children) {
      walkTree(childId, depth + 1);
    }
  }

  // Walk all roots
  const sortedRoots = sortIssues(roots.map((r) => r.id));
  for (const rootId of sortedRoots) {
    walkTree(rootId, 0);
  }

  // Also add orphan issues (those with parents not in the set)
  for (const issue of issues) {
    if (!nodes.some((n) => n.id === issue.id)) {
      const depth = 0;
      const bucket = depthBuckets.get(depth) ?? [];
      bucket.push(issue.id);
      depthBuckets.set(depth, bucket);

      const agentName = issue.assigneeAgentId
        ? agentMap.get(issue.assigneeAgentId)?.name
        : undefined;

      nodes.push({
        id: issue.id,
        issue,
        x: 0,
        y: PADDING,
        depth: 0,
        children: childrenOf.get(issue.id) ?? [],
        agentName,
      });
    }
  }

  // Assign x positions per depth level
  for (const [depth, ids] of depthBuckets) {
    ids.forEach((id, index) => {
      const node = nodes.find((n) => n.id === id);
      if (node) {
        node.x = index * (NODE_W + GAP_X) + PADDING;
      }
    });
  }

  // Build edges
  const edges: DagEdge[] = [];
  for (const node of nodes) {
    for (const childId of node.children) {
      const childIssue = issueMap.get(childId);
      const assigneeName = childIssue?.assigneeAgentId
        ? agentMap.get(childIssue.assigneeAgentId)?.name
        : undefined;
      edges.push({
        from: node.id,
        to: childId,
        label: assigneeName ? `→ ${assigneeName}` : undefined,
      });
    }
  }

  // Compute bounds
  let maxX = 0, maxY = 0;
  for (const n of nodes) {
    maxX = Math.max(maxX, n.x + NODE_W);
    maxY = Math.max(maxY, n.y + NODE_H);
  }

  return {
    nodes,
    edges,
    width: maxX + PADDING * 2,
    height: maxY + PADDING * 2,
  };
}

// ── Legend ────────────────────────────────────────────────────────────────
function Legend() {
  const statuses = ["todo", "in_progress", "in_review", "done", "blocked", "backlog"];
  return (
    <div className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-sm">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
        Status Legend
      </span>
      <div className="flex flex-col gap-1">
        {statuses.map((status) => {
          const colors = STATUS_COLORS[status] ?? DEFAULT_STATUS;
          return (
            <div key={status} className="flex items-center gap-2">
              <StatusDot status={status} />
              <span className="text-[10px] text-muted-foreground capitalize">
                {status.replace(/_/g, " ")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────
export function TaskFlow() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([{ label: "Task Flow" }]);
  }, [setBreadcrumbs]);

  // Fetch all issues
  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  // Fetch agents for name resolution
  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents ?? []) m.set(a.id, a);
    return m;
  }, [agents]);

  // Build DAG
  const dag = useMemo(() => {
    if (!issues || issues.length === 0) return null;
    // Filter out hidden/cancelled for cleaner view
    const visible = issues.filter((i) => !i.hiddenAt && i.status !== "cancelled");
    return buildDag(visible, agentMap);
  }, [issues, agentMap]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, DagNode>();
    for (const n of dag?.nodes ?? []) m.set(n.id, n);
    return m;
  }, [dag]);

  // Pan & zoom state
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Center on first load
  const hasInit = useRef(false);
  useEffect(() => {
    if (hasInit.current || !dag || !containerRef.current) return;
    hasInit.current = true;
    const cW = containerRef.current.clientWidth;
    const cH = containerRef.current.clientHeight;
    const scaleX = (cW - 40) / dag.width;
    const scaleY = (cH - 40) / dag.height;
    const fitZoom = Math.min(scaleX, scaleY, 1);
    const chartW = dag.width * fitZoom;
    const chartH = dag.height * fitZoom;
    setZoom(fitZoom);
    setPan({ x: (cW - chartW) / 2, y: (cH - chartH) / 2 });
  }, [dag]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-task-node]")) return;
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    },
    [pan],
  );
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      setPan({
        x: dragStart.current.panX + e.clientX - dragStart.current.x,
        y: dragStart.current.panY + e.clientY - dragStart.current.y,
      });
    },
    [dragging],
  );
  const handleMouseUp = useCallback(() => setDragging(false), []);
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(zoom * factor, 0.15), 2.5);
      const scale = newZoom / zoom;
      setPan({ x: mx - scale * (mx - pan.x), y: my - scale * (my - pan.y) });
      setZoom(newZoom);
    },
    [zoom, pan],
  );

  // ── Render states ──────────────────────────────────────────────────────
  if (!selectedCompanyId) {
    return <EmptyState icon={GitBranch} message="Select a company to view the task flow." />;
  }
  if (issuesLoading) {
    return <PageSkeleton variant="org-chart" />;
  }
  if (!dag || dag.nodes.length === 0) {
    return <EmptyState icon={GitBranch} message="No tasks found. Create issues to see the task flow." />;
  }

  // ── Stats bar ──────────────────────────────────────────────────────────
  const stats = {
    total: dag.nodes.length,
    done: dag.nodes.filter((n) => n.issue.status === "done").length,
    inProgress: dag.nodes.filter((n) => n.issue.status === "in_progress").length,
    blocked: dag.nodes.filter((n) => n.issue.status === "blocked").length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="mb-2 flex items-center gap-4 shrink-0 px-1">
        <div className="flex items-center gap-1.5 text-sm">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">Task Flow DAG</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
          <span>{stats.total} tasks</span>
          <span className="text-green-400">{stats.done} done</span>
          <span className="text-indigo-400">{stats.inProgress} active</span>
          {stats.blocked > 0 && <span className="text-red-400">{stats.blocked} blocked</span>}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full flex-1 min-h-0 overflow-hidden relative bg-muted/20 border border-border rounded-lg"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <Legend />

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          <button
            className="w-7 h-7 flex items-center justify-center bg-background border border-border rounded text-sm hover:bg-accent transition-colors"
            onClick={() => {
              const nz = Math.min(zoom * 1.2, 2.5);
              const c = containerRef.current;
              if (c) {
                const cx = c.clientWidth / 2, cy = c.clientHeight / 2;
                const s = nz / zoom;
                setPan({ x: cx - s * (cx - pan.x), y: cy - s * (cy - pan.y) });
              }
              setZoom(nz);
            }}
          >+</button>
          <button
            className="w-7 h-7 flex items-center justify-center bg-background border border-border rounded text-sm hover:bg-accent transition-colors"
            onClick={() => {
              const nz = Math.max(zoom * 0.8, 0.15);
              const c = containerRef.current;
              if (c) {
                const cx = c.clientWidth / 2, cy = c.clientHeight / 2;
                const s = nz / zoom;
                setPan({ x: cx - s * (cx - pan.x), y: cy - s * (cy - pan.y) });
              }
              setZoom(nz);
            }}
          >&minus;</button>
          <button
            className="w-7 h-7 flex items-center justify-center bg-background border border-border rounded text-[10px] hover:bg-accent transition-colors"
            onClick={() => {
              if (!containerRef.current || !dag) return;
              const cW = containerRef.current.clientWidth, cH = containerRef.current.clientHeight;
              const sx = (cW - 40) / dag.width, sy = (cH - 40) / dag.height;
              const fz = Math.min(sx, sy, 1);
              setZoom(fz);
              setPan({ x: (cW - dag.width * fz) / 2, y: (cH - dag.height * fz) / 2 });
            }}
          >Fit</button>
        </div>

        {/* SVG edges layer */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <marker
              id="task-arrow"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" fillOpacity={0.7} />
            </marker>
            <marker
              id="task-arrow-done"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#22c55e" fillOpacity={0.7} />
            </marker>
            <marker
              id="task-arrow-blocked"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" fillOpacity={0.7} />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {dag.edges.map(({ from, to, label }) => {
              const fromNode = nodeMap.get(from);
              const toNode = nodeMap.get(to);
              if (!fromNode || !toNode) return null;

              const x1 = fromNode.x + NODE_W / 2;
              const y1 = fromNode.y + NODE_H;
              const x2 = toNode.x + NODE_W / 2;
              const y2 = toNode.y;
              const midY = (y1 + y2) / 2;

              const childStatus = toNode.issue.status;
              const isDone = childStatus === "done";
              const isBlocked = childStatus === "blocked";
              const edgeColor = isDone ? "#22c55e" : isBlocked ? "#ef4444" : "#6366f1";
              const markerId = isDone ? "task-arrow-done" : isBlocked ? "task-arrow-blocked" : "task-arrow";

              return (
                <g key={`${from}-${to}`}>
                  {/* Glow */}
                  <path
                    d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                    fill="none"
                    stroke={edgeColor}
                    strokeWidth={4}
                    strokeOpacity={0.1}
                  />
                  {/* Line */}
                  <path
                    d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                    fill="none"
                    stroke={edgeColor}
                    strokeWidth={2}
                    strokeOpacity={0.6}
                    markerEnd={`url(#${markerId})`}
                  />
                  {/* Label */}
                  {label && (
                    <>
                      <rect
                        x={(x1 + x2) / 2 - 42}
                        y={midY - 8}
                        width={84}
                        height={14}
                        rx={4}
                        fill="#18181b"
                        fillOpacity={0.9}
                        stroke={edgeColor}
                        strokeWidth={0.5}
                        strokeOpacity={0.4}
                      />
                      <text
                        x={(x1 + x2) / 2}
                        y={midY + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 7,
                          fontWeight: 500,
                          fill: edgeColor,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {label.length > 14 ? `${label.slice(0, 14)}…` : label}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Card layer */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {dag.nodes.map((node) => {
            const { issue, agentName } = node;
            const sc = STATUS_COLORS[issue.status] ?? DEFAULT_STATUS;
            const priColor = PRIORITY_COLORS[issue.priority] ?? "#525252";

            return (
              <div
                key={node.id}
                data-task-node
                className="absolute rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer select-none overflow-hidden"
                style={{
                  left: node.x,
                  top: node.y,
                  width: NODE_W,
                  height: NODE_H,
                  backgroundColor: sc.bg,
                  border: `1px solid ${sc.border}40`,
                }}
                onClick={() => navigate(`/issues/${issue.id}`)}
              >
                {/* Top accent + priority bar */}
                <div className="flex h-1 w-full">
                  <div className="flex-1" style={{ backgroundColor: sc.border + "80" }} />
                  <div className="w-8" style={{ backgroundColor: priColor + "80" }} />
                </div>

                {/* Content */}
                <div className="px-2.5 pt-1.5 pb-2">
                  {/* Title row */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <StatusDot status={issue.status} />
                    <span
                      className="text-[11px] font-semibold leading-tight truncate flex-1"
                      style={{ color: sc.text }}
                    >
                      {issue.identifier ?? `#${issue.issueNumber}`}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="text-[10px] text-neutral-400 leading-tight line-clamp-2 mb-1.5">
                    {issue.title}
                  </div>

                  {/* Footer: assignee */}
                  {agentName && (
                    <div className="flex items-center gap-1">
                      <Bot className="h-2.5 w-2.5 text-neutral-500" />
                      <span className="text-[9px] text-neutral-500 truncate">
                        {agentName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
