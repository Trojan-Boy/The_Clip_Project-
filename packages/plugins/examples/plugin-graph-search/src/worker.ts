import {
  definePlugin,
  runWorker,
  type PaperclipPlugin,
  type PluginContext,
  type PluginHealthDiagnostics,
  type ToolResult,
  type ToolRunContext,
} from "@paperclipai/plugin-sdk";
import { DEFAULT_CONFIG, PLUGIN_ID, TOOL_NAMES } from "./constants.js";

type GraphConfig = {
  maxIssues?: number;
};

type GraphNode = {
  id: string;
  label: string;
  kind: "issue" | "goal" | "agent";
};

type GraphEdge = {
  from: string;
  to: string;
  relation: string;
};

type CompanyGraph = {
  companyId: string;
  builtAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

let lastGraphBuiltAt: string | null = null;
let lastGraphNodeCount = 0;

async function getConfig(ctx: PluginContext): Promise<Required<GraphConfig>> {
  const raw = (await ctx.config.get()) as GraphConfig;
  return {
    maxIssues: raw.maxIssues ?? DEFAULT_CONFIG.maxIssues,
  };
}

async function buildGraph(ctx: PluginContext, companyId: string): Promise<CompanyGraph> {
  const config = await getConfig(ctx);
  const [issues, goals, agents] = await Promise.all([
    ctx.issues.list({ companyId, limit: config.maxIssues, offset: 0 }),
    ctx.goals.list({ companyId, limit: 100, offset: 0 }),
    ctx.agents.list({ companyId, limit: 100, offset: 0 }),
  ]);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seenNodes = new Set<string>();

  const addNode = (node: GraphNode) => {
    if (seenNodes.has(node.id)) return;
    seenNodes.add(node.id);
    nodes.push(node);
  };

  for (const issue of issues) {
    addNode({
      id: issue.id,
      label: issue.identifier ?? issue.title,
      kind: "issue",
    });

    if (issue.parentId) {
      edges.push({ from: issue.parentId, to: issue.id, relation: "parent_of" });
    }
    if (issue.goalId) {
      edges.push({ from: issue.goalId, to: issue.id, relation: "goal_of" });
    }
    if (issue.assigneeAgentId) {
      edges.push({ from: issue.assigneeAgentId, to: issue.id, relation: "assigned_to" });
    }
  }

  for (const goal of goals) {
    addNode({ id: goal.id, label: goal.title, kind: "goal" });
    if (goal.parentId) {
      edges.push({ from: goal.parentId, to: goal.id, relation: "goal_parent" });
    }
    if (goal.ownerAgentId) {
      edges.push({ from: goal.ownerAgentId, to: goal.id, relation: "owns_goal" });
    }
  }

  for (const agent of agents) {
    addNode({ id: agent.id, label: agent.name, kind: "agent" });
    if (agent.reportsTo) {
      edges.push({ from: agent.reportsTo, to: agent.id, relation: "manages" });
    }
  }

  const graph: CompanyGraph = {
    companyId,
    builtAt: new Date().toISOString(),
    nodes,
    edges,
  };

  await ctx.state.set({ scopeKind: "company", scopeId: companyId, stateKey: "company-graph" }, graph);
  await ctx.metrics.write("graph.build", nodes.length, { companyId });
  await ctx.activity.log({
    companyId,
    message: `Graph search rebuilt company graph with ${nodes.length} nodes and ${edges.length} edges`,
    metadata: { plugin: PLUGIN_ID },
  });

  lastGraphBuiltAt = graph.builtAt;
  lastGraphNodeCount = nodes.length;
  return graph;
}

async function getOrBuildGraph(ctx: PluginContext, companyId: string): Promise<CompanyGraph> {
  const existing = (await ctx.state.get({
    scopeKind: "company",
    scopeId: companyId,
    stateKey: "company-graph",
  })) as CompanyGraph | null;

  if (existing?.nodes?.length) {
    lastGraphBuiltAt = existing.builtAt;
    lastGraphNodeCount = existing.nodes.length;
    return existing;
  }
  return buildGraph(ctx, companyId);
}

function graphAdjacency(graph: CompanyGraph): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  const connect = (from: string, to: string) => {
    const values = adjacency.get(from) ?? [];
    if (!values.includes(to)) values.push(to);
    adjacency.set(from, values);
  };

  for (const edge of graph.edges) {
    connect(edge.from, edge.to);
    connect(edge.to, edge.from);
  }
  return adjacency;
}

