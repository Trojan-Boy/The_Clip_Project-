export const type = "ollama";
export const label = "Ollama (local)";

export const DEFAULT_OLLAMA_MODEL = "qwen2.5:14b";
export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

// Models that tend to work best with Paperclip's prompt-guided local loop.
export const HIGH_CONFIDENCE_MODELS = [
  "qwen2.5:14b",
  "qwen2.5:7b",
  "qwen2.5:32b",
  "gemma4",
  "gemma4:latest",
  "gemma3",
  "gemma3:latest",
  "llama3.3",
  "llama3.2",
  "mistral-nemo",
  "nemotron-mini",
  "command-r",
];

export const TOOL_CAPABLE_MODELS = HIGH_CONFIDENCE_MODELS;

export const models = [
  { id: "qwen2.5:14b", label: "Qwen 2.5 14B (best overall local worker)" },
  { id: "qwen2.5:7b", label: "Qwen 2.5 7B (lighter worker)" },
  { id: "qwen2.5:32b", label: "Qwen 2.5 32B (strongest Qwen local worker)" },
  { id: "gemma4:latest", label: "Gemma 4 (prompt-guided local worker)" },
  { id: "gemma4", label: "Gemma 4 (explicit tag)" },
  { id: "gemma3:latest", label: "Gemma 3 (prompt-guided local worker)" },
  { id: "gemma3", label: "Gemma 3 (explicit tag)" },
  { id: "llama3.3", label: "Llama 3.3 (strong local worker)" },
  { id: "llama3.2", label: "Llama 3.2" },
  { id: "mistral-nemo", label: "Mistral Nemo" },
  { id: "nemotron-mini", label: "Nemotron Mini" },
  { id: "command-r", label: "Command R" },
  { id: "deepseek-r1", label: "DeepSeek R1" },
  { id: "deepseek-r1:8b", label: "DeepSeek R1 8B" },
  { id: "phi4", label: "Phi-4" },
  { id: "codellama", label: "Code Llama" },
];

export const agentConfigurationDoc = `# ollama agent configuration

Adapter: ollama

The Ollama adapter sends prompts to a local Ollama instance (http://localhost:11434/api/chat).
It supports any model you have pulled into your local Ollama installation.

Use when:
- You want a fully local, no-API-key worker
- You want free local execution for leaders or specialists
- You want to pair Paperclip with prompt-guided local models such as Qwen, Gemma, or Llama

Avoid when:
- You need the strongest possible reasoning for executive planning and approvals
- Your local machine cannot comfortably host the selected model
- You need a provider-specific feature that Ollama does not expose

Core fields:
- model (string, optional): Ollama model name (defaults to "${DEFAULT_OLLAMA_MODEL}")
- baseUrl (string, optional): Override the Ollama API base URL (defaults to "${DEFAULT_OLLAMA_BASE_URL}")
- promptTemplate (string, optional): run prompt template
- systemPrompt (string, optional): system prompt sent as the first message
- temperature (number, optional): sampling temperature (0-2)
- numCtx (number, optional): context window size

Operational fields:
- timeoutSec (number, optional): request timeout in seconds (default: 300)

Environment variables:
- OLLAMA_MODEL: Default model to use
- OLLAMA_BASE_URL: Override API base URL

Notes:
- Ollama must be running locally before using this adapter
- Pull models first with: ollama pull <model>
- No API key required - Ollama runs completely locally
- Paperclip uses a prompt-guided tool loop with Ollama, so native function calling is not required
- Qwen 2.5 14B and Llama 3.3 are the most reliable local workers
- Gemma 4 and Gemma 3 work well when given explicit step-by-step system prompts
- Large models may require significant RAM/VRAM
`;
