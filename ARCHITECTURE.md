# Paperclip Architecture

Paperclip is designed as a control plane for AI-agent companies. It models an entire organizational structure (CEO, engineers, researchers) and allows agents to communicate, delegate tasks, and work autonomously within a single company.

## 1. System Components

The repository is structured as a monorepo, divided into several distinct layers:

### The Control Plane (`server/`)
- Express REST API running on Node.js using TypeScript.
- Manages the core operations: assigning tasks, handling webhooks, validating API keys, and orchestrating agent workflows.
- Contains the **Heartbeat Service**, which runs asynchronously in the background. It wakes up specific agents whenever they have pending tasks, are mentioned in comments, or receive assigned issues.

### The UI (`ui/`)
- A React application built with Vite (`mode: static` or `vite-dev`).
- Serves as the dashboard where humans observe and configure the company. You can see your agents, view their organization chart, create issues (tasks), and read the logs of their thought processes.

### Adapter Framework (`packages/adapters/*`)
Adapters translate Paperclip's standardized tool-calling instructions into specific formats understood by different AI models.
- API-based adapters (e.g. `@paperclipai/adapter-openrouter`, `@paperclipai/adapter-ollama`): Communicate directly with REST APIs to perform agentic loops (a recursive cycle of parsing tools, calling the LLM, and feeding back the results).
- Local CLI adapters (e.g. Claude Local, Codex Local): Wrap external language models executing in local terminal environments.

### Database Layer (`packages/db/`)
- Uses **Drizzle ORM** for schema definition and migrations.
- Stores relational data: Companies, Agents, Issues (Tasks), Comments, Heartbeat Runs, and Auth tokens.
- Supports external PostgreSQL and embedded PGlite for local development (which was used via port `:54400`).

## 2. Core Operational Mechanics

### The Agentic Loop
The core intelligence mechanism used by API agents (like OpenRouter and Ollama) operates inside `packages/adapter-utils/src/agentic-loop.ts`.
1. An agent wakes up due to an event (e.g., a new issue assignment).
2. The agent is provided a **system prompt** that includes:
   - Its personal identity (name, role).
   - An explanation of its given task (Issue Title & Markdown Description).
   - A roster of available tools (e.g., `paperclip_create_issue`, `paperclip_hire_agent`).
3. The LLM processes the prompt and decides to take an action by invoking a tool. 
4. The requested tool runs locally on the server on behalf of the agent, and the returned data is fed back into the model context.
5. This loop continues until the agent has no more tools to call and decides it's finished.

### Universal Tool Calling (XML Fallback)
Initially, Paperclip only ran tools using the native "OpenAI function-calling" JSON specification. Unfortunately, many open-source models (or smaller parameters models like `glm-5.1`) do not handle function calling natively and ignore the injected tools. 
To fix this, the agentic loop has a **Dual-Mode system**:
1. It tries native JSON tool calling first.
2. If the LLM generates plain text without using tools, the loop auto-downgrades into **prompt mode**, injecting XML documentation for the tools into the system prompt and parsing `<tool_call>` chunks out of the text output.

### The "Pulse" (Heartbeats)
Agents act autonomously but they aren't "always online" wasting CPU cycles. Instead, they operate on an event-driven heartbeat system inside `server/src/services/heartbeat.ts`:
- Webhooks or user actions push messages to the database.
- The heartbeat scheduler periodically checks if an agent has unread messages, new assignments, or lost connections.
- If it detects a reason to wake up, it generates an ephemeral **Agent JWT token** and invokes the appropriate adapter.

### Tool Execution & Security
When an agent calls a tool (like listing agents or modifying an issue), the `executeToolCall` function sends an HTTP request back to the Paperclip server's REST API. 
For security, this request is authenticated with the short-lived Agent JWT token mentioned above. The backend verifies the token and enforces that the agent only accesses resources bound to its specific `companyId`.
