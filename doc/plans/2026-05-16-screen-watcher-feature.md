# Screen Watcher Feature — Window Monitoring with AI Alerts

## Problem

When AI agents (or humans) work autonomously in a terminal, code editor, or any GUI application, errors can occur silently. By the time someone notices, significant time and money may have been wasted.

Current monitoring approaches have gaps:
- **Log file monitoring** only catches errors that are logged to files
- **Screenshot polling** is slow and doesn't analyze content
- **Human watching** doesn't scale and is expensive
- **Existing tools** (NannyAI, OSScreenObserver) are either too narrow or don't integrate with agent workflows

## Solution

A two-part screen monitoring system:

### 1. Window Capture Stream Server
- Captures a **specific window** (by title match) using Windows Desktop Duplication API
- Serves it as an **MJPEG HTTP stream** — viewable in any browser, no plugins needed
- Also provides snapshot and status endpoints
- Lightweight: ~2 FPS is enough for monitoring

### 2. AI Watcher Agent
- Connects to the stream and captures frames periodically (configurable interval)
- Sends each frame to an **AI vision model** (OpenRouter) for analysis
- AI checks for: errors, crashes, stuck states, unusual behavior
- Sends **Telegram alerts** with screenshot when problems are detected
- Configurable sensitivity (low/medium/high) and cooldown to avoid alert spam

## Architecture

```
┌─────────────────────┐
│  Target Window       │  (Warp, VS Code, Terminal, etc.)
│  (Windows API)       │
└──────────┬──────────┘
           │ capture
           ▼
┌─────────────────────┐
│  Stream Server       │  screen_watcher.py
│  MJPEG HTTP stream   │  http://localhost:8080
│  + snapshot endpoint │
└──────────┬──────────┘
           │ HTTP
           ▼
┌─────────────────────┐
│  AI Watcher          │  ai_watcher.py
│  Frame analysis      │  OpenRouter Vision API
│  Error detection     │
└──────────┬──────────┘
           │ alert
           ▼
┌─────────────────────┐
│  Telegram            │  Screenshot + error description
│  Notification        │  to operator
└─────────────────────┘
```

## Integration with Paperclip

This feature fits Paperclip's agent monitoring philosophy:

1. **Agent workspace monitoring** — Watch an agent's terminal/editor for crashes
2. **Heartbeat complement** — Heartbeat tells you if agent is alive; screen watcher tells you if it's stuck
3. **Board visibility** — Stream can be embedded in Paperclip UI for real-time agent observation
4. **Audit trail** — Saved frames provide visual evidence of what went wrong

### Proposed Paperclip API Endpoints

```
POST   /api/screen-watchers          — Start watching a window
GET    /api/screen-watchers          — List active watchers
GET    /api/screen-watchers/:id      — Get watcher status
DELETE /api/screen-watchers/:id      — Stop watching
GET    /api/screen-watchers/:id/stream — Proxy MJPEG stream
GET    /api/screen-watchers/:id/snapshot — Get latest frame
```

### Proposed UI

- **Board page**: Live view of all monitored agent windows
- **Alert history**: Timeline of detected errors with screenshots
- **Per-agent toggle**: Enable/disable screen watching per agent

## Technical Details

### Window Capture
- Uses `PrintWindow` API with `PW_RENDERFULLCONTENT` flag
- Captures GPU-composited content (works for Electron apps like VS Code, Warp)
- Falls back to `BitBlt` if PrintWindow fails
- Only captures the target window, not the full screen

### MJPEG Stream
- Standard `multipart/x-mixed-replace` HTTP response
- Works in all browsers without plugins
- Low bandwidth: ~50-100 KB/s at 2 FPS, quality 75

### AI Analysis
- Uses OpenRouter vision model (configurable)
- Structured prompt for consistent error detection
- Response format: ERROR/DESCRIPTION/STUCK/URGENCY
- Cooldown period prevents alert spam

## Files

- `server/screen_watcher.py` — Window capture + MJPEG stream server
- `server/ai_watcher.py` — AI analysis + Telegram alerts
- `skills/screen-watcher/SKILL.md` — Hermes agent skill for using the watcher

## Future Enhancements

- [ ] WebRTC streaming for lower latency
- [ ] Multi-window monitoring in single server
- [ ] Paperclip UI integration (embed stream in board)
- [ ] Agent adapter integration (auto-watch agent workspaces)
- [ ] Configurable alert rules (regex, keywords, custom prompts)
- [ ] Frame diffing (only alert on changes)
- [ ] Recording mode (save video when error detected)
