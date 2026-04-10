// ---------------------------------------------------------------------------
// Tool Executor — executes Paperclip tools by calling the local API
// ---------------------------------------------------------------------------

import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { PaperclipToolCall, PaperclipToolResult } from "./paperclip-tools.js";

const execAsync = promisify(exec);

export interface ToolExecutorContext {
  /** JWT auth token for the agent */
  authToken: string;
  /** Base URL of the Paperclip API, e.g. "http://localhost:3100" */
  apiBaseUrl: string;
  /** The agent's ID */
  agentId: string;
  /** The agent's company ID */
  companyId: string;
  /** The agent's current working directory for file operations */
  cwd: string;
  /** Logging callback */
  onLog: (stream: "stdout" | "stderr", chunk: string) => Promise<void>;
}

async function apiCall(
  ctx: ToolExecutorContext,
  method: string,
  apiPath: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = `${ctx.apiBaseUrl}/api${apiPath}`;
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${ctx.authToken}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { ok: response.ok, status: response.status, data };
}

function formatResult(data: unknown): string {
  if (typeof data === "string") return data;
  return JSON.stringify(data, null, 2);
}

/**
 * Ensures the target path is safe and inside the cwd.
 */
function resolveSafePath(baseDir: string, relPath: string): string {
  const target = path.resolve(baseDir, relPath);
  if (!target.startsWith(path.resolve(baseDir))) {
    throw new Error(`Path ${relPath} is outside the workspace block directory.`);
  }
  return target;
}

/**
 * Execute a single Paperclip tool call and return the result.
 */
