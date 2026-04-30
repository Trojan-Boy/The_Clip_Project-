#!/usr/bin/env tsx
/**
 * Migrate agents from other adapters to hermes_local
 * Usage: tsx scripts/migrate-to-hermes.ts <companyId|prefix> [agentId]
 *
 * Examples:
 *   # Migrate all agents in company POL
 *   tsx scripts/migrate-to-hermes.ts POL
 *
 *   # Migrate specific agent
 *   tsx scripts/migrate-to-hermes.ts POL agent-uuid-here
 *
 *   # Dry run (see what would change)
 *   DRY_RUN=1 tsx scripts/migrate-to-hermes.ts POL
 */

import { agentService } from "../server/src/services/agents.js";
import { secretService } from "../server/src/services/secrets.js";
import { logActivity } from "../server/src/services/activity.js";
import { createDb } from "@paperclipai/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs/promises";

dotenv.config();

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

interface MigrationResult {
  agentId: string;
  agentName: string;
  oldAdapter: string;
  newAdapter: string;
  success: boolean;
  error?: string;
}

async function resolveCompanyId(
  db: ReturnType<typeof drizzle>,
  ref: string
): Promise<string | null> {
  // If it's a UUID, use it directly
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) {
    return ref;
  }

  // Otherwise, treat as prefix
  const { companies } = await import("@paperclipai/db");
  const { eq, sql } = await import("drizzle-orm");

  const match = await db
    .select({ id: companies.id })
    .from(companies)
    .where(sql`lower(${companies.issuePrefix}) = ${ref.toLowerCase()}`)
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return match?.id ?? null;
}

function generateAgentInstructionsPath(agent: {
  id: string;
  name: string;
  role: string;
  companyId: string;
}): string {
  // Store agent instructions in a company-scoped directory
  // This allows each agent to have their own memory and instructions
  const baseDir = process.env.PAPERCLIP_AGENT_INSTRUCTIONS_DIR || "./data/agent-instructions";
  const companyDir = path.join(baseDir, agent.companyId);
  const agentDir = path.join(companyDir, agent.id);

  return path.join(agentDir, "AGENTS.md");
}

async function ensureAgentInstructionsFile(instructionsPath: string, agent: {
  id: string;
  name: string;
  role: string;
  capabilities: string | null;
}): Promise<void> {
  const dir = path.dirname(instructionsPath);
  await fs.mkdir(dir, { recursive: true });

  // Check if file already exists
  try {
    await fs.access(instructionsPath);
    return; // Already exists, don't overwrite
  } catch {
    // File doesn't exist, create it
  }

  // Generate role-appropriate instructions
  const roleSpecificInstructions = getRoleInstructions(agent.role);

  const content = `# ${agent.name} (${agent.role})

You are ${agent.name}, a ${agent.role} at the company.

## Your Role

${agent.capabilities || `You are responsible for ${agent.role} work within the company.`}

## Memory and Planning

You MUST use the \`para-memory-files\` skill for all memory operations:
- Store facts, decisions, and knowledge in your personal memory
- Write daily notes to track your work
- Recall prior context before starting new tasks
- Keep your skills list updated

Your personal memory lives in your agent home directory (\`$AGENT_HOME\`).

## Work Tracking

- Always update your assigned issue with a comment explaining what you did
- Check your todo list on each heartbeat using \`paperclip_list_issues\`
- Prioritize work according to company goals and project plans
- Delegate when appropriate

${roleSpecificInstructions}

## Safety

- Never exfiltrate secrets or private data
- Do not perform destructive commands unless explicitly requested

## References

- \`$AGENT_HOME/HEARTBEAT.md\` - Your execution checklist
- \`$AGENT_HOME/SKILLS.md\` - Tools and capabilities you've learned
- \`$AGENT_HOME/MEMORY.md\` - Your durable memory store
`;

  await fs.writeFile(instructionsPath, content, "utf8");
}

function getRoleInstructions(role: string): string {
  const instructions: Record<string, string> = {
    ceo: `## Delegation (Critical)

You MUST delegate work rather than doing it yourself:
1. **Triage** - read the task and determine which department owns it
2. **Delegate** - create subtasks and assign to the right direct report
3. **Follow up** - check that delegated work is progressing

Routing rules:
- Code/bugs/features/infra → CTO
- Marketing/content/growth → CMO  
- UX/design/user research → UXDesigner
- Cross-functional → break into separate subtasks`,

    cto: `## Engineering Leadership

You are the technical leader. Your responsibilities:
- Architecture decisions and technical direction
- Code review and quality standards
- Technical hiring and team building
- Infrastructure and devtools

Delegate implementation work to engineers. Focus on:
- Technical design and architecture
- Code review and mentoring
- Unblocking your team
- Cross-functional technical coordination`,

    cmo: `## Marketing Leadership

You own growth and market presence:
- Content strategy and creation
- Social media and community
- Developer relations
- Brand and messaging

Focus on measurable growth and clear messaging.`,

    engineer: `## Engineering Work

You are an individual contributor engineer:
- Write clean, tested code
- Follow established patterns and conventions
- Ask for clarification when requirements are unclear
- Update your task with progress comments

When stuck:
1. Check if there's a pattern in the codebase to follow
2. Ask your manager or teammates for help
3. Document what you learned for future reference`,

    designer: `## Design Work

You are responsible for user experience and visual design:
- Create clear, accessible designs
- Follow existing design system patterns
- Collaborate with engineers on implementation
- Document design decisions and rationale

Always consider:
- User goals and workflows
- Accessibility standards
- Responsive/adaptive requirements
- Design system consistency`,
  };

  return instructions[role.toLowerCase()] || instructions.engineer;
}

