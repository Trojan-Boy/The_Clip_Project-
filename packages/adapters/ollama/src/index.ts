export const type = "ollama";
export const label = "Ollama (local)";

export const DEFAULT_OLLAMA_MODEL = "llama3.3";
export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

export const models = [
  { id: "llama3.3", label: "Llama 3.3" },
  { id: "llama3.2", label: "Llama 3.2" },
  { id: "deepseek-r1", label: "DeepSeek R1" },
  { id: "deepseek-r1:8b", label: "DeepSeek R1 8B" },
  { id: "qwen3", label: "Qwen3" },
  { id: "gemma3", label: "Gemma 3" },
  { id: "phi4", label: "Phi-4" },
  { id: "mistral", label: "Mistral" },
  { id: "codellama", label: "Code Llama" },
];

export const agentConfigurationDoc = `# ollama agent configuration

Adapter: ollama

The Ollama adapter sends prompts to a local Ollama instance (http://localhost:11434/api/chat).
It supports any model you have pulled into your local Ollama installation.

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
- No API key required — Ollama runs completely locally
- Large models may require significant RAM/VRAM
`;