function formatNeighborhood(graph: CompanyGraph, nodeId: string, depth: number): string {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const adjacency = graphAdjacency(graph);
  const visited = new Set<string>([nodeId]);
  const queue: Array<{ id: string; level: number }> = [{ id: nodeId, level: 0 }];
  const lines: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const node = nodeById.get(current.id);
    if (!node) continue;

    lines.push(`${"  ".repeat(current.level)}- ${node.kind}: ${node.label}`);
    if (current.level >= depth) continue;

    for (const neighborId of adjacency.get(current.id) ?? []) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      queue.push({ id: neighborId, level: current.level + 1 });
    }
  }

  return lines.join("\n");
}

function shortestPath(graph: CompanyGraph, fromNodeId: string, toNodeId: string): string[] | null {
  if (fromNodeId === toNodeId) return [fromNodeId];

  const adjacency = graphAdjacency(graph);
  const queue: string[] = [fromNodeId];
  const visited = new Set<string>([fromNodeId]);
  const previous = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      previous.set(neighbor, current);
      if (neighbor === toNodeId) {
        const path = [neighbor];
        let cursor = neighbor;
        while (previous.has(cursor)) {
          cursor = previous.get(cursor)!;
          path.push(cursor);
        }
        return path.reverse();
      }
      queue.push(neighbor);
    }
  }

  return null;
}

function escapeMermaidLabel(value: string): string {
  return value.replace(/"/g, "'");
}

function exportMermaid(graph: CompanyGraph, nodeId?: string, depth = 1): string {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  let included = new Set(graph.nodes.map((node) => node.id));

  if (nodeId && nodeById.has(nodeId)) {
    const adjacency = graphAdjacency(graph);
    included = new Set<string>([nodeId]);
    const queue: Array<{ id: string; level: number }> = [{ id: nodeId, level: 0 }];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || current.level >= depth) continue;
      for (const neighbor of adjacency.get(current.id) ?? []) {
        if (included.has(neighbor)) continue;
        included.add(neighbor);
        queue.push({ id: neighbor, level: current.level + 1 });
      }
    }
  }

  const lines = ["flowchart TD"];
  for (const node of graph.nodes) {
    if (!included.has(node.id)) continue;
    lines.push(`  ${node.id.replace(/-/g, "_")}[\"${escapeMermaidLabel(`${node.kind}: ${node.label}`)}\"]`);
  }
  for (const edge of graph.edges) {
    if (!included.has(edge.from) || !included.has(edge.to)) continue;
    lines.push(`  ${edge.from.replace(/-/g, "_")} -->|${edge.relation}| ${edge.to.replace(/-/g, "_")}`);
  }
  return lines.join("\n");
}

