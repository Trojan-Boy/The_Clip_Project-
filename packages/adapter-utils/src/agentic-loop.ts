// ---------------------------------------------------------------------------
// Agentic Loop — shared tool-calling loop for API-based adapters
// Supports BOTH native function-calling AND prompt-based fallback
// Enhanced: robust parsing for Ollama/local models that produce
// varied tool-call formats (XML, markdown, plain JSON, etc.)
// ---------------------------------------------------------------------------

import { PAPERCLIP_TOOLS } from "./paperclip-tools.js";
import { executeToolCall, type ToolExecutorContext } from "./tool-executor.js";
import type { PaperclipToolCall, PaperclipToolDefinition } from "./paperclip-tools.js";

const MAX_TOOL_ITERATIONS = 25;

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

export interface AgenticLoopOptions {
  /** Initial messages (system + user prompt) */
  messages: ChatMessage[];
  /** Function that calls the LLM API and returns the raw response */
  callLlm: (messages: ChatMessage[], tools: unknown[]) => Promise<{
    message: ChatMessage;
    usage?: { inputTokens: number; outputTokens: number };
    model?: string;
    raw?: Record<string, unknown>;
  }>;
  /** Tool executor context for calling Paperclip API */
  toolCtx: ToolExecutorContext;
  /** Logging callback */
  onLog: (stream: "stdout" | "stderr", chunk: string) => Promise<void>;
  /**
   * Force prompt-based tool mode from the start (skip native tool calling).
   * Useful for models that claim tool support but produce unreliable results
   * (e.g. most Ollama local models).
   */
  forcePromptMode?: boolean;
}

export interface AgenticLoopResult {
  /** Final text response from the LLM */
  content: string;
  /** All messages exchanged during the loop */
  messages: ChatMessage[];
  /** Aggregated token usage */
  totalUsage: { inputTokens: number; outputTokens: number };
  /** Number of tool-calling iterations performed */
  iterations: number;
  /** Model used */
  model: string | null;
  /** Raw response from last LLM call */
  raw: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Prompt-based tool-calling helpers
// ---------------------------------------------------------------------------

/** Names of the most commonly used tools — used for examples in the prompt */
const EXAMPLE_TOOLS = ["paperclip_list_issues", "paperclip_update_issue", "read_file", "write_file", "run_bash_command"];

/**
 * Build a plain-text description of all tools for injection into the system prompt.
 * Used when the model doesn't support native function calling.
 * Enhanced with clear examples and strict formatting rules for local models.
 */
function buildToolPrompt(tools: PaperclipToolDefinition[]): string {
  const toolDescriptions = tools.map((t) => {
    const f = t.function;
    const params = f.parameters as Record<string, unknown>;
    const props = (params.properties ?? {}) as Record<string, Record<string, unknown>>;
    const required = (params.required ?? []) as string[];

    const paramLines = Object.entries(props).map(([name, schema]) => {
      const req = required.includes(name) ? " (REQUIRED)" : " (optional)";
      const desc = (schema.description as string) ?? "";
      const type = (schema.type as string) ?? "string";
      return `    - ${name} (${type})${req}: ${desc}`;
    });

    return `  ${f.name}: ${f.description}\n    Parameters:\n${paramLines.join("\n")}`;
  });

  return `
# TOOL SYSTEM

You are an AI agent that EXECUTES tasks using tools. You MUST use tools to take actions — never just describe what you would do.

## How to call a tool

Wrap each tool call in <tool_call> tags with valid JSON inside:

<tool_call>
{"name": "tool_name", "arguments": {"param1": "value1"}}
</tool_call>

## Examples

Example 1 — List your assigned tasks:
<tool_call>
{"name": "paperclip_list_issues", "arguments": {"assigneeAgentId": "me", "status": "open"}}
</tool_call>

Example 2 — Mark a task as done:
<tool_call>
{"name": "paperclip_update_issue", "arguments": {"issueId": "ISSUE_ID_HERE", "status": "done", "comment": "Completed the task"}}
</tool_call>

Example 3 — Read a file:
<tool_call>
{"name": "read_file", "arguments": {"path": "README.md"}}
</tool_call>

Example 4 — Run a command:
<tool_call>
{"name": "run_bash_command", "arguments": {"command": "ls -la"}}
</tool_call>

Example 5 — Multiple tools in one response:
<tool_call>
{"name": "paperclip_list_agents", "arguments": {}}
</tool_call>
<tool_call>
{"name": "paperclip_list_issues", "arguments": {"assigneeAgentId": "me"}}
</tool_call>

## CRITICAL RULES — FOLLOW EXACTLY

1. **NEVER describe actions in text. ONLY use <tool_call> tags.**
   - WRONG: "I will list your issues to see what tasks are pending."
   - RIGHT: <tool_call>{"name":"paperclip_list_issues","arguments":{"assigneeAgentId":"me"}}</tool_call>

2. **ALWAYS wrap tool calls in <tool_call>...</tool_call> tags.**
   - The system ONLY parses text inside these tags. Anything outside is ignored for actions.

3. **Use valid JSON with double quotes.** Single quotes or unquoted keys will fail.

4. **You CAN make multiple <tool_call> blocks in one response.**

5. **After tool calls, the system sends back <tool_result>.** Read the result, then make more tool calls if needed.

6. **Keep calling tools until the task is COMPLETE.** Then write your final summary as plain text (no <tool_call> tags).

7. **If a tool fails, try a different approach — don't give up.**

8. **DO NOT explain your reasoning before calling tools.** Just call them immediately.

## Available tools

${toolDescriptions.join("\n\n")}
`.trim();
}

/**
 * Try to parse a JSON string leniently — handles common issues from local models:
 * - Trailing commas
 * - Single quotes instead of double quotes
 * - Unquoted keys
 * - Extra whitespace / newlines
 */
function lenientJsonParse(raw: string): Record<string, unknown> | null {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  cleaned = cleaned.trim();

  // Try strict parse first
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch { /* continue to lenient */ }

  // Fix trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  // Fix single-quoted strings → double-quoted
  cleaned = cleaned.replace(/'/g, '"');

  // Try again
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch { /* continue */ }

  // Try to extract just the JSON object from surrounding text
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]) as Record<string, unknown>;
    } catch { /* give up */ }
  }

  return null;
}

