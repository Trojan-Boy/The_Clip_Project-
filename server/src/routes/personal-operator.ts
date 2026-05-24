import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  createPersonalOperatorRunSchema,
  createPersonalOperatorSessionSchema,
  daemonHealthQuerySchema,
  recordPersonalOperatorActionSchema,
  recordPersonalOperatorScreenshotSchema,
  updatePersonalOperatorProfileSchema,
  upsertPersonalOperatorCompanyPermissionSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { badRequest, notFound } from "../errors.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { assertLoopbackDaemonUrl, logActivity, personalOperatorService } from "../services/index.js";

function boardUserId(req: Parameters<typeof assertBoard>[0]) {
  return req.actor.userId ?? "local-board";
}

export function personalOperatorRoutes(db: Db) {
  const router = Router();
  const svc = personalOperatorService(db);

  router.get("/personal-operator/profile", async (req, res) => {
    assertBoard(req);
    res.json(await svc.getProfile(boardUserId(req)));
  });

  router.patch("/personal-operator/profile", validate(updatePersonalOperatorProfileSchema), async (req, res) => {
    assertBoard(req);
    res.json(await svc.updateProfile(boardUserId(req), req.body));
  });

  router.get("/personal-operator/permissions", async (req, res) => {
    assertBoard(req);
    res.json(await svc.listPermissions(boardUserId(req)));
  });

  router.put(
    "/personal-operator/permissions/:companyId",
    validate(upsertPersonalOperatorCompanyPermissionSchema),
    async (req, res) => {
      assertBoard(req);
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const permission = await svc.upsertPermission(boardUserId(req), companyId, req.body);
      await logActivity(db, {
        companyId,
        actorType: "user",
        actorId: boardUserId(req),
        action: "personal_operator.permission_updated",
        entityType: "personal_operator_permission",
        entityId: permission.id,
        details: {
          readEnabled: permission.readEnabled,
          writeEnabled: permission.writeEnabled,
          browserControlEnabled: permission.browserControlEnabled,
          desktopControlEnabled: permission.desktopControlEnabled,
          approvalRequired: permission.approvalRequired,
        },
      });
      res.json(permission);
    },
  );

  router.post("/personal-operator/sessions", validate(createPersonalOperatorSessionSchema), async (req, res) => {
    assertBoard(req);
    const session = await svc.createSession(boardUserId(req), req.body);
    res.status(201).json(session);
  });

  router.post("/personal-operator/sessions/:sessionId/daemon-token", async (req, res) => {
    assertBoard(req);
    const token = await svc.createDaemonToken(boardUserId(req), req.params.sessionId as string);
    if (!token) throw notFound("Personal operator session not found");
    res.json(token);
  });

  router.get("/personal-operator/runs", async (req, res) => {
    assertBoard(req);
    res.json(await svc.listRuns(boardUserId(req)));
  });

  router.post("/personal-operator/runs", validate(createPersonalOperatorRunSchema), async (req, res) => {
    assertBoard(req);
    if (req.body.companyId) assertCompanyAccess(req, req.body.companyId);
    const run = await svc.createRun(boardUserId(req), req.body);
    if (run.companyId) {
      await logActivity(db, {
        companyId: run.companyId,
        actorType: "user",
        actorId: boardUserId(req),
        action: "personal_operator.run_created",
        entityType: "personal_operator_run",
        entityId: run.id,
        details: { adapterType: run.adapterType, status: run.status },
      });
    }
    res.status(201).json(run);
  });

  router.post(
    "/personal-operator/runs/:runId/actions",
    validate(recordPersonalOperatorActionSchema),
    async (req, res) => {
      assertBoard(req);
      if (req.body.companyId) assertCompanyAccess(req, req.body.companyId);
      const action = await svc.recordAction(boardUserId(req), req.params.runId as string, req.body);
      if (action.companyId) {
        await logActivity(db, {
          companyId: action.companyId,
          actorType: "user",
          actorId: boardUserId(req),
          action: "personal_operator.action_recorded",
          entityType: "personal_operator_action",
          entityId: action.id,
          details: {
            kind: action.kind,
            method: action.method,
            status: action.status,
            requiresApproval: action.requiresApproval,
          },
        });
      }
      res.status(201).json(action);
    },
  );

  router.post(
    "/personal-operator/runs/:runId/screenshots",
    validate(recordPersonalOperatorScreenshotSchema),
    async (req, res) => {
      assertBoard(req);
      const screenshot = await svc.recordScreenshot(boardUserId(req), req.params.runId as string, req.body);
      res.status(201).json(screenshot);
    },
  );

  router.get("/personal-operator/daemon/health", async (req, res) => {
    assertBoard(req);
    const parsed = daemonHealthQuerySchema.parse(req.query);
    const baseUrl = parsed.baseUrl ?? "http://127.0.0.1:3177";
    const url = assertLoopbackDaemonUrl(baseUrl);
    url.pathname = "/health";
    url.search = "";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3_000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const body = await response.json().catch(() => ({}));
      res.status(response.ok ? 200 : 502).json({ ok: response.ok, daemon: body });
    } catch (error) {
      throw badRequest(error instanceof Error ? error.message : "Unable to reach personal operator daemon");
    } finally {
      clearTimeout(timer);
    }
  });

  return router;
}
