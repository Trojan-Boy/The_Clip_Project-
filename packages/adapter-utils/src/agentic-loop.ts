// ---------------------------------------------------------------------------
// Agentic Loop — shared tool-calling loop for API-based adapters
// ---------------------------------------------------------------------------

import { PAPERCLIP_TOOLS } from "./paperclip-tools.js";
import { executeToolCall, type ToolExecutorContext } from "./tool-executor.js";
import type { PaperclipToolCall } from "./paperclip-tools.js";

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

/**
 * Run an agentic tool-calling loop.
 *
 * 1. Send messages + tool definitions to LLM
 * 2. If response contains tool_calls → execute each → append results → goto 1
 * 3. If response is just text → done
 * 4. Safety cap at MAX_TOOL_ITERATIONS iterations
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

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    // Call the LLM
    const response = await callLlm(messages, tools);

    // Accumulate usage
    if (response.usage) {
      totalUsage.inputTokens += response.usage.inputTokens;
      totalUsage.outputTokens += response.usage.outputTokens;
    }
    if (response.model) lastModel = response.model;
    if (response.raw) lastRaw = response.raw;

    const assistantMessage = response.message;
    messages.push(assistantMessage);

    // Check if there are tool calls
    const toolCalls = assistantMessage.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      // No tool calls — we're done
      finalContent = assistantMessage.content ?? "";
      break;
    }

    // Execute each tool call
    await onLog("stdout", `\n[paperclip:tools] Agent requested ${toolCalls.length} tool call(s) (iteration ${iterations}/${MAX_TOOL_ITERATIONS}):\n`);

    for (const tc of toolCalls) {
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

      // Truncate very long results to avoid context window overflow
      const truncatedContent = result.content.length > 4000
        ? result.content.slice(0, 4000) + "\n...(truncated)"
        : result.content;

      await onLog(
        result.isError ? "stderr" : "stdout",
        `  ← ${funcName}: ${result.isError ? "ERROR " : ""}${truncatedContent.slice(0, 200)}${truncatedContent.length > 200 ? "..." : ""}\n`,
      );

      // Add tool result message
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        name: funcName,
        content: truncatedContent,
      });
    }

    // If the assistant also had text content alongside tool calls, capture it
    if (assistantMessage.content) {
      await onLog("stdout", `\n${assistantMessage.content}\n`);
    }
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
