import { useState } from "react";
import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  DraftInput,
} from "../../components/agent-config-primitives";
import { ModelDropdown } from "../../components/ModelDropdown";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function OllamaConfigFields({
  isCreate,
  config,
  eff,
  mark,
  models,
}: AdapterConfigFieldsProps) {
  const [modelOpen, setModelOpen] = useState(false);

  if (isCreate) {
    return (
      <div className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 space-y-1">
        <p><strong>Ollama</strong> runs models locally — no API key needed.</p>
        <p>Make sure Ollama is running (<code>ollama serve</code>) and pull models first (<code>ollama pull llama3.3</code>).</p>
        <p>Free and private — your data never leaves your machine.</p>
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
        <p>Pull models with: <code>ollama pull llama3.3</code></p>
      </div>
    </>
  );
}
