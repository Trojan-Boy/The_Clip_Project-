import type {
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
  AdapterExecutionContext,
  AdapterExecutionResult,
  AdapterSessionCodec,
} from "@paperclipai/adapter-utils";
import {
  buildEnrichedContext,
  runAgenticLoop,
  type ChatMessage,
} from "@paperclipai/adapter-utils/server";
import {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
} from "../index.js";

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

function resolveDefaultTemperature(model: string, config: Record<string, unknown>): number | undefined {
  if (config.temperature != null) {
    return asNumber(config.temperature, 0.4);
  }

  const normalized = model.toLowerCase();
  if (normalized.includes("gemma")) return 0.2;
  if (normalized.includes("qwen")) return 0.35;
  if (normalized.includes("llama")) return 0.4;
  return 0.4;
}

function resolveSystemPrompt(model: string, config: Record<string, unknown>): string {
  const configured = readNonEmptyString(config.systemPrompt);
  if (configured) return configured;

  const normalized = model.toLowerCase();
  const basePrompt = `You are an autonomous AI agent working inside a Paperclip company.
Your job is to execute work, not just describe ideas.

Operating rules:
1. Start by checking assigned or highest-priority company work.
2. If coordination tools are available, inspect current work lanes before acting.
3. If memory or graph tools are available, use them to pull context before making large changes.
4. Take one concrete action at a time and keep moving until the task is unblocked or complete.
5. Update task status and leave a useful comment when you finish meaningful work.
6. If a task should be split, create or delegate non-overlapping subtasks.
7. Never stop at "I would do X". Actually do X with the available tools.
8. If there are no clear assignments, identify the next highest-priority pending task and work it.

Behavior requirements:
- Prefer action over narration.
- Keep plans short and immediately follow them with execution.
- Avoid sleeping silently when pending work exists.
- When local coordination plugins exist, respect claims and avoid collisions.`;

  if (normalized.includes("gemma")) {
    return `${basePrompt}

Model-specific guidance for Gemma:
- Use very short action loops.
- After every tool result, decide the next step in one sentence and continue.
- Do not write long essays.
- If you are unsure, gather one more concrete fact with a tool instead of stalling.`;
  }

  if (normalized.includes("qwen")) {
    return `${basePrompt}

Model-specific guidance for Qwen:
- Be concise, decisive, and tool-forward.
- Use company memory and task lists before making edits.
- Prefer finishing one lane fully before switching context.`;
  }

  return basePrompt;
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { agent, config, context, onLog, onMeta, authToken } = ctx;

  const model = resolveModel(config);
  const baseUrl = resolveBaseUrl(config);
  const rawTimeoutSec = asNumber(config.timeoutSec, 600);
  const timeoutMs = (rawTimeoutSec > 0 ? rawTimeoutSec : 600) * 1000;
  const temperature = resolveDefaultTemperature(model, config);
  const numCtx = config.numCtx != null ? asNumber(config.numCtx, 4096) : undefined;

  const cwd = readNonEmptyString(context?.cwd) ?? process.cwd();
  const apiBaseUrl = readNonEmptyString(process.env.PAPERCLIP_API_URL) ?? "http://localhost:3100";

  const promptTemplate = asString(
    config.promptTemplate,
    "You are agent {{agent.id}} ({{agent.name}}). Continue your Paperclip work.",
  );
  const renderedPrompt = promptTemplate
    .replace(/\{\{agent\.id\}\}/g, agent.id)
    .replace(/\{\{agent\.name\}\}/g, agent.name)
    .replace(/\{\{agent\.companyId\}\}/g, agent.companyId);

  const systemPrompt = resolveSystemPrompt(model, config);

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

  const initialMessages: ChatMessage[] = [];
  const fullSystemPrompt = [systemPrompt, enrichedContext].filter(Boolean).join("\n\n");
  if (fullSystemPrompt) {
    initialMessages.push({ role: "system", content: fullSystemPrompt });
  }
  initialMessages.push({ role: "user", content: renderedPrompt });

  if (onMeta) {
    await onMeta({
      adapterType: "ollama",
      command: `POST ${baseUrl}/api/chat (Agentic Loop - prompt-guided mode)`,
      cwd,
      env: { OLLAMA_MODEL: model, OLLAMA_BASE_URL: baseUrl },
      prompt: renderedPrompt,
      context,
    });
  }

  await onLog(
    "stdout",
    `[paperclip:ollama] Starting agentic loop with ${model} via Ollama at ${baseUrl} (prompt-guided tool mode)...\n`,
  );

  const startTime = Date.now();

  const callLlm = async (messages: ChatMessage[]) => {
    const requestBody: Record<string, unknown> = {
      model,
      messages,
      stream: false,
      ...(temperature !== undefined || numCtx !== undefined
        ? {
            options: {
              ...(temperature !== undefined ? { temperature } : {}),
              ...(numCtx !== undefined ? { num_ctx: numCtx } : {}),
            },
          }
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

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        if (response.status === 404) {
          throw new Error(`Model "${model}" not found. Pull it first with: ollama pull ${model}`);
        }
        throw new Error(`Ollama API returned ${response.status}: ${errorText.slice(0, 500)}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const message = parseObject(data.message);
      const inputTokens = asNumber(data.prompt_eval_count, 0);
      const outputTokens = asNumber(data.eval_count, 0);

      return {
        message: message as unknown as ChatMessage,
        usage: { inputTokens, outputTokens },
        model: readNonEmptyString(data.model as string) ?? model,
        raw: data,
      };
    } catch (error: unknown) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `Request timed out after ${timeoutMs / 1000}s while waiting for Ollama model "${model}". Increase adapterConfig.timeoutSec or use a smaller/faster local model.`,
        );
      }
      throw error;
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
      forcePromptMode: true,
    });

    const elapsedMs = Date.now() - startTime;
    await onLog(
      "stdout",
      `[paperclip:ollama] Completed in ${(elapsedMs / 1000).toFixed(1)}s after ${result.iterations} iterations - ${result.totalUsage.inputTokens} input / ${result.totalUsage.outputTokens} output tokens\n`,
    );

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      usage: result.totalUsage,
      provider: "ollama",
      model: result.model ?? model,
      billingType: "fixed",
      costUsd: 0,
      resultJson: result.raw,
      summary: result.content.slice(0, 500),
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isConnectionRefused =
      errorMessage.includes("ECONNREFUSED") || errorMessage.includes("fetch failed");
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

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      checks.push({
        code: "ollama_api_error",
        level: "warn",
        message: `Ollama API returned ${response.status}`,
      });
    } else {
      const data = (await response.json()) as Record<string, unknown>;
      const modelList = Array.isArray(data.models) ? data.models : [];
      const modelNames = modelList
        .map((entry: unknown) => {
          const objectEntry = parseObject(entry);
          return readNonEmptyString(objectEntry.name);
        })
        .filter((entry): entry is string => Boolean(entry));

      checks.push({
        code: "ollama_running",
        level: "info",
        message: `Ollama is running at ${baseUrl} with ${modelNames.length} model(s) available`,
      });

      const baseModelName = model.split(":")[0];
      const modelAvailable = modelNames.some(
        (name) => name === model || name.startsWith(`${baseModelName}:`) || name === `${model}:latest`,
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
    }
  } catch (error: unknown) {
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

  const hasErrors = checks.some((check) => check.level === "error");
  const hasWarnings = checks.some((check) => check.level === "warn");
  const status = hasErrors ? "fail" : hasWarnings ? "warn" : "pass";

  return {
    adapterType: "ollama",
    status,
    checks,
    testedAt: new Date().toISOString(),
  };
}

export async function listOllamaModels(): Promise<Array<{ id: string; label: string }>> {
  try {
    const baseUrl = readNonEmptyString(process.env.OLLAMA_BASE_URL) ?? DEFAULT_OLLAMA_BASE_URL;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return [];
    const data = (await response.json()) as Record<string, unknown>;
    const modelList = Array.isArray(data.models) ? data.models : [];

    return modelList
      .map((entry: unknown) => {
        const objectEntry = parseObject(entry);
        const name = readNonEmptyString(objectEntry.name);
        if (!name) return null;
        return { id: name, label: name };
      })
      .filter((entry): entry is { id: string; label: string } => entry !== null);
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
