import { useMemo, useState } from "react";
import type { AdapterConfigFieldsProps } from "../types";
import { DraftInput, DraftNumberInput, Field } from "../../components/agent-config-primitives";
import { ModelDropdown } from "../../components/ModelDropdown";

const inputClass =
  "w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none placeholder:text-muted-foreground/40";

const HIGH_CONFIDENCE_OLLAMA_MODELS = new Set([
  "qwen2.5:14b",
  "qwen2.5:7b",
  "qwen2.5:32b",
  "gemma4",
  "gemma4:latest",
  "gemma3",
  "gemma3:latest",
  "llama3.3",
  "llama3.2",
  "mistral-nemo",
  "nemotron-mini",
  "command-r",
]);

function isHighConfidenceModel(modelId: string): boolean {
  if (!modelId) return false;
  if (HIGH_CONFIDENCE_OLLAMA_MODELS.has(modelId)) return true;
  for (const candidate of HIGH_CONFIDENCE_OLLAMA_MODELS) {
    if (modelId === candidate || modelId.startsWith(`${candidate}:`)) {
      return true;
    }
  }
  return false;
}

export function OllamaConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
  models,
}: AdapterConfigFieldsProps) {
  const [modelOpen, setModelOpen] = useState(false);

  const currentModel = isCreate
    ? String(values?.model ?? "")
    : eff("adapterConfig", "model", String(config.model ?? ""));
  const currentBaseUrl = isCreate
    ? String(values?.baseUrl ?? "")
    : eff("adapterConfig", "baseUrl", String(config.baseUrl ?? ""));
  const currentSystemPrompt = isCreate
    ? String(values?.systemPrompt ?? "")
    : eff("adapterConfig", "systemPrompt", String(config.systemPrompt ?? ""));
  const currentTimeoutSec = isCreate
    ? Number(values?.timeoutSec ?? 600)
    : Number(eff("adapterConfig", "timeoutSec", Number(config.timeoutSec ?? 600)));
  const updateModel = (value: string) =>
    isCreate ? set?.({ model: value }) : mark("adapterConfig", "model", value || undefined);
  const updateBaseUrl = (value: string) =>
    isCreate ? set?.({ baseUrl: value }) : mark("adapterConfig", "baseUrl", value || undefined);
  const updateSystemPrompt = (value: string) =>
    isCreate ? set?.({ systemPrompt: value }) : mark("adapterConfig", "systemPrompt", value || undefined);
  const updateTimeoutSec = (value: number) =>
    isCreate ? set?.({ timeoutSec: value }) : mark("adapterConfig", "timeoutSec", value || undefined);
  const modelWarning = useMemo(() => {
    if (!currentModel || isHighConfidenceModel(currentModel)) return null;
    return `"${currentModel}" is not one of the known high-confidence local worker models. It may still work in prompt-guided mode, but Qwen 2.5, Gemma 4, Gemma 3, or Llama 3.3 are safer choices for autonomous execution.`;
  }, [currentModel]);

  if (isCreate) {
    return (
      <div className="space-y-3">
        <Field
          label="Ollama Model"
          hint="Select or type a model name. Qwen 2.5 14B is the safest default. Gemma 4 and Gemma 3 also work well with the local prompt-guided loop."
        >
          <ModelDropdown
            models={models}
            value={currentModel}
            onChange={updateModel}
            open={modelOpen}
            onOpenChange={setModelOpen}
            allowDefault={false}
            required={true}
            creatable={true}
          />
        </Field>

        <Field
          label="Base URL"
          hint="The URL of your local Ollama instance. Leave blank for http://localhost:11434."
        >
          <DraftInput
            value={currentBaseUrl}
            onCommit={updateBaseUrl}
            immediate
            className={inputClass}
            placeholder="http://localhost:11434"
          />
        </Field>

        <Field
          label="Request timeout"
          hint="Seconds to wait for a local model response. Large models such as qwen2.5:14b often need up to 600 seconds on CPU or low-VRAM machines."
        >
          <DraftNumberInput
            value={currentTimeoutSec || 600}
            onCommit={(value) => updateTimeoutSec(Number.isFinite(value) && value > 0 ? value : 600)}
            immediate
            className={inputClass}
            placeholder="600"
          />
        </Field>

        <Field
          label="System Prompt"
          hint="Optional system prompt sent as the first message to the model."
        >
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            value={currentSystemPrompt}
            onChange={(event) => updateSystemPrompt(event.target.value)}
            placeholder="You are an autonomous Paperclip agent..."
          />
        </Field>

        {modelWarning && (
          <div className="space-y-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <p>
              <strong>Model Warning:</strong> {modelWarning}
            </p>
          </div>
        )}

        <div className="space-y-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          <p>
            <strong>Ollama</strong> runs models locally - no API key needed.
          </p>
          <p>
            Make sure Ollama is running (<code>ollama serve</code>) and pull models first
            (<code>ollama pull qwen2.5:14b</code>).
          </p>
          <p>
            Recommended local workers: <code>qwen2.5:14b</code>, <code>gemma4:latest</code>,{" "}
            <code>gemma3:latest</code>, <code>llama3.3</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Field
        label="Base URL"
        hint="The URL of your local Ollama instance (defaults to http://localhost:11434)."
      >
        <DraftInput
          value={currentBaseUrl}
          onCommit={updateBaseUrl}
          immediate
          className={inputClass}
          placeholder="http://localhost:11434"
        />
      </Field>

      <Field
        label="Ollama Model"
        hint="Select or type a model name. Qwen 2.5 14B is the safest default for autonomous local execution."
      >
        <ModelDropdown
          models={models}
          value={currentModel}
          onChange={updateModel}
          open={modelOpen}
          onOpenChange={setModelOpen}
          allowDefault={false}
          required={true}
          creatable={true}
        />
      </Field>

      {modelWarning && (
        <div className="space-y-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <p>
            <strong>Model Warning:</strong> {modelWarning}
          </p>
        </div>
      )}

      <Field
        label="Request timeout"
        hint="Seconds to wait for a local model response. Large models such as qwen2.5:14b often need up to 600 seconds on CPU or low-VRAM machines."
      >
        <DraftNumberInput
          value={currentTimeoutSec || 600}
          onCommit={(value) => updateTimeoutSec(Number.isFinite(value) && value > 0 ? value : 600)}
          immediate
          className={inputClass}
          placeholder="600"
        />
      </Field>

      <Field
        label="System Prompt"
        hint="Optional system prompt sent as the first message to the model."
      >
        <textarea
          className={`${inputClass} min-h-[60px] resize-y`}
          value={currentSystemPrompt}
          onChange={(event) => updateSystemPrompt(event.target.value)}
          placeholder="You are a helpful AI assistant..."
        />
      </Field>

      <div className="space-y-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
        <p>
          <strong>Ollama</strong> runs models locally - no API key needed.
        </p>
        <p>
          Pull models with: <code>ollama pull qwen2.5:14b</code> or{" "}
          <code>ollama pull gemma4:latest</code>.
        </p>
        <p>
          Paperclip uses a prompt-guided tool loop here, so Gemma models can still work even without
          native function calling.
        </p>
      </div>
    </>
  );
}
