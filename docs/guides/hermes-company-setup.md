# Hermes Agent Architecture - Company-Wide Setup

This guide explains how to set up Hermes as the default adapter for all agents in your Paperclip company, enabling the full agentic tools architecture with personal memory and work tracking.

## What is Hermes?

Hermes (`hermes-paperclip-adapter`) is a multi-provider agent CLI that:
- Runs agents with **any LLM backend** (Claude, GPT-4, Gemini, local models)
- Provides **full tool calling** (list issues, hire agents, delegate work)
- Supports **personal memory** via `para-memory-files` skill
- Enables **work tracking** through heartbeat-driven inbox processing

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Paperclip Control Plane                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ CEO Agent    │  │ CTO Agent    │  │ Engineer 1   │      │
│  │ hermes_local │  │ hermes_local │  │ hermes_local │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                           │                                  │
│                    ┌──────┴──────┐                         │
│                    │   Hermes    │                         │
│                    │    CLI      │                         │
│                    └──────┬──────┘                         │
│                           │                                  │
│              ┌────────────┼────────────┐                   │
│              ▼            ▼            ▼                   │
│         ┌────────┐  ┌────────┐  ┌────────┐                 │
│         │Claude  │  │ GPT-4  │  │ Gemini │                 │
│         └────────┘  └────────┘  └────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

## Setup Steps

### 1. Install Hermes CLI

```bash
npm install -g hermes-paperclip-adapter
```

Verify installation:
```bash
hermes --version
```

### 2. Configure Hermes

Set up your preferred LLM provider:

```bash
hermes configure
```

This will prompt for:
- **Claude API Key** (recommended for CEO/leadership agents)
- **OpenAI API Key** (for GPT-4 models)
- **Gemini API Key** (for Google models)
- **Ollama** (for local models - see below)

#### Using Ollama Backend (Local Models)

For fully local agents using Ollama:

```bash
# 1. Install Ollama
# https://ollama.com

# 2. Pull a capable model
ollama pull llama3.3

# 3. Configure Hermes with Ollama backend
# In your agent config, set:
#   provider: "ollama"
#   model: "llama3.3"
#   baseUrl: "http://localhost:11434"
```

**Note:** The migration script and onboarding wizard now default to Hermes with Ollama backend for cost-free local execution.

### 3. Migrate Existing Agents (Optional)

If you have existing agents on other adapters (ollama, claude_local, etc.):

```bash
# Migrate all agents in company POL
tsx scripts/migrate-to-hermes.ts POL

# Dry run to see what would change
DRY_RUN=1 tsx scripts/migrate-to-hermes.ts POL

# Migrate specific agent
tsx scripts/migrate-to-hermes.ts POL <agent-id>
```

### 4. Set Hermes as Default for New Companies

The onboarding wizard now defaults to `hermes_local` for new companies. When creating a new company:

1. Company name and goal
2. **Hermes Agent** is pre-selected as the adapter
3. Agent instructions file is auto-configured
4. `para-memory-files` skill is auto-enabled

### 5. Verify Setup

Test the CEO agent (or any agent):

```bash
# Get your agent ID
curl http://localhost:3100/api/companies/{companyId}/agents \
  -H "Authorization: Bearer {boardToken}"

# Wake the agent
curl -X POST http://localhost:3100/api/agents/{agentId}/wake \
  -H "Authorization: Bearer {boardToken}" \
  -d '{"reason": "Test Hermes setup"}'
```

## Agent Configuration

Each Hermes agent has this adapter configuration:

```json
{
  "adapterType": "hermes_local",
  "adapterConfig": {
    "instructionsFilePath": "/path/to/agent/AGENTS.md",
    "timeoutSec": 300,
    "env": {
      "HERMES_MODEL": "claude-sonnet-4-20250514"
    }
  },
  "desiredSkills": ["para-memory-files"]
}
```

### Key Configuration Fields

| Field | Description | Default |
|-------|-------------|---------|
| `instructionsFilePath` | Path to agent's AGENTS.md | Required |
| `timeoutSec` | Request timeout | 300 |
| `env.HERMES_MODEL` | LLM model override | From `hermes configure` |
| `env.HERMES_MAX_TURNS` | Max iterations per run | 50 |

## Personal Memory System

Each Hermes agent gets:

### 1. Personal Instructions File (AGENTS.md)

Located at: `data/agent-instructions/{companyId}/{agentId}/AGENTS.md`

Contains:
- Role-specific behavior instructions
- Delegation rules (for leaders)
- Memory system usage guidelines
- Safety considerations

### 2. Memory Skills

All Hermes agents have `para-memory-files` skill enabled by default:

```yaml
# Agent capabilities via para-memory-files skill
memory_operations:
  - store_facts:      "Save durable knowledge"
  - daily_notes:    "Track daily work"
  - recall_context: "Retrieve prior decisions"
  - plan_tasks:     "Create and manage plans"
  - skills_list:    "Track learned capabilities"
```

### 3. File Locations

```
data/agent-instructions/
└── {companyId}/
    └── {agentId}/
        ├── AGENTS.md          # Role instructions
        ├── HEARTBEAT.md       # Execution checklist
        ├── SKILLS.md          # Learned capabilities
        └── MEMORY.md          # Durable memory store
```

## Work Tracking

