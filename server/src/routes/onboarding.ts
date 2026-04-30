import { Router } from "express";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { organizations, complianceUsers } from "../models/compliance-models.js";
import { badRequest, notFound } from "../errors.js";
import { getActorInfo } from "./authz.js";

export function onboardingRoutes(db: Db) {
  const router = Router();

  // Health check endpoint for onboarding
  router.get("/health", async (_req, res) => {
    res.json({ 
      status: "ok", 
      service: "onboarding-api",
      version: "1.0.0",
      endpoints: [
        "/onboarding/start",
        "/onboarding/business-profile",
        "/onboarding/regulations",
        "/onboarding/team",
        "/onboarding/complete"
      ]
    });
  });

  // Start onboarding - creates initial organization and user
  router.post("/start", async (req, res) => {
    try {
      const { email, name, businessName, industry, employeeCount } = req.body;
      
      // Validate input
      if (!email || !name || !businessName) {
        throw badRequest("Email, name, and business name are required");
      }

      // Check if user already exists
      const existingUsers = await db.select()
        .from(complianceUsers)
        .where(eq(complianceUsers.email, email))
        .limit(1);
      
      if (existingUsers.length > 0) {
        // User exists, check if they have an organization
        const user = existingUsers[0];
        if (user.organizationId) {
          // User already has an organization, return it
          const org = await db.select()
            .from(organizations)
            .where(eq(organizations.id, user.organizationId))
            .limit(1);
          
          if (org.length > 0) {
            return res.json({
              success: true,
              message: "User already onboarded",
              data: {
                user,
                organization: org[0],
                onboardingComplete: true
              }
            });
          }
        }
        
        // User exists but no organization, continue onboarding
        return res.json({
          success: true,
          message: "User found, continue onboarding",
          data: {
            user,
            onboardingComplete: false
          }
        });
      }

      // Create organization first
      const [organization] = await db.insert(organizations)
        .values({
          name: businessName,
          industry: industry || null,
          employeeCount: employeeCount || null,
          regulations: []
        })
        .returning();

      // Create user and associate with organization
      const [user] = await db.insert(complianceUsers)
        .values({
          email,
          name,
          organizationId: organization.id,
          role: "admin"
        })
        .returning();

      // Create audit trail entry
      await db.insert({
        organizationId: organization.id,
        userId: user.id,
        action: "onboarding_started",
        resourceType: "organization",
        resourceId: organization.id,
        details: {
          businessName,
          industry,
          employeeCount
        }
      });

      res.status(201).json({
        success: true,
        message: "Onboarding started successfully",
        data: {
          user,
          organization,
          onboardingComplete: false,
          currentStep: 1
        }
      });
    } catch (error) {
      console.error("Onboarding start error:", error);
      if (error instanceof Error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: "Failed to start onboarding" 
        });
      }
    }
  });

  // Save business profile
  router.post("/business-profile", async (req, res) => {
    try {
      const { organizationId, industry, employeeCount, annualRevenue, complianceBudget } = req.body;
      
      if (!organizationId) {
        throw badRequest("Organization ID is required");
      }

      // Update organization with business profile
      const [organization] = await db.update(organizations)
        .set({
          industry,
          employeeCount,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, organizationId))
        .returning();

      if (!organization) {
        throw notFound("Organization not found");
      }

      // Create audit trail entry
      await db.insert({
        organizationId,
        action: "business_profile_updated",
        resourceType: "organization",
        resourceId: organizationId,
        details: {
          industry,
          employeeCount,
          annualRevenue,
          complianceBudget
        }
      });

      res.json({
        success: true,
        message: "Business profile saved successfully",
        data: {
          organization,
          nextStep: "regulations"
        }
      });
    } catch (error) {
      console.error("Business profile save error:", error);
      if (error instanceof Error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: "Failed to save business profile" 
        });
      }
    }
  });

  // Save regulation selections
  router.post("/regulations", async (req, res) => {
    try {
      const { organizationId, regulations } = req.body;
      
      if (!organizationId || !regulations || !Array.isArray(regulations)) {
        throw badRequest("Organization ID and regulations array are required");
      }

      // Update organization with selected regulations
      const [organization] = await db.update(organizations)
        .set({
          regulations,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, organizationId))
        .returning();

      if (!organization) {
        throw notFound("Organization not found");
      }

      // Create audit trail entry
      await db.insert({
        organizationId,
        action: "regulations_selected",
        resourceType: "organization",
        resourceId: organizationId,
        details: {
          regulations,
          count: regulations.length
        }
      });

      res.json({
        success: true,
        message: "Regulations saved successfully",
        data: {
          organization,
          nextStep: "team"
        }
      });
    } catch (error) {
      console.error("Regulations save error:", error);
      if (error instanceof Error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: "Failed to save regulations" 
        });
      }
    }
  });

  // Save team invitations
  router.post("/team", async (req, res) => {
    try {
      const { organizationId, invitations } = req.body;
      
      if (!organizationId || !invitations || !Array.isArray(invitations)) {
        throw badRequest("Organization ID and invitations array are required");
      }

      // Validate invitations
      const validInvitations = invitations.filter(inv => 
        inv.email && inv.role && ['admin', 'compliance_manager', 'auditor', 'viewer'].includes(inv.role)
      );

      // Create team members (for now, just store in audit trail)
      // In a real implementation, you'd create actual user records and send invites
      await db.insert({
        organizationId,
        action: "team_invitations_sent",
        resourceType: "organization",
        resourceId: organizationId,
        details: {
          invitations: validInvitations,
          count: validInvitations.length
        }
      });

      res.json({
        success: true,
        message: "Team invitations processed successfully",
        data: {
          invitationsSent: validInvitations.length,
          nextStep: "complete"
        }
      });
    } catch (error) {
      console.error("Team invitations error:", error);
      if (error instanceof Error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: "Failed to process team invitations" 
        });
      }
    }
  });

  // Complete onboarding
  router.post("/complete", async (req, res) => {
    try {
      const { organizationId, termsAccepted, privacyAccepted, marketingOptIn } = req.body;
      
      if (!organizationId) {
        throw badRequest("Organization ID is required");
      }

      if (!termsAccepted || !privacyAccepted) {
        throw badRequest("Terms and privacy must be accepted");
      }

      // Create audit trail entry for completion
      await db.insert({
        organizationId,
        action: "onboarding_completed",
        resourceType: "organization",
        resourceId: organizationId,
        details: {
          termsAccepted,
          privacyAccepted,
          marketingOptIn: marketingOptIn || false
        }
      });

      // Get the organization to return
      const [organization] = await db.select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      res.json({
        success: true,
        message: "Onboarding completed successfully",
        data: {
          organization,
          onboardingComplete: true,
          redirectUrl: "/dashboard"
        }
      });
    } catch (error) {
      console.error("Onboarding completion error:", error);
      if (error instanceof Error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: "Failed to complete onboarding" 
        });
      }
    }
  });

  // Get onboarding status
  router.get("/status/:organizationId", async (req, res) => {
    try {
      const { organizationId } = req.params;
      
      if (!organizationId) {
        throw badRequest("Organization ID is required");
      }

      // Get organization
      const [organization] = await db.select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!organization) {
        throw notFound("Organization not found");
      }

      // Get audit trail entries to determine progress
      const auditEntries = await db.select()
        .from({
          organizationId,
          action: "action",
          timestamp: "timestamp"
        })
        .where(eq({
          organizationId,
          resourceType: "organization",
          resourceId: organizationId
        }));

      // Determine onboarding progress based on audit trail
      const stepsCompleted = {
        started: auditEntries.some(entry => entry.action === "onboarding_started"),
        businessProfile: auditEntries.some(entry => entry.action === "business_profile_updated"),
        regulations: auditEntries.some(entry => entry.action === "regulations_selected"),
        team: auditEntries.some(entry => entry.action === "team_invitations_sent"),
        completed: auditEntries.some(entry => entry.action === "onboarding_completed")
      };

      res.json({
        success: true,
        data: {
          organization,
          stepsCompleted,
          currentStep: stepsCompleted.completed ? 5 : 
                     stepsCompleted.team ? 4 :
                     stepsCompleted.regulations ? 3 :
                     stepsCompleted.businessProfile ? 2 :
                     stepsCompleted.started ? 1 : 0,
          onboardingComplete: stepsCompleted.completed
        }
      });
    } catch (error) {
      console.error("Onboarding status error:", error);
      if (error instanceof Error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: "Failed to get onboarding status" 
        });
      }
    }
  });

  // Get available regulations for selection
  router.get("/regulations/available", async (_req, res) => {
    try {
      // This would normally come from a database table
      // For now, return a static list
      const regulations = [
        {
          id: "gdpr",
          name: "GDPR Compliance",
          code: "GDPR",
          description: "General Data Protection Regulation for EU data protection",
          applicableIndustries: ["tech", "ecommerce", "healthcare", "fintech"],
          complexity: "high",
          estimatedTimeToCompliance: "3-6 months",
          icon: "shield"
        },
        {
          id: "ccpa",
          name: "CCPA Compliance",
          code: "CCPA",
          description: "California Consumer Privacy Act for California residents",
          applicableIndustries: ["tech", "ecommerce", "fintech"],
          complexity: "medium",
          estimatedTimeToCompliance: "2-4 months",
          icon: "lock"
        },
        {
          id: "hipaa",
          name: "HIPAA Compliance",
          code: "HIPAA",
          description: "Health Insurance Portability and Accountability Act",
          applicableIndustries: ["healthcare", "healthtech"],
          complexity: "high",
          estimatedTimeToCompliance: "4-8 months",
          icon: "medical"
        },
        {
          id: "soc2",
          name: "SOC 2 Compliance",
          code: "SOC2",
          description: "Service Organization Control 2 for security, availability, processing integrity",
          applicableIndustries: ["tech", "fintech", "saas"],
          complexity: "high",
          estimatedTimeToCompliance: "6-12 months",
          icon: "certificate"
        },
        {
          id: "iso27001",
          name: "ISO 27001 Compliance",
          code: "ISO27001",
          description: "Information security management system standard",
          applicableIndustries: ["tech", "fintech", "manufacturing", "services"],
          complexity: "high",
          estimatedTimeToCompliance: "6-12 months",
          icon: "standard"
        }
      ];

      res.json({
        success: true,
        data: regulations
      });
    } catch (error) {
      console.error("Regulations fetch error:", error);
      if (error instanceof Error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: "Failed to fetch regulations" 
        });
      }
    }
  });

  // Get industry options
  router.get("/industries", async (_req, res) => {
    try {
      const industries = [
        { id: "tech", name: "Technology & SaaS", description: "Software, platforms, services" },
        { id: "fintech", name: "Financial Technology", description: "Banking, payments, investments" },
        { id: "healthcare", name: "Healthcare", description: "Medical services, pharmaceuticals, devices" },
        { id: "ecommerce", name: "E-commerce & Retail", description: "Online retail, marketplaces" },
        { id: "education", name: "Education", description: "EdTech, schools, training" },
        { id: "manufacturing", name: "Manufacturing", description: "Industrial production, goods" },
        { id: "services", name: "Professional Services", description: "Consulting, legal, marketing" },
        { id: "nonprofit", name: "Non-Profit", description: "Charities, foundations, NGOs" }
      ];

      res.json({
        success: true,
        data: industries
      });
    } catch (error) {
      console.error("Industries fetch error:", error);
      if (error instanceof Error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: "Failed to fetch industries" 
        });
      }
    }
  });

  return router;
}