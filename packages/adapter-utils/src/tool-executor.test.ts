import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeToolCall, type ToolExecutorContext } from "./tool-executor.js";

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
  return {
    ok,
    status,
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

describe("executeToolCall", () => {
  const ctx: ToolExecutorContext = {
    authToken: "token-1",
    apiBaseUrl: "http://paperclip.test",
    agentId: "agent-1",
    companyId: "company-1",
    cwd: process.cwd(),
    onLog: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("posts and blocks a clarification request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: "comment-1" }))
      .mockResolvedValueOnce(jsonResponse({ id: "issue-1", status: "blocked" }))
      .mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeToolCall(
      {
        name: "paperclip_request_clarification",
        arguments: {
          issueId: "issue-1",
          questions: ["Which API should this use?", "What is the success criterion?"],
          assumptions: "I will use the existing REST API.",
        },
      },
      ctx,
    );

    expect(result.isError).toBe(false);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://paperclip.test/api/issues/issue-1/comments",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token-1" }),
        body: expect.stringContaining("Which API should this use?"),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://paperclip.test/api/issues/issue-1",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("\"status\":\"blocked\""),
      }),
    );
  });

  it("rejects clarification requests without questions", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeToolCall(
      {
        name: "paperclip_request_clarification",
        arguments: {
          issueId: "issue-1",
          questions: [],
        },
      },
      ctx,
    );

    expect(result.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
