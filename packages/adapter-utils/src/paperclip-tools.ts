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
      name: "paperclip_request_clarification",
      description:
        "Request clarification from the task creator or assigner when requirements are unclear, ambiguous, or missing critical information. Use this BEFORE starting work when: the task description is vague, success criteria are undefined, dependencies are unknown, scope is unclear, or you need user preferences (styling, naming, approach). This tool will comment on the issue with your questions and optionally mark it as blocked pending response.",
      parameters: {
        type: "object",
        properties: {
          issueId: { type: "string", description: "The issue ID that needs clarification" },
          questions: {
            type: "array",
            items: { type: "string" },
            description: "Specific questions that need answers before proceeding. Be concise and numbered.",
          },
          blocking: {
            type: "boolean",
            description: "Whether to mark the issue as 'blocked' status until clarification is received (default: true)",
          },
          assumptions: {
            type: "string",
            description: "Optional: Describe what you plan to do if no clarification is provided, so the user can correct your assumptions.",
          },
        },
        required: ["issueId", "questions"],
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
          status: {
            type: "string",
            enum: ["open", "backlog", "todo", "in_progress", "in_review", "blocked", "done", "cancelled"],
            description: "Filter by status. Use 'open' for todo/in_progress/in_review/blocked.",
          },
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
          status: {
            type: "string",
            enum: ["backlog", "todo", "in_progress", "in_review", "blocked", "done", "cancelled"],
            description: "New status. Use 'cancelled' only when the task is obsolete or not useful.",
          },
          title: { type: "string", description: "New title" },
          assigneeAgentId: { type: "string", description: "Reassign to this agent ID" },
          priority: { type: "string", enum: ["urgent", "high", "medium", "low", "none"], description: "New priority" },
          comment: {
            type: "string",
            description: "Optional reason/comment. Required when cancelling planning/strategy tasks so higher-up governance is auditable.",
          },
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
      name: "paperclip_list_my_tool_usage",
      description:
        "List the tools you've used recently (with counts). Use this to update your personal memory ($AGENT_HOME/TOOLS.md) and to understand your current tool habits.",
      parameters: {
        type: "object",
        properties: {
          lookbackDays: { type: "number", description: "How many days to look back (default 14, max 90)" },
          limit: { type: "number", description: "Max tools to return (default 25, max 50)" },
        },
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
  {
    type: "function",
    function: {
      name: "browser_navigate",
      description: "Navigate a real browser to a URL and return the rendered text content. Useful for reading web pages that require JavaScript or block simple fetch requests.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to navigate to" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_screenshot",
      description: "Take a screenshot of the current page in the browser. Returns a base64 encoded PNG image.",
      parameters: {
        type: "object",
        properties: {
          fullPage: { type: "boolean", description: "Whether to capture the full scrollable page (default: false)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_search",
      description: "Perform a Google search using the browser and return structured results. Better than web_search for finding recent or specific information.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
          numResults: { type: "number", description: "Number of results to return (default: 5, max: 10)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_click",
      description: "Click an element on the current page using a CSS selector or exact text match. Useful for navigating sites or accepting cookies.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector of the element to click" },
          text: { type: "string", description: "Text content of the element to click (if selector is not provided)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_type",
      description: "Type text into an input field on the current page.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector of the input element" },
          text: { type: "string", description: "Text to type into the element" },
          submit: { type: "boolean", description: "Whether to press Enter after typing (default: false)" },
        },
        required: ["selector", "text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_extract",
      description: "Extract text content from specific elements on the current page using a CSS selector.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector of the elements to extract text from" },
        },
        required: ["selector"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "tavily_search",
      description:
        "Market/web research using Tavily. Use this to quickly find sources and summarize findings. Requires TAVILY_API_KEY to be configured for this agent.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          maxResults: { type: "number", description: "Max results (default 5, max 10)" },
          searchDepth: { type: "string", enum: ["basic", "advanced"], description: "Search depth (default basic)" },
          includeAnswer: { type: "boolean", description: "Include Tavily's answer summary (default true)" },
          includeRawContent: { type: "boolean", description: "Include raw page content when available (default false)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cloud_browser_fetch",
      description:
        "Fetch rendered page content using a cloud browser (Browserless-compatible). Use for JS-heavy pages. Requires BROWSERLESS_API_KEY to be configured for this agent.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to fetch (http/https)" },
          endpoint: {
            type: "string",
            description:
              "Optional Browserless endpoint (default https://chrome.browserless.io/content). If you host your own, put it here.",
          },
          timeoutMs: { type: "number", description: "Timeout in milliseconds (default 30000)" },
        },
        required: ["url"],
      },
    },
  },
];
