import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  personalOperatorActions,
  personalOperatorCompanyPermissions,
  personalOperatorProfiles,
  personalOperatorRuns,
  personalOperatorScreenshots,
  personalOperatorSessions,
} from "@paperclipai/db";
import {
  assertNoRawPersonalOperatorSecrets,
  type CreatePersonalOperatorRun,
  type CreatePersonalOperatorSession,
  type RecordPersonalOperatorAction,
  type RecordPersonalOperatorScreenshot,
  type UpdatePersonalOperatorProfile,
  type UpsertPersonalOperatorCompanyPermission,
} from "@paperclipai/shared";
import { forbidden } from "../errors.js";

export const PERSONAL_OPERATOR_ACTION_PRIORITY = [
  "paperclip_api",
  "browser_dom",
  "browser_accessibility",
  "screenshot_vision",
  "desktop_mouse_keyboard",
] as const;

const DEFAULT_DAEMON_BASE_URL = "http://127.0.0.1:3177";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function redactPersonalOperatorSecrets(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactPersonalOperatorSecrets);
  const record = value as Record<string, unknown>;
  if (record.type === "secret_ref") {
    return { type: "secret_ref", secretId: "[redacted]", version: record.version ?? "latest" };
  }
  return Object.fromEntries(
    Object.entries(record).map(([key, child]) => {
      if (/api[_\-.]?key|token|secret|password|authorization|cookie/i.test(key)) {
        return [key, "[redacted]"];
      }
      return [key, redactPersonalOperatorSecrets(child)];
    }),
  );
}

export function assertLoopbackDaemonUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  const allowedHosts = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
  if (!["http:", "https:"].includes(url.protocol) || !allowedHosts.has(url.hostname)) {
    throw forbidden("Personal operator daemon URLs must target a loopback host");
  }
  return url;
}

