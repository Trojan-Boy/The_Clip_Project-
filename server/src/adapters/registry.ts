import type { ServerAdapterModule } from "./types.js";
import { getAdapterSessionManagement } from "@paperclipai/adapter-utils";
import {
  execute as claudeExecute,
  listClaudeSkills,
  syncClaudeSkills,
  testEnvironment as claudeTestEnvironment,
  sessionCodec as claudeSessionCodec,
  getQuotaWindows as claudeGetQuotaWindows,
} from "@paperclipai/adapter-claude-local/server";
import { agentConfigurationDoc as claudeAgentConfigurationDoc, models as claudeModels } from "@paperclipai/adapter-claude-local";
import {
  execute as codexExecute,
  listCodexSkills,
  syncCodexSkills,
  testEnvironment as codexTestEnvironment,
  sessionCodec as codexSessionCodec,
  getQuotaWindows as codexGetQuotaWindows,
} from "@paperclipai/adapter-codex-local/server";
import { agentConfigurationDoc as codexAgentConfigurationDoc, models as codexModels } from "@paperclipai/adapter-codex-local";
import {
  execute as cursorExecute,
  listCursorSkills,
  syncCursorSkills,
  testEnvironment as cursorTestEnvironment,
  sessionCodec as cursorSessionCodec,
} from "@paperclipai/adapter-cursor-local/server";
import { agentConfigurationDoc as cursorAgentConfigurationDoc, models as cursorModels } from "@paperclipai/adapter-cursor-local";
import {
  execute as geminiExecute,
  listGeminiSkills,
  syncGeminiSkills,
  testEnvironment as geminiTestEnvironment,
  sessionCodec as geminiSessionCodec,
} from "@paperclipai/adapter-gemini-local/server";
import { agentConfigurationDoc as geminiAgentConfigurationDoc, models as geminiModels } from "@paperclipai/adapter-gemini-local";
import {
  execute as openCodeExecute,
  listOpenCodeSkills,
  syncOpenCodeSkills,
  testEnvironment as openCodeTestEnvironment,
  sessionCodec as openCodeSessionCodec,
  listOpenCodeModels,
} from "@paperclipai/adapter-opencode-local/server";
import {
  agentConfigurationDoc as openCodeAgentConfigurationDoc,
  models as openCodeModels,
} from "@paperclipai/adapter-opencode-local";
import {
  execute as openclawGatewayExecute,
  testEnvironment as openclawGatewayTestEnvironment,
} from "@paperclipai/adapter-openclaw-gateway/server";
import {
  agentConfigurationDoc as openclawGatewayAgentConfigurationDoc,
  models as openclawGatewayModels,
} from "@paperclipai/adapter-openclaw-gateway";
import { listCodexModels } from "./codex-models.js";
import { listCursorModels } from "./cursor-models.js";
import {
  execute as piExecute,
  listPiSkills,
  syncPiSkills,
  testEnvironment as piTestEnvironment,
  sessionCodec as piSessionCodec,
  listPiModels,
} from "@paperclipai/adapter-pi-local/server";
import {
  agentConfigurationDoc as piAgentConfigurationDoc,
} from "@paperclipai/adapter-pi-local";
import {
  execute as baseHermesExecute,
  testEnvironment as hermesTestEnvironment,
  sessionCodec as hermesSessionCodec,
  listSkills as hermesListSkills,
  syncSkills as hermesSyncSkills,
  detectModel as detectModelFromHermes,
} from "hermes-paperclip-adapter/server";
import {
  agentConfigurationDoc as hermesAgentConfigurationDoc,
  models as hermesModels,
} from "hermes-paperclip-adapter";
import { processAdapter } from "./process/index.js";
import { httpAdapter } from "./http/index.js";
import {
  execute as openrouterExecute,
  testEnvironment as openrouterTestEnvironment,
  sessionCodec as openrouterSessionCodec,
} from "@paperclipai/adapter-openrouter/server";
import { agentConfigurationDoc as openrouterAgentConfigurationDoc, models as openrouterModels } from "@paperclipai/adapter-openrouter";
import { listOpenRouterModels } from "./openrouter-models.js";
import {
  execute as ollamaExecute,
  testEnvironment as ollamaTestEnvironment,
  sessionCodec as ollamaSessionCodec,
  listOllamaModels,
} from "@paperclipai/adapter-ollama/server";
import { agentConfigurationDoc as ollamaAgentConfigurationDoc, models as ollamaModels } from "@paperclipai/adapter-ollama";
import {
  execute as codingCliLocalExecute,
  testEnvironment as codingCliLocalTestEnvironment,
} from "@paperclipai/adapter-coding-cli-local/server";
import {
  agentConfigurationDoc as codingCliLocalAgentConfigurationDoc,
  models as codingCliLocalModels,
} from "@paperclipai/adapter-coding-cli-local";

