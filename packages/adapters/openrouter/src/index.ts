export const type = "openrouter";
export const label = "OpenRouter";

export const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.5-flash";
export const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export const models = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (cheap)" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2" },
  { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B (Free)" },
  { id: "google/gemma-4-26b-a4b-it:free", label: "Gemma 4 26B (Free)" },
];

export const agentConfigurationDoc = `# openrouter agent configuration

Adapter: openrouter

The OpenRouter adapter sends prompts to the OpenRouter API (https://openrouter.ai/api/v1/chat/completions).
It supports any model available on OpenRouter, including free-tier models.

Core fields:
- model (string, optional): OpenRouter model id (defaults to "${DEFAULT_OPENROUTER_MODEL}")
- apiKey (string, optional): OpenRouter API key. Can also be set via OPENROUTER_API_KEY env var
- baseUrl (string, optional): Override the OpenRouter API base URL
- promptTemplate (string, optional): run prompt template
- systemPrompt (string, optional): system prompt sent as the first message
- temperature (number, optional): sampling temperature (0-2)
- maxTokens (number, optional): max tokens in response

Operational fields:
- timeoutSec (number, optional): request timeout in seconds (default: 300)

Environment variables:
- OPENROUTER_API_KEY: API key for OpenRouter
- OPENROUTER_MODEL: Default model to use
- OPENROUTER_BASE_URL: Override API base URL

Notes:
- Free models have ":free" suffix in their model id
- OpenRouter supports 300+ models from various providers
- Usage and costs are tracked and reported back to Paperclip
`;
