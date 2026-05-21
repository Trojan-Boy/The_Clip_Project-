import type { UIAdapterModule } from "../types";
import type { TranscriptEntry, CreateConfigValues } from "@paperclipai/adapter-utils";
import { OllamaConfigFields } from "./config-fields";

function parseOllamaStdoutLine(line: string, ts: string): TranscriptEntry[] {
  if (line.startsWith("[paperclip:ollama]")) {
    return [{ kind: "system", ts, text: line }];
  }
  if (line.trim()) {
    return [{ kind: "assistant", ts, text: line }];
  }
  return [];
}

function buildOllamaConfig(values: CreateConfigValues): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (values.model) config.model = values.model;
  if (values.baseUrl) config.baseUrl = values.baseUrl;
  if (values.systemPrompt) config.systemPrompt = values.systemPrompt;
  if (values.timeoutSec && values.timeoutSec > 0) config.timeoutSec = values.timeoutSec;
  if (values.promptTemplate) config.promptTemplate = values.promptTemplate;
  return config;
}

export const ollamaUIAdapter: UIAdapterModule = {
  type: "ollama",
  label: "Ollama (Local)",
  parseStdoutLine: parseOllamaStdoutLine,
  ConfigFields: OllamaConfigFields,
  buildAdapterConfig: buildOllamaConfig,
};