/**
 * Extract tool call name and arguments from a parsed object.
 * Handles multiple formats models might produce:
 * - {name: "x", arguments: {...}}
 * - {name: "x", parameters: {...}}
 * - {tool: "x", args: {...}}
 * - {function: "x", params: {...}}
 */
function extractToolCallFromObject(obj: Record<string, unknown>): { name: string; arguments: Record<string, unknown> } | null {
  const name = String(
    obj.name ?? obj.tool ?? obj.function ?? obj.tool_name ?? obj.function_name ?? "",
  ).trim();
  if (!name) return null;

  const args = (
    obj.arguments ?? obj.parameters ?? obj.args ?? obj.params ?? obj.input ?? {}
  ) as Record<string, unknown>;

  // If args is a string, try to parse it as JSON
  if (typeof args === "string") {
    const parsed = lenientJsonParse(args);
    return { name, arguments: parsed ?? {} };
  }

  return { name, arguments: typeof args === "object" && args !== null ? args : {} };
}

/**
 * Parse tool calls from the model's text response.
 * Handles MANY formats that local/free models produce:
 *
 * 1. <tool_call>{...}</tool_call>  (standard XML)
 * 2. ```tool_call\n{...}\n```       (markdown code block)
 * 3. ```json\n{"name":...}\n```    (JSON code block with tool structure)
 * 4. Bare JSON object with tool structure
 * 5. [tool_call] ... [/tool_call]   (bracket variant)
 * 6. **Tool Call:** {json}          (labeled variant)
 *
 * Returns extracted tool calls and the remaining text content.
 */
function parseTextToolCalls(text: string): {
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  remainingText: string;
} {
  const toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = [];
  let remaining = text;
  let callIndex = 0;

  const addCall = (tc: { name: string; arguments: Record<string, unknown> }) => {
    toolCalls.push({ id: `prompt_call_${callIndex++}`, ...tc });
  };

  // Strategy 1: <tool_call>...</tool_call> XML blocks
  const xmlRegex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/gi;
  let match;
  while ((match = xmlRegex.exec(text)) !== null) {
    const parsed = lenientJsonParse(match[1]);
    if (parsed) {
      const tc = extractToolCallFromObject(parsed);
      if (tc) addCall(tc);
    }
    remaining = remaining.replace(match[0], "").trim();
  }
  if (toolCalls.length > 0) return { toolCalls, remainingText: remaining };

  // Strategy 2: [tool_call]...[/tool_call] bracket blocks
  const bracketRegex = /\[tool_call\]\s*([\s\S]*?)\s*\[\/tool_call\]/gi;
  while ((match = bracketRegex.exec(text)) !== null) {
    const parsed = lenientJsonParse(match[1]);
    if (parsed) {
      const tc = extractToolCallFromObject(parsed);
      if (tc) addCall(tc);
    }
    remaining = remaining.replace(match[0], "").trim();
  }
  if (toolCalls.length > 0) return { toolCalls, remainingText: remaining };

  // Strategy 3: ```tool_call\n{...}\n``` or ```json\n{...}\n``` code blocks
  const codeBlockRegex = /```(?:tool_call|json)?\s*\n([\s\S]*?)\n\s*```/gi;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const parsed = lenientJsonParse(match[1]);
    if (parsed) {
      const tc = extractToolCallFromObject(parsed);
      if (tc) {
        addCall(tc);
        remaining = remaining.replace(match[0], "").trim();
      }
    }
  }
  if (toolCalls.length > 0) return { toolCalls, remainingText: remaining };

  // Strategy 4: Bare JSON objects with tool structure
  // Look for {"name": "some_tool", ...} patterns in the text
  const bareJsonRegex = /\{\s*"(?:name|tool|function)"\s*:\s*"([^"]+)"[\s\S]*?\}/g;
  while ((match = bareJsonRegex.exec(text)) !== null) {
    const parsed = lenientJsonParse(match[0]);
    if (parsed) {
      const tc = extractToolCallFromObject(parsed);
      if (tc) {
        addCall(tc);
        remaining = remaining.replace(match[0], "").trim();
      }
    }
  }

  return { toolCalls, remainingText: remaining };
}

