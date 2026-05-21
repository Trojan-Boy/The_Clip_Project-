import {
  definePlugin,
  runWorker,
  type PaperclipPlugin,
  type PluginContext,
  type PluginHealthDiagnostics,
  type ToolResult,
  type ToolRunContext,
} from "@paperclipai/plugin-sdk";
import type { Agent, Goal, Issue, IssueComment } from "@paperclipai/shared";
import { DEFAULT_CONFIG, PLUGIN_ID, TOOL_NAMES } from "./constants.js";

type RagConfig = {
  maxIssues?: number;
  maxCommentsPerIssue?: number;
  chunkSize?: number;
  maxResults?: number;
};

type MemoryChunk = {
  id: string;
  sourceType: "issue" | "issue_comment" | "goal" | "agent";
  sourceId: string;
  title: string;
  text: string;
  tokens: string[];
};

type MemoryIndex = {
  companyId: string;
  builtAt: string;
  issueCount: number;
  commentCount: number;
  goalCount: number;
  agentCount: number;
  chunkCount: number;
  chunks: MemoryChunk[];
};

let lastIndexedAt: string | null = null;
let lastChunkCount = 0;

async function getConfig(ctx: PluginContext): Promise<Required<RagConfig>> {
  const raw = (await ctx.config.get()) as RagConfig;
  return {
    maxIssues: raw.maxIssues ?? DEFAULT_CONFIG.maxIssues,
    maxCommentsPerIssue: raw.maxCommentsPerIssue ?? DEFAULT_CONFIG.maxCommentsPerIssue,
    chunkSize: raw.chunkSize ?? DEFAULT_CONFIG.chunkSize,
    maxResults: raw.maxResults ?? DEFAULT_CONFIG.maxResults,
  };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return Array.from(
    new Set(
      normalizeText(value)
        .toLowerCase()
        .split(/[^a-z0-9_]+/)
        .filter((token) => token.length >= 3),
    ),
  );
}

function chunkText(text: string, chunkSize: number): string[] {
  const normalized = normalizeText(text);
  if (normalized.length <= chunkSize) return [normalized];

  const sentences = normalized.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (!sentence) continue;
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length <= chunkSize) {
      current = next;
      continue;
    }
    if (current) chunks.push(current);
    current = sentence;
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [normalized.slice(0, chunkSize)];
}

function buildIssueBaseText(issue: Issue): string {
  return [
    issue.identifier ?? `#${issue.issueNumber ?? "?"}`,
    issue.title,
    issue.description ?? "",
    `status ${issue.status}`,
    `priority ${issue.priority}`,
  ]
    .filter(Boolean)
    .join(". ");
}

function scoreTokens(queryTokens: string[], chunkTokens: string[]): number {
  if (queryTokens.length === 0 || chunkTokens.length === 0) return 0;
  const tokenSet = new Set(chunkTokens);
  let score = 0;
  for (const token of queryTokens) {
    if (tokenSet.has(token)) score += 1;
  }
  return score / Math.sqrt(chunkTokens.length);
}

