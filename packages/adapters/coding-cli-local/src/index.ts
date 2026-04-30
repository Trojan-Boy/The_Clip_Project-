export const type = "coding_cli_local";
export const label = "Coding CLI (local)";

export const models: { id: string; label: string }[] = [];

export const agentConfigurationDoc = `# coding_cli_local agent configuration

Adapter: coding_cli_local

Use when:
- You want Paperclip to run a local coding CLI not covered by built-in adapters.
- The CLI accepts a prompt via stdin or as a command argument.

Don't use when:
- You are using a first-party supported adapter (codex_local, cursor, claude_local, gemini_local, opencode_local, pi_local).
- The target CLI needs deep protocol-specific parsing/session management that this generic adapter does not implement.

Core fields:
- command (string, required): executable command for the local coding CLI
- args (string[] | comma string, optional): additional command arguments
- cwd (string, optional): absolute working directory for command execution
- env (object, optional): extra environment variables

Prompt fields:
- promptTemplate (string, optional): run prompt template
- bootstrapPromptTemplate (string, optional): prepended prompt for fresh runs
- promptArg (string, optional): if set, append prompt as \`<promptArg> <prompt>\` instead of stdin

Operational fields:
- timeoutSec (number, optional): run timeout in seconds (default 0 = no timeout)
- graceSec (number, optional): process grace timeout in seconds (default 20)
`;
