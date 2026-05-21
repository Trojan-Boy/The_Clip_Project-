import {
  definePlugin,
  runWorker,
  type PaperclipPlugin,
  type PluginContext,
  type PluginHealthDiagnostics,
  type ToolResult,
  type ToolRunContext,
} from "@paperclipai/plugin-sdk";
import { DEFAULT_CONFIG, JOB_KEYS, PLUGIN_ID, TOOL_NAMES } from "./constants.js";

type SwarmConfig = {
  claimTtlMinutes?: number;
  maxLeadersPerSweep?: number;
  wakeIdleLeaders?: boolean;
  leaderRoleHints?: string[];
};

type WorkClaim = {
  issueId: string;
  issueTitle: string;
  agentId: string;
  agentName: string;
  note: string | null;
  acquiredAt: string;
  expiresAt: string;
};

type SweepSummary = {
  sweptAt: string;
  wokenAgents: Array<{ companyId: string; agentId: string; agentName: string; issueCount: number }>;
  pendingIssueCount: number;
};

type SwarmOverview = {
  claims: WorkClaim[];
  lastSweep: SweepSummary | null;
};

let lastSweepAt: string | null = null;
let lastWakeCount = 0;

async function getConfig(ctx: PluginContext): Promise<Required<SwarmConfig>> {
  const raw = (await ctx.config.get()) as SwarmConfig;
  return {
    claimTtlMinutes: raw.claimTtlMinutes ?? DEFAULT_CONFIG.claimTtlMinutes,
    maxLeadersPerSweep: raw.maxLeadersPerSweep ?? DEFAULT_CONFIG.maxLeadersPerSweep,
    wakeIdleLeaders: raw.wakeIdleLeaders ?? DEFAULT_CONFIG.wakeIdleLeaders,
    leaderRoleHints: raw.leaderRoleHints ?? [...DEFAULT_CONFIG.leaderRoleHints],
  };
}

async function readOverview(ctx: PluginContext, companyId: string): Promise<SwarmOverview> {
  return ((await ctx.state.get({
    scopeKind: "company",
    scopeId: companyId,
    stateKey: "swarm-overview",
  })) as SwarmOverview | null) ?? { claims: [], lastSweep: null };
}

async function writeOverview(ctx: PluginContext, companyId: string, overview: SwarmOverview): Promise<void> {
  await ctx.state.set({ scopeKind: "company", scopeId: companyId, stateKey: "swarm-overview" }, overview);
}

function pruneExpiredClaims(claims: WorkClaim[]): WorkClaim[] {
  const now = Date.now();
  return claims.filter((claim) => new Date(claim.expiresAt).getTime() > now);
}

function isLeader(
  agent: { id: string; role: string },
  allAgents: Array<{ reportsTo?: string | null; id: string; role: string }>,
  roleHints: string[],
): boolean {
  if (roleHints.includes(agent.role)) return true;
  return allAgents.some((candidate) => candidate.reportsTo === agent.id);
}

async function claimIssue(
  ctx: PluginContext,
  companyId: string,
  runCtx: ToolRunContext,
  issueId: string,
  note: string | null,
): Promise<ToolResult> {
  const [issue, agent, config, overview] = await Promise.all([
    ctx.issues.get(issueId, companyId),
    ctx.agents.get(runCtx.agentId, companyId),
    getConfig(ctx),
    readOverview(ctx, companyId),
  ]);

  if (!issue) return { error: "Issue not found" };
  if (!agent) return { error: "Agent not found" };

  const claims = pruneExpiredClaims(overview.claims);
  const existing = claims.find((claim) => claim.issueId === issueId);
  if (existing && existing.agentId !== runCtx.agentId) {
    return {
      error: `Issue already claimed by ${existing.agentName} until ${new Date(existing.expiresAt).toLocaleString()}`,
    };
  }

  const ttlMs = config.claimTtlMinutes * 60 * 1000;
  const now = new Date();
  const nextClaim: WorkClaim = {
    issueId,
    issueTitle: issue.title,
    agentId: runCtx.agentId,
    agentName: agent.name,
    note,
    acquiredAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  };

  const nextClaims = [...claims.filter((claim) => claim.issueId !== issueId), nextClaim];
  await writeOverview(ctx, companyId, { ...overview, claims: nextClaims });
  await ctx.activity.log({
    companyId,
    message: `${agent.name} claimed work lane for ${issue.identifier ?? issue.title}`,
    entityType: "issue",
    entityId: issue.id,
    metadata: { plugin: PLUGIN_ID, note },
  });
  await ctx.metrics.write("swarm.claim", 1, { companyId });

  return {
    content: `Claimed ${issue.identifier ?? issue.title} until ${new Date(nextClaim.expiresAt).toLocaleString()}.`,
    data: nextClaim,
  };
}

