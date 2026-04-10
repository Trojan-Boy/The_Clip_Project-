# The Clip Project

Welcome to The Clip Project! 

This repository contains the codebase for our customized agent control plane.

## Getting Started

To run the application locally:

```bash
pnpm install
pnpm dev
```

This will start the local development server at `http://localhost:3100`.

## Architecture

- `server/`: Express REST API and orchestration services
- `ui/`: React + Vite board UI
- `packages/db/`: Drizzle schema, migrations, DB clients
- `packages/shared/`: Shared types, validators, and constants
- `packages/adapters/`: Agent adapter implementations (Claude, Codex, Ollama, OpenRouter, etc.)

## License

This project is licensed under the MIT License.