Hermes agents automatically:

1. **List todos on each heartbeat**:
   ```javascript
   paperclip_list_issues({
     assigneeAgentId: "me",
     status: "open"
   })
   ```

2. **Prioritize by company plan**:
   - Check company goals
   - Review project roadmaps
   - Follow assignment priorities

3. **Update work status**:
   - Comment on issues with progress
   - Mark tasks done when complete
   - Delegate subtasks to reports

4. **Track completed work**:
   - Archive finished tasks
   - Update skills list
   - Write learnings to memory

## Tool Calling Architecture

Hermes agents have access to all Paperclip tools:

| Tool | Purpose |
|------|---------|
| `paperclip_list_issues` | **List todos** - See assigned work |
| `paperclip_create_issue` | **Delegate tasks** - Create subtasks |
| `paperclip_update_issue` | **Update status** - Mark done/progress |
| `paperclip_hire_agent` | **Hire reports** - Expand team |
| `paperclip_list_agents` | **See org chart** - Find collaborators |
| `paperclip_comment_on_issue` | **Communicate** - Ask questions |

## Role-Specific Behavior

### CEO Agent

Uses `@/server/src/onboarding-assets/ceo/AGENTS.md:1-78`:
- **Delegates all work** - Never writes code
- **Triages tasks** - Routes to correct department
- **Hires strategically** - Builds org chart
- **Unblocks reports** - Removes obstacles

### Department Leads (CTO, CMO, etc.)

Uses role-specific instructions:
- **Owns domain** - Technical/marketing decisions
- **Manages ICs** - Direct reports for execution
- **Coordinates cross-functionally** - Works with other leads

### Individual Contributors

Uses `@/server/src/onboarding-assets/default/AGENTS.md:1-79`:
- **Executes tasks** - Writes code, creates designs
- **Asks for help** - Unblocks via comments
- **Documents learnings** - Updates SKILLS.md
- **Follows patterns** - Uses existing conventions

## Migration Best Practices

### 1. Test Before Migrating Production

```bash
# Create test company
curl -X POST http://localhost:3100/api/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"name": "Hermes Test"}'

# Create test agent with Hermes
curl -X POST http://localhost:3100/api/companies/{id}/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "TestAgent",
    "role": "engineer",
    "adapterType": "hermes_local",
    "adapterConfig": {
      "instructionsFilePath": "/path/to/test/AGENTS.md"
    }
  }'
```

### 2. Migrate in Stages

1. **Start with 1-2 agents** - Test thoroughly
2. **Migrate department leads** - CTO, CMO, etc.
3. **Migrate ICs** - Engineers, designers
4. **Migrate CEO last** - After verifying leadership works

### 3. Preserve Existing Config

The migration script preserves:
- Environment variables
- Working directory (cwd)
- Timeout settings
- Custom prompt templates

### 4. Verify After Migration

Check each migrated agent:

```bash
# Check adapter type
curl http://localhost:3100/api/agents/{id}/configuration \
  -H "Authorization: Bearer {token}"

# Test environment
curl -X POST http://localhost:3100/api/companies/{id}/adapters/hermes_local/test-environment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"adapterConfig": {"instructionsFilePath": "/path/to/AGENTS.md"}}'
```

## Troubleshooting

### Hermes CLI Not Found

```bash
# Check if hermes is in PATH
which hermes

# If not found, install globally
npm install -g hermes-paperclip-adapter

# Or use npx
npx hermes-paperclip-adapter --version
```

### Model Not Configured

```bash
# Configure Hermes
hermes configure

# Or set environment variable
export HERMES_MODEL=claude-sonnet-4-20250514
```

### Instructions File Not Found

The migration script auto-creates instructions files. If missing:

```bash
# Create manually
mkdir -p data/agent-instructions/{companyId}/{agentId}
cp server/src/onboarding-assets/default/AGENTS.md \
   data/agent-instructions/{companyId}/{agentId}/AGENTS.md
```

### Agent Stuck / Not Responding

```bash
# Check agent runtime state
curl http://localhost:3100/api/agents/{id}/runtime-state \
  -H "Authorization: Bearer {token}"

# Reset session if needed
curl -X POST http://localhost:3100/api/agents/{id}/runtime-state/reset-session \
  -H "Authorization: Bearer {token}"
```

## Comparison: Hermes vs Other Adapters

| Feature | ollama | claude_local | hermes_local |
|---------|--------|--------------|--------------|
| **Tool calling** | Limited | Full | **Full** |
| **Multi-provider** | Local only | Claude only | **Any LLM** |
| **Memory skills** | Manual | Manual | **Auto-enabled** |
| **Instructions** | System prompt | Instructions file | **Full bundle** |
| **Work tracking** | Basic | Good | **Excellent** |
| **Setup complexity** | Low | Medium | **Medium** |

## Summary

Hermes provides the most capable agent architecture for Paperclip companies:

✅ **Universal adapter** - Works with any LLM  
✅ **Full tool calling** - Complete Paperclip API access  
✅ **Personal memory** - Each agent has durable storage  
✅ **Work tracking** - Automatic todo list management  
✅ **Role-specific** - Different instructions per role  
✅ **Production-ready** - Battle-tested in real companies  

**Recommendation**: Use `hermes_local` for all agents in production companies.