const HERMES_PAPERCLIP_PROMPT_TEMPLATE = `You are "{{agentName}}", an AI agent employee in a Paperclip-managed company.

Paperclip runtime access:
- API base: {{paperclipApiUrl}}
- Your agent ID: {{agentId}}
- Your company ID: {{companyId}}
- Use the PAPERCLIP_API_KEY environment variable for authenticated API calls.
- Never print, paste, or store PAPERCLIP_API_KEY.

Use Hermes terminal/curl for Paperclip API calls. Always include:
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
  -H "X-Paperclip-Run-Id: {{runId}}"

Quick self-check:
  curl -s -H "Authorization: Bearer $PAPERCLIP_API_KEY" -H "X-Paperclip-Run-Id: {{runId}}" "{{paperclipApiUrl}}/agents/me"

{{#taskId}}
## Assigned Task

Issue ID: {{taskId}}
Title: {{taskTitle}}

{{taskBody}}

## Workflow

1. Read the issue and comments if needed:
   curl -s -H "Authorization: Bearer $PAPERCLIP_API_KEY" -H "X-Paperclip-Run-Id: {{runId}}" "{{paperclipApiUrl}}/issues/{{taskId}}"
2. Do the work in the assigned workspace.
3. When done, mark the issue complete:
   curl -s -X PATCH -H "Authorization: Bearer $PAPERCLIP_API_KEY" -H "X-Paperclip-Run-Id: {{runId}}" -H "Content-Type: application/json" -d '{"status":"done"}' "{{paperclipApiUrl}}/issues/{{taskId}}"
4. Post a completion comment:
   curl -s -X POST -H "Authorization: Bearer $PAPERCLIP_API_KEY" -H "X-Paperclip-Run-Id: {{runId}}" -H "Content-Type: application/json" -d '{"body":"DONE: <summary>"}' "{{paperclipApiUrl}}/issues/{{taskId}}/comments"
{{/taskId}}

{{#commentId}}
## Comment Wake

Someone commented on the assigned issue. Read the issue/comments, answer the comment, then continue the work.
{{/commentId}}

{{#noTask}}
## Heartbeat Wake

1. List open issues assigned to you:
   curl -s -H "Authorization: Bearer $PAPERCLIP_API_KEY" -H "X-Paperclip-Run-Id: {{runId}}" "{{paperclipApiUrl}}/companies/{{companyId}}/issues?assigneeAgentId={{agentId}}&status=todo,in_progress,in_review,blocked"
2. If you have assigned work, pick the most important item and work on it.
3. If no assigned work exists, list backlog issues and take one only when it clearly matches your role:
   curl -s -H "Authorization: Bearer $PAPERCLIP_API_KEY" -H "X-Paperclip-Run-Id: {{runId}}" "{{paperclipApiUrl}}/companies/{{companyId}}/issues?status=backlog"
4. If nothing is actionable, briefly report what you checked.
{{/noTask}}`;

