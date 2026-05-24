import { z } from "zod";

export const PERSONAL_OPERATOR_ADAPTER_TYPES = [
  "hermes_local",
  "openclaw_gateway",
  "openrouter",
  "ollama",
] as const;

export const PERSONAL_OPERATOR_ACTION_METHODS = [
  "paperclip_api",
  "browser_dom",
  "browser_accessibility",
  "screenshot_vision",
  "desktop_mouse_keyboard",
] as const;

export const PERSONAL_OPERATOR_ACTION_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "blocked",
] as const;

export const PERSONAL_OPERATOR_RUN_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
] as const;

const sensitiveKeyPattern = /(^|[_\-.])(api[_\-.]?key|token|secret|password|authorization|cookie)($|[_\-.])/i;

export function isSensitiveConfigKey(key: string): boolean {
  return sensitiveKeyPattern.test(key) || ["apikey", "apiKey"].includes(key);
}

function isSecretRef(value: unknown): value is { type: "secret_ref"; secretId: string } {
  return (
    !!value &&
    typeof value === "object" &&
    (value as Record<string, unknown>).type === "secret_ref" &&
    typeof (value as Record<string, unknown>).secretId === "string"
  );
}

export function assertNoRawPersonalOperatorSecrets(value: unknown, path: string[] = []): void {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoRawPersonalOperatorSecrets(entry, [...path, String(index)]));
    return;
  }
  if (typeof value !== "object") return;
  if (isSecretRef(value)) return;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = [...path, key];
    if (isSensitiveConfigKey(key)) {
      if (typeof child === "string" && child.trim().length > 0) {
        throw new Error(`Raw sensitive value is not allowed at ${childPath.join(".")}; use a secret_ref.`);
      }
      if (child != null && typeof child === "object" && !isSecretRef(child)) {
        assertNoRawPersonalOperatorSecrets(child, childPath);
      }
      continue;
    }
    assertNoRawPersonalOperatorSecrets(child, childPath);
  }
}

export const personalOperatorSecretRefSchema = z.object({
  type: z.literal("secret_ref"),
  secretId: z.string().uuid(),
  version: z.union([z.literal("latest"), z.number().int().positive()]).optional(),
});

export const personalOperatorAdapterTypeSchema = z.enum(PERSONAL_OPERATOR_ADAPTER_TYPES);

export const personalOperatorAdapterConfigSchema = z.record(z.unknown()).superRefine((config, ctx) => {
  try {
    assertNoRawPersonalOperatorSecrets(config);
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : "Raw sensitive value is not allowed; use a secret_ref.",
    });
  }
});

export const updatePersonalOperatorProfileSchema = z.object({
  enabled: z.boolean().optional(),
  defaultAdapterType: personalOperatorAdapterTypeSchema.optional(),
  defaultAdapterConfig: personalOperatorAdapterConfigSchema.optional(),
  daemonEnabled: z.boolean().optional(),
  browserControlEnabled: z.boolean().optional(),
  desktopControlEnabled: z.boolean().optional(),
  screenshotVisionEnabled: z.boolean().optional(),
});

export const upsertPersonalOperatorCompanyPermissionSchema = z.object({
  readEnabled: z.boolean().optional(),
  writeEnabled: z.boolean().optional(),
  browserControlEnabled: z.boolean().optional(),
  desktopControlEnabled: z.boolean().optional(),
  approvalRequired: z.boolean().optional(),
});

export const createPersonalOperatorSessionSchema = z.object({
  daemonBaseUrl: z.string().url().optional(),
});

export const createPersonalOperatorRunSchema = z.object({
  sessionId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  prompt: z.string().min(1),
  adapterType: personalOperatorAdapterTypeSchema.optional(),
  adapterConfig: personalOperatorAdapterConfigSchema.optional(),
});

export const recordPersonalOperatorActionSchema = z.object({
  companyId: z.string().uuid().optional().nullable(),
  kind: z.string().min(1),
  method: z.enum(PERSONAL_OPERATOR_ACTION_METHODS),
  target: z.string().optional().nullable(),
  payload: z.record(z.unknown()).optional().default({}),
  result: z.record(z.unknown()).optional().default({}),
  status: z.enum(PERSONAL_OPERATOR_ACTION_STATUSES).optional().default("queued"),
  requiresApproval: z.boolean().optional(),
  approvalId: z.string().uuid().optional().nullable(),
  error: z.string().optional().nullable(),
});

export const recordPersonalOperatorScreenshotSchema = z.object({
  actionId: z.string().uuid().optional().nullable(),
  storageProvider: z.string().min(1).optional().default("metadata_only"),
  objectKey: z.string().optional().nullable(),
  sha256: z.string().optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  redactionState: z.enum(["metadata_only", "redacted", "raw_local_only"]).optional().default("metadata_only"),
});

export const daemonHealthQuerySchema = z.object({
  baseUrl: z.string().url().optional(),
});

export type UpdatePersonalOperatorProfile = z.infer<typeof updatePersonalOperatorProfileSchema>;
export type UpsertPersonalOperatorCompanyPermission = z.infer<typeof upsertPersonalOperatorCompanyPermissionSchema>;
export type CreatePersonalOperatorSession = z.infer<typeof createPersonalOperatorSessionSchema>;
export type CreatePersonalOperatorRun = z.infer<typeof createPersonalOperatorRunSchema>;
export type RecordPersonalOperatorAction = z.infer<typeof recordPersonalOperatorActionSchema>;
export type RecordPersonalOperatorScreenshot = z.infer<typeof recordPersonalOperatorScreenshotSchema>;
