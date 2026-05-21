// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { Agent } from "@paperclipai/shared";
import { buildFallbackOrgTree } from "./OrgChart";

function makeAgent(overrides: Partial<Agent> & Pick<Agent, "id" | "name" | "role">): Agent {
  const base = {
    companyId: "company-1",
    name: "Agent",
    role: "general",
    title: null,
    status: "active",
    reportsTo: null,
    capabilities: null,
    adapterType: "codex_local",
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    contextMode: "thin",
    lastHeartbeatAt: null,
    icon: null,
    urlKey: overrides.name.toLowerCase(),
    createdAt: new Date("2026-05-19T00:00:00.000Z"),
    updatedAt: new Date("2026-05-19T00:00:00.000Z"),
  };
  return { ...base, ...overrides } as Agent;
}

describe("buildFallbackOrgTree", () => {
  it("keeps orphaned agents as roots instead of dropping them", () => {
    const agents = [
      makeAgent({ id: "ceo", name: "CEO", role: "ceo" }),
      makeAgent({ id: "orphan", name: "Orphan", role: "engineer", reportsTo: "missing-manager" }),
    ];

    const tree = buildFallbackOrgTree(agents);

    expect(tree).toHaveLength(2);
    expect(tree.map((node) => node.id)).toEqual(expect.arrayContaining(["ceo", "orphan"]));
  });

  it("breaks reporting cycles by promoting one side back to a root", () => {
    const agents = [
      makeAgent({ id: "a", name: "Lead A", role: "general", reportsTo: "b" }),
      makeAgent({ id: "b", name: "Lead B", role: "general", reportsTo: "a" }),
    ];

    const tree = buildFallbackOrgTree(agents);

    expect(tree.length).toBeGreaterThan(0);
    expect(tree.map((node) => node.id)).toEqual(expect.arrayContaining(["a", "b"]));
  });
});
