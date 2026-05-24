import { describe, it, expect } from "vitest";
import {
  assertNoRawPersonalOperatorSecrets,
  isSensitiveConfigKey,
  PERSONAL_OPERATOR_ADAPTER_TYPES,
  PERSONAL_OPERATOR_ACTION_METHODS,
  PERSONAL_OPERATOR_ACTION_STATUSES,
  PERSONAL_OPERATOR_RUN_STATUSES,
  updatePersonalOperatorProfileSchema,
  upsertPersonalOperatorCompanyPermissionSchema,
  createPersonalOperatorSessionSchema,
  createPersonalOperatorRunSchema,
  recordPersonalOperatorActionSchema,
  recordPersonalOperatorScreenshotSchema,
  daemonHealthQuerySchema,
} from "@paperclipai/shared";

// ---------------------------------------------------------------------------
// isSensitiveConfigKey
// ---------------------------------------------------------------------------
describe("isSensitiveConfigKey", () => {
  it.each([
    "apiKey",
    "apikey",
    "OPENROUTER_API_KEY",
    "hermes-api-key",
    "access_token",
    "auth_token",
    "token",
    "client_secret",
    "secret",
    "password",
    "authorization",
    "cookie",
  ])("detects %s as sensitive", (key) => {
    expect(isSensitiveConfigKey(key)).toBe(true);
  });

  it.each([
    "model",
    "baseUrl",
    "temperature",
    "maxTokens",
    "name",
    "description",
    "companyId",
  ])("does not flag %s as sensitive", (key) => {
    expect(isSensitiveConfigKey(key)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// assertNoRawPersonalOperatorSecrets
// ---------------------------------------------------------------------------
describe("assertNoRawPersonalOperatorSecrets", () => {
  it("accepts empty config", () => {
    expect(() => assertNoRawPersonalOperatorSecrets({})).not.toThrow();
  });

  it("accepts null and undefined", () => {
    expect(() => assertNoRawPersonalOperatorSecrets(null)).not.toThrow();
    expect(() => assertNoRawPersonalOperatorSecrets(undefined)).not.toThrow();
  });

  it("accepts non-sensitive keys with string values", () => {
    expect(() =>
      assertNoRawPersonalOperatorSecrets({
        model: "gpt-4",
        baseUrl: "https://api.example.com",
        temperature: 0.7,
      }),
    ).not.toThrow();
  });

  it("accepts secret_ref objects for sensitive keys", () => {
    expect(() =>
      assertNoRawPersonalOperatorSecrets({
        apiKey: { type: "secret_ref", secretId: "00000000-0000-4000-8000-000000000000", version: "latest" },
      }),
    ).not.toThrow();
  });

  it("rejects raw string for apiKey", () => {
    expect(() =>
      assertNoRawPersonalOperatorSecrets({ apiKey: "sk-abc123" }),
    ).toThrow(/raw sensitive value/i);
  });

  it("rejects raw string for OPENROUTER_API_KEY", () => {
    expect(() =>
      assertNoRawPersonalOperatorSecrets({ OPENROUTER_API_KEY: "sk-or-v1-abc" }),
    ).toThrow(/raw sensitive value/i);
  });

  it("rejects raw string for token", () => {
    expect(() =>
      assertNoRawPersonalOperatorSecrets({ token: "tok_xyz" }),
    ).toThrow(/raw sensitive value/i);
  });

  it("rejects raw string for secret", () => {
    expect(() =>
      assertNoRawPersonalOperatorSecrets({ secret: "my-secret-value" }),
    ).toThrow(/raw sensitive value/i);
  });

  it("rejects raw string for password", () => {
    expect(() =>
      assertNoRawPersonalOperatorSecrets({ password: "hunter2" }),
    ).toThrow(/raw sensitive value/i);
  });

  it("handles nested objects", () => {
    expect(() =>
      assertNoRawPersonalOperatorSecrets({
        adapter: { apiKey: "sk-nested" },
      }),
    ).toThrow(/raw sensitive value/i);
  });

  it("handles arrays", () => {
    expect(() =>
      assertNoRawPersonalOperatorSecrets([
        { apiKey: "sk-in-array" },
      ]),
    ).toThrow(/raw sensitive value/i);
  });

  it("accepts empty string for sensitive key (treated as blank)", () => {
    expect(() =>
      assertNoRawPersonalOperatorSecrets({ apiKey: "" }),
    ).not.toThrow();
  });

  it("accepts whitespace-only string for sensitive key", () => {
    expect(() =>
      assertNoRawPersonalOperatorSecrets({ apiKey: "   " }),
    ).not.toThrow();
  });

  it("accepts mixed valid config", () => {
    expect(() =>
      assertNoRawPersonalOperatorSecrets({
        model: "claude-3.5",
        apiKey: { type: "secret_ref", secretId: "00000000-0000-4000-8000-000000000001" },
        temperature: 0.5,
      }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Zod schema: updatePersonalOperatorProfileSchema
// ---------------------------------------------------------------------------
describe("updatePersonalOperatorProfileSchema", () => {
  it("accepts empty object (all optional)", () => {
    const result = updatePersonalOperatorProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid profile patch", () => {
    const result = updatePersonalOperatorProfileSchema.safeParse({
      enabled: true,
      defaultAdapterType: "openrouter",
      daemonEnabled: false,
      browserControlEnabled: false,
      desktopControlEnabled: false,
      screenshotVisionEnabled: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid adapter type", () => {
    const result = updatePersonalOperatorProfileSchema.safeParse({
      defaultAdapterType: "invalid_adapter",
    });
    expect(result.success).toBe(false);
  });

  it("rejects raw apiKey in adapter config", () => {
    const result = updatePersonalOperatorProfileSchema.safeParse({
      defaultAdapterConfig: { apiKey: "sk-raw-key" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts secret_ref in adapter config", () => {
    const result = updatePersonalOperatorProfileSchema.safeParse({
      defaultAdapterConfig: {
        apiKey: { type: "secret_ref", secretId: "00000000-0000-4000-8000-000000000002", version: "latest" },
      },
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Zod schema: upsertPersonalOperatorCompanyPermissionSchema
// ---------------------------------------------------------------------------
describe("upsertPersonalOperatorCompanyPermissionSchema", () => {
  it("accepts empty object", () => {
    const result = upsertPersonalOperatorCompanyPermissionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts all flags", () => {
    const result = upsertPersonalOperatorCompanyPermissionSchema.safeParse({
      readEnabled: true,
      writeEnabled: true,
      browserControlEnabled: false,
      desktopControlEnabled: false,
      approvalRequired: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-boolean flag", () => {
    const result = upsertPersonalOperatorCompanyPermissionSchema.safeParse({
      readEnabled: "yes",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Zod schema: createPersonalOperatorSessionSchema
// ---------------------------------------------------------------------------
describe("createPersonalOperatorSessionSchema", () => {
  it("accepts empty object", () => {
    const result = createPersonalOperatorSessionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid daemon URL", () => {
    const result = createPersonalOperatorSessionSchema.safeParse({
      daemonBaseUrl: "http://127.0.0.1:3177",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL", () => {
    const result = createPersonalOperatorSessionSchema.safeParse({
      daemonBaseUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Zod schema: createPersonalOperatorRunSchema
// ---------------------------------------------------------------------------
describe("createPersonalOperatorRunSchema", () => {
  it("accepts minimal run", () => {
    const result = createPersonalOperatorRunSchema.safeParse({
      prompt: "Do something",
    });
    expect(result.success).toBe(true);
  });

  it("accepts full run", () => {
    const result = createPersonalOperatorRunSchema.safeParse({
      sessionId: "00000000-0000-4000-8000-000000000003",
      companyId: "00000000-0000-4000-8000-000000000004",
      prompt: "Triage inbox",
      adapterType: "openrouter",
      adapterConfig: {
        model: "claude-3.5",
        apiKey: { type: "secret_ref", secretId: "00000000-0000-4000-8000-000000000005" },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty prompt", () => {
    const result = createPersonalOperatorRunSchema.safeParse({ prompt: "" });
    expect(result.success).toBe(false);
  });

  it("rejects raw apiKey in adapter config", () => {
    const result = createPersonalOperatorRunSchema.safeParse({
      prompt: "test",
      adapterConfig: { apiKey: "sk-raw" },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Zod schema: recordPersonalOperatorActionSchema
// ---------------------------------------------------------------------------
describe("recordPersonalOperatorActionSchema", () => {
  it("accepts minimal action", () => {
    const result = recordPersonalOperatorActionSchema.safeParse({
      kind: "navigate",
      method: "browser_dom",
    });
    expect(result.success).toBe(true);
  });

  it("accepts full action", () => {
    const result = recordPersonalOperatorActionSchema.safeParse({
      companyId: "00000000-0000-4000-8000-000000000006",
      kind: "click",
      method: "desktop_mouse_keyboard",
      target: "button#submit",
      payload: { x: 100, y: 200 },
      result: { clicked: true },
      status: "succeeded",
      requiresApproval: false,
      approvalId: null,
      error: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid method", () => {
    const result = recordPersonalOperatorActionSchema.safeParse({
      kind: "click",
      method: "invalid_method",
    });
    expect(result.success).toBe(false);
  });

  it.each(PERSONAL_OPERATOR_ACTION_METHODS)("accepts method %s", (method) => {
    const result = recordPersonalOperatorActionSchema.safeParse({
      kind: "test",
      method,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Zod schema: recordPersonalOperatorScreenshotSchema
// ---------------------------------------------------------------------------
describe("recordPersonalOperatorScreenshotSchema", () => {
  it("accepts minimal screenshot", () => {
    const result = recordPersonalOperatorScreenshotSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts full screenshot", () => {
    const result = recordPersonalOperatorScreenshotSchema.safeParse({
      actionId: "00000000-0000-4000-8000-000000000007",
      storageProvider: "metadata_only",
      sha256: "abc123",
      width: 1920,
      height: 1080,
      redactionState: "metadata_only",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid redaction state", () => {
    const result = recordPersonalOperatorScreenshotSchema.safeParse({
      redactionState: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Zod schema: daemonHealthQuerySchema
// ---------------------------------------------------------------------------
describe("daemonHealthQuerySchema", () => {
  it("accepts empty query", () => {
    const result = daemonHealthQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid baseUrl", () => {
    const result = daemonHealthQuerySchema.safeParse({
      baseUrl: "http://127.0.0.1:3177",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Enum constants
// ---------------------------------------------------------------------------
describe("Personal operator enum constants", () => {
  it("has expected adapter types", () => {
    expect(PERSONAL_OPERATOR_ADAPTER_TYPES).toContain("hermes_local");
    expect(PERSONAL_OPERATOR_ADAPTER_TYPES).toContain("openclaw_gateway");
    expect(PERSONAL_OPERATOR_ADAPTER_TYPES).toContain("openrouter");
    expect(PERSONAL_OPERATOR_ADAPTER_TYPES).toContain("ollama");
  });

  it("has expected action methods", () => {
    expect(PERSONAL_OPERATOR_ACTION_METHODS).toContain("paperclip_api");
    expect(PERSONAL_OPERATOR_ACTION_METHODS).toContain("browser_dom");
    expect(PERSONAL_OPERATOR_ACTION_METHODS).toContain("browser_accessibility");
    expect(PERSONAL_OPERATOR_ACTION_METHODS).toContain("screenshot_vision");
    expect(PERSONAL_OPERATOR_ACTION_METHODS).toContain("desktop_mouse_keyboard");
  });

  it("has expected action statuses", () => {
    expect(PERSONAL_OPERATOR_ACTION_STATUSES).toContain("queued");
    expect(PERSONAL_OPERATOR_ACTION_STATUSES).toContain("running");
    expect(PERSONAL_OPERATOR_ACTION_STATUSES).toContain("succeeded");
    expect(PERSONAL_OPERATOR_ACTION_STATUSES).toContain("failed");
    expect(PERSONAL_OPERATOR_ACTION_STATUSES).toContain("blocked");
  });

  it("has expected run statuses", () => {
    expect(PERSONAL_OPERATOR_RUN_STATUSES).toContain("queued");
    expect(PERSONAL_OPERATOR_RUN_STATUSES).toContain("running");
    expect(PERSONAL_OPERATOR_RUN_STATUSES).toContain("succeeded");
    expect(PERSONAL_OPERATOR_RUN_STATUSES).toContain("failed");
    expect(PERSONAL_OPERATOR_RUN_STATUSES).toContain("cancelled");
  });
});
