import { and, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { activityLog, heartbeatRuns, issues } from "@paperclipai/db";

export interface ActivityFilters {
  companyId: string;
  agentId?: string;
  entityType?: string;
  entityId?: string;
}

export function activityService(db: Db) {
  const issueIdAsText = sql<string>`${issues.id}::text`;
  return {
    list: (filters: ActivityFilters) => {
      const conditions = [eq(activityLog.companyId, filters.companyId)];

      if (filters.agentId) {
        conditions.push(eq(activityLog.agentId, filters.agentId));
      }
      if (filters.entityType) {
        conditions.push(eq(activityLog.entityType, filters.entityType));
      }
      if (filters.entityId) {
        conditions.push(eq(activityLog.entityId, filters.entityId));
      }

      return db
        .select({ activityLog })
        .from(activityLog)
        .leftJoin(
          issues,
          and(
            eq(activityLog.entityType, sql`'issue'`),
            eq(activityLog.entityId, issueIdAsText),
          ),
        )
        .where(
          and(
            ...conditions,
            or(
              sql`${activityLog.entityType} != 'issue'`,
              isNull(issues.hiddenAt),
            ),
          ),
        )
        .orderBy(desc(activityLog.createdAt))
        .then((rows) => rows.map((r) => r.activityLog));
    },

    forIssue: (issueId: string) =>
      db
        .select()
        .from(activityLog)
        .where(
          and(
            eq(activityLog.entityType, "issue"),
            eq(activityLog.entityId, issueId),
          ),
        )
        .orderBy(desc(activityLog.createdAt)),

    runsForIssue: (companyId: string, issueId: string) =>
      db
        .select({
          runId: heartbeatRuns.id,
          status: heartbeatRuns.status,
          agentId: heartbeatRuns.agentId,
          startedAt: heartbeatRuns.startedAt,
          finishedAt: heartbeatRuns.finishedAt,
          createdAt: heartbeatRuns.createdAt,
          invocationSource: heartbeatRuns.invocationSource,
          usageJson: heartbeatRuns.usageJson,
          resultJson: heartbeatRuns.resultJson,
        })
        .from(heartbeatRuns)
        .where(
          and(
            eq(heartbeatRuns.companyId, companyId),
            or(
              sql`${heartbeatRuns.contextSnapshot} ->> 'issueId' = ${issueId}`,
              sql`exists (
                select 1
                from ${activityLog}
                where ${activityLog.companyId} = ${companyId}
                  and ${activityLog.entityType} = 'issue'
                  and ${activityLog.entityId} = ${issueId}
                  and ${activityLog.runId} = ${heartbeatRuns.id}
              )`,
            ),
          ),
        )
        .orderBy(desc(heartbeatRuns.createdAt)),

    issuesForRun: async (runId: string) => {
      const run = await db
        .select({
          companyId: heartbeatRuns.companyId,
          contextSnapshot: heartbeatRuns.contextSnapshot,
        })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, runId))
        .then((rows) => rows[0] ?? null);
      if (!run) return [];

      const fromActivity = await db
        .selectDistinctOn([issueIdAsText], {
          issueId: issues.id,
          identifier: issues.identifier,
          title: issues.title,
          status: issues.status,
          priority: issues.priority,
        })
        .from(activityLog)
        .innerJoin(issues, eq(activityLog.entityId, issueIdAsText))
        .where(
          and(
            eq(activityLog.companyId, run.companyId),
            eq(activityLog.runId, runId),
            eq(activityLog.entityType, "issue"),
            isNull(issues.hiddenAt),
          ),
        )
        .orderBy(issueIdAsText);

      const context = run.contextSnapshot;
      const contextIssueId =
        context && typeof context === "object" && typeof (context as Record<string, unknown>).issueId === "string"
          ? ((context as Record<string, unknown>).issueId as string)
          : null;
      if (!contextIssueId) return fromActivity;
      if (fromActivity.some((issue) => issue.issueId === contextIssueId)) return fromActivity;

      const fromContext = await db
        .select({
          issueId: issues.id,
          identifier: issues.identifier,
          title: issues.title,
          status: issues.status,
          priority: issues.priority,
        })
        .from(issues)
        .where(
          and(
            eq(issues.companyId, run.companyId),
            eq(issues.id, contextIssueId),
            isNull(issues.hiddenAt),
          ),
        )
        .then((rows) => rows[0] ?? null);

      if (!fromContext) return fromActivity;
      return [fromContext, ...fromActivity];
    },

    create: (data: typeof activityLog.$inferInsert) =>
      db
        .insert(activityLog)
        .values(data)
        .returning()
        .then((rows) => rows[0]),

    toolUsageSummary: async (
      companyId: string,
      opts?: { limitPerAgent?: number; lookbackDays?: number },
    ): Promise<Record<string, string[]>> => {
      const limitPerAgent = Math.max(1, Math.min(10, opts?.limitPerAgent ?? 3));
      const lookbackDays = Math.max(1, Math.min(90, opts?.lookbackDays ?? 14));
      const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

      const rows = await db
        .select({
          agentId: activityLog.agentId,
          tool: activityLog.entityId,
          count: sql<number>`count(*)::int`,
        })
        .from(activityLog)
        .where(
          and(
            eq(activityLog.companyId, companyId),
            eq(activityLog.action, "agent.tool_called"),
            eq(activityLog.entityType, "tool"),
            gte(activityLog.createdAt, since),
            sql`${activityLog.agentId} is not null`,
          ),
        )
        .groupBy(activityLog.agentId, activityLog.entityId);

      const byAgent: Record<string, Array<{ tool: string; count: number }>> = {};
      for (const row of rows) {
        const agentId = row.agentId;
        const tool = String(row.tool ?? "");
        if (!agentId || !tool) continue;
        (byAgent[agentId] ??= []).push({ tool, count: Number(row.count ?? 0) });
      }

      return Object.fromEntries(
        Object.entries(byAgent).map(([agentId, entries]) => [
          agentId,
          entries
            .sort((a, b) => b.count - a.count)
            .slice(0, limitPerAgent)
            .map((e) => e.tool),
        ]),
      );
    },

    toolUsageForAgent: async (companyId: string, agentId: string, opts?: { limit?: number; lookbackDays?: number }) => {
      const limit = Math.max(1, Math.min(50, opts?.limit ?? 25));
      const lookbackDays = Math.max(1, Math.min(90, opts?.lookbackDays ?? 14));
      const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

      const rows = await db
        .select({
          tool: activityLog.entityId,
          count: sql<number>`count(*)::int`,
          lastUsedAt: sql<Date>`max(${activityLog.createdAt})`,
        })
        .from(activityLog)
        .where(
          and(
            eq(activityLog.companyId, companyId),
            eq(activityLog.agentId, agentId),
            eq(activityLog.action, "agent.tool_called"),
            eq(activityLog.entityType, "tool"),
            gte(activityLog.createdAt, since),
          ),
        )
        .groupBy(activityLog.entityId)
        .limit(limit);

      return rows.map((row) => ({
        tool: String(row.tool ?? ""),
        count: Number(row.count ?? 0),
        lastUsedAt: row.lastUsedAt,
      }))
        .filter((row) => row.tool.length > 0)
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          const left = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
          const right = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
          return right - left;
        });
    },
  };
}