async function buildMemoryIndex(ctx: PluginContext, companyId: string): Promise<MemoryIndex> {
  const config = await getConfig(ctx);
  const issues = await ctx.issues.list({ companyId, limit: config.maxIssues, offset: 0 });
  const agents = await ctx.agents.list({ companyId, limit: 100, offset: 0 });
  const goals = await ctx.goals.list({ companyId, limit: 100, offset: 0 });

  const sortedIssues = [...issues].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );

  const chunks: MemoryChunk[] = [];
  let indexedCommentCount = 0;

  for (const issue of sortedIssues) {
    const issueText = buildIssueBaseText(issue);
    const issueParts = chunkText(issueText, config.chunkSize);
    issueParts.forEach((part, index) => {
      chunks.push({
        id: `${issue.id}:issue:${index}`,
        sourceType: "issue",
        sourceId: issue.id,
        title: issue.identifier ?? issue.title,
        text: part,
        tokens: tokenize(part),
      });
    });

    const comments = await ctx.issues.listComments(issue.id, companyId);
    const recentComments = [...comments]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, config.maxCommentsPerIssue);

    for (const comment of recentComments) {
      const body = normalizeText(comment.body);
      if (!body) continue;
      indexedCommentCount += 1;
      chunks.push({
        id: `${issue.id}:comment:${comment.id}`,
        sourceType: "issue_comment",
        sourceId: comment.id,
        title: `${issue.identifier ?? issue.title} comment`,
        text: body.slice(0, config.chunkSize),
        tokens: tokenize(body),
      });
    }
  }

  for (const goal of goals) {
    const text = normalizeText([goal.title, goal.description ?? "", `status ${goal.status}`].join(". "));
    if (!text) continue;
    chunks.push({
      id: `goal:${goal.id}`,
      sourceType: "goal",
      sourceId: goal.id,
      title: goal.title,
      text: text.slice(0, config.chunkSize),
      tokens: tokenize(text),
    });
  }

  for (const agent of agents) {
    const text = normalizeText(
      [agent.name, agent.role, agent.title ?? "", agent.capabilities ?? "", agent.status].join(". "),
    );
    if (!text) continue;
    chunks.push({
      id: `agent:${agent.id}`,
      sourceType: "agent",
      sourceId: agent.id,
      title: agent.name,
      text: text.slice(0, config.chunkSize),
      tokens: tokenize(text),
    });
  }

  const index: MemoryIndex = {
    companyId,
    builtAt: new Date().toISOString(),
    issueCount: sortedIssues.length,
    commentCount: indexedCommentCount,
    goalCount: goals.length,
    agentCount: agents.length,
    chunkCount: chunks.length,
    chunks,
  };

  await ctx.state.set({ scopeKind: "company", scopeId: companyId, stateKey: "memory-index" }, index);
  await ctx.metrics.write("memory.index.build", chunks.length, { companyId });
  await ctx.activity.log({
    companyId,
    message: `RAG memory index refreshed with ${chunks.length} chunks`,
    metadata: { plugin: PLUGIN_ID, issueCount: sortedIssues.length, goalCount: goals.length },
  });

  lastIndexedAt = index.builtAt;
  lastChunkCount = chunks.length;
  return index;
}

async function getOrBuildIndex(ctx: PluginContext, companyId: string): Promise<MemoryIndex> {
  const existing = (await ctx.state.get({
    scopeKind: "company",
    scopeId: companyId,
    stateKey: "memory-index",
  })) as MemoryIndex | null;

  if (existing?.chunks?.length) {
    lastIndexedAt = existing.builtAt;
    lastChunkCount = existing.chunkCount;
    return existing;
  }

  return buildMemoryIndex(ctx, companyId);
}

function formatSearchResults(results: Array<{ chunk: MemoryChunk; score: number }>): string {
  if (results.length === 0) {
    return "No memory matches found.";
  }

  return results
    .map(({ chunk, score }, index) => {
      const snippet = chunk.text.length > 220 ? `${chunk.text.slice(0, 220)}...` : chunk.text;
      return `${index + 1}. [${chunk.sourceType}] ${chunk.title} (score ${score.toFixed(2)})\n${snippet}`;
    })
    .join("\n\n");
}

async function handleRefreshIndex(
  ctx: PluginContext,
  params: unknown,
  runCtx: ToolRunContext,
): Promise<ToolResult> {
  const payload = (params ?? {}) as { companyId?: string };
  const companyId = payload.companyId || runCtx.companyId;
  const index = await buildMemoryIndex(ctx, companyId);
  return {
    content: `Memory index refreshed for company ${companyId}. Indexed ${index.chunkCount} chunks across ${index.issueCount} issues.`,
    data: index,
  };
}