const HERMES_BUILT_IN_PROVIDERS = new Set([
  "auto",
  "openrouter",
  "nous",
  "openai-codex",
  "zai",
  "kimi-coding",
  "minimax",
  "minimax-cn",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const hermesExecute: ServerAdapterModule["execute"] = async (ctx) => {
  const adapterConfig = isRecord(ctx.agent.adapterConfig) ? ctx.agent.adapterConfig : {};
  const configuredEnv = isRecord(adapterConfig.env) ? adapterConfig.env : {};
  const env = { ...configuredEnv };

  if (ctx.authToken && typeof env.PAPERCLIP_API_KEY !== "string") {
    env.PAPERCLIP_API_KEY = ctx.authToken;
  }

  const promptTemplate =
    typeof adapterConfig.promptTemplate === "string" && adapterConfig.promptTemplate.trim().length > 0
      ? adapterConfig.promptTemplate
      : HERMES_PAPERCLIP_PROMPT_TEMPLATE;
  const provider = typeof adapterConfig.provider === "string" ? adapterConfig.provider.trim() : "";
  const configuredExtraArgs = Array.isArray(adapterConfig.extraArgs)
    ? adapterConfig.extraArgs.filter((arg): arg is string => typeof arg === "string")
    : [];
  const shouldPassCustomProvider =
    provider.length > 0
    && !HERMES_BUILT_IN_PROVIDERS.has(provider)
    && !configuredExtraArgs.some((arg) => arg === "--provider");

  return baseHermesExecute({
    ...ctx,
    agent: {
      ...ctx.agent,
      adapterConfig: {
        ...adapterConfig,
        env,
        promptTemplate,
        ...(shouldPassCustomProvider
          ? { extraArgs: [...configuredExtraArgs, "--provider", provider] }
          : {}),
      },
    },
  });
};

const claudeLocalAdapter: ServerAdapterModule = {
  type: "claude_local",
  execute: claudeExecute,
  testEnvironment: claudeTestEnvironment,
  listSkills: listClaudeSkills,
  syncSkills: syncClaudeSkills,
  sessionCodec: claudeSessionCodec,
  sessionManagement: getAdapterSessionManagement("claude_local") ?? undefined,
  models: claudeModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: claudeAgentConfigurationDoc,
  getQuotaWindows: claudeGetQuotaWindows,
};

const codexLocalAdapter: ServerAdapterModule = {
  type: "codex_local",
  execute: codexExecute,
  testEnvironment: codexTestEnvironment,
  listSkills: listCodexSkills,
  syncSkills: syncCodexSkills,
  sessionCodec: codexSessionCodec,
  sessionManagement: getAdapterSessionManagement("codex_local") ?? undefined,
  models: codexModels,
  listModels: listCodexModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: codexAgentConfigurationDoc,
  getQuotaWindows: codexGetQuotaWindows,
};

const cursorLocalAdapter: ServerAdapterModule = {
  type: "cursor",
  execute: cursorExecute,
  testEnvironment: cursorTestEnvironment,
  listSkills: listCursorSkills,
  syncSkills: syncCursorSkills,
  sessionCodec: cursorSessionCodec,
  sessionManagement: getAdapterSessionManagement("cursor") ?? undefined,
  models: cursorModels,
  listModels: listCursorModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: cursorAgentConfigurationDoc,
};

const geminiLocalAdapter: ServerAdapterModule = {
  type: "gemini_local",
  execute: geminiExecute,
  testEnvironment: geminiTestEnvironment,
  listSkills: listGeminiSkills,
  syncSkills: syncGeminiSkills,
  sessionCodec: geminiSessionCodec,
  sessionManagement: getAdapterSessionManagement("gemini_local") ?? undefined,
  models: geminiModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: geminiAgentConfigurationDoc,
};

const openclawGatewayAdapter: ServerAdapterModule = {
  type: "openclaw_gateway",
  execute: openclawGatewayExecute,
  testEnvironment: openclawGatewayTestEnvironment,
  models: openclawGatewayModels,
  supportsLocalAgentJwt: false,
  agentConfigurationDoc: openclawGatewayAgentConfigurationDoc,
};

const openCodeLocalAdapter: ServerAdapterModule = {
  type: "opencode_local",
  execute: openCodeExecute,
  testEnvironment: openCodeTestEnvironment,
  listSkills: listOpenCodeSkills,
  syncSkills: syncOpenCodeSkills,
  sessionCodec: openCodeSessionCodec,
  models: openCodeModels,
  sessionManagement: getAdapterSessionManagement("opencode_local") ?? undefined,
  listModels: listOpenCodeModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: openCodeAgentConfigurationDoc,
};

const piLocalAdapter: ServerAdapterModule = {
  type: "pi_local",
  execute: piExecute,
  testEnvironment: piTestEnvironment,
  listSkills: listPiSkills,
  syncSkills: syncPiSkills,
  sessionCodec: piSessionCodec,
  sessionManagement: getAdapterSessionManagement("pi_local") ?? undefined,
  models: [],
  listModels: listPiModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: piAgentConfigurationDoc,
};

const hermesLocalAdapter: ServerAdapterModule = {
  type: "hermes_local",
  execute: hermesExecute,
  testEnvironment: hermesTestEnvironment,
  sessionCodec: hermesSessionCodec,
  listSkills: hermesListSkills,
  syncSkills: hermesSyncSkills,
  models: hermesModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: hermesAgentConfigurationDoc,
  detectModel: () => detectModelFromHermes(),
};

const openrouterAdapter: ServerAdapterModule = {
  type: "openrouter",
  execute: openrouterExecute,
  testEnvironment: openrouterTestEnvironment,
  sessionCodec: openrouterSessionCodec,
  models: openrouterModels,
  listModels: () => listOpenRouterModels(),
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: openrouterAgentConfigurationDoc,
};

const ollamaAdapter: ServerAdapterModule = {
  type: "ollama",
  execute: ollamaExecute,
  testEnvironment: ollamaTestEnvironment,
  sessionCodec: ollamaSessionCodec,
  models: ollamaModels,
  listModels: listOllamaModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: ollamaAgentConfigurationDoc,
};

const codingCliLocalAdapter: ServerAdapterModule = {
  type: "coding_cli_local",
  execute: codingCliLocalExecute,
  testEnvironment: codingCliLocalTestEnvironment,
  models: codingCliLocalModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: codingCliLocalAgentConfigurationDoc,
};

const adaptersByType = new Map<string, ServerAdapterModule>(
  [
    claudeLocalAdapter,
    codexLocalAdapter,
    openCodeLocalAdapter,
    piLocalAdapter,
    cursorLocalAdapter,
    geminiLocalAdapter,
    openclawGatewayAdapter,
    hermesLocalAdapter,
    openrouterAdapter,
    ollamaAdapter,
    codingCliLocalAdapter,
    processAdapter,
    httpAdapter,
  ].map((a) => [a.type, a]),
);

export function getServerAdapter(type: string): ServerAdapterModule {
  const adapter = adaptersByType.get(type);
  if (!adapter) {
    // Fall back to process adapter for unknown types
    return processAdapter;
  }
  return adapter;
}

export async function listAdapterModels(type: string): Promise<{ id: string; label: string }[]> {
  const adapter = adaptersByType.get(type);
  if (!adapter) return [];
  if (adapter.listModels) {
    const discovered = await adapter.listModels();
    if (discovered.length > 0) return discovered;
  }
  return adapter.models ?? [];
}

export function listServerAdapters(): ServerAdapterModule[] {
  return Array.from(adaptersByType.values());
}

export async function detectAdapterModel(
  type: string,
): Promise<{ model: string; provider: string; source: string } | null> {
  const adapter = adaptersByType.get(type);
  if (!adapter?.detectModel) return null;
  const detected = await adapter.detectModel();
  return detected ? { model: detected.model, provider: detected.provider, source: detected.source } : null;
}

export function findServerAdapter(type: string): ServerAdapterModule | null {
  return adaptersByType.get(type) ?? null;
}
