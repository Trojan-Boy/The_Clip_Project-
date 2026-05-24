#!/usr/bin/env node
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const host = process.env.PAPERCLIP_OPERATOR_DAEMON_HOST ?? "127.0.0.1";
const port = Number(process.env.PAPERCLIP_OPERATOR_DAEMON_PORT ?? 3177);
const expectedToken = process.env.PAPERCLIP_OPERATOR_DAEMON_TOKEN ?? "";

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function authorize(req: IncomingMessage) {
  if (!expectedToken) return true;
  const auth = req.headers.authorization ?? "";
  return auth === `Bearer ${expectedToken}`;
}

async function runPowerShell(script: string) {
  if (process.platform !== "win32") {
    throw new Error("Desktop control is currently implemented for Windows only");
  }
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    windowsHide: true,
    timeout: 10_000,
  });
  return stdout.trim();
}

async function moveMouse(x: number, y: number) {
  await runPowerShell(`
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System.Runtime.InteropServices;
public class NativeMouse {
  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int X, int Y);
}
"@
[NativeMouse]::SetCursorPos(${Math.round(x)}, ${Math.round(y)}) | Out-Null
`);
}

async function clickMouse(x: number, y: number) {
  await runPowerShell(`
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System.Runtime.InteropServices;
public class NativeMouse {
  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")]
  public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
}
"@
[NativeMouse]::SetCursorPos(${Math.round(x)}, ${Math.round(y)}) | Out-Null
[NativeMouse]::mouse_event(0x0002, 0, 0, 0, 0)
[NativeMouse]::mouse_event(0x0004, 0, 0, 0, 0)
`);
}

async function captureScreenshot() {
  return runPowerShell(`
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$stream = New-Object System.IO.MemoryStream
$bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
[Convert]::ToBase64String($stream.ToArray())
`);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${host}:${port}`);
    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, {
        ok: true,
        host,
        port,
        platform: process.platform,
        desktopControl: process.platform === "win32" ? "windows-user32" : "unsupported",
        screenshotVision: "screenshot_png",
        auth: expectedToken ? "bearer" : "disabled",
      });
      return;
    }

    if (!authorize(req)) {
      json(res, 401, { error: "Unauthorized" });
      return;
    }

    if (req.method === "POST" && url.pathname === "/mouse/move") {
      const body = await readBody(req);
      await moveMouse(Number(body.x), Number(body.y));
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/mouse/click") {
      const body = await readBody(req);
      await clickMouse(Number(body.x), Number(body.y));
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/screenshot") {
      const pngBase64 = await captureScreenshot();
      json(res, 200, { ok: true, mimeType: "image/png", pngBase64 });
      return;
    }

    json(res, 404, { error: "Not found" });
  } catch (error) {
    json(res, 500, { error: error instanceof Error ? error.message : "Daemon error" });
  }
});

server.listen(port, host, () => {
  console.log(`[paperclip] Local operator daemon listening at http://${host}:${port}`);
});
