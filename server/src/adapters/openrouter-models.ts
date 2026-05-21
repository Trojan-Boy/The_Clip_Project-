import type { AdapterModel } from "@paperclipai/adapter-utils";
import {
  DEFAULT_OPENROUTER_BASE_URL,
  models as fallbackModels,
} from "@paperclipai/adapter-openrouter";

const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;

let modelCache: { key: string; expiresAt: number; models: AdapterModel[] } | null = null;

export function resetOpenRouterModelsCacheForTests() {
  modelCache = null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function resolveApiKey(): string | null {
  return readNonEmptyString(process.env.OPENROUTER_API_KEY);
}

function resolveBaseUrl(): string {
  return (
    readNonEmptyString(process.env.OPENROUTER_BASE_URL) ??
    DEFAULT_OPENROUTER_BASE_URL
  );
}

function dedupeModels(models: AdapterModel[]): AdapterModel[] {
  const seen = new Set<string>();
  const deduped: AdapterModel[] = [];
  for (const model of models) {
    if (!model.id || seen.has(model.id)) continue;
    seen.add(model.id);
    deduped.push(model);
  }
  return deduped;
}

function mergeWithFallback(models: AdapterModel[]): AdapterModel[] {
  return dedupeModels([...models, ...fallbackModels]);
}

function collectOpenRouterModels(data: unknown): AdapterModel[] {
  const record = parseObject(data);
  const entries = Array.isArray(record.data) ? record.data : [];
  const models: AdapterModel[] = [];

  for (const entry of entries) {
    const item = parseObject(entry);
    const id = readNonEmptyString(item.id);
    if (!id) continue;
    const name = readNonEmptyString(item.name);
    models.push({ id, label: name && name !== id ? `${name} (${id})` : id });
  }

  return dedupeModels(models);
}

export async function listOpenRouterModels(): Promise<AdapterModel[]> {
  const apiKey = resolveApiKey();
  const baseUrl = resolveBaseUrl();
  if (!apiKey) return fallbackModels;

  const cacheKey = `${baseUrl}:${apiKey.slice(0, 8)}:${apiKey.slice(-6)}`;
  const now = Date.now();
  if (modelCache && modelCache.key === cacheKey && modelCache.expiresAt > now) {
    return modelCache.models;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return modelCache?.models ?? fallbackModels;

    const merged = mergeWithFallback(collectOpenRouterModels(await response.json()));
    modelCache = { key: cacheKey, expiresAt: now + MODEL_CACHE_TTL_MS, models: merged };
    return merged;
  } catch {
    return modelCache?.models ?? fallbackModels;
  }
}
