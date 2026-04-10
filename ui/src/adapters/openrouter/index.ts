import type { UIAdapterModule } from "../types";
import type { TranscriptEntry, CreateConfigValues } from "@paperclipai/adapter-utils";
import { OpenRouterConfigFields } from "./config-fields";

function parseOpenRouterStdoutLine(line: string, ts: string): TranscriptEntry[] {
  if (line.startsWith("[paperclip:openrouter]")) {
    return [{ kind: "system", ts, text: line }];
  }
  if (line.trim()) {
    return [{ kind: "assistant", ts, text: line }];
  }
  return [];
}

function buildOpenRouterConfig(values: CreateConfigValues): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (values.model) config.model = values.model;
  if (values.promptTemplate) config.promptTemplate = values.promptTemplate;
  return config;
}

export const openrouterUIAdapter: UIAdapterModule = {
  type: "openrouter",
  label: "OpenRouter",
  parseStdoutLine: parseOpenRouterStdoutLine,
  ConfigFields: OpenRouterConfigFields,
  buildAdapterConfig: buildOpenRouterConfig,
};
