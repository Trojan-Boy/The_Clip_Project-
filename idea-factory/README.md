# 🏭 Idea Factory

> A fully automated AI startup pipeline that discovers, evaluates, builds, and launches products — all autonomously.

## How It Works

Idea Factory operates as a 4-layer pipeline where each layer feeds into the next:

```
Layer 1: Intelligence → Layer 2: Decision → Layer 3: Build → Layer 4: Launch
```

### Layer 1 — Intelligence 🔍
Monitors the internet 24/7. Finds, collects, and filters the best startup ideas from YC, HN, and startup media.

### Layer 2 — Decision ⚖️
Acts as your internal investment committee. Scores ideas, kills bad ones fast, and greenlits the winners.

### Layer 3 — Build 🛠️
Your fully automated product studio. Takes the winning idea and ships a working app with design specs.

### Layer 4 — Launch 🚀
Gets your product in front of users. Generates landing pages, marketing copy, and growth strategy automatically.

## Org Chart

| Agent | Title | Layer | Model | Reports To |
|-------|-------|-------|-------|------------|
| **CEO Agent** | Chief Executive Officer | Decision (L2) | Claude Sonnet 4.5 | — |
| **YC Scout** | Intelligence Scout | Intelligence (L1) | Gemini 2.0 Flash | CEO Agent |
| **Trend Mapper** | Intelligence Analyst | Intelligence (L1) | DeepSeek R1 | CEO Agent |
| **Idea Scorer** | Decision Analyst | Decision (L2) | DeepSeek R1 | CEO Agent |
| **Kill Switch** | Decision Filter | Decision (L2) | Gemini 2.0 Flash | CEO Agent |
| **CTO Agent** | Chief Technology Officer | Build (L3) | Qwen 2.5 Coder 32B | CEO Agent |
| **Product Architect** | Build Lead | Build (L3) | DeepSeek R1 | CTO Agent |
| **Coder Agent** | Software Engineer | Build (L3) | Qwen 2.5 Coder 32B | CTO Agent |
| **Designer Agent** | UI/UX Designer | Build (L3) | Llama 3.3 70B | CTO Agent |
| **Landing Page Agent** | Launch Engineer | Launch (L4) | Qwen 2.5 Coder 32B | CTO Agent |
| **Growth Agent** | Growth Strategist | Launch (L4) | Gemini 2.0 Flash | CEO Agent |

## Pipeline Flow

```
YC Scout ──┐
            ├──→ Idea Scorer ──→ Kill Switch ──→ CEO Agent (GO/NO-GO)
Trend Mapper┘                                        │
                                                      ▼
                                              Product Architect
                                              ┌───────┴───────┐
                                              ▼               ▼
                                          CTO Agent    Designer Agent
                                              │               │
                                              └───────┬───────┘
                                                      ▼
                                                 Coder Agent
                                                      │
                                                      ▼
                                            Landing Page Agent
                                                      │
                                                      ▼
                                               Growth Agent
```

## Getting Started

Import into Paperclip:
```bash
paperclipai company import --from ./idea-factory
```

## References

- [Agent Companies Specification](https://agentcompanies.io/specification)
- [Paperclip](https://github.com/paperclipai/paperclip)

## License

MIT