async function migrateAgent(
  db: ReturnType<typeof drizzle>,
  agent: {
    id: string;
    name: string;
    role: string;
    adapterType: string;
    adapterConfig: Record<string, unknown> | null;
    companyId: string;
    capabilities: string | null;
  },
  secretsSvc: ReturnType<typeof secretService>
): Promise<MigrationResult> {
  const result: MigrationResult = {
    agentId: agent.id,
    agentName: agent.name,
    oldAdapter: agent.adapterType,
    newAdapter: "hermes_local",
    success: false,
  };

  try {
    // Skip if already on hermes_local
    if (agent.adapterType === "hermes_local") {
      result.success = true;
      return result;
    }

    // Generate instructions path for this agent
    const instructionsPath = generateAgentInstructionsPath(agent);

    if (!DRY_RUN) {
      // Ensure the instructions file exists
      await ensureAgentInstructionsFile(instructionsPath, agent);

      // Build new adapter config with Ollama backend
      const existingConfig = agent.adapterConfig ?? {};
      const newConfig: Record<string, unknown> = {
        // Preserve adapter-agnostic keys
        env: existingConfig.env,
        cwd: existingConfig.cwd,
        timeoutSec: existingConfig.timeoutSec ?? 300,
        // Hermes-specific config with Ollama backend (qwen2.5:14b supports tool calling)
        instructionsFilePath: instructionsPath,
        provider: "ollama",
        model: "qwen2.5:14b",
        baseUrl: "http://localhost:11434",
      };

      // Normalize and save
      const normalizedConfig = await secretsSvc.normalizeAdapterConfigForPersistence(
        agent.companyId,
        newConfig,
        { strictMode: false }
      );

      // Update the agent
      const { agentService } = await import("../server/src/services/agents.js");
      const svc = agentService(db);

      await svc.update(
        agent.id,
        {
          adapterType: "hermes_local",
          adapterConfig: normalizedConfig,
        },
        {
          recordRevision: {
            createdByUserId: "migration-script",
            source: "hermes-migration",
          },
        }
      );

      // Log the migration
      await logActivity(db, {
        companyId: agent.companyId,
        actorType: "user",
        actorId: "migration-script",
        action: "agent.migrated_to_hermes",
        entityType: "agent",
        entityId: agent.id,
        details: {
          oldAdapter: agent.adapterType,
          newAdapter: "hermes_local",
          instructionsPath,
        },
      });
    } else {
      console.log(`[DRY RUN] Would migrate ${agent.name} (${agent.id}):`);
      console.log(`  Old adapter: ${agent.adapterType}`);
      console.log(`  New adapter: hermes_local (Ollama backend)`);
      console.log(`  Model: qwen2.5:14b via Ollama at http://localhost:11434 (supports tool calling)`);
      console.log(`  Instructions: ${instructionsPath}`);
    }

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const companyRef = args[0];
  const specificAgentId = args[1];

  if (!companyRef) {
    console.error("Usage: tsx scripts/migrate-to-hermes.ts <companyId|prefix> [agentId]");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    // Resolve company ID
    const companyId = await resolveCompanyId(db, companyRef);
    if (!companyId) {
      console.error(`Company not found: ${companyRef}`);
      process.exit(1);
    }

    console.log(`Working with company: ${companyId}`);

    const secretsSvc = secretService(db);
    const { agentService } = await import("../server/src/services/agents.js");
    const svc = agentService(db);

    // Get agents to migrate
    let agents: Array<{
      id: string;
      name: string;
      role: string;
      adapterType: string;
      adapterConfig: Record<string, unknown> | null;
      companyId: string;
      capabilities: string | null;
    }>;

    if (specificAgentId) {
      const agent = await svc.getById(specificAgentId);
      if (!agent || agent.companyId !== companyId) {
        console.error(`Agent not found: ${specificAgentId}`);
        process.exit(1);
      }
      agents = [agent];
    } else {
      agents = await svc.list(companyId);
    }

    console.log(`\nFound ${agents.length} agent(s) to process\n`);

    if (DRY_RUN) {
      console.log("=== DRY RUN MODE (no changes will be made) ===\n");
    }

    const results: MigrationResult[] = [];

    for (const agent of agents) {
      const result = await migrateAgent(db, agent, secretsSvc);
      results.push(result);

      const status = result.success ? "✓" : "✗";
      const skipNote = agent.adapterType === "hermes_local" ? " (already hermes)" : "";
      console.log(`${status} ${agent.name} (${agent.role}): ${agent.adapterType} → hermes_local${skipNote}`);

      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    }

    // Summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`\n=== Summary ===`);
    console.log(`Total: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);

    if (DRY_RUN) {
      console.log("\nTo apply these changes, run without DRY_RUN=1");
    } else {
      console.log("\nMigration complete!");
      console.log("\nNext steps:");
      console.log("1. Ensure Hermes CLI is installed: npm install -g hermes-paperclip-adapter");
      console.log("2. Configure Hermes with your preferred LLM: hermes configure");
      console.log("3. Test each migrated agent with a wake call");
      console.log("4. Update agent instructions files as needed");
    }

  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