function formatClaims(claims: WorkClaim[]): string {
  if (claims.length === 0) return "No active work-lane claims.";
  return claims
    .map((claim) => `- ${claim.issueTitle} -> ${claim.agentName} (until ${new Date(claim.expiresAt).toLocaleString()})`)
    .join("\n");
}

async function buildParallelPlan(ctx: PluginContext, companyId: string): Promise<string> {
  const [issues, agents, overview] = await Promise.all([
    ctx.issues.list({ companyId, limit: 200, offset: 0 }),
    ctx.agents.list({ companyId, limit: 100, offset: 0 }),
    readOverview(ctx, companyId),
  ]);

  const claims = pruneExpiredClaims(overview.claims);
  const claimedIssueIds = new Set(claims.map((claim) => claim.issueId));
  const pendingIssues = issues.filter((issue) =>
    issue.status !== "done" &&
    issue.status !== "cancelled" &&
    !claimedIssueIds.has(issue.id),
  );

  const leaders = agents.filter((agent) =>
    agent.status !== "terminated" &&
    isLeader(agent, agents, DEFAULT_CONFIG.leaderRoleHints as unknown as string[]),
  );

  const lines = [
    `Pending lanes: ${pendingIssues.length}`,
    `Active claims: ${claims.length}`,
    `Leaders available: ${leaders.map((agent) => agent.name).join(", ") || "none"}`,
    "",
    ...pendingIssues.slice(0, 8).map((issue) =>
      `- ${issue.identifier ?? `#${issue.issueNumber ?? "?"}`} ${issue.title} [${issue.status}/${issue.priority}]`,
    ),
  ];

  return lines.join("\n");
}

async function runLeaderSweep(ctx: PluginContext): Promise<SweepSummary> {
  const config = await getConfig(ctx);
  const companies = await ctx.companies.list({ limit: 100, offset: 0 });
  const wokenAgents: SweepSummary["wokenAgents"] = [];
  let totalPendingIssues = 0;

  for (const company of companies) {
    const [issues, agents, overview] = await Promise.all([
      ctx.issues.list({ companyId: company.id, limit: 200, offset: 0 }),
      ctx.agents.list({ companyId: company.id, limit: 100, offset: 0 }),
      readOverview(ctx, company.id),
    ]);

    const claims = pruneExpiredClaims(overview.claims);
    const claimedIssueIds = new Set(claims.map((claim) => claim.issueId));
    const pendingIssues = issues.filter((issue) =>
      issue.status !== "done" &&
      issue.status !== "cancelled" &&
      !claimedIssueIds.has(issue.id),
    );
    totalPendingIssues += pendingIssues.length;

    if (!config.wakeIdleLeaders || pendingIssues.length === 0) {
      await writeOverview(ctx, company.id, { ...overview, claims });
      continue;
    }

    const idleLeaders = agents.filter((agent) =>
      agent.status === "idle" &&
      isLeader(agent, agents, config.leaderRoleHints),
    );

    for (const leader of idleLeaders.slice(0, config.maxLeadersPerSweep)) {
      await ctx.agents.invoke(leader.id, company.id, {
        reason: "swarm-coordinator leader sweep",
        prompt: [
          "You are being woken by the Swarm Coordinator.",
          "Review pending company work, claim one lane before acting, and avoid lanes already claimed by another agent.",
          "If work can be parallelized, split it into non-overlapping sub-lanes and delegate cleanly.",
          "Report status through your normal Paperclip workflow.",
        ].join(" "),
      });

      wokenAgents.push({
        companyId: company.id,
        agentId: leader.id,
        agentName: leader.name,
        issueCount: pendingIssues.length,
      });
    }

    const nextOverview: SwarmOverview = {
      claims,
      lastSweep: {
        sweptAt: new Date().toISOString(),
        wokenAgents: wokenAgents.filter((entry) => entry.companyId === company.id),
        pendingIssueCount: pendingIssues.length,
      },
    };
    await writeOverview(ctx, company.id, nextOverview);
  }

  const summary: SweepSummary = {
    sweptAt: new Date().toISOString(),
    wokenAgents,
    pendingIssueCount: totalPendingIssues,
  };

  lastSweepAt = summary.sweptAt;
  lastWakeCount = summary.wokenAgents.length;
  return summary;
}