export function personalOperatorService(db: Db) {
  async function getProfileRow(userId: string) {
    return db
      .select()
      .from(personalOperatorProfiles)
      .where(eq(personalOperatorProfiles.userId, userId))
      .then((rows) => rows[0] ?? null);
  }

  async function getPermission(userId: string, companyId: string) {
    return db
      .select()
      .from(personalOperatorCompanyPermissions)
      .where(
        and(
          eq(personalOperatorCompanyPermissions.userId, userId),
          eq(personalOperatorCompanyPermissions.companyId, companyId),
        ),
      )
      .then((rows) => rows[0] ?? null);
  }

  return {
    getProfile: async (userId: string) =>
      await getProfileRow(userId) ?? {
        id: null,
        userId,
        enabled: false,
        defaultAdapterType: "openrouter",
        defaultAdapterConfig: {},
        daemonEnabled: false,
        browserControlEnabled: false,
        desktopControlEnabled: false,
        screenshotVisionEnabled: true,
        createdAt: null,
        updatedAt: null,
      },

    updateProfile: async (userId: string, patch: UpdatePersonalOperatorProfile) => {
      if (patch.defaultAdapterConfig) {
        assertNoRawPersonalOperatorSecrets(patch.defaultAdapterConfig);
      }
      const current = await getProfileRow(userId);
      const now = new Date();
      const values = {
        enabled: patch.enabled ?? current?.enabled ?? false,
        defaultAdapterType: patch.defaultAdapterType ?? current?.defaultAdapterType ?? "openrouter",
        defaultAdapterConfig: patch.defaultAdapterConfig ?? current?.defaultAdapterConfig ?? {},
        daemonEnabled: patch.daemonEnabled ?? current?.daemonEnabled ?? false,
        browserControlEnabled: patch.browserControlEnabled ?? current?.browserControlEnabled ?? false,
        desktopControlEnabled: patch.desktopControlEnabled ?? current?.desktopControlEnabled ?? false,
        screenshotVisionEnabled: patch.screenshotVisionEnabled ?? current?.screenshotVisionEnabled ?? true,
        updatedAt: now,
      };
      const [row] = await db
        .insert(personalOperatorProfiles)
        .values({ userId, ...values, createdAt: now })
        .onConflictDoUpdate({
          target: [personalOperatorProfiles.userId],
          set: values,
        })
        .returning();
      return row;
    },

    listPermissions: (userId: string) =>
      db
        .select()
        .from(personalOperatorCompanyPermissions)
        .where(eq(personalOperatorCompanyPermissions.userId, userId)),

    upsertPermission: async (
      userId: string,
      companyId: string,
      patch: UpsertPersonalOperatorCompanyPermission,
    ) => {
      const current = await getPermission(userId, companyId);
      const now = new Date();
      const values = {
        readEnabled: patch.readEnabled ?? current?.readEnabled ?? false,
        writeEnabled: patch.writeEnabled ?? current?.writeEnabled ?? false,
        browserControlEnabled: patch.browserControlEnabled ?? current?.browserControlEnabled ?? false,
        desktopControlEnabled: patch.desktopControlEnabled ?? current?.desktopControlEnabled ?? false,
        approvalRequired: patch.approvalRequired ?? current?.approvalRequired ?? true,
        updatedAt: now,
      };
      const [row] = await db
        .insert(personalOperatorCompanyPermissions)
        .values({ userId, companyId, ...values, createdAt: now })
        .onConflictDoUpdate({
          target: [personalOperatorCompanyPermissions.userId, personalOperatorCompanyPermissions.companyId],
          set: values,
        })
        .returning();
      return row;
    },

    assertCompanyAllowed: async (
      userId: string,
      companyId: string,
      mode: "read" | "write" | "browser" | "desktop",
    ) => {
      const profile = await getProfileRow(userId);
      if (!profile?.enabled) throw forbidden("Personal AI Operator is disabled");
      const permission = await getPermission(userId, companyId);
      if (!permission?.readEnabled) throw forbidden("Personal AI is not allowed for this company");
      if (mode === "write" && !permission.writeEnabled) throw forbidden("Personal AI write access is not allowed");
      if (mode === "browser" && (!profile.browserControlEnabled || !permission.browserControlEnabled)) {
        throw forbidden("Personal AI browser control is not allowed");
      }
      if (mode === "desktop" && (!profile.desktopControlEnabled || !permission.desktopControlEnabled)) {
        throw forbidden("Personal AI desktop control is not allowed");
      }
      return permission;
    },

    createSession: async (userId: string, input: CreatePersonalOperatorSession) => {
      const daemonBaseUrl = input.daemonBaseUrl ?? DEFAULT_DAEMON_BASE_URL;
      assertLoopbackDaemonUrl(daemonBaseUrl);
      const [row] = await db
        .insert(personalOperatorSessions)
        .values({ userId, daemonBaseUrl })
        .returning();
      return row;
    },

    createDaemonToken: async (userId: string, sessionId: string, ttlSeconds = 300) => {
      const token = `pco_${crypto.randomBytes(32).toString("base64url")}`;
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      const [row] = await db
        .update(personalOperatorSessions)
        .set({
          daemonTokenHash: hashToken(token),
          daemonTokenExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(and(eq(personalOperatorSessions.id, sessionId), eq(personalOperatorSessions.userId, userId)))
        .returning();
      return row ? { token, expiresAt } : null;
    },

    verifyDaemonToken: async (sessionId: string, token: string) => {
      const row = await db
        .select()
        .from(personalOperatorSessions)
        .where(eq(personalOperatorSessions.id, sessionId))
        .then((rows) => rows[0] ?? null);
      if (!row?.daemonTokenHash || !row.daemonTokenExpiresAt) return false;
      if (row.daemonTokenExpiresAt.getTime() < Date.now()) return false;
      return row.daemonTokenHash === hashToken(token);
    },

    listRuns: (userId: string) =>
      db
        .select()
        .from(personalOperatorRuns)
        .where(eq(personalOperatorRuns.userId, userId))
        .orderBy(desc(personalOperatorRuns.createdAt))
        .limit(50),

    createRun: async (userId: string, input: CreatePersonalOperatorRun) => {
      if (input.adapterConfig) assertNoRawPersonalOperatorSecrets(input.adapterConfig);
      const profile = await getProfileRow(userId);
      if (!profile?.enabled) throw forbidden("Personal AI Operator is disabled");
      if (input.companyId) {
        await (personalOperatorService(db)).assertCompanyAllowed(userId, input.companyId, "read");
      }
      const [row] = await db
        .insert(personalOperatorRuns)
        .values({
          userId,
          sessionId: input.sessionId ?? null,
          companyId: input.companyId ?? null,
          prompt: input.prompt,
          adapterType: input.adapterType ?? profile.defaultAdapterType,
          adapterConfig: input.adapterConfig ?? profile.defaultAdapterConfig,
        })
        .returning();
      return row;
    },

    recordAction: async (userId: string, runId: string, input: RecordPersonalOperatorAction) => {
      if (input.payload) assertNoRawPersonalOperatorSecrets(input.payload);
      if (input.result) assertNoRawPersonalOperatorSecrets(input.result);
      if (input.companyId) {
        const mode = input.method === "desktop_mouse_keyboard"
          ? "desktop"
          : input.method === "browser_dom" || input.method === "browser_accessibility"
            ? "browser"
            : input.status === "succeeded"
              ? "write"
              : "read";
        await (personalOperatorService(db)).assertCompanyAllowed(userId, input.companyId, mode);
      }
      const [row] = await db
        .insert(personalOperatorActions)
        .values({
          runId,
          userId,
          companyId: input.companyId ?? null,
          kind: input.kind,
          method: input.method,
          target: input.target ?? null,
          payload: redactPersonalOperatorSecrets(input.payload ?? {}) as Record<string, unknown>,
          result: redactPersonalOperatorSecrets(input.result ?? {}) as Record<string, unknown>,
          status: input.status,
          requiresApproval: input.requiresApproval ?? true,
          approvalId: input.approvalId ?? null,
          error: input.error ?? null,
        })
        .returning();
      return row;
    },

    recordScreenshot: async (userId: string, runId: string, input: RecordPersonalOperatorScreenshot) => {
      const [row] = await db
        .insert(personalOperatorScreenshots)
        .values({
          runId,
          actionId: input.actionId ?? null,
          userId,
          storageProvider: input.storageProvider,
          objectKey: input.objectKey ? "[redacted]" : null,
          sha256: input.sha256 ?? null,
          width: input.width ?? null,
          height: input.height ?? null,
          redactionState: input.redactionState,
        })
        .returning();
      return row;
    },
  };
}