export async function executeToolCall(
  call: PaperclipToolCall,
  ctx: ToolExecutorContext,
): Promise<PaperclipToolResult> {
  const args = call.arguments;

  try {
    switch (call.name) {

      // ------ FS & Shell Tools ------

      case "read_file": {
        const target = resolveSafePath(ctx.cwd, args.path as string);
        const content = await fs.readFile(target, "utf-8");
        return { name: call.name, content, isError: false };
      }

      case "write_file": {
        const target = resolveSafePath(ctx.cwd, args.path as string);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, args.content as string, "utf-8");
        return { name: call.name, content: `Successfully wrote to ${args.path}`, isError: false };
      }

      case "list_files": {
        const relDir = (args.path as string) || ".";
        const target = resolveSafePath(ctx.cwd, relDir);
        const entries = await fs.readdir(target, { withFileTypes: true });
        const list = entries.map((e) => `${e.isDirectory() ? "[DIR] " : "- "}${e.name}`).join("\n");
        return { name: call.name, content: list || "(empty directory)", isError: false };
      }

      case "run_bash_command": {
        const command = args.command as string;
        try {
          const { stdout, stderr } = await execAsync(command, { cwd: ctx.cwd });
          const output = `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;
          return { name: call.name, content: output.trim() || "(Command executed successfully with no output)", isError: false };
        } catch (error: any) {
          const stdout = error.stdout || "";
          const stderr = error.stderr || error.message || "";
          return { name: call.name, content: `Command failed with exit code ${error.code}.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`, isError: true };
        }
      }

      // ------ API Tools ------

      case "paperclip_get_my_info": {
        const result = await apiCall(ctx, "GET", `/agents/me`);
        return { name: call.name, content: formatResult(result.data), isError: !result.ok };
      }

      case "paperclip_list_agents": {
        const result = await apiCall(ctx, "GET", `/companies/${ctx.companyId}/agents`);
        if (result.ok && Array.isArray(result.data)) {
          // Summarize for token efficiency
          const summary = (result.data as Array<Record<string, unknown>>).map((a) => ({
            id: a.id,
            name: a.name,
            role: a.role,
            title: a.title,
            status: a.status,
            adapterType: a.adapterType,
          }));
          return { name: call.name, content: formatResult(summary), isError: false };
        }
        return { name: call.name, content: formatResult(result.data), isError: !result.ok };
      }

      case "paperclip_hire_agent": {
        const payload: Record<string, unknown> = {
          name: args.name,
          role: args.role,
          title: args.title,
          capabilities: args.capabilities,
          adapterType: args.adapterType ?? "openrouter",
          adapterConfig: args.adapterConfig ?? { model: "google/gemini-2.5-flash", timeoutSec: 120 },
          runtimeConfig: { heartbeat: { enabled: true, intervalSec: 300, wakeOnDemand: true } },
        };
        if (args.icon) payload.icon = args.icon;
        if (args.reportsTo) payload.reportsTo = args.reportsTo;
        if (args.desiredSkills) payload.desiredSkills = args.desiredSkills;
        if (args.sourceIssueId) payload.sourceIssueId = args.sourceIssueId;

        const result = await apiCall(ctx, "POST", `/companies/${ctx.companyId}/agent-hires`, payload);
        return { name: call.name, content: formatResult(result.data), isError: !result.ok };
      }

      case "paperclip_create_issue": {
        const payload: Record<string, unknown> = {
          title: args.title,
        };
        if (args.body) payload.body = args.body;
        if (args.assigneeAgentId) payload.assigneeAgentId = args.assigneeAgentId;
        if (args.parentId) payload.parentId = args.parentId;
        if (args.priority) payload.priority = args.priority;

        const result = await apiCall(ctx, "POST", `/companies/${ctx.companyId}/issues`, payload);
        return { name: call.name, content: formatResult(result.data), isError: !result.ok };
      }

      case "paperclip_comment_on_issue": {
        const issueId = args.issueId as string;
        const result = await apiCall(ctx, "POST", `/issues/${issueId}/comments`, {
          body: args.body,
        });
        return { name: call.name, content: formatResult(result.data), isError: !result.ok };
      }

      case "paperclip_list_issues": {
        let path = `/companies/${ctx.companyId}/issues`;
        const params: string[] = [];
        if (args.assigneeAgentId) {
          const assigneeId = args.assigneeAgentId === "me" ? ctx.agentId : args.assigneeAgentId;
          params.push(`assigneeAgentId=${encodeURIComponent(assigneeId as string)}`);
        }
        if (args.status) params.push(`status=${encodeURIComponent(args.status as string)}`);
        if (params.length > 0) path += `?${params.join("&")}`;

        const result = await apiCall(ctx, "GET", path);
        if (result.ok && Array.isArray(result.data)) {
          const summary = (result.data as Array<Record<string, unknown>>).map((i) => ({
            id: i.id,
            identifier: i.identifier,
            title: i.title,
            status: i.status,
            priority: i.priority,
            assigneeName: i.assigneeName,
            assigneeAgentId: i.assigneeAgentId,
          }));
          return { name: call.name, content: formatResult(summary), isError: false };
        }
        return { name: call.name, content: formatResult(result.data), isError: !result.ok };
      }

      case "paperclip_update_issue": {
        const issueId = args.issueId as string;
        const patch: Record<string, unknown> = {};
        if (args.status) patch.status = args.status;
        if (args.title) patch.title = args.title;
        if (args.assigneeAgentId) patch.assigneeAgentId = args.assigneeAgentId;
        if (args.priority) patch.priority = args.priority;

        const result = await apiCall(ctx, "PATCH", `/issues/${issueId}`, patch);
        return { name: call.name, content: formatResult(result.data), isError: !result.ok };
      }

      case "paperclip_get_agent_config_docs": {
        const adapterType = (args.adapterType as string) ?? "";
        const path = adapterType
          ? `/agent-configuration/${encodeURIComponent(adapterType)}.txt`
          : `/agent-configuration.txt`;
        // This endpoint is under /llms, not /api
        const url = `${ctx.apiBaseUrl}/llms${path}`;
        const response = await fetch(url, {
          headers: { "Authorization": `Bearer ${ctx.authToken}` },
        });
        const text = await response.text();
        // Truncate to avoid token bloat
        const truncated = text.length > 2000 ? text.slice(0, 2000) + "\n...(truncated)" : text;
        return { name: call.name, content: truncated, isError: !response.ok };
      }

      case "paperclip_get_agent_icons": {
        const url = `${ctx.apiBaseUrl}/llms/agent-icons.txt`;
        const response = await fetch(url, {
          headers: { "Authorization": `Bearer ${ctx.authToken}` },
        });
        const text = await response.text();
        const truncated = text.length > 1500 ? text.slice(0, 1500) + "\n...(truncated)" : text;
        return { name: call.name, content: truncated, isError: !response.ok };
      }

      default:
        return {
          name: call.name,
          content: `Unknown tool: ${call.name}`,
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      name: call.name,
      content: `Tool execution failed: ${message}`,
      isError: true,
    };
  }
}
