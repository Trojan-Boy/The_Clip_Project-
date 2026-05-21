"""
Screen Watcher - Window Capture + MJPEG Stream Server

Captures a specific window by title and serves it as an MJPEG HTTP stream.
Other agents (AI or human) can watch the stream and monitor for errors.

Usage:
    python screen_watcher.py --window "Warp" --port 8080
    python screen_watcher.py --window "Visual Studio Code" --port 8080 --fps 2

Then open http://localhost:8080/stream in any browser or video player.
"""
import argparse
import time
import threading
import io
import sys
import json
import ctypes
import ctypes.wintypes
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Windows API constants
GW_OWNER = 4
GWL_EXSTYLE = -20
WS_EX_TOOLWINDOW = 0x00000080
WS_EX_APPWINDOW = 0x00040000

user32 = ctypes.windll.user32


def enum_windows():
    """Enumerate all visible windows and return list of (hwnd, title) tuples."""
    windows = []

    @ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    def callback(hwnd, _lparam):
        if user32.IsWindowVisible(hwnd):
            length = user32.GetWindowTextLengthW(hwnd)
            if length > 0:
                buf = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buf, length + 1)
                title = buf.value.strip()
                if title:
                    windows.append((hwnd, title))
        return True

    user32.EnumWindows(callback, 0)
    return windows


def find_window(partial_title):
    """Find a window handle by partial title match."""
    partial = partial_title.lower()
    for hwnd, title in enum_windows():
        if partial in title.lower():
            return hwnd, title
    return None, None


def capture_window(hwnd):
    """Capture a specific window and return as PIL Image.
    
    Works even when the window is minimized by temporarily restoring it,
    capturing, then minimizing again — all in milliseconds.
    """
    from PIL import Image

    # Constants
    SW_RESTORE = 9
    SW_SHOWMINIMIZED = 2
    SW_SHOWNA = 8
    DWMWA_EXTENDED_FRAME_BOUNDS = 9
    PW_RENDERFULLCONTENT = 0x00000002
    SRCCOPY = 0x00CC0020

    class RECT(ctypes.Structure):
        _fields_ = [
            ('left', ctypes.c_long),
            ('top', ctypes.c_long),
            ('right', ctypes.c_long),
            ('bottom', ctypes.c_long),
        ]

    class WINDOWPLACEMENT(ctypes.Structure):
        _fields_ = [
            ('length', ctypes.c_uint),
            ('flags', ctypes.c_uint),
            ('showCmd', ctypes.c_uint),
            ('ptMinPosition', ctypes.wintypes.POINT),
            ('ptMaxPosition', ctypes.wintypes.POINT),
            ('rcNormalPosition', ctypes.wintypes.RECT),
        ]

    # Check if window is minimized
    wp = WINDOWPLACEMENT()
    wp.length = ctypes.sizeof(wp)
    user32.GetWindowPlacement(hwnd, ctypes.byref(wp))
    was_minimized = (wp.showCmd == 2)  # SW_SHOWMINIMIZED

    # If minimized, restore it temporarily
    if was_minimized:
        # Use SW_RESTORE to fully restore (needed for GPU-rendered content)
        user32.ShowWindow(hwnd, SW_RESTORE)
        # Force redraw so the window actually renders its content
        user32.RedrawWindow(hwnd, None, None, 0x0085)  # RDW_INVALIDATE | RDW_ERASE | RDW_ALLCHILDREN
        # Give it time to render
        ctypes.windll.kernel32.Sleep(200)

    try:
        # Get window bounds from saved normal position (works even when minimized)
        if was_minimized:
            rect = wp.rcNormalPosition
        else:
            rect = RECT()
            ctypes.windll.dwmapi.DwmGetWindowAttribute(
                hwnd, DWMWA_EXTENDED_FRAME_BOUNDS,
                ctypes.byref(rect), ctypes.sizeof(rect)
            )

        width = rect.right - rect.left
        height = rect.bottom - rect.top

        if width <= 100 or height <= 100:
            return None

        # Use PrintWindow for reliable capture (works for GPU-rendered content)
        hwndDC = user32.GetWindowDC(hwnd)
        mfcDC = ctypes.windll.gdi32.CreateCompatibleDC(hwndDC)
        saveBitMap = ctypes.windll.gdi32.CreateCompatibleBitmap(hwndDC, width, height)
        ctypes.windll.gdi32.SelectObject(mfcDC, saveBitMap)

        # Try PrintWindow with PW_RENDERFULLCONTENT (captures GPU-composited content)
        result = user32.PrintWindow(hwnd, mfcDC, PW_RENDERFULLCONTENT)
        if not result:
            # Fallback: BitBlt from window DC
            ctypes.windll.gdi32.BitBlt(mfcDC, 0, 0, width, height, hwndDC, 0, 0, SRCCOPY)

        # Convert to PIL Image using GetDIBits
        class BITMAPINFOHEADER(ctypes.Structure):
            _fields_ = [
                ('biSize', ctypes.c_uint32),
                ('biWidth', ctypes.c_long),
                ('biHeight', ctypes.c_long),
                ('biPlanes', ctypes.c_ushort),
                ('biBitCount', ctypes.c_ushort),
                ('biCompression', ctypes.c_uint32),
                ('biSizeImage', ctypes.c_uint32),
                ('biXPelsPerMeter', ctypes.c_long),
                ('biYPelsPerMeter', ctypes.c_long),
                ('biClrUsed', ctypes.c_uint32),
                ('biClrImportant', ctypes.c_uint32),
            ]

        bmi = BITMAPINFOHEADER()
        bmi.biSize = 40
        bmi.biWidth = width
        bmi.biHeight = -height  # Top-down
        bmi.biPlanes = 1
        bmi.biBitCount = 32
        bmi.biCompression = 0

        buffer_size = width * height * 4
        buffer = ctypes.c_buffer(buffer_size)
        ctypes.windll.gdi32.GetDIBits(mfcDC, saveBitMap, 0, height, buffer, ctypes.byref(bmi), 0)

        image = Image.frombytes('RGBA', (width, height), buffer, 'raw', 'BGRA')
        image = image.convert('RGB')

        # Cleanup GDI
        ctypes.windll.gdi32.DeleteObject(saveBitMap)
        ctypes.windll.gdi32.DeleteDC(mfcDC)
        user32.ReleaseDC(hwnd, hwndDC)

        return image

    finally:
        # If window was minimized, minimize it again
        if was_minimized:
            user32.ShowWindow(hwnd, SW_SHOWMINIMIZED)


