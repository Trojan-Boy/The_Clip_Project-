// Database models for Compliance-as-a-Service platform

import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, integer, uuid, varchar, jsonb, index } from "drizzle-orm/pg-schema";
import { relations } from "drizzle-orm";
import { users } from "./user-models";

// Organization table
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 100 }),
  employeeCount: integer("employee_count"),
  regulations: jsonb("regulations").default([]),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => {
  return {
    nameIndex: index("organizations_name_idx").on(table.name),
    industryIndex: index("organizations_industry_idx").on(table.industry),
  };
});

// User table (extended)
export const complianceUsers = pgTable("compliance_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  role: varchar("role", { length: 50 }).notNull().default("member"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => {
  return {
    emailIndex: index("compliance_users_email_idx").on(table.email),
    orgIndex: index("compliance_users_org_idx").on(table.organizationId),
  };
});

// Compliance checklist table
export const complianceChecklists = pgTable("compliance_checklists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  regulation: varchar("regulation", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  items: jsonb("items").default([]),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => {
  return {
    orgIndex: index("checklists_org_idx").on(table.organizationId),
    regulationIndex: index("checklists_regulation_idx").on(table.regulation),
    statusIndex: index("checklists_status_idx").on(table.status),
  };
});

// Document table
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  content: text("content"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => {
  return {
    orgIndex: index("documents_org_idx").on(table.organizationId),
    typeIndex: index("documents_type_idx").on(table.type),
  };
});

// Audit trail table
export const auditTrail = pgTable("audit_trail", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  userId: uuid("user_id").references(() => complianceUsers.id),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 100 }).notNull(),
  resourceId: uuid("resource_id").notNull(),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  details: jsonb("details").default({}),
}, (table) => {
  return {
    orgIndex: index("audit_trail_org_idx").on(table.organizationId),
    userIndex: index("audit_trail_user_idx").on(table.userId),
    actionIndex: index("audit_trail_action_idx").on(table.action),
    timestampIndex: index("audit_trail_timestamp_idx").on(table.timestamp),
  };
});

// Regulation table
export const regulations = pgTable("regulations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  applicableIndustries: jsonb("applicable_industries").default([]),
  requirements: jsonb("requirements").default([]),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => {
  return {
    nameIndex: index("regulations_name_idx").on(table.name),
  };
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(complianceUsers),
  checklists: many(complianceChecklists),
  documents: many(documents),
  auditTrail: many(auditTrail),
}));

export const complianceUsersRelations = relations(complianceUsers, ({ one }) => ({
  organization: one(organizations, {
    fields: [complianceUsers.organizationId],
    references: [organizations.id],
  }),
}));

export const complianceChecklistsRelations = relations(complianceChecklists, ({ one }) => ({
  organization: one(organizations, {
    fields: [complianceChecklists.organizationId],
    references: [organizations.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  organization: one(organizations, {
    fields: [documents.organizationId],
    references: [organizations.id],
  }),
}));

export const auditTrailRelations = relations(auditTrail, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditTrail.organizationId],
    references: [organizations.id],
  }),
  user: one(complianceUsers, {
    fields: [auditTrail.userId],
    references: [complianceUsers.id],
  }),
}));

export const regulationsRelations = relations(regulations, ({ many }) => ({
  // This table is likely to be referenced but we won't create reverse relations for it
}));