async function registerHandlers(ctx: PluginContext): Promise<void> {
  ctx.data.register("graph-overview", async (params: Record<string, unknown>) => {
    const companyId = typeof params.companyId === "string" ? params.companyId : "";
    if (!companyId) return null;
    return await ctx.state.get({ scopeKind: "company", scopeId: companyId, stateKey: "company-graph" });
  });

  ctx.actions.register("refresh-graph", async (params: Record<string, unknown>) => {
    const companyId = typeof params.companyId === "string" ? params.companyId : "";
    if (!companyId) throw new Error("companyId is required");
    return await buildGraph(ctx, companyId);
  });

  ctx.tools.register(
    TOOL_NAMES.refreshGraph,
    {
      displayName: "Refresh Company Graph",
      description: "Rebuilds the company graph from issues, goals, and reporting lines.",
      parametersSchema: {
        type: "object",
        properties: { companyId: { type: "string" } },
      },
    },
    async (params: unknown, runCtx: ToolRunContext): Promise<ToolResult> => {
      const payload = (params ?? {}) as { companyId?: string };
      const graph = await buildGraph(ctx, payload.companyId || runCtx.companyId);
      return {
        content: `Graph rebuilt with ${graph.nodes.length} nodes and ${graph.edges.length} edges.`,
        data: graph,
      };
    },
  );

  ctx.tools.register(
    TOOL_NAMES.neighborhood,
    {
      displayName: "Graph Neighborhood",
      description: "Shows nearby graph nodes around a target node.",
      parametersSchema: {
        type: "object",
        properties: {
          nodeId: { type: "string" },
          depth: { type: "number" },
        },
        required: ["nodeId"],
      },
    },
    async (params: unknown, runCtx: ToolRunContext): Promise<ToolResult> => {
      const payload = (params ?? {}) as { nodeId?: string; depth?: number };
      if (!payload.nodeId) return { error: "nodeId is required" };
      const graph = await getOrBuildGraph(ctx, runCtx.companyId);
      const text = formatNeighborhood(graph, payload.nodeId, Math.max(1, payload.depth ?? 1));
      return { content: text || "No neighborhood found.", data: { nodeId: payload.nodeId } };
    },
  );

  ctx.tools.register(
    TOOL_NAMES.shortestPath,
    {
      displayName: "Graph Shortest Path",
      description: "Finds a short relationship path between two nodes.",
      parametersSchema: {
        type: "object",
        properties: {
          fromNodeId: { type: "string" },
          toNodeId: { type: "string" },
        },
        required: ["fromNodeId", "toNodeId"],
      },
    },
    async (params: unknown, runCtx: ToolRunContext): Promise<ToolResult> => {
      const payload = (params ?? {}) as { fromNodeId?: string; toNodeId?: string };
      if (!payload.fromNodeId || !payload.toNodeId) {
        return { error: "fromNodeId and toNodeId are required" };
      }
      const graph = await getOrBuildGraph(ctx, runCtx.companyId);
      const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
      const path = shortestPath(graph, payload.fromNodeId, payload.toNodeId);
      if (!path) return { content: "No path found.", data: { path: [] } };
      const labels = path.map((nodeId) => nodeById.get(nodeId)?.label ?? nodeId);
      return { content: labels.join(" -> "), data: { path } };
    },
  );

  ctx.tools.register(
    TOOL_NAMES.exportMermaid,
    {
      displayName: "Graph Export Mermaid",
      description: "Exports the company graph as Mermaid flowchart text.",
      parametersSchema: {
        type: "object",
        properties: {
          nodeId: { type: "string" },
          depth: { type: "number" },
        },
      },
    },
    async (params: unknown, runCtx: ToolRunContext): Promise<ToolResult> => {
      const payload = (params ?? {}) as { nodeId?: string; depth?: number };
      const graph = await getOrBuildGraph(ctx, runCtx.companyId);
      const mermaid = exportMermaid(graph, payload.nodeId, Math.max(1, payload.depth ?? 1));
      return { content: mermaid, data: { mermaid } };
    },
  );
}

const plugin: PaperclipPlugin = definePlugin({
  async setup(ctx: PluginContext) {
    ctx.logger.info("Graph Search plugin starting");
    await registerHandlers(ctx);
    ctx.logger.info("Graph Search plugin ready");
  },

  async onHealth(): Promise<PluginHealthDiagnostics> {
    return {
      status: "ok",
      message: "Graph search worker healthy",
      details: {
        lastGraphBuiltAt,
        lastGraphNodeCount,
      },
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