async function registerHandlers(ctx: PluginContext): Promise<void> {
  ctx.jobs.register(JOB_KEYS.leaderSweep, async () => {
    await runLeaderSweep(ctx);
  });

  ctx.data.register("swarm-overview", async (params: Record<string, unknown>) => {
    const companyId = typeof params.companyId === "string" ? params.companyId : "";
    if (!companyId) return null;
    const overview = await readOverview(ctx, companyId);
    overview.claims = pruneExpiredClaims(overview.claims);
    return overview;
  });

  ctx.actions.register("run-leader-sweep", async () => {
    return await runLeaderSweep(ctx);
  });

  ctx.tools.register(
    TOOL_NAMES.claimLane,
    {
      displayName: "Claim Work Lane",
      description: "Claim an issue so parallel workers stay out of each other's lane.",
      parametersSchema: {
        type: "object",
        properties: {
          issueId: { type: "string" },
          note: { type: "string" },
        },
        required: ["issueId"],
      },
    },
    async (params: unknown, runCtx: ToolRunContext): Promise<ToolResult> => {
      const payload = (params ?? {}) as { issueId?: string; note?: string };
      if (!payload.issueId) return { error: "issueId is required" };
      return claimIssue(ctx, runCtx.companyId, runCtx, payload.issueId, payload.note ?? null);
    },
  );

  ctx.tools.register(
    TOOL_NAMES.releaseLane,
    {
      displayName: "Release Work Lane",
      description: "Release a claimed issue so another worker can take it over.",
      parametersSchema: {
        type: "object",
        properties: {
          issueId: { type: "string" },
        },
        required: ["issueId"],
      },
    },
    async (params: unknown, runCtx: ToolRunContext): Promise<ToolResult> => {
      const payload = (params ?? {}) as { issueId?: string };
      if (!payload.issueId) return { error: "issueId is required" };
      const overview = await readOverview(ctx, runCtx.companyId);
      const claims = pruneExpiredClaims(overview.claims);
      const nextClaims = claims.filter((claim) =>
        !(claim.issueId === payload.issueId && claim.agentId === runCtx.agentId),
      );
      await writeOverview(ctx, runCtx.companyId, { ...overview, claims: nextClaims });
      await ctx.metrics.write("swarm.release", 1, { companyId: runCtx.companyId });
      return { content: `Released claim for ${payload.issueId}.`, data: { issueId: payload.issueId } };
    },
  );

  ctx.tools.register(
    TOOL_NAMES.listLanes,
    {
      displayName: "List Work Lanes",
      description: "List current work-lane claims in the company.",
      parametersSchema: {
        type: "object",
        properties: {},
      },
    },
    async (_params: unknown, runCtx: ToolRunContext): Promise<ToolResult> => {
      const overview = await readOverview(ctx, runCtx.companyId);
      const claims = pruneExpiredClaims(overview.claims);
      await writeOverview(ctx, runCtx.companyId, { ...overview, claims });
      return { content: formatClaims(claims), data: { claims } };
    },
  );

  ctx.tools.register(
    TOOL_NAMES.recommendPlan,
    {
      displayName: "Recommend Parallel Plan",
      description: "Recommend how to split pending work into non-overlapping lanes.",
      parametersSchema: {
        type: "object",
        properties: {},
      },
    },
    async (_params: unknown, runCtx: ToolRunContext): Promise<ToolResult> => {
      const plan = await buildParallelPlan(ctx, runCtx.companyId);
      return { content: plan, data: { companyId: runCtx.companyId } };
    },
  );
}

const plugin: PaperclipPlugin = definePlugin({
  async setup(ctx: PluginContext) {
    ctx.logger.info("Swarm Coordinator plugin starting");
    await registerHandlers(ctx);
    ctx.logger.info("Swarm Coordinator plugin ready");
  },

  async onHealth(): Promise<PluginHealthDiagnostics> {
    return {
      status: "ok",
      message: "Swarm coordinator healthy",
      details: {
        lastSweepAt,
        lastWakeCount,
      },
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
