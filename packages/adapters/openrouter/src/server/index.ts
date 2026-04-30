import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
  AdapterSessionCodec,
} from "@paperclipai/adapter-utils";
import { runAgenticLoop, buildEnrichedContext, type ChatMessage } from "@paperclipai/adapter-utils/server";
import { DEFAULT_OPENROUTER_MODEL, DEFAULT_OPENROUTER_BASE_URL } from "../index.js";

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

function resolveApiKey(config: Record<string, unknown>): string | null {
  const envConfig = parseObject(config.env);
  return (
    readNonEmptyString(config.apiKey) ??
    readNonEmptyString(envConfig.OPENROUTER_API_KEY) ??
    readNonEmptyString(process.env.OPENROUTER_API_KEY) ??
    null
  );
}

function resolveModel(config: Record<string, unknown>): string {
  return (
    asString(config.model, "") ||
    readNonEmptyString(process.env.OPENROUTER_MODEL) ||
    DEFAULT_OPENROUTER_MODEL
  );
}

function resolveBaseUrl(config: Record<string, unknown>): string {
  return (
    asString(config.baseUrl, "") ||
    readNonEmptyString(process.env.OPENROUTER_BASE_URL) ||
    DEFAULT_OPENROUTER_BASE_URL
  );
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, config, context, onLog, onMeta, authToken } = ctx;

  const apiKey = resolveApiKey(config);
  if (!apiKey) {
    await onLog("stderr", "[paperclip:openrouter] ERROR: No OpenRouter API key found.\n");
    await onLog("stderr", "[paperclip:openrouter] Set OPENROUTER_API_KEY in environment or in agent adapter config.\n");
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: "Missing OPENROUTER_API_KEY. Set it in .env or agent adapter config.",
      errorCode: "openrouter_missing_api_key",
    };
  }

  const model = resolveModel(config);
  const baseUrl = resolveBaseUrl(config);
  const rawTimeoutSec = asNumber(config.timeoutSec, 120);
  const timeoutMs = (rawTimeoutSec > 0 ? rawTimeoutSec : 120) * 1000;
  const temperature = config.temperature != null ? asNumber(config.temperature, 0.7) : undefined;
  const maxTokens = config.maxTokens != null ? asNumber(config.maxTokens, 4096) : undefined;

  // Identify workspace / API endpoints
  const cwd = readNonEmptyString(context?.cwd) ?? process.cwd();
  const apiBaseUrl = readNonEmptyString(process.env.PAPERCLIP_API_URL) ?? "http://localhost:3100";

  // Build prompt
  const promptTemplate = asString(
    config.promptTemplate,
    "You are agent {{agent.id}} ({{agent.name}}). Continue your Paperclip work.",
  );
  const renderedPrompt = promptTemplate
    .replace(/\{\{agent\.id\}\}/g, agent.id)
    .replace(/\{\{agent\.name\}\}/g, agent.name)
    .replace(/\{\{agent\.companyId\}\}/g, agent.companyId);

  // Strong default system prompt — makes free-tier and all models work better
  const defaultOpenRouterSystemPrompt = `You are an autonomous AI agent working in a company managed by Paperclip.
Your job is to EXECUTE tasks using the tools provided to you — not just discuss them.

WORKFLOW:
1. Check your assigned tasks with paperclip_list_issues (use assigneeAgentId: "me")
2. Read the task details carefully
3. Execute the work using the tools: read_file, write_file, run_bash_command, etc.
4. When done, mark the task as "done" with paperclip_update_issue
5. If you need to delegate, create subtasks with paperclip_create_issue
6. If you need clarification, use paperclip_request_clarification

RULES:
- ALWAYS use tools to take real actions — never just describe what you would do
- If a tool call fails, try a different approach
- Report your progress by commenting on issues`;

  const systemPrompt = asString(config.systemPrompt, defaultOpenRouterSystemPrompt);

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
      adapterType: "openrouter",
      command: `POST ${baseUrl}/chat/completions (Agentic Loop)`,
      cwd,
      env: { OPENROUTER_MODEL: model, OPENROUTER_BASE_URL: baseUrl },
      prompt: renderedPrompt,
      context,
    });
  }

  await onLog("stdout", `[paperclip:openrouter] Starting agentic loop with ${model} via OpenRouter at ${baseUrl}...\n`);

  const startTime = Date.now();

  const callLlm = async (messages: ChatMessage[], tools: unknown[]) => {
    const requestBody = {
      model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
    };

    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [5000, 15000, 30000]; // 5s, 15s, 30s

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://paperclip.ing",
            "X-Title": "Paperclip AI",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json() as Record<string, unknown>;
          const choices = Array.isArray(data.choices) ? data.choices : [];
          const firstChoice = choices[0] as Record<string, unknown> | undefined;
          const message = parseObject(firstChoice?.message);

          const usageObj = parseObject(data.usage);
          const inputTokens = asNumber(usageObj.prompt_tokens, 0);
          const outputTokens = asNumber(usageObj.completion_tokens, 0);

          return {
            message: message as unknown as ChatMessage,
            usage: { inputTokens, outputTokens },
            model: readNonEmptyString(data.model as string) ?? model,
            raw: data,
          };
        }

        if (response.status === 429 && attempt < MAX_RETRIES) {
          const retryDelay = RETRY_DELAYS[attempt] ?? 30000;
          await onLog(
            "stderr",
            `[paperclip:openrouter] Rate limited (429), retrying in ${retryDelay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...\n`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        const lastErrorText = await response.text().catch(() => "");
        throw new Error(`OpenRouter API returned ${response.status}: ${lastErrorText.slice(0, 500)}`);
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === "AbortError") {
          throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
        }
        throw err;
      }
    }
    throw new Error(`OpenRouter API rate limited after ${MAX_RETRIES} retries`);
  };

  try {
    // Free-tier models (with ":free" suffix) are unreliable with native function calling.
    // Force prompt-based tool mode for them to ensure tools actually get called.
    const isFreeModel = model.includes(":free");
    if (isFreeModel) {
      await onLog("stdout", `[paperclip:openrouter] Free-tier model detected (${model}). Using prompt-based tool mode for reliability.\n`);
    }

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
      forcePromptMode: isFreeModel,
    });

    const elapsedMs = Date.now() - startTime;
    await onLog(
      "stdout",
      `[paperclip:openrouter] Completed in ${(elapsedMs / 1000).toFixed(1)}s after ${result.iterations} iterations — ${result.totalUsage.inputTokens} input / ${result.totalUsage.outputTokens} output tokens\n`,
    );

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      usage: result.totalUsage,
      provider: "openrouter",
      model: result.model ?? model,
      billingType: "metered_api",
      resultJson: result.raw,
      summary: result.content.slice(0, 500),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await onLog("stderr", `[paperclip:openrouter] Error: ${errorMessage}\n`);
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: `OpenRouter execution failed: ${errorMessage}`,
      errorCode: "openrouter_loop_failed",
      provider: "openrouter",
      model,
    };
  }
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const config = ctx.config;
  const checks: AdapterEnvironmentTestResult["checks"] = [];

  const apiKey = resolveApiKey(config);
  if (!apiKey) {
    checks.push({
      code: "openrouter_api_key_missing",
      level: "error",
      message: "OPENROUTER_API_KEY is not set",
      hint: "Set OPENROUTER_API_KEY in your environment or in the agent's adapter config env section.",
    });
    return { adapterType: "openrouter", status: "fail", checks, testedAt: new Date().toISOString() };
  }

  checks.push({
    code: "openrouter_api_key_present",
    level: "info",
    message: "OpenRouter API key is configured",
  });

  // Test connectivity
  const baseUrl = resolveBaseUrl(config);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${baseUrl}/models`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      checks.push({
        code: "openrouter_connectivity_ok",
        level: "info",
        message: `Connected to OpenRouter API at ${baseUrl}`,
      });
    } else {
      checks.push({
        code: "openrouter_connectivity_error",
        level: "warn",
        message: `OpenRouter API returned ${response.status}`,
        hint: "Check that your API key is valid.",
      });
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    checks.push({
      code: "openrouter_connectivity_failed",
      level: "warn",
      message: `Could not reach OpenRouter API: ${reason}`,
      hint: "Check your network connection and OPENROUTER_BASE_URL setting.",
    });
  }

  const model = resolveModel(config);
  checks.push({
    code: "openrouter_model",
    level: "info",
    message: `Model: ${model}`,
  });

  const hasErrors = checks.some((c) => c.level === "error");
  const hasWarnings = checks.some((c) => c.level === "warn");
  const status = hasErrors ? "fail" : hasWarnings ? "warn" : "pass";

  return { adapterType: "openrouter", status, checks, testedAt: new Date().toISOString() };
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
