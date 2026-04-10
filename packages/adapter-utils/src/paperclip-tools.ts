// ---------------------------------------------------------------------------
// Paperclip Tool Definitions for API-based adapters
// OpenAI-compatible function-calling format
// ---------------------------------------------------------------------------

export interface PaperclipToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface PaperclipToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface PaperclipToolResult {
  name: string;
  content: string;
  isError: boolean;
}

/**
 * All Paperclip tools available to API-based adapters.
 * These give agents the same capabilities as CLI-based adapters
 * (hiring, task management, commenting, delegation).
 */
export const PAPERCLIP_TOOLS: PaperclipToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "paperclip_list_agents",
      description:
        "List all agents in your company. Use this to see who is on the team, their roles, statuses, and IDs before delegating work or hiring.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "paperclip_hire_agent",
      description:
        "Hire a new agent into the company. This creates a hire request which may require board approval. Use this when you need to delegate work but the right team member doesn't exist yet.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Agent name, e.g. 'CTO', 'Engineer', 'Designer'" },
          role: { type: "string", description: "Role slug, e.g. 'cto', 'engineer', 'designer'" },
          title: { type: "string", description: "Full title, e.g. 'Chief Technology Officer'" },
          icon: { type: "string", description: "Icon name from the available icons list, e.g. 'crown', 'code', 'palette'" },
          reportsTo: { type: "string", description: "Agent ID this new hire reports to (your own ID to make them your direct report)" },
          capabilities: { type: "string", description: "Description of what this agent is responsible for" },
          adapterType: { type: "string", description: "Adapter type: 'openrouter' or 'ollama'. Defaults to 'openrouter'." },
          adapterConfig: {
            type: "object",
            description: "Adapter configuration. For openrouter: {model, timeoutSec}. For ollama: {model}.",
            properties: {
              model: { type: "string", description: "Model ID, e.g. 'google/gemini-2.5-flash'" },
              timeoutSec: { type: "number", description: "Timeout in seconds, default 120" },
            },
          },
          desiredSkills: {
            type: "array",
            items: { type: "string" },
            description: "Skills to install on this agent, e.g. ['paperclipai/paperclip/paperclip-create-agent']",
          },
          sourceIssueId: { type: "string", description: "Issue ID that triggered this hire" },
        },
        required: ["name", "role", "title", "capabilities"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "paperclip_create_issue",
      description:
        "Create a new task/issue and optionally assign it to an agent. Use this to delegate work to your reports or create subtasks.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Issue title" },
          body: { type: "string", description: "Issue body/description in markdown" },
          assigneeAgentId: { type: "string", description: "Agent ID to assign this issue to" },
          parentId: { type: "string", description: "Parent issue ID if this is a subtask" },
          priority: { type: "string", enum: ["urgent", "high", "medium", "low", "none"], description: "Priority level" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "paperclip_comment_on_issue",
      description:
        "Add a comment to an existing issue. Use this to provide updates, ask questions, or give feedback on tasks.",
      parameters: {
        type: "object",
        properties: {
          issueId: { type: "string", description: "The issue ID to comment on" },
          body: { type: "string", description: "Comment body in markdown" },
        },
        required: ["issueId", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "paperclip_list_issues",
      description:
        "List issues in the company. Can filter by assignee or status. Use this to see what tasks are pending, in progress, or need attention.",
      parameters: {
        type: "object",
        properties: {
          assigneeAgentId: { type: "string", description: "Filter by assigned agent ID. Use 'me' for your own tasks." },
          status: { type: "string", enum: ["open", "in_progress", "done", "cancelled"], description: "Filter by status" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "paperclip_update_issue",
      description:
        "Update an existing issue's status, title, or assignment. Use this to mark tasks as done, reassign work, or update priorities.",
      parameters: {
        type: "object",
        properties: {
          issueId: { type: "string", description: "The issue ID to update" },
          status: { type: "string", enum: ["open", "in_progress", "done", "cancelled"], description: "New status" },
          title: { type: "string", description: "New title" },
          assigneeAgentId: { type: "string", description: "Reassign to this agent ID" },
          priority: { type: "string", enum: ["urgent", "high", "medium", "low", "none"], description: "New priority" },
        },
        required: ["issueId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "paperclip_get_agent_config_docs",
      description:
        "Read adapter configuration documentation for a specific adapter type. Useful when hiring agents to understand what config options are available.",
      parameters: {
        type: "object",
        properties: {
          adapterType: { type: "string", description: "Adapter type, e.g. 'openrouter', 'ollama', 'claude_local'" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "paperclip_get_agent_icons",
      description: "Get the list of available agent icons. Use when hiring to pick an appropriate icon for the new agent.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "paperclip_get_my_info",
      description: "Get your own agent info including ID, name, role, company, and permissions. Use this to know your own context.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file in the workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path to the file" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file in the workspace. Overwrites if it exists.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path to the file" },
          content: { type: "string", description: "Content to write" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files and directories in a path.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path to list (defaults to workspace root)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_bash_command",
      description: "Run a bash shell command in the workspace. Use this to execute build scripts, run tests, or use tools like curl and grep.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The bash command to run" },
        },
        required: ["command"],
      },
    },
  },
];
