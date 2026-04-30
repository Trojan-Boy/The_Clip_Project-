import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
  AdapterSessionCodec,
} from "@paperclipai/adapter-utils";
import { runAgenticLoop, buildEnrichedContext, type ChatMessage } from "@paperclipai/adapter-utils/server";
import { DEFAULT_OLLAMA_MODEL, DEFAULT_OLLAMA_BASE_URL } from "../index.js";

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  if (value == null) return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && value !== "" ? parsed : fallback;
}

function parseObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function resolveModel(config: Record<string, unknown>): string {
  return (
    asString(config.model, "") ||
    readNonEmptyString(process.env.OLLAMA_MODEL) ||
    DEFAULT_OLLAMA_MODEL
  );
}

function resolveBaseUrl(config: Record<string, unknown>): string {
  const envConfig = parseObject(config.env);
  return (
    asString(config.baseUrl, "") ||
    readNonEmptyString(envConfig.OLLAMA_BASE_URL) ||
    readNonEmptyString(process.env.OLLAMA_BASE_URL) ||
    DEFAULT_OLLAMA_BASE_URL
  );
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, config, context, onLog, onMeta, authToken } = ctx;

  const model = resolveModel(config);
  const baseUrl = resolveBaseUrl(config);
  const rawTimeoutSec = asNumber(config.timeoutSec, 300);
  const timeoutMs = (rawTimeoutSec > 0 ? rawTimeoutSec : 300) * 1000;
  const temperature = config.temperature != null ? asNumber(config.temperature, 0.7) : undefined;
  const numCtx = config.numCtx != null ? asNumber(config.numCtx, 4096) : undefined;

  // Identify workspace / API endpoints
  const cwd = readNonEmptyString(context?.cwd) ?? process.cwd();
  const apiBaseUrl = readNonEmptyString(process.env.PAPERCLIP_API_URL) ?? "http://localhost:3100";

  // Build prompt — enhanced for local models
  const promptTemplate = asString(
    config.promptTemplate,
    "You are agent {{agent.id}} ({{agent.name}}). Continue your Paperclip work.",
  );
  const renderedPrompt = promptTemplate
    .replace(/\{\{agent\.id\}\}/g, agent.id)
    .replace(/\{\{agent\.name\}\}/g, agent.name)
    .replace(/\{\{agent\.companyId\}\}/g, agent.companyId);

  // Strong default system prompt for local models that need more guidance
  const defaultOllamaSystemPrompt = `You are an autonomous AI agent working in a company managed by Paperclip.
Your job is to EXECUTE tasks, not just discuss them. You have tools available and MUST use them.

CRITICAL RULES:
1. Start by checking your assigned tasks with paperclip_list_issues
2. Pick a task and work on it using the available tools
3. When done, update the task status to "done" using paperclip_update_issue
4. If you need to delegate, create subtasks with paperclip_create_issue
5. ALWAYS take action. Never just describe what you would do.
6. Use run_bash_command to execute shell commands
7. Use read_file and write_file for file operations

You are a DOER, not an advisor. Execute tasks step by step.`;

  const systemPrompt = asString(config.systemPrompt, defaultOllamaSystemPrompt);

  // Fetch issue and agent context from Paperclip API
  const enrichedContext = await buildEnrichedContext(
    context as Record<string, unknown> | undefined,
    {
      authToken: authToken ?? "",
      apiBaseUrl,
      agentId: agent.id,
      companyId: agent.companyId,
      cwd,
      onLog,
    },
  );

  // Build initial messages
  const initialMessages: ChatMessage[] = [];
  const fullSystemPrompt = [
    systemPrompt,
    enrichedContext,
  ].filter(Boolean).join("\n\n");
  if (fullSystemPrompt) {
    initialMessages.push({ role: "system", content: fullSystemPrompt });
  }
  initialMessages.push({ role: "user", content: renderedPrompt });

  if (onMeta) {
    await onMeta({
      adapterType: "ollama",
      command: `POST ${baseUrl}/api/chat (Agentic Loop — prompt-based tools)`,
      cwd,
      env: { OLLAMA_MODEL: model, OLLAMA_BASE_URL: baseUrl },
      prompt: renderedPrompt,
      context,
    });
  }

  await onLog("stdout", `[paperclip:ollama] Starting agentic loop with ${model} via Ollama at ${baseUrl} (prompt-based tool mode)...\n`);

  const startTime = Date.now();

  // Ollama callLlm — no native tools sent since we use prompt-based mode
  const callLlm = async (messages: ChatMessage[], tools: unknown[]) => {
    const requestBody: Record<string, unknown> = {
      model,
      messages,
      stream: false,
      // Don't send native tools — we use prompt-based mode for reliability
      ...(temperature !== undefined || numCtx !== undefined
        ? { options: {
            ...(temperature !== undefined ? { temperature } : {}),
            ...(numCtx !== undefined ? { num_ctx: numCtx } : {}),
          } }
        : {}),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json() as Record<string, unknown>;
        const message = parseObject(data.message);

        // Parse usage — Ollama reports eval_count and prompt_eval_count
        const inputTokens = asNumber(data.prompt_eval_count, 0);
        const outputTokens = asNumber(data.eval_count, 0);

        return {
          message: message as unknown as ChatMessage,
          usage: { inputTokens, outputTokens },
          model: readNonEmptyString(data.model as string) ?? model,
          raw: data,
        };
      }

      const errorText = await response.text().catch(() => "");
      let errorMessage = `Ollama API returned ${response.status}: ${errorText.slice(0, 500)}`;

      if (response.status === 404) {
        errorMessage = `Model "${model}" not found. Pull it first with: ollama pull ${model}`;
      }

      throw new Error(errorMessage);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
      }
      throw err;
    }
  };

  try {
    const result = await runAgenticLoop({
      messages: initialMessages,
      callLlm,
      toolCtx: {
        authToken: authToken ?? "",
        apiBaseUrl,
        agentId: agent.id,
        companyId: agent.companyId,
        cwd,
        onLog,
      },
      onLog,
      // Force prompt-based tool mode for Ollama — local models are unreliable
      // with native function calling, but work well with explicit prompt instructions
      forcePromptMode: true,
    });

    const elapsedMs = Date.now() - startTime;
    await onLog(
      "stdout",
      `[paperclip:ollama] Completed in ${(elapsedMs / 1000).toFixed(1)}s after ${result.iterations} iterations — ${result.totalUsage.inputTokens} input / ${result.totalUsage.outputTokens} output tokens\n`,
    );

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      usage: result.totalUsage,
      provider: "ollama",
      model: result.model ?? model,
      billingType: "fixed", // Ollama is local/free
      costUsd: 0,
      resultJson: result.raw,
      summary: result.content.slice(0, 500),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isConnectionRefused = errorMessage.includes("ECONNREFUSED") || errorMessage.includes("fetch failed");
    const hint = isConnectionRefused
      ? `Could not connect to Ollama at ${baseUrl}. Make sure Ollama is running (start it with: ollama serve)`
      : `Ollama execution failed: ${errorMessage}`;

    await onLog("stderr", `[paperclip:ollama] ${hint}\n`);
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: hint,
      errorCode: isConnectionRefused ? "ollama_not_running" : "ollama_loop_failed",
      provider: "ollama",
      model,
    };
  }
}


