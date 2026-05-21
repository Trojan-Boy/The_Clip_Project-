import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Circle,
  Clock,
  GitBranch,
  Loader2,
} from "lucide-react";
import type { Agent, Issue } from "@paperclipai/shared";
import { agentsApi } from "../api/agents";
import { issuesApi } from "../api/issues";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";

const NODE_W = 220;
const NODE_H = 80;
const GAP_X = 50;
const GAP_Y = 70;
const PADDING = 50;

const STATUS_COLORS: Record<
  string,
  { bg: string; border: string; text: string; dot: string }
> = {
  done: { bg: "#0a2e1a", border: "#22c55e", text: "#4ade80", dot: "#22c55e" },
  completed: { bg: "#0a2e1a", border: "#22c55e", text: "#4ade80", dot: "#22c55e" },
  in_progress: { bg: "#0c1a3a", border: "#6366f1", text: "#818cf8", dot: "#6366f1" },
  in_review: { bg: "#1a0a3a", border: "#8b5cf6", text: "#a78bfa", dot: "#8b5cf6" },
  todo: { bg: "#0a1a2e", border: "#3b82f6", text: "#60a5fa", dot: "#3b82f6" },
  backlog: { bg: "#1a1a1a", border: "#525252", text: "#a3a3a3", dot: "#525252" },
  blocked: { bg: "#2a0a0a", border: "#ef4444", text: "#f87171", dot: "#ef4444" },
  cancelled: { bg: "#1a1a1a", border: "#525252", text: "#737373", dot: "#525252" },
};

const DEFAULT_STATUS = {
  bg: "#1a1a1a",
  border: "#525252",
  text: "#a3a3a3",
  dot: "#525252",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  none: "#525252",
};

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

interface DagBuildResult {
  nodes: DagNode[];
  edges: DagEdge[];
  width: number;
  height: number;
  detachedCount: number;
  cycleCount: number;
}

