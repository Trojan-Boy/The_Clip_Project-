import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { agentsApi, type OrgNode } from "../api/agents";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { agentUrl } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { AgentIcon } from "../components/AgentIconPicker";
import {
  Download,
  Network,
  Upload,
  Brain,
  ListTodo,
  Cpu,
  Wrench,
  Sparkles,
} from "lucide-react";
import { AGENT_ROLE_LABELS, type Agent } from "@paperclipai/shared";

// ── Layout constants ────────────────────────────────────────────────────
const CARD_W = 260;
const CARD_H = 170;
const GAP_X = 40;
const GAP_Y = 100;
const PADDING = 60;

// ── Role‑based color palette ────────────────────────────────────────────

const ROLE_COLORS: Record<string, { stroke: string; fill: string; label: string }> = {
  ceo:        { stroke: "#f59e0b", fill: "#fef3c7", label: "CEO" },
  cto:        { stroke: "#8b5cf6", fill: "#ede9fe", label: "CTO" },
  vp:         { stroke: "#3b82f6", fill: "#dbeafe", label: "VP" },
  lead:       { stroke: "#06b6d4", fill: "#cffafe", label: "Lead" },
  manager:    { stroke: "#10b981", fill: "#d1fae5", label: "Manager" },
  senior:     { stroke: "#ec4899", fill: "#fce7f3", label: "Senior" },
  general:    { stroke: "#6366f1", fill: "#e0e7ff", label: "General" },
  specialist: { stroke: "#f97316", fill: "#ffedd5", label: "Specialist" },
  intern:     { stroke: "#a3a3a3", fill: "#f5f5f5", label: "Intern" },
};

const DEFAULT_ROLE_COLOR = { stroke: "#58a6ff", fill: "#dbeafe", label: "Agent" };

function roleColor(role: string) {
  return ROLE_COLORS[role.toLowerCase()] ?? DEFAULT_ROLE_COLOR;
}

// ── Adapter display labels ──────────────────────────────────────────────

const adapterLabels: Record<string, string> = {
  claude_local: "Claude",
  codex_local: "Codex",
  gemini_local: "Gemini",
  opencode_local: "OpenCode",
  cursor: "Cursor",
  hermes_local: "Hermes",
  openclaw_gateway: "OpenClaw",
  openrouter_remote: "OpenRouter",
  process: "Process",
  http: "HTTP",
};

// ── Tree layout types ───────────────────────────────────────────────────

interface LayoutNode {
  id: string;
  name: string;
  role: string;
  status: string;
  reportsTo?: string | null;
  title?: string | null;
  capabilities?: string | null;
  icon?: string | null;
  adapterType?: string | null;
  toolsUsed?: string[];
  x: number;
  y: number;
  children: LayoutNode[];
}

// ── Status dot colors (raw hex for SVG) ─────────────────────────────────

const statusDotColor: Record<string, string> = {
  running: "#22d3ee",
  active: "#4ade80",
  paused: "#facc15",
  idle: "#facc15",
  error: "#f87171",
  terminated: "#a3a3a3",
};
const defaultDotColor = "#a3a3a3";

// ── Layout algorithm ────────────────────────────────────────────────────

function subtreeWidth(node: OrgNode): number {
  if (node.reports.length === 0) return CARD_W;
  const childrenW = node.reports.reduce((sum, c) => sum + subtreeWidth(c), 0);
  const gaps = (node.reports.length - 1) * GAP_X;
  return Math.max(CARD_W, childrenW + gaps);
}

function layoutTree(node: OrgNode, x: number, y: number): LayoutNode {
  const totalW = subtreeWidth(node);
  const layoutChildren: LayoutNode[] = [];

  if (node.reports.length > 0) {
    const childrenW = node.reports.reduce((sum, c) => sum + subtreeWidth(c), 0);
    const gaps = (node.reports.length - 1) * GAP_X;
    let cx = x + (totalW - childrenW - gaps) / 2;

    for (const child of node.reports) {
      const cw = subtreeWidth(child);
      layoutChildren.push(layoutTree(child, cx, y + CARD_H + GAP_Y));
      cx += cw + GAP_X;
    }
  }

  return {
    id: node.id,
    name: node.name,
    role: node.role,
    status: node.status,
    reportsTo: node.reportsTo ?? null,
    title: node.title,
    capabilities: node.capabilities,
    icon: node.icon,
    adapterType: node.adapterType,
    toolsUsed: node.toolsUsed,
    x: x + (totalW - CARD_W) / 2,
    y,
    children: layoutChildren,
  };
}

