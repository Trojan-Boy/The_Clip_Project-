// ---------------------------------------------------------------------------
// Context Enrichment — fetches issue/task details from Paperclip API
// to give API-based adapters full context about what they need to do.
// ---------------------------------------------------------------------------

import type { ToolExecutorContext } from "./tool-executor.js";

interface IssueContext {
  id: string;
  title: string;
  body: string | null;
  status: string;
  priority: string | null;
  key: string | null;
}

/**
 * Fetch the assigned issue details from the Paperclip API and build
 * a rich system prompt that tells the agent exactly what to work on.
 */
export async function fetchIssueContext(
  issueId: string | undefined | null,
  ctx: ToolExecutorContext,
): Promise<string> {
  if (!issueId || !ctx.authToken) return "";

  try {
    const url = `${ctx.apiBaseUrl}/api/companies/${ctx.companyId}/issues/${issueId}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${ctx.authToken}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return "";

    const issue = (await response.json()) as IssueContext;
    const parts = [`\n## Your Current Task\n`];
    if (issue.key) parts.push(`Issue: ${issue.key}`);
    parts.push(`Title: ${issue.title}`);
    if (issue.priority) parts.push(`Priority: ${issue.priority}`);
    parts.push(`Status: ${issue.status}`);
    if (issue.body) parts.push(`\nDescription:\n${issue.body}`);
    parts.push(``);
    parts.push(`Complete this task by using the tools available to you. Take real actions — don't just describe what you would do.`);

    return parts.join("\n");
  } catch {
    return "";
  }
}

/**
 * Fetch basic agent info (name, role, reports-to) and the team roster
 * to give the agent organizational awareness.
 */
export async function fetchAgentContext(
  ctx: ToolExecutorContext,
): Promise<string> {
  if (!ctx.authToken) return "";

  try {
    // Fetch agent's own info
    const meUrl = `${ctx.apiBaseUrl}/api/agents/me?companyId=${ctx.companyId}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(meUrl, {
      headers: {
        "Authorization": `Bearer ${ctx.authToken}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return "";

    const me = (await response.json()) as Record<string, unknown>;

    const parts = [`\n## Your Identity\n`];
    parts.push(`Name: ${me.name ?? "Unknown"}`);
    parts.push(`Role: ${me.title ?? me.role ?? "Agent"}`);
    parts.push(`Agent ID: ${me.id ?? ctx.agentId}`);
    parts.push(`Company ID: ${ctx.companyId}`);
    if (me.systemPrompt) parts.push(`\nYour directives:\n${me.systemPrompt}`);

    return parts.join("\n");
  } catch {
    return "";
  }
}

/**
 * Build a comprehensive context block for the agent prompt, combining
 * identity, task details, and organizational context.
 */
export async function buildEnrichedContext(
  context: Record<string, unknown> | undefined,
  toolCtx: ToolExecutorContext,
): Promise<string> {
  const issueId = (context?.issueId as string) ?? (context?.taskId as string) ?? null;
  const wakeReason = (context?.wakeReason as string) ?? "unknown";

  const parts: string[] = [];

  // Add agent identity
  const agentCtx = await fetchAgentContext(toolCtx);
  if (agentCtx) parts.push(agentCtx);

  // Add task context
  const issueCtx = await fetchIssueContext(issueId, toolCtx);
  if (issueCtx) parts.push(issueCtx);

  // Add wake reason
  if (wakeReason !== "unknown") {
    parts.push(`\nWake reason: ${wakeReason}`);
  }

  return parts.join("\n");
}