function StatusDot({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? DEFAULT_STATUS;
  const isRunning = status === "in_progress";

  if (status === "done" || status === "completed") {
    return <CheckCircle2 className="h-3 w-3" style={{ color: colors.dot }} />;
  }
  if (status === "blocked") {
    return <AlertTriangle className="h-3 w-3" style={{ color: colors.dot }} />;
  }
  if (isRunning) {
    return <Loader2 className="h-3 w-3 animate-spin" style={{ color: colors.dot }} />;
  }
  if (status === "backlog" || status === "cancelled") {
    return <Clock className="h-3 w-3" style={{ color: colors.dot }} />;
  }
  return <Circle className="h-3 w-3" style={{ color: colors.dot }} />;
}

function sortIssueIds(issueMap: Map<string, Issue>, ids: string[]): string[] {
  const priorityOrder: Record<string, number> = {
    critical: 0,
    urgent: 1,
    high: 2,
    medium: 3,
    low: 4,
    none: 5,
  };

  return [...ids].sort((leftId, rightId) => {
    const left = issueMap.get(leftId);
    const right = issueMap.get(rightId);
    if (!left || !right) return leftId.localeCompare(rightId);

    const leftPriority = priorityOrder[left.priority] ?? 5;
    const rightPriority = priorityOrder[right.priority] ?? 5;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;

    const leftCreated = new Date(left.createdAt).getTime();
    const rightCreated = new Date(right.createdAt).getTime();
    return leftCreated - rightCreated;
  });
}

export function buildTaskFlowDag(issues: Issue[], agentMap: Map<string, Agent>): DagBuildResult {
  const issueMap = new Map(issues.map((issue) => [issue.id, issue]));
  const childrenByParent = new Map<string, string[]>();
  const hasVisibleParent = new Set<string>();

  for (const issue of issues) {
    if (!issue.parentId || !issueMap.has(issue.parentId) || issue.parentId === issue.id) {
      continue;
    }
    hasVisibleParent.add(issue.id);
    const children = childrenByParent.get(issue.parentId) ?? [];
    children.push(issue.id);
    childrenByParent.set(issue.parentId, children);
  }

  const orderedChildrenByParent = new Map<string, string[]>();
  for (const [parentId, childIds] of childrenByParent.entries()) {
    orderedChildrenByParent.set(parentId, sortIssueIds(issueMap, childIds));
  }

  const getVisibleChildren = (issueId: string) =>
    (orderedChildrenByParent.get(issueId) ?? []).filter((childId) => childId !== issueId);

  const widthCache = new Map<string, number>();
  const widthStack = new Set<string>();
  let cycleCount = 0;

  const computeWidth = (issueId: string): number => {
    const cached = widthCache.get(issueId);
    if (cached) return cached;

    if (widthStack.has(issueId)) {
      cycleCount += 1;
      return NODE_W + GAP_X;
    }

    widthStack.add(issueId);
    const children = getVisibleChildren(issueId);
    let width = NODE_W + GAP_X;

    if (children.length > 0) {
      width = -GAP_X;
      for (const childId of children) {
        width += computeWidth(childId) + GAP_X;
      }
      width = Math.max(width, NODE_W + GAP_X);
    }

    widthStack.delete(issueId);
    widthCache.set(issueId, width);
    return width;
  };

  const nodes: DagNode[] = [];
  const nodeById = new Map<string, DagNode>();
  const rendered = new Set<string>();

  const layoutNode = (
    issueId: string,
    depth: number,
    startX: number,
    lineage: Set<string>,
  ): number => {
    if (rendered.has(issueId)) {
      return nodeById.get(issueId)?.x ?? startX;
    }

    if (lineage.has(issueId)) {
      cycleCount += 1;
      return startX;
    }

    const issue = issueMap.get(issueId);
    if (!issue) return startX;

    const nextLineage = new Set(lineage);
    nextLineage.add(issueId);

    const children = getVisibleChildren(issueId).filter((childId) => !nextLineage.has(childId));
    const agentName = issue.assigneeAgentId
      ? agentMap.get(issue.assigneeAgentId)?.name
      : undefined;

    let x = startX;
    if (children.length > 0) {
      let childX = startX;
      let firstChildCenter = 0;
      let lastChildCenter = 0;

      children.forEach((childId, index) => {
        const childWidth = computeWidth(childId);
        const childStartX = childX + childWidth / 2 - (NODE_W + GAP_X) / 2;
        const childCenter = childStartX + NODE_W / 2;

        if (index === 0) firstChildCenter = childCenter;
        if (index === children.length - 1) lastChildCenter = childCenter;

        layoutNode(childId, depth + 1, childStartX, nextLineage);
        childX += childWidth + GAP_X;
      });

      x = (firstChildCenter + lastChildCenter) / 2 - NODE_W / 2;
    }

    const node: DagNode = {
      id: issue.id,
      issue,
      x: x + PADDING,
      y: depth * (NODE_H + GAP_Y) + PADDING,
      depth,
      children,
      agentName,
    };
    nodes.push(node);
    nodeById.set(issue.id, node);
    rendered.add(issue.id);
    return x;
  };

  const rootIds = sortIssueIds(
    issueMap,
    issues.filter((issue) => !hasVisibleParent.has(issue.id)).map((issue) => issue.id),
  );

  let currentX = 0;
  for (const rootId of rootIds) {
    const rootWidth = computeWidth(rootId);
    const rootStartX = currentX + rootWidth / 2 - (NODE_W + GAP_X) / 2;
    layoutNode(rootId, 0, rootStartX, new Set<string>());
    currentX += rootWidth + GAP_X * 2;
  }

  const detachedIds = sortIssueIds(
    issueMap,
    issues.filter((issue) => !rendered.has(issue.id)).map((issue) => issue.id),
  );

  for (const detachedId of detachedIds) {
    const detachedWidth = computeWidth(detachedId);
    const detachedStartX = currentX + detachedWidth / 2 - (NODE_W + GAP_X) / 2;
    layoutNode(detachedId, 0, detachedStartX, new Set<string>());
    currentX += detachedWidth + GAP_X * 2;
  }

  const edges: DagEdge[] = [];
  for (const node of nodes) {
    for (const childId of node.children) {
      if (!nodeById.has(childId)) continue;

      const childIssue = issueMap.get(childId);
      const assigneeName = childIssue?.assigneeAgentId
        ? agentMap.get(childIssue.assigneeAgentId)?.name
        : undefined;

      edges.push({
        from: node.id,
        to: childId,
        label: assigneeName ? `-> ${assigneeName}` : undefined,
      });
    }
  }

  let maxX = 0;
  let maxY = 0;
  for (const node of nodes) {
    maxX = Math.max(maxX, node.x + NODE_W);
    maxY = Math.max(maxY, node.y + NODE_H);
  }

  return {
    nodes,
    edges,
    width: Math.max(maxX + PADDING * 2, currentX + PADDING),
    height: maxY + PADDING * 2,
    detachedCount: detachedIds.length,
    cycleCount,
  };
}

function Legend() {
  const statuses = ["todo", "in_progress", "in_review", "done", "blocked", "backlog"];

  return (
    <div className="absolute left-3 top-3 z-10 rounded-lg border border-border bg-background/90 px-3 py-2 shadow-sm backdrop-blur-sm">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Status Legend
      </span>
      <div className="flex flex-col gap-1">
        {statuses.map((status) => (
          <div key={status} className="flex items-center gap-2">
            <StatusDot status={status} />
            <span className="text-[10px] capitalize text-muted-foreground">
              {status.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TaskFlow() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([{ label: "Task Flow" }]);
  }, [setBreadcrumbs]);

  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const agent of agents ?? []) {
      map.set(agent.id, agent);
    }
    return map;
  }, [agents]);

  const dag = useMemo(() => {
    if (!issues || issues.length === 0) return null;
    const visibleIssues = issues.filter((issue) => !issue.hiddenAt && issue.status !== "cancelled");
    return buildTaskFlowDag(visibleIssues, agentMap);
  }, [issues, agentMap]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, DagNode>();
    for (const node of dag?.nodes ?? []) {
      map.set(node.id, node);
    }
    return map;
  }, [dag]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const layoutSignature = useMemo(() => {
    if (!dag) return "";
    const nodeSignature = dag.nodes.map((node) => node.id).join("|");
    return `${nodeSignature}::${dag.width}x${dag.height}`;
  }, [dag]);

  const hasInitialized = useRef(false);

  useEffect(() => {
    hasInitialized.current = false;
  }, [layoutSignature]);

  useEffect(() => {
    if (hasInitialized.current || !dag || !containerRef.current) return;

    hasInitialized.current = true;
    const container = containerRef.current;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const fitZoom = Math.min((containerW - 40) / dag.width, (containerH - 40) / dag.height, 1);
    const chartW = dag.width * fitZoom;
    const chartH = dag.height * fitZoom;

    setZoom(fitZoom);
    setPan({
      x: (containerW - chartW) / 2,
      y: (containerH - chartH) / 2,
    });
  }, [dag]);

  const fitToView = useCallback(() => {
    if (!containerRef.current || !dag) return;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const fitZoom = Math.min((containerW - 40) / dag.width, (containerH - 40) / dag.height, 1);

    setZoom(fitZoom);
    setPan({
      x: (containerW - dag.width * fitZoom) / 2,
      y: (containerH - dag.height * fitZoom) / 2,
    });
  }, [dag]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (target.closest("[data-task-node]")) return;

      setDragging(true);
      dragStart.current = {
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!dragging) return;

      setPan({
        x: dragStart.current.panX + event.clientX - dragStart.current.x,
        y: dragStart.current.panY + event.clientY - dragStart.current.y,
      });
    },
    [dragging],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      event.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const factor = event.deltaY < 0 ? 1.1 : 0.9;
      const nextZoom = Math.min(Math.max(zoom * factor, 0.15), 2.5);
      const scale = nextZoom / zoom;

      setPan({
        x: mouseX - scale * (mouseX - pan.x),
        y: mouseY - scale * (mouseY - pan.y),
      });
      setZoom(nextZoom);
    },
    [pan, zoom],
  );

  if (!selectedCompanyId) {
    return <EmptyState icon={GitBranch} message="Select a company to view the task flow." />;
  }

  if (issuesLoading) {
    return <PageSkeleton variant="org-chart" />;
  }

  if (!dag || dag.nodes.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        message="No tasks found. Create issues to see the task flow."
      />
    );
  }

  const stats = {
    total: dag.nodes.length,
    done: dag.nodes.filter((node) => node.issue.status === "done").length,
    inProgress: dag.nodes.filter((node) => node.issue.status === "in_progress").length,
    blocked: dag.nodes.filter((node) => node.issue.status === "blocked").length,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex shrink-0 items-center gap-4 px-1">
        <div className="flex items-center gap-1.5 text-sm">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">Task Flow DAG</span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>{stats.total} tasks</span>
          <span className="text-green-400">{stats.done} done</span>
          <span className="text-indigo-400">{stats.inProgress} active</span>
          {stats.blocked > 0 && <span className="text-red-400">{stats.blocked} blocked</span>}
        </div>
      </div>

      {(dag.detachedCount > 0 || dag.cycleCount > 0) && (
        <div className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          <span className="font-medium text-amber-200">
            Task relationships were inconsistent, so the view recovered automatically.
          </span>
          {dag.detachedCount > 0 && (
            <span className="ml-2 text-amber-100/90">
              {dag.detachedCount} detached task{dag.detachedCount === 1 ? "" : "s"} rendered at the
              top level.
            </span>
          )}
          {dag.cycleCount > 0 && (
            <span className="ml-2 text-amber-100/90">
              {dag.cycleCount} cyclic link{dag.cycleCount === 1 ? "" : "s"} ignored.
            </span>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-border bg-muted/20"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <Legend />

        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1">
          <button
            className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-sm transition-colors hover:bg-accent"
            onClick={() => {
              const nextZoom = Math.min(zoom * 1.2, 2.5);
              const container = containerRef.current;
              if (container) {
                const centerX = container.clientWidth / 2;
                const centerY = container.clientHeight / 2;
                const scale = nextZoom / zoom;
                setPan({
                  x: centerX - scale * (centerX - pan.x),
                  y: centerY - scale * (centerY - pan.y),
                });
              }
              setZoom(nextZoom);
            }}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-sm transition-colors hover:bg-accent"
            onClick={() => {
              const nextZoom = Math.max(zoom * 0.8, 0.15);
              const container = containerRef.current;
              if (container) {
                const centerX = container.clientWidth / 2;
                const centerY = container.clientHeight / 2;
                const scale = nextZoom / zoom;
                setPan({
                  x: centerX - scale * (centerX - pan.x),
                  y: centerY - scale * (centerY - pan.y),
                });
              }
              setZoom(nextZoom);
            }}
            aria-label="Zoom out"
          >
            &minus;
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-[10px] transition-colors hover:bg-accent"
            onClick={fitToView}
            aria-label="Fit chart to screen"
            title="Fit to screen"
          >
            Fit
          </button>
        </div>

        <svg className="pointer-events-none absolute inset-0" style={{ width: "100%", height: "100%" }}>
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
              const markerId = isDone
                ? "task-arrow-done"
                : isBlocked
                  ? "task-arrow-blocked"
                  : "task-arrow";

              return (
                <g key={`${from}-${to}`}>
                  <path
                    d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                    fill="none"
                    stroke={edgeColor}
                    strokeWidth={4}
                    strokeOpacity={0.1}
                  />
                  <path
                    d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                    fill="none"
                    stroke={edgeColor}
                    strokeWidth={2}
                    strokeOpacity={0.6}
                    markerEnd={`url(#${markerId})`}
                  />
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
                        {label.length > 14 ? `${label.slice(0, 14)}...` : label}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {dag.nodes.map((node) => {
            const { issue, agentName } = node;
            const statusColors = STATUS_COLORS[issue.status] ?? DEFAULT_STATUS;
            const priorityColor = PRIORITY_COLORS[issue.priority] ?? "#525252";

            return (
              <div
                key={node.id}
                data-task-node
                className="absolute cursor-pointer select-none overflow-hidden rounded-lg shadow-sm transition-all duration-200 hover:shadow-lg"
                style={{
                  left: node.x,
                  top: node.y,
                  width: NODE_W,
                  height: NODE_H,
                  backgroundColor: statusColors.bg,
                  border: `1px solid ${statusColors.border}40`,
                }}
                onClick={() => navigate(`/issues/${issue.id}`)}
              >
                <div className="flex h-1 w-full">
                  <div className="flex-1" style={{ backgroundColor: `${statusColors.border}80` }} />
                  <div className="w-8" style={{ backgroundColor: `${priorityColor}80` }} />
                </div>

                <div className="px-2.5 pb-2 pt-1.5">
                  <div className="mb-1 flex items-center gap-1.5">
                    <StatusDot status={issue.status} />
                    <span
                      className="flex-1 truncate text-[11px] font-semibold leading-tight"
                      style={{ color: statusColors.text }}
                    >
                      {issue.identifier ?? `#${issue.issueNumber}`}
                    </span>
                  </div>

                  <div className="mb-1.5 line-clamp-2 text-[10px] leading-tight text-neutral-400">
                    {issue.title}
                  </div>

                  {agentName && (
                    <div className="flex items-center gap-1">
                      <Bot className="h-2.5 w-2.5 text-neutral-500" />
                      <span className="truncate text-[9px] text-neutral-500">{agentName}</span>
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
