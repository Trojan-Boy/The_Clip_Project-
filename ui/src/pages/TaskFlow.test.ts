// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { Agent, Issue } from "@paperclipai/shared";
import { buildTaskFlowDag } from "./TaskFlow";

function makeIssue(overrides: Partial<Issue> & Pick<Issue, "id" | "title">): Issue {
  const base = {
    companyId: "company-1",
    projectId: null,
    goalId: null,
    parentId: null,
    title: "Task",
    description: null,
    status: "todo",
    priority: "medium",
    assigneeAgentId: null,
    assigneeUserId: null,
    createdByAgentId: null,
    createdByUserId: null,
    requestDepth: 0,
    issueNumber: 1,
    identifier: "POL-1",
    billingCode: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    checkoutRunId: null,
    executionRunId: null,
    lastCommentAt: null,
    hiddenAt: null,
    createdAt: new Date("2026-05-19T00:00:00.000Z"),
    updatedAt: new Date("2026-05-19T00:00:00.000Z"),
  };
  return { ...base, ...overrides } as Issue;
}

describe("buildTaskFlowDag", () => {
  it("keeps detached tasks visible at the top level", () => {
    const issues = [
      makeIssue({ id: "root", title: "Root task", identifier: "POL-1", issueNumber: 1 }),
      makeIssue({
        id: "detached",
        title: "Detached task",
        identifier: "POL-2",
        issueNumber: 2,
        parentId: "missing-parent",
      }),
    ];

    const dag = buildTaskFlowDag(issues, new Map<string, Agent>());

    expect(dag.nodes).toHaveLength(2);
    expect(dag.detachedCount).toBe(0);
    expect(dag.nodes.map((node) => node.id)).toEqual(expect.arrayContaining(["root", "detached"]));
  });

  it("ignores cyclic edges but still renders the participating issues", () => {
    const issues = [
      makeIssue({ id: "a", title: "Task A", identifier: "POL-1", issueNumber: 1, parentId: "b" }),
      makeIssue({ id: "b", title: "Task B", identifier: "POL-2", issueNumber: 2, parentId: "a" }),
    ];

    const dag = buildTaskFlowDag(issues, new Map<string, Agent>());

    expect(dag.nodes).toHaveLength(2);
    expect(dag.cycleCount).toBeGreaterThan(0);
    expect(dag.edges.length).toBeLessThan(2);
    expect(dag.edges.every((edge) => edge.from !== edge.to)).toBe(true);
  });
});
