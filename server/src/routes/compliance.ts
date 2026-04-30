import { Router } from "express";
import type { Request, Response } from "express";
import { and, eq, ilike, isNull, desc, asc } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  organizations,
  complianceUsers,
  complianceChecklists,
  documents,
  auditTrail,
  regulations,
} from "../models/compliance-models.js";
import {
  forbidden,
  unauthorized,
  notFound,
  conflict,
  badRequest,
} from "../errors.js";
import { assertCompanyAccess } from "./authz.js";
import { getActorInfo } from "./authz.js";

// Helper function to get the organization ID from the request or actor
function getOrganizationIdFromRequest(req: Request): string {
  // If organization ID is provided in the route parameters, use it
  if (req.params.orgId) {
    return req.params.orgId;
  }
  
  // If user has an organization, return it
  const actor = getActorInfo(req);
  if (actor.actorType === "user" && actor.agentId) {
    // This would need to be adjusted based on how we actually retrieve user's org
    // For now, we'll return a default or throw an error - this needs to be implemented
  }
  
  throw badRequest("Organization ID required for this endpoint");
}

export function complianceRoutes(db: Db) {
  const router = Router();

  // Health check endpoint
  router.get("/health", async (_req, res) => {
    res.json({ status: "ok", service: "compliance-api" });
  });

  // Organization endpoints
  router.post("/organizations", async (req, res) => {
    try {
      const { name, industry, employeeCount, regulations } = req.body;
      
      // Validate input
      if (!name) {
        throw badRequest("Organization name is required");
      }
      
      // Get the actor info to associate with the organization
      const actor = getActorInfo(req);
      
      // Create organization
      const [org] = await db.insert(organizations)
        .values({
          name,
          industry,
          employeeCount,
          regulations: regulations || [],
        })
        .returning();
      
      // Associate the creating user with the organization if they're not already
      // This is a simplified approach - in a real system we would need proper user association
      
      res.status(201).json(org);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create organization" });
      }
    }
  });

  router.get("/organizations/:orgId", async (req, res) => {
    try {
      const orgId = req.params.orgId;
      
      const org = await db.select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);
      
      if (org.length === 0) {
        throw notFound("Organization not found");
      }
      
      res.json(org[0]);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to fetch organization" });
      }
    }
  });

  router.put("/organizations/:orgId", async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const { name, industry, employeeCount, regulations } = req.body;
      
      const [org] = await db.update(organizations)
        .set({
          name,
          industry,
          employeeCount,
          regulations: regulations || [],
        })
        .where(eq(organizations.id, orgId))
        .returning();
      
      if (!org) {
        throw notFound("Organization not found");
      }
      
      res.json(org);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update organization" });
      }
    }
  });

  router.delete("/organizations/:orgId", async (req, res) => {
    try {
      const orgId = req.params.orgId;
      
      // First check if organization exists
      const existingOrg = await db.select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);
      
      if (existingOrg.length === 0) {
        throw notFound("Organization not found");
      }
      
      // Delete the organization
      await db.delete(organizations)
        .where(eq(organizations.id, orgId));
      
      res.json({ message: "Organization deleted successfully" });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to delete organization" });
      }
    }
  });

  // User management endpoints
  router.get("/organizations/:orgId/users", async (req, res) => {
    try {
      const orgId = req.params.orgId;
      
      const users = await db.select()
        .from(complianceUsers)
        .where(eq(complianceUsers.organizationId, orgId));
      
      res.json(users);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to fetch users" });
      }
    }
  });

  // Compliance data endpoints
  router.get("/organizations/:orgId/regulations", async (req, res) => {
    try {
      const orgId = req.params.orgId;
      
      // In a real implementation, this would filter based on organization's industry and employee count
      // For now, we'll return all regulations
      const regData = await db.select()
        .from(regulations);
      
      res.json(regData);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to fetch regulations" });
      }
    }
  });

  router.get("/organizations/:orgId/checklists", async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const { regulation, status } = req.query;
      
      let query = db.select()
        .from(complianceChecklists)
        .where(eq(complianceChecklists.organizationId, orgId));
      
      if (regulation) {
        query = query.and(eq(complianceChecklists.regulation, regulation as string));
      }
      
      if (status) {
        query = query.and(eq(complianceChecklists.status, status as string));
      }
      
      const checklists = await query;
      
      res.json(checklists);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to fetch checklists" });
      }
    }
  });

  router.post("/organizations/:orgId/checklists", async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const { regulation, title, description, items } = req.body;
      
      if (!regulation || !title) {
        throw badRequest("Regulation and title are required");
      }
      
      const [checklist] = await db.insert(complianceChecklists)
        .values({
          organizationId: orgId,
          regulation,
          title,
          description,
          items: items || [],
        })
        .returning();
      
      res.status(201).json(checklist);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create checklist" });
      }
    }
  });

  router.get("/organizations/:orgId/documents", async (req, res) => {
    try {
      const orgId = req.params.orgId;
      
      const docs = await db.select()
        .from(documents)
        .where(eq(documents.organizationId, orgId));
      
      res.json(docs);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to fetch documents" });
      }
    }
  });

  router.post("/organizations/:orgId/documents", async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const { type, name, content } = req.body;
      
      if (!type || !name) {
        throw badRequest("Type and name are required");
      }
      
      const [doc] = await db.insert(documents)
        .values({
          organizationId: orgId,
          type,
          name,
          content,
        })
        .returning();
      
      res.status(201).json(doc);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create document" });
      }
    }
  });

  router.get("/organizations/:orgId/audit-trail", async (req, res) => {
    try {
      const orgId = req.params.orgId;
      
      const auditRecords = await db.select()
        .from(auditTrail)
        .where(eq(auditTrail.organizationId, orgId))
        .orderBy(desc(auditTrail.timestamp));
      
      res.json(auditRecords);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to fetch audit trail" });
      }
    }
  });

  // Authentication endpoints (if needed)
  router.post("/auth/register", async (req, res) => {
    try {
      const { email, name, password } = req.body;
      
      if (!email || !name || !password) {
        throw badRequest("Email, name, and password are required");
      }
      
      // In a real system, we'd hash the password and create a user
      // For now, we'll just validate the input
      
      const [user] = await db.insert(complianceUsers)
        .values({
          email,
          name,
          role: "member",
        })
        .returning();
      
      // In a real system, you'd generate a JWT token here
      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token: "fake-jwt-token" // This would be a real token in production
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to register user" });
      }
    }
  });

  return router;
}