function layoutForest(roots: OrgNode[]): LayoutNode[] {
  if (roots.length === 0) return [];
  let x = PADDING;
  const y = PADDING;
  const result: LayoutNode[] = [];
  for (const root of roots) {
    const w = subtreeWidth(root);
    result.push(layoutTree(root, x, y));
    x += w + GAP_X;
  }
  return result;
}

function hierarchyRank(role: string) {
  const normalized = role.toLowerCase();
  const rank: Record<string, number> = {
    ceo: 0,
    cto: 1,
    cfo: 1,
    coo: 1,
    vp: 2,
    director: 3,
    manager: 4,
    lead: 5,
    senior: 6,
    engineer: 7,
    general: 8,
  };
  return rank[normalized] ?? 20;
}

function sortByHierarchy(nodes: OrgNode[]): OrgNode[] {
  return [...nodes].sort((a, b) => {
    const byRank = hierarchyRank(a.role) - hierarchyRank(b.role);
    if (byRank !== 0) return byRank;
    return a.name.localeCompare(b.name);
  });
}

export function buildFallbackOrgTree(agents: Agent[]): OrgNode[] {
  if (agents.length === 0) return [];
  const activeAgents = agents.filter((agent) => agent.status !== "terminated");
  const byId = new Map(activeAgents.map((agent) => [agent.id, agent]));
  const parentById = new Map<string, string | null>(
    activeAgents.map((agent) => [agent.id, agent.reportsTo ?? null]),
  );

  const nodesById = new Map<string, OrgNode>();
  for (const agent of activeAgents) {
    nodesById.set(agent.id, {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      title: agent.title ?? null,
      capabilities: agent.capabilities ?? null,
      icon: agent.icon ?? null,
      reportsTo: agent.reportsTo ?? null,
      adapterType: agent.adapterType ?? null,
      toolsUsed: [],
      reports: [],
    });
  }

  const roots: OrgNode[] = [];
  for (const agent of activeAgents) {
    const child = nodesById.get(agent.id);
    if (!child) continue;
    const managerId = agent.reportsTo ?? null;
    if (!managerId || managerId === agent.id || !byId.has(managerId)) {
      roots.push(child);
      continue;
    }

    let cursor: string | null = managerId;
    let cycle = false;
    const visited = new Set<string>([agent.id]);
    while (cursor) {
      if (visited.has(cursor)) {
        cycle = true;
        break;
      }
      visited.add(cursor);
      cursor = parentById.get(cursor) ?? null;
    }
    if (cycle) {
      roots.push(child);
      continue;
    }

    const managerNode = nodesById.get(managerId);
    if (!managerNode) {
      roots.push(child);
      continue;
    }
    managerNode.reports.push(child);
  }

  const seen = new Set<string>();
  const dedupedRoots: OrgNode[] = [];
  for (const root of sortByHierarchy(roots)) {
    if (seen.has(root.id)) continue;
    seen.add(root.id);
    dedupedRoots.push(root);
  }

  for (const root of dedupedRoots) {
    const queue = [root];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      current.reports = sortByHierarchy(current.reports);
      queue.push(...current.reports);
    }
  }

  if (dedupedRoots.length > 0) return dedupedRoots;
  return sortByHierarchy(Array.from(nodesById.values()));
}

function flattenLayout(nodes: LayoutNode[]): LayoutNode[] {
  const result: LayoutNode[] = [];
  function walk(n: LayoutNode) {
    result.push(n);
    n.children.forEach(walk);
  }
  nodes.forEach(walk);
  return result;
}

interface Edge {
  parent: LayoutNode;
  child: LayoutNode;
}

function collectEdges(nodes: LayoutNode[]): Edge[] {
  const edges: Edge[] = [];
  function walk(n: LayoutNode) {
    for (const c of n.children) {
      edges.push({ parent: n, child: c });
      walk(c);
    }
  }
  nodes.forEach(walk);
  return edges;
}

// ── Main component ──────────────────────────────────────────────────────