async function handleSearchMemory(
  ctx: PluginContext,
  params: unknown,
  runCtx: ToolRunContext,
): Promise<ToolResult> {
  const payload = (params ?? {}) as { query?: string; limit?: number };
  const query = typeof payload.query === "string" ? payload.query.trim() : "";
  if (!query) return { error: "query is required" };

  const config = await getConfig(ctx);
  const limit = Math.max(1, Math.min(payload.limit ?? config.maxResults, 10));
  const index = await getOrBuildIndex(ctx, runCtx.companyId);
  const queryTokens = tokenize(query);

  const matches = index.chunks
    .map((chunk) => ({ chunk, score: scoreTokens(queryTokens, chunk.tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);

  await ctx.metrics.write("memory.search", matches.length, { companyId: runCtx.companyId });

  return {
    content: formatSearchResults(matches),
    data: {
      query,
      builtAt: index.builtAt,
      results: matches,
    },
  };
}

async function buildIssueBrief(
  issue: Issue,
  comments: IssueComment[],
  goals: Goal[],
  agents: Agent[],
): Promise<string> {
  const goal = issue.goalId ? goals.find((entry) => entry.id === issue.goalId) : null;
  const assignee = issue.assigneeAgentId ? agents.find((entry) => entry.id === issue.assigneeAgentId) : null;
  const recentComments = [...comments]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 3)
    .map((comment) => `- ${normalizeText(comment.body).slice(0, 180)}`);

  return [
    `Issue: ${issue.identifier ?? issue.title}`,
    `Title: ${issue.title}`,
    issue.description ? `Description: ${normalizeText(issue.description).slice(0, 400)}` : null,
    `Status: ${issue.status}`,
    `Priority: ${issue.priority}`,
    assignee ? `Assignee: ${assignee.name} (${assignee.role})` : null,
    goal ? `Goal: ${goal.title}` : null,
    recentComments.length > 0 ? `Recent comments:\n${recentComments.join("\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function handleIssueBrief(
  ctx: PluginContext,
  params: unknown,
  runCtx: ToolRunContext,
): Promise<ToolResult> {
  const payload = (params ?? {}) as { issueId?: string };
  const issueId = typeof payload.issueId === "string" ? payload.issueId : "";
  if (!issueId) return { error: "issueId is required" };

  const issue = await ctx.issues.get(issueId, runCtx.companyId);
  if (!issue) return { error: "Issue not found" };

  const [comments, goals, agents] = await Promise.all([
    ctx.issues.listComments(issueId, runCtx.companyId),
    ctx.goals.list({ companyId: runCtx.companyId, limit: 100, offset: 0 }),
    ctx.agents.list({ companyId: runCtx.companyId, limit: 100, offset: 0 }),
  ]);

  const brief = await buildIssueBrief(issue, comments, goals, agents);
  return { content: brief, data: { issueId, commentCount: comments.length } };
}

async function registerDataHandlers(ctx: PluginContext): Promise<void> {
  ctx.data.register("memory-overview", async (params: Record<string, unknown>) => {
    const companyId = typeof params.companyId === "string" ? params.companyId : "";
    if (!companyId) return null;
    return await ctx.state.get({ scopeKind: "company", scopeId: companyId, stateKey: "memory-index" });
  });

  ctx.actions.register("refresh-index", async (params: Record<string, unknown>) => {
    const companyId = typeof params.companyId === "string" ? params.companyId : "";
    if (!companyId) throw new Error("companyId is required");
    return await buildMemoryIndex(ctx, companyId);
  });
}

async function registerTools(ctx: PluginContext): Promise<void> {
  ctx.tools.register(
    TOOL_NAMES.refreshIndex,
    {
      displayName: "Refresh Memory Index",
      description: "Rebuilds company memory from issues, goals, and agent metadata.",
      parametersSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
        },
      },
    },
    (params: unknown, runCtx: ToolRunContext) => handleRefreshIndex(ctx, params, runCtx),
  );

  ctx.tools.register(
    TOOL_NAMES.searchMemory,
    {
      displayName: "Search Company Memory",
      description: "Searches indexed memory for issue, goal, comment, and agent context.",
      parametersSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number" },
        },
        required: ["query"],
      },
    },
    (params: unknown, runCtx: ToolRunContext) => handleSearchMemory(ctx, params, runCtx),
  );

  ctx.tools.register(
    TOOL_NAMES.issueBrief,
    {
      displayName: "Issue Context Brief",
      description: "Returns a compact brief for an issue using its description and recent comments.",
      parametersSchema: {
        type: "object",
        properties: {
          issueId: { type: "string" },
        },
        required: ["issueId"],
      },
    },
    (params: unknown, runCtx: ToolRunContext) => handleIssueBrief(ctx, params, runCtx),
  );
}

const plugin: PaperclipPlugin = definePlugin({
  async setup(ctx: PluginContext) {
    ctx.logger.info("RAG Memory plugin starting");
    await registerTools(ctx);
    await registerDataHandlers(ctx);
    ctx.logger.info("RAG Memory plugin ready");
  },

  async onHealth(): Promise<PluginHealthDiagnostics> {
    return {
      status: "ok",
      message: "RAG memory worker healthy",
      details: {
        lastIndexedAt,
        lastChunkCount,
      },
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
