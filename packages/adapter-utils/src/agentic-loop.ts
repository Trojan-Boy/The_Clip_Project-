// ---------------------------------------------------------------------------
// Agentic Loop — shared tool-calling loop for API-based adapters
// Supports BOTH native function-calling AND prompt-based fallback
// ---------------------------------------------------------------------------

import { PAPERCLIP_TOOLS } from "./paperclip-tools.js";
import { executeToolCall, type ToolExecutorContext } from "./tool-executor.js";
import type { PaperclipToolCall, PaperclipToolDefinition } from "./paperclip-tools.js";

const MAX_TOOL_ITERATIONS = 20;

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

/**
 * Build a plain-text description of all tools for injection into the system prompt.
 * Used when the model doesn't support native function calling.
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
You have access to the following tools. To use a tool, include a <tool_call> block in your response:

<tool_call>
{"name": "tool_name", "arguments": {"param1": "value1", "param2": "value2"}}
</tool_call>

You can make multiple tool calls in a single response. After each response, the system will execute your tool calls and provide results in <tool_result> blocks. Then you can make more tool calls or provide your final answer.

When you are DONE and have no more tools to call, write your final response as plain text WITHOUT any <tool_call> blocks.

IMPORTANT: Always use <tool_call> blocks to take actions. Do NOT just describe what you would do — actually call the tools.

Available tools:
${toolDescriptions.join("\n\n")}
`.trim();
}

/**
 * Parse <tool_call> blocks from the model's text response.
 * Returns extracted tool calls and the remaining text content.
 */
function parseTextToolCalls(text: string): {
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  remainingText: string;
} {
  const toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = [];
  let remaining = text;

  // Match <tool_call>...</tool_call> blocks (including JSON with curly braces)
  const regex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/gi;
  let match;
  let callIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const jsonStr = match[1].trim();
    try {
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      const name = String(parsed.name ?? "");
      const args = (parsed.arguments ?? {}) as Record<string, unknown>;
      if (name) {
        toolCalls.push({
          id: `prompt_call_${callIndex++}`,
          name,
          arguments: args,
        });
      }
    } catch {
      // Malformed JSON — skip this block
    }
    remaining = remaining.replace(match[0], "").trim();
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
  const { callLlm, toolCtx, onLog } = options;
  const messages = [...options.messages];
  const tools = PAPERCLIP_TOOLS;

  let totalUsage = { inputTokens: 0, outputTokens: 0 };
  let iterations = 0;
  let lastModel: string | null = null;
  let lastRaw: Record<string, unknown> | null = null;
  let finalContent = "";
  let usePromptMode = false;

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
          funcArgs = JSON.parse(tc.function.arguments);
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
