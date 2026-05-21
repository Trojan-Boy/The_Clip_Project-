import { useMemo } from "react";
import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  DraftInput,
} from "../../components/agent-config-primitives";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

// Models known to support native function/tool calling reliably on OpenRouter
const TOOL_CAPABLE_OPENROUTER_MODELS = new Set([
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-3-flash-preview",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3.7-sonnet",
  "anthropic/claude-3-opus",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "meta-llama/llama-4-maverick",
  "meta-llama/llama-4-scout",
  "deepseek/deepseek-chat",
  "deepseek/deepseek-v3.2",
  "qwen/qwen-2.5-72b-instruct",
  "qwen/qwen-2.5-32b-instruct",
]);

function isModelToolCapable(modelId: string): boolean {
  if (!modelId) return false;
  if (TOOL_CAPABLE_OPENROUTER_MODELS.has(modelId)) return true;
  for (const capable of TOOL_CAPABLE_OPENROUTER_MODELS) {
    if (modelId === capable || modelId.startsWith(capable + ":")) return true;
  }
  return false;
}

export function OpenRouterConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  const currentModel = isCreate
    ? String(values?.model ?? "")
    : eff("adapterConfig", "model", String(config.model ?? ""));
  const modelWarning = useMemo(() => {
    if (!currentModel) return null;
    if (isModelToolCapable(currentModel)) return null;
    if (currentModel.includes(":free")) {
      return `Free model "${currentModel}" uses prompt-based tool mode (slower, less reliable). Use Gemini 2.5 Flash or Claude 3.5 Sonnet for best agent performance.`;
    }
    return `"${currentModel}" is not known to support native tool calling. Agents may only respond with text and cannot execute tasks reliably. Use google/gemini-2.5-flash or anthropic/claude-3.5-sonnet for full capabilities.`;
  }, [currentModel]);

  const apiKeyValue = isCreate
    ? String(values?.apiKey ?? "")
    : eff("adapterConfig", "apiKey", String(config.apiKey ?? ""));
  const baseUrlValue = isCreate
    ? String(values?.baseUrl ?? "")
    : eff("adapterConfig", "baseUrl", String(config.baseUrl ?? ""));
  const systemPromptValue = isCreate
    ? String(values?.systemPrompt ?? "")
    : eff("adapterConfig", "systemPrompt", String(config.systemPrompt ?? ""));
  const updateApiKey = (value: string) =>
    isCreate ? set?.({ apiKey: value }) : mark("adapterConfig", "apiKey", value || undefined);
  const updateBaseUrl = (value: string) =>
    isCreate ? set?.({ baseUrl: value }) : mark("adapterConfig", "baseUrl", value || undefined);
  const updateSystemPrompt = (value: string) =>
    isCreate ? set?.({ systemPrompt: value }) : mark("adapterConfig", "systemPrompt", value || undefined);

  if (isCreate) {
    return (
      <div className="space-y-3">
        <Field label="API Key" hint="Your OpenRouter API key. Can also be set via OPENROUTER_API_KEY on the server.">
          <DraftInput
            value={apiKeyValue}
            onCommit={updateApiKey}
            immediate
            className={inputClass}
            placeholder="sk-or-v1-..."
            type="password"
          />
        </Field>
        <Field label="Base URL" hint="Override the OpenRouter API base URL. Leave blank for https://openrouter.ai/api/v1.">
          <DraftInput
            value={baseUrlValue}
            onCommit={updateBaseUrl}
            immediate
            className={inputClass}
            placeholder="https://openrouter.ai/api/v1"
          />
        </Field>
        <Field label="System Prompt" hint="Optional system prompt sent as the first message to the model.">
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            value={systemPromptValue}
            onChange={(e) => updateSystemPrompt(e.target.value)}
            placeholder="You are an autonomous Paperclip agent..."
          />
        </Field>
        <div className="rounded-md border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-xs text-blue-200 space-y-1">
          <p><strong>OpenRouter</strong> supports 300+ models from various providers.</p>
          <p>Free models have <code>:free</code> suffix (e.g. <code>meta-llama/llama-3.3-70b-instruct:free</code>).</p>
          <p>The model list is fetched from <code>/models</code> when the server has <code>OPENROUTER_API_KEY</code>; agent-specific keys are used when this agent runs.</p>
        </div>
        {modelWarning && (
          <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 space-y-1">
            <p><strong>Limited Capabilities:</strong> {modelWarning}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Field label="API Key" hint="Your OpenRouter API key. Can also be set via OPENROUTER_API_KEY environment variable.">
        <DraftInput
          value={apiKeyValue}
          onCommit={updateApiKey}
          immediate
          className={inputClass}
          placeholder="sk-or-v1-..."
          type="password"
        />
      </Field>
      <Field label="Base URL" hint="Override the OpenRouter API base URL (defaults to https://openrouter.ai/api/v1).">
        <DraftInput
          value={baseUrlValue}
          onCommit={updateBaseUrl}
          immediate
          className={inputClass}
          placeholder="https://openrouter.ai/api/v1"
        />
      </Field>
      <Field label="Model" hint="The ID of the OpenRouter model to use (e.g. google/gemini-2.5-flash). Recommended: google/gemini-2.5-flash or anthropic/claude-3.5-sonnet for tool support.">
        <DraftInput
          value={eff("adapterConfig", "model", String(config.model ?? ""))}
          onCommit={(v) => mark("adapterConfig", "model", v || undefined)}
          immediate
          className={inputClass}
          placeholder="google/gemini-2.5-flash"
        />
      </Field>
      {modelWarning && (
        <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 space-y-1">
          <p><strong>Limited Capabilities:</strong> {modelWarning}</p>
        </div>
      )}
      <Field label="System Prompt" hint="Optional system prompt sent as the first message to the model.">
        <textarea
          className={`${inputClass} min-h-[60px] resize-y`}
          value={systemPromptValue}
          onChange={(e) => updateSystemPrompt(e.target.value)}
          placeholder="You are a helpful AI assistant..."
        />
      </Field>
      <div className="rounded-md border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-xs text-blue-200 space-y-1">
        <p><strong>OpenRouter</strong> supports 300+ models from various providers.</p>
        <p>Free models have <code>:free</code> suffix (e.g. <code>meta-llama/llama-3.3-70b-instruct:free</code>).</p>
      </div>
    </>
  );
}
