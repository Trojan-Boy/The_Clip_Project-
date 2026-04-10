import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  DraftInput,
} from "../../components/agent-config-primitives";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function OpenRouterConfigFields({
  isCreate,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  // In create mode we still render the fields but they only take effect in edit mode.
  // The API key can be set via OPENROUTER_API_KEY env var or edited after creation.
  if (isCreate) {
    return (
      <div className="rounded-md border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-xs text-blue-200 space-y-1">
        <p><strong>OpenRouter</strong> supports 300+ models from various providers.</p>
        <p>Free models have <code>:free</code> suffix (e.g. <code>meta-llama/llama-3.3-70b-instruct:free</code>).</p>
        <p>Set your API key via the <code>OPENROUTER_API_KEY</code> environment variable, or configure it after creating the agent.</p>
      </div>
    );
  }

  return (
    <>
      <Field label="API Key" hint="Your OpenRouter API key. Can also be set via OPENROUTER_API_KEY environment variable.">
        <DraftInput
          value={eff("adapterConfig", "apiKey", String(config.apiKey ?? ""))}
          onCommit={(v) => mark("adapterConfig", "apiKey", v || undefined)}
          immediate
          className={inputClass}
          placeholder="sk-or-v1-..."
          type="password"
        />
      </Field>
      <Field label="Base URL" hint="Override the OpenRouter API base URL (defaults to https://openrouter.ai/api/v1).">
        <DraftInput
          value={eff("adapterConfig", "baseUrl", String(config.baseUrl ?? ""))}
          onCommit={(v) => mark("adapterConfig", "baseUrl", v || undefined)}
          immediate
          className={inputClass}
          placeholder="https://openrouter.ai/api/v1"
        />
      </Field>
      <Field label="Model" hint="The ID of the OpenRouter model to use (e.g. google/gemini-2.5-flash).">
        <DraftInput
          value={eff("adapterConfig", "model", String(config.model ?? ""))}
          onCommit={(v) => mark("adapterConfig", "model", v || undefined)}
          immediate
          className={inputClass}
          placeholder="google/gemini-2.5-flash"
        />
      </Field>
      <Field label="System Prompt" hint="Optional system prompt sent as the first message to the model.">
        <textarea
          className={`${inputClass} min-h-[60px] resize-y`}
          value={eff("adapterConfig", "systemPrompt", String(config.systemPrompt ?? ""))}
          onChange={(e) => mark("adapterConfig", "systemPrompt", e.target.value || undefined)}
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