export function OrgChart() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();

  const { data: orgTree, isLoading, error: orgError } = useQuery({
    queryKey: queryKeys.org(selectedCompanyId!),
    queryFn: () => agentsApi.org(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: agents, error: agentsError } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const queryError = orgError ?? agentsError;

  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents ?? []) m.set(a.id, a);
    return m;
  }, [agents]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Org Chart" }]);
  }, [setBreadcrumbs]);

  const effectiveOrgTree = useMemo(() => {
    if (orgTree && orgTree.length > 0) return orgTree;
    if (agents && agents.length > 0) return buildFallbackOrgTree(agents);
    return [];
  }, [orgTree, agents]);

  // Layout computation
  const layout = useMemo(() => layoutForest(effectiveOrgTree), [effectiveOrgTree]);
  const allNodes = useMemo(() => flattenLayout(layout), [layout]);
  const edges = useMemo(() => collectEdges(layout), [layout]);
  const nodesById = useMemo(() => {
    const map = new Map<string, LayoutNode>();
    for (const node of allNodes) map.set(node.id, node);
    return map;
  }, [allNodes]);

  // Unique roles in the current tree (for the legend)
  const activeRoles = useMemo(() => {
    const roles = new Set<string>();
    for (const n of allNodes) roles.add(n.role);
    return Array.from(roles);
  }, [allNodes]);

  // Compute SVG bounds
  const bounds = useMemo(() => {
    if (allNodes.length === 0) return { width: 800, height: 600 };
    let maxX = 0,
      maxY = 0;
    for (const n of allNodes) {
      maxX = Math.max(maxX, n.x + CARD_W);
      maxY = Math.max(maxY, n.y + CARD_H);
    }
    return { width: maxX + PADDING, height: maxY + PADDING };
  }, [allNodes]);

  // Pan & zoom state
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Center the chart on first load
  const hasInitialized = useRef(false);
  const layoutSignature = useMemo(
    () => allNodes.map((n) => n.id).join("|"),
    [allNodes],
  );
  useEffect(() => {
    hasInitialized.current = false;
  }, [layoutSignature]);

  useEffect(() => {
    if (
      hasInitialized.current ||
      allNodes.length === 0 ||
      !containerRef.current
    )
      return;
    hasInitialized.current = true;

    const container = containerRef.current;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const scaleX = (containerW - 40) / bounds.width;
    const scaleY = (containerH - 40) / bounds.height;
    const fitZoom = Math.min(scaleX, scaleY, 1);

    const chartW = bounds.width * fitZoom;
    const chartH = bounds.height * fitZoom;

    setZoom(fitZoom);
    setPan({
      x: (containerW - chartW) / 2,
      y: (containerH - chartH) / 2,
    });
  }, [allNodes, bounds]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-org-card]")) return;
      setDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({
        x: dragStart.current.panX + dx,
        y: dragStart.current.panY + dy,
      });
    },
    [dragging],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(zoom * factor, 0.15), 2.5);

      const scale = newZoom / zoom;
      setPan({
        x: mouseX - scale * (mouseX - pan.x),
        y: mouseY - scale * (mouseY - pan.y),
      });
      setZoom(newZoom);
    },
    [zoom, pan],
  );

  if (!selectedCompanyId) {
    return (
      <EmptyState
        icon={Network}
        message="Select a company to view the org chart."
      />
    );
  }

  if (isLoading) {
    return <PageSkeleton variant="org-chart" />;
  }

  if (queryError) {
    return (
      <EmptyState
        icon={Network}
        message={
          queryError instanceof Error
            ? `Failed to load org chart: ${queryError.message}`
            : "Failed to load org chart."
        }
      />
    );
  }

  if (effectiveOrgTree.length === 0) {
    return (
      <EmptyState icon={Network} message="No organizational hierarchy defined." />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Action bar */}
      <div className="mb-2 flex items-center justify-start gap-2 shrink-0">
        <Link to="/company/import">
          <Button variant="outline" size="sm">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import company
          </Button>
        </Link>
        <Link to="/company/export">
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export company
          </Button>
        </Link>
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
        {/* ── Role color legend ─────────────────────────────────────── */}
        {activeRoles.length > 0 && (
          <div className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-sm">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Reporting Lines
            </span>
            <div className="flex flex-col gap-1">
              {activeRoles.map((role) => {
                const rc = roleColor(role);
                return (
                  <div key={role} className="flex items-center gap-2">
                    <span
                      className="inline-block w-5 h-0.5 rounded-full"
                      style={{ backgroundColor: rc.stroke }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {rc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Zoom controls ─────────────────────────────────────────── */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          <button
            className="w-7 h-7 flex items-center justify-center bg-background border border-border rounded text-sm hover:bg-accent transition-colors"
            onClick={() => {
              const newZoom = Math.min(zoom * 1.2, 2.5);
              const container = containerRef.current;
              if (container) {
                const cx = container.clientWidth / 2;
                const cy = container.clientHeight / 2;
                const scale = newZoom / zoom;
                setPan({
                  x: cx - scale * (cx - pan.x),
                  y: cy - scale * (cy - pan.y),
                });
              }
              setZoom(newZoom);
            }}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center bg-background border border-border rounded text-sm hover:bg-accent transition-colors"
            onClick={() => {
              const newZoom = Math.max(zoom * 0.8, 0.15);
              const container = containerRef.current;
              if (container) {
                const cx = container.clientWidth / 2;
                const cy = container.clientHeight / 2;
                const scale = newZoom / zoom;
                setPan({
                  x: cx - scale * (cx - pan.x),
                  y: cy - scale * (cy - pan.y),
                });
              }
              setZoom(newZoom);
            }}
            aria-label="Zoom out"
          >
            &minus;
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center bg-background border border-border rounded text-[10px] hover:bg-accent transition-colors"
            onClick={() => {
              if (!containerRef.current) return;
              const cW = containerRef.current.clientWidth;
              const cH = containerRef.current.clientHeight;
              const scaleX = (cW - 40) / bounds.width;
              const scaleY = (cH - 40) / bounds.height;
              const fitZoom = Math.min(scaleX, scaleY, 1);
              const chartW = bounds.width * fitZoom;
              const chartH = bounds.height * fitZoom;
              setZoom(fitZoom);
              setPan({ x: (cW - chartW) / 2, y: (cH - chartH) / 2 });
            }}
            title="Fit to screen"
            aria-label="Fit chart to screen"
          >
            Fit
          </button>
        </div>

        {/* ── SVG layer for edges (arrows) ──────────────────────────── */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            {/* Create an arrowhead marker per unique role color */}
            {activeRoles.map((role) => {
              const rc = roleColor(role);
              return (
                <marker
                  key={`arrow-${role}`}
                  id={`org-arrow-${role}`}
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="5"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill={rc.stroke} fillOpacity={0.85} />
                </marker>
              );
            })}
            {/* Fallback marker */}
            <marker
              id="org-arrow-default"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill={DEFAULT_ROLE_COLOR.stroke} fillOpacity={0.85} />
            </marker>
          </defs>

          <g
            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          >
            {edges.map(({ parent, child }) => {
              // Arrow goes from parent bottom → child top
              const x1 = parent.x + CARD_W / 2;
              const y1 = parent.y + CARD_H;
              const x2 = child.x + CARD_W / 2;
              const y2 = child.y;
              const midY = (y1 + y2) / 2;
              const rc = roleColor(child.role);
              const markerId = activeRoles.includes(child.role)
                ? `org-arrow-${child.role}`
                : "org-arrow-default";

              return (
                <g key={`${parent.id}-${child.id}`}>
                  {/* Glow behind the line */}
                  <path
                    d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                    fill="none"
                    stroke={rc.stroke}
                    strokeWidth={4}
                    strokeOpacity={0.12}
                  />
                  {/* Main connector line */}
                  <path
                    d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                    fill="none"
                    stroke={rc.stroke}
                    strokeWidth={2}
                    strokeOpacity={0.75}
                    markerEnd={`url(#${markerId})`}
                  />
                  {/* Label: "reports to <parent>" */}
                  <rect
                    x={(x1 + x2) / 2 - 46}
                    y={midY - 10}
                    width={92}
                    height={16}
                    rx={4}
                    fill={rc.fill}
                    fillOpacity={0.85}
                    stroke={rc.stroke}
                    strokeWidth={0.5}
                    strokeOpacity={0.4}
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={midY + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: 8,
                      fontWeight: 600,
                      fill: rc.stroke,
                      letterSpacing: "0.02em",
                    }}
                  >
                    reports to {parent.name.length > 8 ? `${parent.name.slice(0, 8)}...` : parent.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* ── Card layer ────────────────────────────────────────────── */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {allNodes.map((node) => {
            const agent = agentMap.get(node.id);
            const dotColor = statusDotColor[node.status] ?? defaultDotColor;
            const rc = roleColor(node.role);
            const displayTitle = node.title ?? agent?.title ?? roleLabel(node.role);
            const displayCapabilities = node.capabilities ?? agent?.capabilities ?? null;
            const displayAdapter = node.adapterType ?? agent?.adapterType ?? null;
            const displayTools = node.toolsUsed ?? [];
            const managerName = node.reportsTo ? (nodesById.get(node.reportsTo)?.name ?? "Manager") : null;

            return (
              <div
                key={node.id}
                data-org-card
                className="absolute bg-card border rounded-xl shadow-sm hover:shadow-lg hover:border-foreground/20 transition-all duration-200 cursor-pointer select-none overflow-hidden"
                style={{
                  left: node.x,
                  top: node.y,
                  width: CARD_W,
                  minHeight: CARD_H,
                  borderColor: rc.stroke + "30",
                }}
                onClick={() =>
                  navigate(
                    agent ? agentUrl(agent) : `/agents/${node.id}`,
                  )
                }
              >
                {/* Top colored accent bar */}
                <div
                  className="h-1 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${rc.stroke}, ${rc.stroke}88)`,
                  }}
                />

                {/* Header: icon + name + role */}
                <div className="flex items-center px-3 pt-2.5 pb-1.5 gap-2.5">
                  <div className="relative shrink-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: rc.fill }}
                    >
                      <AgentIcon
                        icon={node.icon ?? agent?.icon}
                        className="h-4.5 w-4.5 text-foreground/70"
                      />
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card"
                      style={{ backgroundColor: dotColor }}
                    />
                  </div>
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="text-sm font-semibold text-foreground leading-tight truncate w-full">
                      {node.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate w-full">
                      {displayTitle}
                    </span>
                  </div>
                </div>

                {/* Detail rows */}
                <div className="px-3 pb-2.5 space-y-1.5">
                  {/* Capabilities / Skills */}
                  {displayCapabilities && (
                    <div className="flex items-start gap-1.5">
                      <Sparkles className="h-3 w-3 text-muted-foreground/60 mt-0.5 shrink-0" />
                      <span className="text-[10px] text-muted-foreground/80 leading-tight line-clamp-2">
                        {displayCapabilities}
                      </span>
                    </div>
                  )}

                  {/* Tools used */}
                  {displayTools.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <Wrench className="h-3 w-3 text-muted-foreground/60 mt-0.5 shrink-0" />
                      <span className="text-[10px] text-muted-foreground font-mono leading-tight truncate">
                        {displayTools.slice(0, 3).join(", ")}
                        {displayTools.length > 3 && ` +${displayTools.length - 3}`}
                      </span>
                    </div>
                  )}

                  {/* Memory indicator (adapters that support persistent memory) */}
                  <div className="flex items-start gap-1.5">
                    <Brain className="h-3 w-3 text-muted-foreground/60 mt-0.5 shrink-0" />
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      Memory:{" "}
                      <span className="font-medium">
                        {hasMemorySupport(displayAdapter)
                          ? "Enabled"
                          : "Basic"}
                      </span>
                    </span>
                  </div>

                  {/* Todo / Task status */}
                  <div className="flex items-start gap-1.5">
                    <ListTodo className="h-3 w-3 text-muted-foreground/60 mt-0.5 shrink-0" />
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      Status:{" "}
                      <span
                        className="font-medium"
                        style={{
                          color:
                            node.status === "active" || node.status === "running"
                              ? "#4ade80"
                              : node.status === "idle"
                                ? "#facc15"
                                : node.status === "error"
                                  ? "#f87171"
                                  : undefined,
                        }}
                      >
                        {statusLabel(node.status)}
                      </span>
                    </span>
                  </div>

                  {managerName && (
                    <div className="flex items-start gap-1.5">
                      <Network className="h-3 w-3 text-muted-foreground/60 mt-0.5 shrink-0" />
                      <span className="text-[10px] text-muted-foreground leading-tight truncate">
                        Reports to {managerName}
                      </span>
                    </div>
                  )}

                  {/* Adapter pill */}
                  {displayAdapter && (
                    <div className="flex items-center gap-1.5">
                      <Cpu className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: rc.fill,
                          color: rc.stroke,
                        }}
                      >
                        {adapterLabels[displayAdapter] ?? displayAdapter}
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

// ── Helpers ─────────────────────────────────────────────────────────────

const roleLabels: Record<string, string> = AGENT_ROLE_LABELS;

function roleLabel(role: string): string {
  return roleLabels[role] ?? role;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "Working",
    running: "Running",
    idle: "Awaiting tasks",
    paused: "Paused",
    error: "Error",
    terminated: "Terminated",
    pending_approval: "Pending",
  };
  return map[status] ?? status;
}

/** Adapters that support persistent scratch-pad / long-term memory. */
function hasMemorySupport(adapterType: string | null | undefined): boolean {
  if (!adapterType) return false;
  const withMemory = new Set([
    "claude_local",
    "gemini_local",
    "opencode_local",
    "cursor",
    "openrouter_remote",
  ]);
  return withMemory.has(adapterType);
}