class MJPEGStreamHandler(BaseHTTPRequestHandler):
    """HTTP handler that serves MJPEG stream and a simple HTML viewer."""

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == '/stream':
            self._serve_mjpeg()
        elif parsed.path == '/snapshot':
            self._serve_snapshot()
        elif parsed.path == '/status':
            self._serve_status()
        elif parsed.path == '/':
            self._serve_viewer()
        else:
            self.send_error(404)

    def _serve_mjpeg(self):
        """Serve MJPEG stream (multipart/x-mixed-replace)."""
        self.send_response(200)
        self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Connection', 'close')
        self.end_headers()

        server = self.server
        while not server._stop_event.is_set():
            try:
                frame = server._get_frame()
                if frame:
                    self.wfile.write(b'--frame\r\n')
                    self.wfile.write(b'Content-Type: image/jpeg\r\n')
                    self.wfile.write(f'Content-Length: {len(frame)}\r\n'.encode())
                    self.wfile.write(b'\r\n')
                    self.wfile.write(frame)
                    self.wfile.write(b'\r\n')
                    self.wfile.flush()
                time.sleep(1.0 / server._fps)
            except (BrokenPipeError, ConnectionResetError, OSError):
                break

    def _serve_snapshot(self):
        """Serve a single JPEG snapshot."""
        server = self.server
        frame = server._get_frame()
        if frame:
            self.send_response(200)
            self.send_header('Content-Type', 'image/jpeg')
            self.send_header('Content-Length', str(len(frame)))
            self.end_headers()
            self.wfile.write(frame)
        else:
            self.send_error(500, 'Capture failed')

    def _serve_status(self):
        """Serve JSON status."""
        server = self.server
        status = {
            'window_title': server._window_title,
            'hwnd': server._hwnd,
            'fps': server._fps,
            'resolution': server._resolution,
            'active': server._running,
            'timestamp': time.time()
        }
        data = json.dumps(status).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(data)

    def _serve_viewer(self):
        """Serve a simple HTML viewer page."""
        html = b'''<!DOCTYPE html>
<html>
<head><title>Screen Watcher</title>
<style>
body{background:#111;color:#eee;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;padding:20px}
img{max-width:100%;border:2px solid #333;border-radius:8px}
.status{margin-top:10px;color:#888;font-size:14px}
</style></head>
<body>
<h2>Screen Watcher</h2>
<img src="/stream" id="stream">
<div class="status" id="status">Connecting...</div>
<script>
const img = document.getElementById('stream');
const status = document.getElementById('status');
img.onload = () => { status.textContent = 'Connected - ' + new Date().toLocaleTimeString(); };
img.onerror = () => { status.textContent = 'Disconnected. Retrying...'; setTimeout(() => img.src='/stream?'+Date.now(), 2000); };
fetch('/status').then(r=>r.json()).then(s => {
    status.textContent = `Watching: "${s.window_title}" @ ${s.fps}fps (${s.resolution})`;
});
</script></body></html>'''
        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        self.wfile.write(html)

    def log_message(self, format, *args):
        pass  # Suppress request logs


