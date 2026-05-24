import { describe, it, expect } from "vitest";
import {
  redactPersonalOperatorSecrets,
  assertLoopbackDaemonUrl,
  PERSONAL_OPERATOR_ACTION_PRIORITY,
} from "../../services/personal-operator.js";

// ---------------------------------------------------------------------------
// redactPersonalOperatorSecrets
// ---------------------------------------------------------------------------
describe("redactPersonalOperatorSecrets", () => {
  it("returns null/undefined as-is", () => {
    expect(redactPersonalOperatorSecrets(null)).toBeNull();
    expect(redactPersonalOperatorSecrets(undefined)).toBeUndefined();
  });

  it("returns primitives as-is", () => {
    expect(redactPersonalOperatorSecrets("hello")).toBe("hello");
    expect(redactPersonalOperatorSecrets(42)).toBe(42);
    expect(redactPersonalOperatorSecrets(true)).toBe(true);
  });

  it("redacts apiKey string value", () => {
    const result = redactPersonalOperatorSecrets({ apiKey: "sk-abc123" });
    expect(result).toEqual({ apiKey: "[redacted]" });
  });

  it("redacts token string value", () => {
    const result = redactPersonalOperatorSecrets({ token: "tok_xyz" });
    expect(result).toEqual({ token: "[redacted]" });
  });

  it("redacts secret string value", () => {
    const result = redactPersonalOperatorSecrets({ secret: "my-secret" });
    expect(result).toEqual({ secret: "[redacted]" });
  });

  it("redacts password string value", () => {
    const result = redactPersonalOperatorSecrets({ password: "hunter2" });
    expect(result).toEqual({ password: "[redacted]" });
  });

  it("redacts authorization string value", () => {
    const result = redactPersonalOperatorSecrets({ authorization: "Bearer xyz" });
    expect(result).toEqual({ authorization: "[redacted]" });
  });

  it("redacts cookie string value", () => {
    const result = redactPersonalOperatorSecrets({ cookie: "session=abc" });
    expect(result).toEqual({ cookie: "[redacted]" });
  });

  it("replaces secret_ref secretId with [redacted]", () => {
    const result = redactPersonalOperatorSecrets({
      type: "secret_ref",
      secretId: "00000000-0000-4000-8000-000000000001",
      version: "latest",
    });
    expect(result).toEqual({
      type: "secret_ref",
      secretId: "[redacted]",
      version: "latest",
    });
  });

  it("keeps non-sensitive keys intact", () => {
    const result = redactPersonalOperatorSecrets({
      model: "gpt-4",
      temperature: 0.7,
      baseUrl: "https://api.example.com",
    });
    expect(result).toEqual({
      model: "gpt-4",
      temperature: 0.7,
      baseUrl: "https://api.example.com",
    });
  });

  it("handles nested objects", () => {
    const result = redactPersonalOperatorSecrets({
      adapter: { apiKey: "sk-nested", model: "claude" },
    });
    expect(result).toEqual({
      adapter: { apiKey: "[redacted]", model: "claude" },
    });
  });

  it("handles arrays", () => {
    const result = redactPersonalOperatorSecrets([
      { apiKey: "sk-1" },
      { model: "gpt-4" },
    ]);
    expect(result).toEqual([
      { apiKey: "[redacted]" },
      { model: "gpt-4" },
    ]);
  });

  it("ensures no fake secret values appear in output", () => {
    const fakeSecrets = ["sk-abc123", "tok_xyz", "my-secret", "hunter2"];
    const input = {
      apiKey: fakeSecrets[0],
      token: fakeSecrets[1],
      secret: fakeSecrets[2],
      password: fakeSecrets[3],
      model: "gpt-4",
    };
    const result = JSON.stringify(redactPersonalOperatorSecrets(input));
    for (const fake of fakeSecrets) {
      expect(result).not.toContain(fake);
    }
  });

  it("handles deeply nested secret_ref", () => {
    const result = redactPersonalOperatorSecrets({
      config: {
        provider: {
          type: "secret_ref",
          secretId: "deep-secret-id",
          version: 3,
        },
      },
    });
    expect(result).toEqual({
      config: {
        provider: {
          type: "secret_ref",
          secretId: "[redacted]",
          version: 3,
        },
      },
    });
  });
});

// ---------------------------------------------------------------------------
// assertLoopbackDaemonUrl
// ---------------------------------------------------------------------------
describe("assertLoopbackDaemonUrl", () => {
  it("accepts http://127.0.0.1:3177", () => {
    const url = assertLoopbackDaemonUrl("http://127.0.0.1:3177");
    expect(url.hostname).toBe("127.0.0.1");
  });

  it("accepts http://localhost:3177", () => {
    const url = assertLoopbackDaemonUrl("http://localhost:3177");
    expect(url.hostname).toBe("localhost");
  });

  it("accepts http://[::1]:3177", () => {
    const url = assertLoopbackDaemonUrl("http://[::1]:3177");
    expect(["[::1]", "::1"]).toContain(url.hostname);
  });

  it("accepts https://127.0.0.1:3177", () => {
    const url = assertLoopbackDaemonUrl("https://127.0.0.1:3177");
    expect(url.hostname).toBe("127.0.0.1");
  });

  it("rejects external host", () => {
    expect(() => assertLoopbackDaemonUrl("http://example.com:3177")).toThrow(/loopback/i);
  });

  it("rejects non-loopback IP", () => {
    expect(() => assertLoopbackDaemonUrl("http://192.168.1.1:3177")).toThrow(/loopback/i);
  });

  it("rejects ftp protocol", () => {
    expect(() => assertLoopbackDaemonUrl("ftp://127.0.0.1:3177")).toThrow(/loopback/i);
  });

  it("rejects invalid URL", () => {
    expect(() => assertLoopbackDaemonUrl("not-a-url")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Action priority constants
// ---------------------------------------------------------------------------
describe("PERSONAL_OPERATOR_ACTION_PRIORITY", () => {
  it("has correct order", () => {
    expect(PERSONAL_OPERATOR_ACTION_PRIORITY).toEqual([
      "paperclip_api",
      "browser_dom",
      "browser_accessibility",
      "screenshot_vision",
      "desktop_mouse_keyboard",
    ]);
  });

  it("has paperclip_api as highest priority", () => {
    expect(PERSONAL_OPERATOR_ACTION_PRIORITY[0]).toBe("paperclip_api");
  });

  it("has desktop_mouse_keyboard as lowest priority (fallback)", () => {
    expect(PERSONAL_OPERATOR_ACTION_PRIORITY[PERSONAL_OPERATOR_ACTION_PRIORITY.length - 1]).toBe(
      "desktop_mouse_keyboard",
    );
  });
});
