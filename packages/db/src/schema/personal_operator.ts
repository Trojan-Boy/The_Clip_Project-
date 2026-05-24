import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const personalOperatorProfiles = pgTable(
  "personal_operator_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    defaultAdapterType: text("default_adapter_type").notNull().default("openrouter"),
    defaultAdapterConfig: jsonb("default_adapter_config").$type<Record<string, unknown>>().notNull().default({}),
    daemonEnabled: boolean("daemon_enabled").notNull().default(false),
    browserControlEnabled: boolean("browser_control_enabled").notNull().default(false),
    desktopControlEnabled: boolean("desktop_control_enabled").notNull().default(false),
    screenshotVisionEnabled: boolean("screenshot_vision_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userUq: uniqueIndex("personal_operator_profiles_user_uq").on(table.userId),
  }),
);

export const personalOperatorCompanyPermissions = pgTable(
  "personal_operator_company_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    readEnabled: boolean("read_enabled").notNull().default(false),
    writeEnabled: boolean("write_enabled").notNull().default(false),
    browserControlEnabled: boolean("browser_control_enabled").notNull().default(false),
    desktopControlEnabled: boolean("desktop_control_enabled").notNull().default(false),
    approvalRequired: boolean("approval_required").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userCompanyUq: uniqueIndex("personal_operator_company_permissions_user_company_uq").on(
      table.userId,
      table.companyId,
    ),
    companyIdx: index("personal_operator_company_permissions_company_idx").on(table.companyId),
  }),
);

export const personalOperatorSessions = pgTable(
  "personal_operator_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    status: text("status").notNull().default("active"),
    daemonBaseUrl: text("daemon_base_url").notNull().default("http://127.0.0.1:3177"),
    daemonTokenHash: text("daemon_token_hash"),
    daemonTokenExpiresAt: timestamp("daemon_token_expires_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userStatusIdx: index("personal_operator_sessions_user_status_idx").on(table.userId, table.status),
  }),
);

export const personalOperatorRuns = pgTable(
  "personal_operator_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    sessionId: uuid("session_id").references(() => personalOperatorSessions.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    status: text("status").notNull().default("queued"),
    adapterType: text("adapter_type").notNull(),
    adapterConfig: jsonb("adapter_config").$type<Record<string, unknown>>().notNull().default({}),
    prompt: text("prompt").notNull(),
    summary: text("summary"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userCreatedIdx: index("personal_operator_runs_user_created_idx").on(table.userId, table.createdAt),
    companyCreatedIdx: index("personal_operator_runs_company_created_idx").on(table.companyId, table.createdAt),
  }),
);

export const personalOperatorActions = pgTable(
  "personal_operator_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id").notNull().references(() => personalOperatorRuns.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    method: text("method").notNull(),
    target: text("target"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    result: jsonb("result").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").notNull().default("queued"),
    requiresApproval: boolean("requires_approval").notNull().default(true),
    approvalId: uuid("approval_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    runIdx: index("personal_operator_actions_run_idx").on(table.runId, table.createdAt),
    companyIdx: index("personal_operator_actions_company_idx").on(table.companyId, table.createdAt),
  }),
);

export const personalOperatorScreenshots = pgTable(
  "personal_operator_screenshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id").references(() => personalOperatorRuns.id, { onDelete: "cascade" }),
    actionId: uuid("action_id").references(() => personalOperatorActions.id, { onDelete: "set null" }),
    userId: text("user_id").notNull(),
    storageProvider: text("storage_provider").notNull().default("metadata_only"),
    objectKey: text("object_key"),
    sha256: text("sha256"),
    width: integer("width"),
    height: integer("height"),
    redactionState: text("redaction_state").notNull().default("metadata_only"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    runIdx: index("personal_operator_screenshots_run_idx").on(table.runId, table.createdAt),
  }),
);
