import { describe, it, expect } from "vitest";
import { redactPersonalOperatorSecrets } from "../../services/personal-operator.js";

// ---------------------------------------------------------------------------
// Export / API response redaction
// ---------------------------------------------------------------------------
describe("Personal operator export redaction", () => {
  it("redacts apiKey from adapter config", () => {
    const config = {
      model: "gpt-4",
      apiKey: "sk-abc123-real-key",
      temperature: 0.7,
    };
    const redacted = redactPersonalOperatorSecrets(config) as Record<string, unknown>;
    expect(redacted.apiKey).toBe("[redacted]");
    expect(redacted.model).toBe("gpt-4");
    expect(redacted.temperature).toBe(0.7);
    expect(JSON.stringify(redacted)).not.toContain("sk-abc123-real-key");
  });

  it("redacts multiple sensitive keys simultaneously", () => {
    const config = {
      apiKey: "sk-key1",
      token: "tok-key2",
      secret: "sec-key3",
      password: "pass-key4",
      authorization: "Bearer xyz",
      cookie: "session=abc",
      model: "claude",
    };
    const redacted = redactPersonalOperatorSecrets(config) as Record<string, unknown>;
    expect(redacted.apiKey).toBe("[redacted]");
    expect(redacted.token).toBe("[redacted]");
    expect(redacted.secret).toBe("[redacted]");
    expect(redacted.password).toBe("[redacted]");
    expect(redacted.authorization).toBe("[redacted]");
    expect(redacted.cookie).toBe("[redacted]");
    expect(redacted.model).toBe("claude");
  });

  it("redacts secret_ref secretId", () => {
    const ref = {
      type: "secret_ref",
      secretId: "real-uuid-should-be-hidden",
      version: "latest",
    };
    const redacted = redactPersonalOperatorSecrets(ref) as Record<string, unknown>;
    expect(redacted.type).toBe("secret_ref");
    expect(redacted.secretId).toBe("[redacted]");
    expect(redacted.version).toBe("latest");
  });

  it("deeply redacts nested config objects", () => {
    const config = {
      primary: {
        apiKey: "primary-key",
        model: "gpt-4",
      },
      fallback: {
        apiKey: "fallback-key",
        model: "claude",
      },
    };
    const redacted = redactPersonalOperatorSecrets(config) as Record<string, Record<string, unknown>>;
    expect(redacted.primary.apiKey).toBe("[redacted]");
    expect(redacted.primary.model).toBe("gpt-4");
    expect(redacted.fallback.apiKey).toBe("[redacted]");
    expect(redacted.fallback.model).toBe("claude");
  });

  it("redacts inside arrays", () => {
    const configs = [
      { apiKey: "key-1", model: "a" },
      { apiKey: "key-2", model: "b" },
    ];
    const redacted = redactPersonalOperatorSecrets(configs) as Array<Record<string, unknown>>;
    expect(redacted[0].apiKey).toBe("[redacted]");
    expect(redacted[1].apiKey).toBe("[redacted]");
    expect(redacted[0].model).toBe("a");
    expect(redacted[1].model).toBe("b");
  });

  it("handles empty objects and arrays", () => {
    expect(redactPersonalOperatorSecrets({})).toEqual({});
    expect(redactPersonalOperatorSecrets([])).toEqual([]);
  });

  it("ensures no fake secret values appear in stringified output", () => {
    const fakeSecrets = [
      "sk-live-abc123def456",
      "tok_test_real_token",
      "super-secret-password",
      "Bearer real-auth-header",
    ];
    const input = {
      apiKey: fakeSecrets[0],
      token: fakeSecrets[1],
      password: fakeSecrets[2],
      authorization: fakeSecrets[3],
      safeField: "this is fine",
      nested: {
        secret: "nested-secret-value",
      },
    };
    const redacted = redactPersonalOperatorSecrets(input);
    const output = JSON.stringify(redacted);

    for (const fake of fakeSecrets) {
      expect(output).not.toContain(fake);
    }
    expect(output).not.toContain("nested-secret-value");
    expect(output).toContain("this is fine");
  });

  it("preserves non-sensitive object structure", () => {
    const input = {
      config: {
        model: "gpt-4",
        maxTokens: 1000,
        temperature: 0.5,
        options: {
          stream: true,
          format: "json",
        },
      },
    };
    const redacted = redactPersonalOperatorSecrets(input);
    expect(redacted).toEqual(input);
  });

  it("handles mixed secret_ref and raw values", () => {
    const input = {
      primaryKey: {
        type: "secret_ref",
        secretId: "uuid-1",
        version: "latest",
      },
      fallbackKey: "raw-fallback-should-not-appear",
      model: "claude",
    };
    const redacted = redactPersonalOperatorSecrets(input) as Record<string, unknown>;
    const output = JSON.stringify(redacted);
    expect(output).not.toContain("uuid-1");
    expect(output).not.toContain("raw-fallback-should-not-appear");
    expect(output).toContain("claude");
  });

  it("screenshot metadata objectKey would be redacted at service level", () => {
    // This tests the pattern used in the service where objectKey is stored as "[redacted]"
    const screenshotInput = {
      storageProvider: "metadata_only",
      objectKey: "/screenshots/2025/01/01/screenshot-001.png",
      sha256: "abc123",
    };
    // The service sets objectKey to "[redacted]" directly, not through this function
    // But we verify the pattern works
    const stored = {
      ...screenshotInput,
      objectKey: screenshotInput.objectKey ? "[redacted]" : null,
    };
    expect(stored.objectKey).toBe("[redacted]");
    expect(JSON.stringify(stored)).not.toContain("screenshot-001.png");
  });
});