export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const config = ctx.config;
  const checks: AdapterEnvironmentTestResult["checks"] = [];

  const baseUrl = resolveBaseUrl(config);
  const model = resolveModel(config);

  checks.push({
    code: "ollama_model",
    level: "info",
    message: `Model: ${model}`,
  });

  // Test connectivity
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json() as Record<string, unknown>;
      const modelList = Array.isArray(data.models) ? data.models : [];
      const modelNames = modelList
        .map((m: unknown) => {
          const obj = parseObject(m);
          return readNonEmptyString(obj.name);
        })
        .filter(Boolean);

      checks.push({
        code: "ollama_running",
        level: "info",
        message: `Ollama is running at ${baseUrl} with ${modelNames.length} model(s) available`,
      });

      // Check if selected model is available
      const baseModelName = model.split(":")[0];
      const modelAvailable = modelNames.some(
        (name) => name === model || name?.startsWith(`${baseModelName}:`) || name === `${model}:latest`,
      );
      if (!modelAvailable && modelNames.length > 0) {
        checks.push({
          code: "ollama_model_not_pulled",
          level: "warn",
          message: `Model "${model}" does not appear to be pulled`,
          hint: `Run: ollama pull ${model}`,
          detail: `Available models: ${modelNames.slice(0, 10).join(", ")}`,
        });
      } else if (modelAvailable) {
        checks.push({
          code: "ollama_model_available",
          level: "info",
          message: `Model "${model}" is available`,
        });
      }
    } else {
      checks.push({
        code: "ollama_api_error",
        level: "warn",
        message: `Ollama API returned ${response.status}`,
      });
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const isConnectionRefused = reason.includes("ECONNREFUSED") || reason.includes("fetch failed");
    checks.push({
      code: "ollama_not_reachable",
      level: "error",
      message: isConnectionRefused
        ? `Ollama is not running at ${baseUrl}`
        : `Could not reach Ollama: ${reason}`,
      hint: "Start Ollama with: ollama serve",
    });
  }

  const hasErrors = checks.some((c) => c.level === "error");
  const hasWarnings = checks.some((c) => c.level === "warn");
  const status = hasErrors ? "fail" : hasWarnings ? "warn" : "pass";

  return { adapterType: "ollama", status, checks, testedAt: new Date().toISOString() };
}

export async function listOllamaModels(): Promise<{ id: string; label: string }[]> {
  try {
    const baseUrl = readNonEmptyString(process.env.OLLAMA_BASE_URL) ?? DEFAULT_OLLAMA_BASE_URL;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return [];
    const data = await response.json() as Record<string, unknown>;
    const modelList = Array.isArray(data.models) ? data.models : [];
    return modelList
      .map((m: unknown) => {
        const obj = parseObject(m);
        const name = readNonEmptyString(obj.name);
        if (!name) return null;
        return { id: name, label: name };
      })
      .filter((m): m is { id: string; label: string } => m !== null);
  } catch {
    return [];
  }
}

export const sessionCodec: AdapterSessionCodec = {
  deserialize(raw: unknown) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
    return raw as Record<string, unknown>;
  },
  serialize(params: Record<string, unknown> | null) {
    return params;
  },
};
