import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../../..");

const ROOT_DOCS = [
  "README.md",
  "PRD.md",
  "ARCHITECTURE.md",
  "BACKEND.md",
  "FRONTEND.md",
  "API.md",
  "DATABASE.md",
  "DEPLOYMENT.md",
  "AUTH.md",
];

// ---------------------------------------------------------------------------
// Doc existence
// ---------------------------------------------------------------------------
describe("Root documentation files exist", () => {
  for (const doc of ROOT_DOCS) {
    it(`${doc} exists`, () => {
      const filePath = path.join(ROOT, doc);
      expect(fs.existsSync(filePath), `${doc} should exist at repo root`).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// Key content checks
// ---------------------------------------------------------------------------
describe("Root documentation key content", () => {
  function readDoc(name: string) {
    return fs.readFileSync(path.join(ROOT, name), "utf8");
  }

  it("README.md mentions Personal AI", () => {
    expect(readDoc("README.md")).toContain("Personal AI");
  });

  it("README.md has quickstart section", () => {
    expect(readDoc("README.md")).toContain("Quickstart");
  });

  it("README.md references companion docs", () => {
    const content = readDoc("README.md");
    expect(content).toContain("PRD.md");
    expect(content).toContain("ARCHITECTURE.md");
    expect(content).toContain("AUTH.md");
  });

  it("PRD.md has Personal AI Operator section", () => {
    expect(readDoc("PRD.md")).toContain("Personal AI Operator");
  });

  it("PRD.md has permissions section", () => {
    expect(readDoc("PRD.md")).toContain("Permission");
  });

  it("PRD.md has non-goals section", () => {
    expect(readDoc("PRD.md")).toContain("Non-Goals");
  });

  it("ARCHITECTURE.md has system overview", () => {
    const content = readDoc("ARCHITECTURE.md");
    expect(content).toContain("System Overview");
  });

  it("ARCHITECTURE.md has trust boundaries", () => {
    expect(readDoc("ARCHITECTURE.md")).toContain("Trust Boundaries");
  });

  it("ARCHITECTURE.md contains mermaid diagram", () => {
    expect(readDoc("ARCHITECTURE.md")).toContain("```mermaid");
  });

  it("BACKEND.md has route organization", () => {
    expect(readDoc("BACKEND.md")).toContain("Route Organization");
  });

  it("BACKEND.md references personal operator", () => {
    expect(readDoc("BACKEND.md")).toContain("personal-operator");
  });

  it("FRONTEND.md mentions PersonalAI page", () => {
    expect(readDoc("FRONTEND.md")).toContain("PersonalAI");
  });

  it("FRONTEND.md mentions sidebar", () => {
    expect(readDoc("FRONTEND.md")).toContain("Sidebar");
  });

  it("API.md lists personal operator endpoints", () => {
    const content = readDoc("API.md");
    expect(content).toContain("/api/personal-operator/profile");
    expect(content).toContain("/api/personal-operator/runs");
  });

  it("API.md documents secret ref contract", () => {
    expect(readDoc("API.md")).toContain("secret_ref");
  });

  it("DATABASE.md lists personal AI tables", () => {
    const content = readDoc("DATABASE.md");
    expect(content).toContain("personal_operator_profiles");
    expect(content).toContain("personal_operator_runs");
    expect(content).toContain("personal_operator_actions");
  });

  it("DATABASE.md has secret invariants", () => {
    expect(readDoc("DATABASE.md")).toContain("Secret Invariants");
  });

  it("DEPLOYMENT.md mentions daemon", () => {
    const content = readDoc("DEPLOYMENT.md");
    expect(content).toContain("Daemon");
    expect(content).toContain("127.0.0.1");
  });

  it("DEPLOYMENT.md has environment variables", () => {
    expect(readDoc("DEPLOYMENT.md")).toContain("Environment Variable");
  });

  it("AUTH.md has board access section", () => {
    expect(readDoc("AUTH.md")).toContain("Board Access");
  });

  it("AUTH.md has daemon auth section", () => {
    expect(readDoc("AUTH.md")).toContain("Daemon Auth");
  });

  it("AUTH.md has secret handling section", () => {
    expect(readDoc("AUTH.md")).toContain("Secret Handling");
  });
});

// ---------------------------------------------------------------------------
// No raw API key patterns in docs
// ---------------------------------------------------------------------------
describe("No raw API keys in documentation", () => {
  const RAW_KEY_PATTERNS = [
    /sk-[a-zA-Z0-9]{20,}/,
    /sk-or-v1-[a-zA-Z0-9]{20,}/,
    /sk-ant-[a-zA-Z0-9]{20,}/,
    /AIza[a-zA-Z0-9_-]{30,}/,
    /ghp_[a-zA-Z0-9]{30,}/,
    /ghu_[a-zA-Z0-9]{30,}/,
  ];

  for (const doc of ROOT_DOCS) {
    it(`${doc} contains no raw API key patterns`, () => {
      const content = fs.readFileSync(path.join(ROOT, doc), "utf8");
      for (const pattern of RAW_KEY_PATTERNS) {
        expect(content).not.toMatch(pattern);
      }
    });
  }
});
