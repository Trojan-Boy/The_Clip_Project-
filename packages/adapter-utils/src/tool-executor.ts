// ---------------------------------------------------------------------------
// Tool Executor — executes Paperclip tools by calling the local API
// ---------------------------------------------------------------------------

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getBrowserHarness, extractPageText, extractGoogleResults } from "./browser-harness.js";
import type { PaperclipToolCall, PaperclipToolResult } from "./paperclip-tools.js";

const execPromise = promisify(exec);

/**
 * Platform-aware command execution.
 * On Windows, uses PowerShell for better compatibility.
 * On Linux/Mac, uses the default shell (bash/sh).
 */
function execAsync(command: string, options: { cwd: string }) {
  const isWindows = os.platform() === "win32";
  if (isWindows) {
    return execPromise(command, {
      ...options,
      shell: "powershell.exe",
      env: { ...process.env, PAGER: "cat" },
    });
  }
  return execPromise(command, {
    ...options,
    env: { ...process.env, PAGER: "cat" },
  });
}

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

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function tryLogToolUsage(
  ctx: ToolExecutorContext,
  event: { tool: string; ok: boolean; details?: Record<string, unknown> },
): Promise<void> {
  try {
    await apiCall(ctx, "POST", `/companies/${ctx.companyId}/activity`, {
      actorType: "agent",
      actorId: ctx.agentId,
      agentId: ctx.agentId,
      action: "agent.tool_called",
      entityType: "tool",
      entityId: event.tool,
      details: { ok: event.ok, ...(event.details ?? {}) },
    });
  } catch {
    // Best-effort telemetry. Never fail tool execution.
  }
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
        const result = { name: call.name, content, isError: false };
        await tryLogToolUsage(ctx, { tool: call.name, ok: true, details: { path: args.path } });
        return result;
      }

      case "write_file": {
        const target = resolveSafePath(ctx.cwd, args.path as string);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, args.content as string, "utf-8");
        const result = { name: call.name, content: `Successfully wrote to ${args.path}`, isError: false };
        await tryLogToolUsage(ctx, { tool: call.name, ok: true, details: { path: args.path } });
        return result;
      }

      case "list_files": {
        const relDir = (args.path as string) || ".";
        const target = resolveSafePath(ctx.cwd, relDir);
        const entries = await fs.readdir(target, { withFileTypes: true });
        const list = entries.map((e) => `${e.isDirectory() ? "[DIR] " : "- "}${e.name}`).join("\n");
        const result = { name: call.name, content: list || "(empty directory)", isError: false };
        await tryLogToolUsage(ctx, { tool: call.name, ok: true, details: { path: relDir } });
        return result;
      }

      case "run_bash_command": {
        const command = args.command as string;
        try {
          const { stdout, stderr } = await execAsync(command, { cwd: ctx.cwd });
          const output = `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;
          const result = {
            name: call.name,
            content: output.trim() || "(Command executed successfully with no output)",
            isError: false,
          };
          await tryLogToolUsage(ctx, { tool: call.name, ok: true });
          return result;
        } catch (error: any) {
          const stdout = error.stdout || "";
          const stderr = error.stderr || error.message || "";
          const result = {
            name: call.name,
            content: `Command failed with exit code ${error.code}.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
            isError: true,
          };
          await tryLogToolUsage(ctx, { tool: call.name, ok: false });
          return result;
        }
      }

      // ------ API Tools ------

      case "paperclip_get_my_info": {
        const result = await apiCall(ctx, "GET", `/agents/me`);
        const out = { name: call.name, content: formatResult(result.data), isError: !result.ok };
        await tryLogToolUsage(ctx, { tool: call.name, ok: result.ok });
        return out;
      }

      case "paperclip_list_my_tool_usage": {
        const lookbackDaysRaw = typeof args.lookbackDays === "number" ? args.lookbackDays : 14;
        const limitRaw = typeof args.limit === "number" ? args.limit : 25;
        const lookbackDays = Math.max(1, Math.min(90, Math.floor(lookbackDaysRaw)));
        const limit = Math.max(1, Math.min(50, Math.floor(limitRaw)));
        const result = await apiCall(
          ctx,
          "GET",
          `/companies/${ctx.companyId}/tool-usage?agentId=${encodeURIComponent(ctx.agentId)}&lookbackDays=${lookbackDays}&limit=${limit}`,
        );
        const out = { name: call.name, content: formatResult(result.data), isError: !result.ok };
        await tryLogToolUsage(ctx, { tool: call.name, ok: result.ok, details: { lookbackDays, limit } });
        return out;
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
          const out = { name: call.name, content: formatResult(summary), isError: false };
          await tryLogToolUsage(ctx, { tool: call.name, ok: true });
          return out;
        }
        const out = { name: call.name, content: formatResult(result.data), isError: !result.ok };
        await tryLogToolUsage(ctx, { tool: call.name, ok: result.ok });
        return out;
      }

      case "paperclip_hire_agent": {
        const desiredName = typeof args.name === "string" ? args.name.trim() : "";
        const desiredRole = typeof args.role === "string" ? args.role.trim() : "";
        if (desiredName) {
          const existing = await apiCall(ctx, "GET", `/companies/${ctx.companyId}/agents`);
          if (existing.ok && Array.isArray(existing.data)) {
            const normalizedName = desiredName.toLowerCase();
            const normalizedRole = desiredRole.toLowerCase();
            const candidates = (existing.data as Array<Record<string, unknown>>)
              .filter((agent) => (typeof agent.status === "string" ? agent.status : "") !== "terminated")
              .filter((agent) => (typeof agent.name === "string" ? agent.name.trim().toLowerCase() : "") === normalizedName);
            const roleMatch = normalizedRole
              ? candidates.find((agent) =>
                  (typeof agent.role === "string" ? agent.role.trim().toLowerCase() : "") === normalizedRole,
                )
              : null;
            const match = roleMatch ?? candidates[0] ?? null;
            if (match) {
              const out = { name: call.name, content: formatResult(match), isError: false };
              await tryLogToolUsage(ctx, { tool: call.name, ok: true, details: { reused: true } });
              return out;
            }
          }
        }

        const payload: Record<string, unknown> = {
          name: args.name,
          role: args.role,
          title: args.title,
          capabilities: args.capabilities,
          adapterType: args.adapterType ?? "openrouter",
          adapterConfig: args.adapterConfig ?? { model: "google/gemini-2.5-flash", timeoutSec: 300 },
          runtimeConfig: { heartbeat: { enabled: true, intervalSec: 300, wakeOnDemand: true } },
        };
        if (args.icon) payload.icon = args.icon;
        if (args.reportsTo) payload.reportsTo = args.reportsTo;
        if (args.desiredSkills) payload.desiredSkills = args.desiredSkills;
        if (args.sourceIssueId) payload.sourceIssueId = args.sourceIssueId;

        const result = await apiCall(ctx, "POST", `/companies/${ctx.companyId}/agent-hires`, payload);
        const out = { name: call.name, content: formatResult(result.data), isError: !result.ok };
        await tryLogToolUsage(ctx, { tool: call.name, ok: result.ok, details: { reused: false } });
        return out;
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
        const out = { name: call.name, content: formatResult(result.data), isError: !result.ok };
        await tryLogToolUsage(ctx, { tool: call.name, ok: result.ok });
        return out;
      }

      case "paperclip_comment_on_issue": {
        const issueId = args.issueId as string;
        const result = await apiCall(ctx, "POST", `/issues/${issueId}/comments`, {
          body: args.body,
        });
        const out = { name: call.name, content: formatResult(result.data), isError: !result.ok };
        await tryLogToolUsage(ctx, { tool: call.name, ok: result.ok });
        return out;
      }

      case "paperclip_request_clarification": {
        const issueId = asNonEmptyString(args.issueId);
        const questions = Array.isArray(args.questions)
          ? args.questions
              .map((question) => asNonEmptyString(question))
              .filter((question): question is string => Boolean(question))
          : [];
        if (!issueId) {
          return { name: call.name, content: "issueId is required", isError: true };
        }
        if (questions.length === 0) {
          return { name: call.name, content: "At least one clarification question is required", isError: true };
        }

        const blocking = args.blocking !== false;
        const assumptions = asNonEmptyString(args.assumptions);
        const body = [
          "Clarification needed:",
          "",
          ...questions.map((question, index) => `${index + 1}. ${question}`),
          ...(assumptions ? ["", `Assumptions if unanswered: ${assumptions}`] : []),
        ].join("\n");
        const commentResult = await apiCall(ctx, "POST", `/issues/${issueId}/comments`, { body });
        if (!commentResult.ok) {
          const out = { name: call.name, content: formatResult(commentResult.data), isError: true };
          await tryLogToolUsage(ctx, { tool: call.name, ok: false });
          return out;
        }

        let blockResult: { ok: boolean; status: number; data: unknown } | null = null;
        if (blocking) {
          blockResult = await apiCall(ctx, "PATCH", `/issues/${issueId}`, {
            status: "blocked",
            comment: "Blocked pending clarification.",
          });
        }

        const ok = !blockResult || blockResult.ok;
        const out = {
          name: call.name,
          content: formatResult({
            comment: commentResult.data,
            blocked: blocking,
            blockUpdate: blockResult?.data ?? null,
          }),
          isError: !ok,
        };
        await tryLogToolUsage(ctx, { tool: call.name, ok, details: { blocking } });
        return out;
      }

      case "paperclip_list_issues": {
        let path = `/companies/${ctx.companyId}/issues`;
        const params: string[] = [];
        if (args.assigneeAgentId) {
          const assigneeId = args.assigneeAgentId === "me" ? ctx.agentId : args.assigneeAgentId;
          params.push(`assigneeAgentId=${encodeURIComponent(assigneeId as string)}`);
        }
        if (args.status) {
          const requestedStatus = args.status as string;
          const normalizedStatus =
            requestedStatus === "open"
              ? "todo,in_progress,in_review,blocked"
              : requestedStatus;
          params.push(`status=${encodeURIComponent(normalizedStatus)}`);
        }
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
          const out = { name: call.name, content: formatResult(summary), isError: false };
          await tryLogToolUsage(ctx, { tool: call.name, ok: true });
          return out;
        }
        const out = { name: call.name, content: formatResult(result.data), isError: !result.ok };
        await tryLogToolUsage(ctx, { tool: call.name, ok: result.ok });
        return out;
      }

      case "paperclip_update_issue": {
        const issueId = args.issueId as string;
        const patch: Record<string, unknown> = {};
        if (args.status) patch.status = args.status;
        if (args.title) patch.title = args.title;
        if (args.assigneeAgentId) patch.assigneeAgentId = args.assigneeAgentId;
        if (args.priority) patch.priority = args.priority;
        if (args.comment) patch.comment = args.comment;

        const result = await apiCall(ctx, "PATCH", `/issues/${issueId}`, patch);
        const out = { name: call.name, content: formatResult(result.data), isError: !result.ok };
        await tryLogToolUsage(ctx, { tool: call.name, ok: result.ok });
        return out;
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
        const out = { name: call.name, content: truncated, isError: !response.ok };
        await tryLogToolUsage(ctx, { tool: call.name, ok: response.ok });
        return out;
      }

      case "paperclip_get_agent_icons": {
        const url = `${ctx.apiBaseUrl}/llms/agent-icons.txt`;
        const response = await fetch(url, {
          headers: { "Authorization": `Bearer ${ctx.authToken}` },
        });
        const text = await response.text();
        const truncated = text.length > 1500 ? text.slice(0, 1500) + "\n...(truncated)" : text;
        const out = { name: call.name, content: truncated, isError: !response.ok };
        await tryLogToolUsage(ctx, { tool: call.name, ok: response.ok });
        return out;
      }

      // ------ Browser Tools ------

      case "browser_navigate": {
        const url = args.url as string;
        if (!url.startsWith("http")) {
          return { name: call.name, content: "URL must start with http or https", isError: true };
        }
        const harness = getBrowserHarness();
        const managed = await harness.getPage();
        try {
          await managed.page.goto(url, { waitUntil: "networkidle2" });
          const title = await managed.page.title();
          const text = await extractPageText(managed.page);
          const out = { name: call.name, content: `Navigated to ${title}\n\nContent:\n${text}`, isError: false };
          await tryLogToolUsage(ctx, { tool: call.name, ok: true, details: { url } });
          return out;
        } finally {
          harness.releasePage(managed);
        }
      }

      case "browser_screenshot": {
        const fullPage = args.fullPage as boolean | undefined;
        const harness = getBrowserHarness();
        if (!harness.isRunning || harness.activePageCount === 0) {
          return { name: call.name, content: "Browser is not running. Navigate to a page first.", isError: true };
        }
        const managed = await harness.getPage();
        try {
          const buffer = await managed.page.screenshot({ fullPage: fullPage ?? false, encoding: "base64" });
          const out = { name: call.name, content: `data:image/png;base64,${buffer}`, isError: false };
          await tryLogToolUsage(ctx, { tool: call.name, ok: true });
          return out;
        } finally {
          harness.releasePage(managed);
        }
      }

      case "browser_search": {
        const query = args.query as string;
        const numResults = (args.numResults as number) ?? 5;
        const harness = getBrowserHarness();
        const managed = await harness.getPage();
        try {
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
          await managed.page.goto(searchUrl, { waitUntil: "networkidle2" });
          
          // Handle cookie consent if present
          try {
            await managed.page.click('button:has-text("Accept all"), button:has-text("I agree")');
            await managed.page.waitForNavigation({ waitUntil: "networkidle2", timeout: 5000 });
          } catch {
            // Ignore if no consent modal
          }

          const results = await extractGoogleResults(managed.page, numResults);
          
          if (results.length === 0) {
            return { name: call.name, content: `No results found for "${query}"`, isError: false };
          }
          
          const formatted = results
            .map((r, i) => `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.snippet}`)
            .join("\n\n");

          const out = { name: call.name, content: `Found ${results.length} results for "${query}":\n\n${formatted}`, isError: false };
          await tryLogToolUsage(ctx, { tool: call.name, ok: true, details: { query } });
          return out;
        } finally {
          harness.releasePage(managed);
        }
      }

      case "browser_click": {
        const selector = args.selector as string | undefined;
        const text = args.text as string | undefined;
        
        if (!selector && !text) {
          return { name: call.name, content: "Must provide either 'selector' or 'text'", isError: true };
        }

        const harness = getBrowserHarness();
        if (!harness.isRunning || harness.activePageCount === 0) {
          return { name: call.name, content: "Browser is not running. Navigate to a page first.", isError: true };
        }
        
        const managed = await harness.getPage();
        try {
          if (selector) {
            await managed.page.waitForSelector(selector, { timeout: 5000 });
            await managed.page.click(selector);
          } else if (text) {
            // Find element containing text and click it
            const clicked = await managed.page.evaluate((searchText) => {
              const elements = Array.from(document.querySelectorAll('a, button, input[type="submit"], input[type="button"], [role="button"]'));
              const target = elements.find(el => (el.textContent ?? '').includes(searchText));
              if (target) {
                (target as HTMLElement).click();
                return true;
              }
              return false;
            }, text);
            
            if (!clicked) {
              return { name: call.name, content: `Could not find clickable element containing text: "${text}"`, isError: true };
            }
          }
          
          // Wait a bit for potential navigation or DOM updates
          await new Promise(r => setTimeout(r, 2000));
          const newTitle = await managed.page.title();

          const out = { name: call.name, content: `Successfully clicked. Current page: ${newTitle}`, isError: false };
          await tryLogToolUsage(ctx, { tool: call.name, ok: true });
          return out;
        } catch (e: any) {
          const out = { name: call.name, content: `Failed to click: ${e.message}`, isError: true };
          await tryLogToolUsage(ctx, { tool: call.name, ok: false });
          return out;
        } finally {
          harness.releasePage(managed);
        }
      }

      case "browser_type": {
        const selector = args.selector as string;
        const text = args.text as string;
        const submit = args.submit as boolean | undefined;

        const harness = getBrowserHarness();
        if (!harness.isRunning || harness.activePageCount === 0) {
          return { name: call.name, content: "Browser is not running. Navigate to a page first.", isError: true };
        }
        
        const managed = await harness.getPage();
        try {
          await managed.page.waitForSelector(selector, { timeout: 5000 });
          await managed.page.type(selector, text);
          
          if (submit) {
            await managed.page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 2000));
          }
          
          const out = { name: call.name, content: `Successfully typed text into ${selector}${submit ? " and pressed Enter" : ""}.`, isError: false };
          await tryLogToolUsage(ctx, { tool: call.name, ok: true });
          return out;
        } catch (e: any) {
          const out = { name: call.name, content: `Failed to type: ${e.message}`, isError: true };
          await tryLogToolUsage(ctx, { tool: call.name, ok: false });
          return out;
        } finally {
          harness.releasePage(managed);
        }
      }

      case "browser_extract": {
        const selector = args.selector as string;
        const harness = getBrowserHarness();
        if (!harness.isRunning || harness.activePageCount === 0) {
          return { name: call.name, content: "Browser is not running. Navigate to a page first.", isError: true };
        }
        
        const managed = await harness.getPage();
        try {
          const content = await managed.page.evaluate((sel) => {
            const elements = Array.from(document.querySelectorAll(sel));
            return elements.map(el => (el as HTMLElement).innerText).join('\n\n');
          }, selector);
          
          if (!content) {
            return { name: call.name, content: `No text content found for selector: ${selector}`, isError: false };
          }
          
          const out = { name: call.name, content, isError: false };
          await tryLogToolUsage(ctx, { tool: call.name, ok: true });
          return out;
        } catch (e: any) {
          const out = { name: call.name, content: `Failed to extract: ${e.message}`, isError: true };
          await tryLogToolUsage(ctx, { tool: call.name, ok: false });
          return out;
        } finally {
          harness.releasePage(managed);
        }
      }

      // ------ Market research tools ------

      case "tavily_search": {
        const apiKey = asNonEmptyString(process.env.TAVILY_API_KEY);
        if (!apiKey) {
          const out = {
            name: call.name,
            content:
              "Missing TAVILY_API_KEY. Add it to this agent's adapter environment (as a secret) and re-run.",
            isError: true,
          };
          await tryLogToolUsage(ctx, { tool: call.name, ok: false, details: { missingKey: "TAVILY_API_KEY" } });
          return out;
        }

        const query = asNonEmptyString(args.query) ?? "";
        const maxResultsRaw = typeof args.maxResults === "number" ? args.maxResults : 5;
        const maxResults = Math.max(1, Math.min(10, Math.floor(maxResultsRaw)));
        const searchDepth = args.searchDepth === "advanced" ? "advanced" : "basic";
        const includeAnswer = args.includeAnswer !== false;
        const includeRawContent = args.includeRawContent === true;

        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            max_results: maxResults,
            search_depth: searchDepth,
            include_answer: includeAnswer,
            include_raw_content: includeRawContent,
          }),
        });

        const text = await response.text();
        const out = { name: call.name, content: text, isError: !response.ok };
        await tryLogToolUsage(ctx, { tool: call.name, ok: response.ok, details: { query } });
        return out;
      }

      case "cloud_browser_fetch": {
        const apiKey = asNonEmptyString(process.env.BROWSERLESS_API_KEY);
        if (!apiKey) {
          const out = {
            name: call.name,
            content:
              "Missing BROWSERLESS_API_KEY. Add it to this agent's adapter environment (as a secret) and re-run.",
            isError: true,
          };
          await tryLogToolUsage(ctx, { tool: call.name, ok: false, details: { missingKey: "BROWSERLESS_API_KEY" } });
          return out;
        }

        const url = asNonEmptyString(args.url);
        if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
          const out = { name: call.name, content: "url must start with http:// or https://", isError: true };
          await tryLogToolUsage(ctx, { tool: call.name, ok: false });
          return out;
        }

        const endpoint = asNonEmptyString(args.endpoint) ?? "https://chrome.browserless.io/content";
        const timeoutMsRaw = typeof args.timeoutMs === "number" ? args.timeoutMs : 30000;
        const timeoutMs = Math.max(1000, Math.min(120000, Math.floor(timeoutMsRaw)));

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const fetchUrl = new URL(endpoint);
          fetchUrl.searchParams.set("token", apiKey);
          const response = await fetch(fetchUrl.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
            signal: controller.signal,
          });
          const content = await response.text();
          const truncated = content.length > 20000 ? content.slice(0, 20000) + "\n...(truncated)" : content;
          const out = { name: call.name, content: truncated, isError: !response.ok };
          await tryLogToolUsage(ctx, { tool: call.name, ok: response.ok, details: { url } });
          return out;
        } finally {
          clearTimeout(timer);
        }
      }

      default:
        {
          const out = {
          name: call.name,
          content: `Unknown tool: ${call.name}`,
          isError: true,
          };
          await tryLogToolUsage(ctx, { tool: call.name, ok: false, details: { unknown: true } });
          return out;
        }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const out = {
      name: call.name,
      content: `Tool execution failed: ${message}`,
      isError: true,
    };
    await tryLogToolUsage(ctx, { tool: call.name, ok: false, details: { failed: true } });
    return out;
  }
}