class ScreenWatcherServer(HTTPServer):
    """HTTP server that captures a window and streams it as MJPEG."""

    def __init__(self, host, port, window_title, fps=2):
        super().__init__((host, port), MJPEGStreamHandler)
        self._window_title = window_title
        self._hwnd = None
        self._fps = fps
        self._resolution = 'unknown'
        self._running = True
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        self._latest_frame = None

        # Find the window
        self._hwnd, actual_title = find_window(window_title)
        if self._hwnd:
            self._window_title = actual_title
            print(f"[ScreenWatcher] Found window: '{actual_title}' (hwnd={self._hwnd})")
        else:
            print(f"[ScreenWatcher] Window '{window_title}' not found! Available windows:")
            for hwnd, title in enum_windows():
                print(f"  - {title}")
            self._running = False
            return

        # Start capture thread
        self._capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._capture_thread.start()

    def _capture_loop(self):
        """Continuously capture the window and encode as JPEG."""
        from PIL import Image
        import io as _io

        consecutive_failures = 0
        while not self._stop_event.is_set():
            try:
                img = capture_window(self._hwnd)
                if img:
                    buf = _io.BytesIO()
                    img.save(buf, format='JPEG', quality=75)
                    with self._lock:
                        self._latest_frame = buf.getvalue()
                        self._resolution = f"{img.width}x{img.height}"
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
            except Exception as e:
                print(f"[ScreenWatcher] Capture error: {e}")
                consecutive_failures += 1

            if consecutive_failures > 10:
                print("[ScreenWatcher] Too many consecutive failures, stopping.")
                self._running = False
                break

            time.sleep(1.0 / self._fps)

    def _get_frame(self):
        """Get the latest captured frame."""
        with self._lock:
            return self._latest_frame

    def stop(self):
        """Stop the server and capture thread."""
        self._stop_event.set()
        self._running = False
        self.shutdown()


def main():
    parser = argparse.ArgumentParser(description='Screen Watcher - Stream a window as MJPEG')
    parser.add_argument('--window', '-w', default=None, help='Window title to capture (partial match)')
    parser.add_argument('--port', '-p', type=int, default=8080, help='HTTP port (default: 8080)')
    parser.add_argument('--host', default='0.0.0.0', help='HTTP host (default: 0.0.0.0)')
    parser.add_argument('--fps', type=float, default=2.0, help='Capture FPS (default: 2)')
    parser.add_argument('--list', action='store_true', help='List all visible windows and exit')
    args = parser.parse_args()

    if args.list:
        print("Visible windows:")
        for hwnd, title in enum_windows():
            print(f"  [{hwnd:10}] {title}")
        return

    print(f"[ScreenWatcher] Starting server on {args.host}:{args.port}")
    print(f"[ScreenWatcher] Watching window: '{args.window}' at {args.fps} FPS")
    print(f"[ScreenWatcher] Open http://localhost:{args.port}/ to view")

    server = ScreenWatcherServer(args.host, args.port, args.window, args.fps)

    if not server._running:
        print("[ScreenWatcher] Failed to find window. Exiting.")
        sys.exit(1)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[ScreenWatcher] Stopping...")
        server.stop()


if __name__ == '__main__':
    main()