// ---------------------------------------------------------------------------
// Main agentic loop
// ---------------------------------------------------------------------------

/**
 * Run an agentic tool-calling loop with automatic fallback.
 *
 * Mode 1 (native): Send tools in OpenAI function-calling format.
 *   If model returns tool_calls → execute → loop.
 *
 * Mode 2 (prompt-based): If the model ignores native tools on the first call,
 *   inject tool descriptions into the system prompt and parse <tool_call> XML
 *   from the model's text output.
 *
 * The mode is auto-detected — no configuration needed.
 */
export async function runAgenticLoop(options: AgenticLoopOptions): Promise<AgenticLoopResult> {
  const { callLlm, toolCtx, onLog, forcePromptMode } = options;
  const messages = [...options.messages];
  const tools = PAPERCLIP_TOOLS;

  let totalUsage = { inputTokens: 0, outputTokens: 0 };
  let iterations = 0;
  let lastModel: string | null = null;
  let lastRaw: Record<string, unknown> | null = null;
  let finalContent = "";
  let usePromptMode = Boolean(forcePromptMode);

  // If forced into prompt mode, inject tool descriptions immediately
  if (usePromptMode) {
    const toolPrompt = buildToolPrompt(tools);
    const sysIdx = messages.findIndex((m) => m.role === "system");
    if (sysIdx >= 0) {
      messages[sysIdx] = {
        ...messages[sysIdx],
        content: `${toolPrompt}\n\n${messages[sysIdx].content ?? ""}`,
      };
    } else {
      messages.unshift({ role: "system", content: toolPrompt });
    }
    await onLog("stdout", `[paperclip:tools] Using prompt-based tool mode (forced).\n`);
  }

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    // Call the LLM
    const response = await callLlm(
      messages,
      usePromptMode ? [] : tools, // Don't send native tools in prompt mode
    );

    // Accumulate usage
    if (response.usage) {
      totalUsage.inputTokens += response.usage.inputTokens;
      totalUsage.outputTokens += response.usage.outputTokens;
    }
    if (response.model) lastModel = response.model;
    if (response.raw) lastRaw = response.raw;

    const assistantMessage = response.message;

    // --- Native mode: check for tool_calls ---
    const nativeToolCalls = assistantMessage.tool_calls;

    if (!usePromptMode && nativeToolCalls && nativeToolCalls.length > 0) {
      // Native function calling works! Execute tool calls.
      messages.push(assistantMessage);

      await onLog("stdout", `\n[paperclip:tools] Agent requested ${nativeToolCalls.length} tool call(s) via native function calling (iteration ${iterations}/${MAX_TOOL_ITERATIONS}):\n`);

      for (const tc of nativeToolCalls) {
        const funcName = tc.function.name;
        let funcArgs: Record<string, unknown> = {};
        try {
          // Ollama returns arguments as an object; OpenAI returns a JSON string
          if (typeof tc.function.arguments === "object" && tc.function.arguments !== null) {
            funcArgs = tc.function.arguments as unknown as Record<string, unknown>;
          } else if (typeof tc.function.arguments === "string") {
            funcArgs = JSON.parse(tc.function.arguments);
          }
        } catch {
          funcArgs = {};
        }

        await onLog("stdout", `  → ${funcName}(${JSON.stringify(funcArgs).slice(0, 200)})\n`);

        const call: PaperclipToolCall = { name: funcName, arguments: funcArgs };
        const result = await executeToolCall(call, toolCtx);

        const truncatedContent = result.content.length > 4000
          ? result.content.slice(0, 4000) + "\n...(truncated)"
          : result.content;

        await onLog(
          result.isError ? "stderr" : "stdout",
          `  ← ${funcName}: ${result.isError ? "ERROR " : ""}${truncatedContent.slice(0, 200)}${truncatedContent.length > 200 ? "..." : ""}\n`,
        );

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name: funcName,
          content: truncatedContent,
        });
      }

      if (assistantMessage.content) {
        await onLog("stdout", `\n${assistantMessage.content}\n`);
      }
      continue;
    }

    // --- Check if we need to switch to prompt mode ---
    if (!usePromptMode && iterations === 1 && (!nativeToolCalls || nativeToolCalls.length === 0)) {
      // First iteration, model returned plain text with no tool calls.
      // This likely means it doesn't support native function calling.
      // Switch to prompt-based mode and retry.
      usePromptMode = true;
      await onLog("stdout", `[paperclip:tools] Model did not use native function calling. Switching to prompt-based tool mode.\n`);

      // Inject tool descriptions into the system prompt
      const toolPrompt = buildToolPrompt(tools);

      // Find or create the system message and prepend tool instructions
      const sysIdx = messages.findIndex((m) => m.role === "system");
      if (sysIdx >= 0) {
        messages[sysIdx] = {
          ...messages[sysIdx],
          content: `${toolPrompt}\n\n${messages[sysIdx].content ?? ""}`,
        };
      } else {
        messages.unshift({ role: "system", content: toolPrompt });
      }

      // Re-send user message with explicit instruction to use tools
      const lastUserMsg = messages.filter((m) => m.role === "user").pop();
      if (lastUserMsg) {
        messages.push({
          role: "user",
          content: `Please complete the task above by actually calling the tools using <tool_call> blocks. Do not just describe what you would do — use the tools to take real actions.`,
        });
      }

      // Don't count this as a real iteration — retry immediately
      iterations--;
      continue;
    }

    // --- Prompt mode: parse <tool_call> from text ---
    if (usePromptMode) {
      const textContent = assistantMessage.content ?? "";
      const { toolCalls: parsedCalls, remainingText } = parseTextToolCalls(textContent);

      if (parsedCalls.length > 0) {
        // Found tool calls in the text! Execute them.
        messages.push({
          role: "assistant",
          content: textContent,
        });

        await onLog("stdout", `\n[paperclip:tools] Agent requested ${parsedCalls.length} tool call(s) via prompt-based mode (iteration ${iterations}/${MAX_TOOL_ITERATIONS}):\n`);

        const resultParts: string[] = [];

        for (const pc of parsedCalls) {
          await onLog("stdout", `  → ${pc.name}(${JSON.stringify(pc.arguments).slice(0, 200)})\n`);

          const call: PaperclipToolCall = { name: pc.name, arguments: pc.arguments };
          const result = await executeToolCall(call, toolCtx);

          const truncatedContent = result.content.length > 4000
            ? result.content.slice(0, 4000) + "\n...(truncated)"
            : result.content;

          await onLog(
            result.isError ? "stderr" : "stdout",
            `  ← ${pc.name}: ${result.isError ? "ERROR " : ""}${truncatedContent.slice(0, 200)}${truncatedContent.length > 200 ? "..." : ""}\n`,
          );

          resultParts.push(
            `<tool_result name="${pc.name}"${result.isError ? ' error="true"' : ""}>\n${truncatedContent}\n</tool_result>`,
          );
        }

        // Feed tool results back as a user message
        messages.push({
          role: "user",
          content: `Tool results:\n\n${resultParts.join("\n\n")}\n\nContinue working on the task. Use more <tool_call> blocks if needed, or provide your final response as plain text.`,
        });

        continue;
      }

      // No tool calls found in text — we're done
      finalContent = remainingText || textContent;
      messages.push({ role: "assistant", content: textContent });
      break;
    }

    // --- Native mode, no tool calls — we're done ---
    messages.push(assistantMessage);
    finalContent = assistantMessage.content ?? "";
    break;
  }

  if (iterations >= MAX_TOOL_ITERATIONS) {
    await onLog("stderr", `\n[paperclip:tools] Hit max tool iterations (${MAX_TOOL_ITERATIONS}). Stopping.\n`);
    if (!finalContent) {
      finalContent = "(Agent reached maximum tool iteration limit)";
    }
  }

  return {
    content: finalContent,
    messages,
    totalUsage,
    iterations,
    model: lastModel,
    raw: lastRaw,
  };
}
