import { useState, useMemo } from "react";
import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  DraftInput,
} from "../../components/agent-config-primitives";
import { ModelDropdown } from "../../components/ModelDropdown";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

// Models known to support tool calling in Ollama
const TOOL_CAPABLE_OLLAMA_MODELS = new Set([
  "qwen2.5:14b",
  "qwen2.5:7b",
  "qwen2.5:32b",
  "llama3.3",
  "llama3.2",
  "mistral-nemo",
  "nemotron-mini",
  "command-r",
]);

function isModelToolCapable(modelId: string): boolean {
  if (!modelId) return false;
  // Exact match
  if (TOOL_CAPABLE_OLLAMA_MODELS.has(modelId)) return true;
  // Check if any known prefix matches (e.g. "qwen2.5:14b" matches "qwen2.5")
  for (const capable of TOOL_CAPABLE_OLLAMA_MODELS) {
    if (modelId === capable || modelId.startsWith(capable + ":")) return true;
  }
  return false;
}

export function OllamaConfigFields({
  isCreate,
  config,
  eff,
  mark,
  models,
}: AdapterConfigFieldsProps) {
  const [modelOpen, setModelOpen] = useState(false);

  const currentModel = eff("adapterConfig", "model", String(config.model ?? ""));
  const modelWarning = useMemo(() => {
    if (!currentModel) return null;
    if (isModelToolCapable(currentModel)) return null;
    return `Warning: "${currentModel}" is not known to support tool calling. Agents using this model will only respond with text and cannot execute tasks (hire, comment, etc.). Use qwen2.5:14b or llama3.3 for full agent capabilities.`;
  }, [currentModel]);

  if (isCreate) {
    return (
      <div className="space-y-3">
        <Field label="Ollama Model" hint="Select or type a model name. Use qwen2.5:14b or llama3.3 for agents that can execute tasks. Pull first with: ollama pull qwen2.5:14b">
          <ModelDropdown
            models={models}
            value={currentModel}
            onChange={(v) => mark("adapterConfig", "model", v || undefined)}
            open={modelOpen}
            onOpenChange={setModelOpen}
            allowDefault={false}
            required={true}
            creatable={true}
          />
        </Field>
        {modelWarning && (
          <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 space-y-1">
            <p><strong>⚠️ Limited Capabilities:</strong> {modelWarning}</p>
          </div>
        )}
        <div className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 space-y-1">
          <p><strong>Ollama</strong> runs models locally — no API key needed.</p>
          <p>Make sure Ollama is running (<code>ollama serve</code>) and pull models first (<code>ollama pull qwen2.5:14b</code>).</p>
          <p>Free and private — your data never leaves your machine.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Field label="Base URL" hint="The URL of your local Ollama instance (defaults to http://localhost:11434).">
        <DraftInput
          value={eff("adapterConfig", "baseUrl", String(config.baseUrl ?? ""))}
          onCommit={(v) => mark("adapterConfig", "baseUrl", v || undefined)}
          immediate
          className={inputClass}
          placeholder="http://localhost:11434"
        />
      </Field>
      
      <ModelDropdown
        models={models}
        value={eff("adapterConfig", "model", String(config.model ?? ""))}
        onChange={(v) => mark("adapterConfig", "model", v || undefined)}
        open={modelOpen}
        onOpenChange={setModelOpen}
        allowDefault={false}
        required={true}
        creatable={true}
      />
      {modelWarning && (
        <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 space-y-1">
          <p><strong>⚠️ Limited Capabilities:</strong> {modelWarning}</p>
        </div>
      )}

      <Field label="System Prompt" hint="Optional system prompt sent as the first message to the model.">
        <textarea
          className={`${inputClass} min-h-[60px] resize-y`}
          value={eff("adapterConfig", "systemPrompt", String(config.systemPrompt ?? ""))}
          onChange={(e) => mark("adapterConfig", "systemPrompt", e.target.value || undefined)}
          placeholder="You are a helpful AI assistant..."
        />
      </Field>
      <div className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 space-y-1">
        <p><strong>Ollama</strong> runs models locally — no API key needed.</p>
        <p>Pull models with: <code>ollama pull qwen2.5:14b</code> (recommended for agent tool execution)</p>
      </div>
    </>
  );
}
