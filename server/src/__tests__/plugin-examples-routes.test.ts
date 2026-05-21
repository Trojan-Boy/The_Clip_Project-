import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { pluginRoutes } from "../routes/plugins.js";

async function createApp() {
  const app = express();
  app.use((req, _res, next) => {
    req.actor = {
      type: "board",
      source: "local_implicit",
      userId: "board-1",
      companyIds: [],
      isInstanceAdmin: true,
      runId: null,
    };
    next();
  });
  app.use("/api", pluginRoutes({} as any, {} as any));
  return app;
}

describe("plugin example routes", () => {
  it("lists bundled example plugins including graph/rag/swarm examples", async () => {
    const app = await createApp();
    const res = await request(app).get("/api/plugins/examples");

    expect(res.status).toBe(200);
    expect(res.body.map((entry: { packageName: string }) => entry.packageName)).toEqual(
      expect.arrayContaining([
        "@paperclipai/plugin-rag-memory",
        "@paperclipai/plugin-graph-search",
        "@paperclipai/plugin-swarm-coordinator",
      ]),
    );
  });
});
