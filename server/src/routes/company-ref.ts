import type { Router } from "express";
import type { Db } from "@paperclipai/db";
import { companies } from "@paperclipai/db";
import { isUuidLike } from "@paperclipai/shared";
import { sql } from "drizzle-orm";
import { notFound } from "../errors.js";

const COMPANY_ISSUE_PREFIX_REF = /^[a-z][a-z0-9]{1,9}$/i;

export async function resolveCompanyIdReference(db: Db, companyRef: string): Promise<string | null> {
  const raw = companyRef.trim();
  if (!raw) return null;
  if (isUuidLike(raw)) return raw;
  if (!COMPANY_ISSUE_PREFIX_REF.test(raw)) return raw;
  const match = await db
    .select({ id: companies.id })
    .from(companies)
    .where(sql`lower(${companies.issuePrefix}) = ${raw.toLowerCase()}`)
    .limit(1)
    .then((rows) => rows[0] ?? null);
  return match?.id ?? null;
}

export async function normalizeCompanyReference(db: Db, companyRef: string): Promise<string> {
  const resolved = await resolveCompanyIdReference(db, companyRef);
  if (!resolved) throw notFound("Company not found");
  return resolved;
}

export function installCompanyIdParamNormalizer(router: Router, db: Db) {
  router.param("companyId", async (req, _res, next, rawCompanyId) => {
    try {
      req.params.companyId = await normalizeCompanyReference(db, rawCompanyId);
      next();
    } catch (err) {
      next(err);
    }
  });
}
