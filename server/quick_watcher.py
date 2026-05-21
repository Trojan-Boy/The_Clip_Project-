"""
Quick AI Watcher - Monitors Arc browser and alerts on changes/errors.
Uses the /snapshot endpoint for simplicity.
"""
import sys, time, json, urllib.request, base64, os
from datetime import datetime

STREAM_URL = "http://localhost:8080"
CHECK_INTERVAL = 5  # seconds
ALERT_COOLDOWN = 30  # seconds

# OpenRouter config
OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT = os.environ.get("TELEGRAM_CHAT_ID", "")

def get_snapshot():
    """Get a single frame from the stream server."""
    try:
        req = urllib.request.Request(f"{STREAM_URL}/snapshot")
        resp = urllib.request.urlopen(req, timeout=10)
        data = resp.read()
        if data[:3] == b'\xff\xd8\xff':
            return data
        return None
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Snapshot error: {e}")
        return None

def get_status():
    """Get stream status."""
    try:
        req = urllib.request.Request(f"{STREAM_URL}/status")
        resp = urllib.request.urlopen(req, timeout=5)
        return json.loads(resp.read().decode())
    except:
        return {}

def analyze_with_ai(image_data):
    """Send image to OpenRouter vision model for analysis."""
    if not OPENROUTER_KEY:
        return None
    
    b64 = base64.b64encode(image_data).decode()
    
    payload = {
        "model": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                {"type": "text", "text": """You are watching a screen share of the Arc browser. Analyze this screenshot and tell me:

1. What is currently visible? (web page content, UI state)
2. Is there any ERROR, DIALOG BOX, POPUP, or UNEXPECTED content? (Yes/No)
3. If yes, describe exactly what the error/dialog says
4. Has anything CHANGED compared to a normal browsing state?

Be concise. Focus on errors, popups, dialogs, and unexpected states."""}
            ]
        }],
        "max_tokens": 300
    }
    
    try:
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENROUTER_KEY}"
            }
        )
        resp = urllib.request.urlopen(req, timeout=60)
        result = json.loads(resp.read().decode())
        return result.get("choices", [{}])[0].get("message", {}).get("content", "")
    except Exception as e:
        print(f"AI error: {e}")
        return None

def send_telegram(message, image_data=None):
    """Send alert to Telegram."""
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT:
        print("No Telegram config, skipping send")
        return False
    
    try:
        if image_data:
            boundary = b'----Boundary'
            body = b''
            body += b'--' + boundary + b'\r\n'
            body += b'Content-Disposition: form-data; name="chat_id"\r\n\r\n'
            body += TELEGRAM_CHAT.encode() + b'\r\n'
            body += b'--' + boundary + b'\r\n'
            body += b'Content-Disposition: form-data; name="caption"\r\n\r\n'
            body += message.encode() + b'\r\n'
            body += b'--' + boundary + b'\r\n'
            body += b'Content-Disposition: form-data; name="photo"; filename="screen.jpg"\r\n'
            body += b'Content-Type: image/jpeg\r\n\r\n'
            body += image_data + b'\r\n'
            body += b'--' + boundary + b'--\r\n'
            
            req = urllib.request.Request(
                f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendPhoto",
                data=body,
                headers={"Content-Type": f"multipart/form-data; boundary={boundary.decode()}"}
            )
        else:
            payload = json.dumps({
                "chat_id": TELEGRAM_CHAT,
                "text": message,
                "parse_mode": "HTML"
            }).encode()
            req = urllib.request.Request(
                f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
                data=payload,
                headers={"Content-Type": "application/json"}
            )
        
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read().decode()).get("ok", False)
    except Exception as e:
        print(f"Telegram error: {e}")
        return False

def main():
    print(f"[Watcher] Starting Arc browser monitor")
    print(f"[Watcher] Stream: {STREAM_URL}")
    print(f"[Watcher] Check interval: {CHECK_INTERVAL}s")
    print(f"[Watcher] Press Ctrl+C to stop\n")
    
    last_alert = 0
    frame_count = 0
    last_analysis = ""
    
    while True:
        try:
            # Check stream status
            status = get_status()
            if not status.get("active"):
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Stream not active, waiting...")
                time.sleep(5)
                continue
            
            # Capture frame
            frame = get_snapshot()
            if not frame:
                time.sleep(2)
                continue
            
            frame_count += 1
            ts = datetime.now().strftime('%H:%M:%S')
            
            # Analyze every 3rd frame (to save API calls)
            if frame_count % 3 == 0:
                print(f"[{ts}] Analyzing frame #{frame_count} ({len(frame)} bytes)...")
                analysis = analyze_with_ai(frame)
                
                if analysis:
                    print(f"[{ts}] AI: {analysis[:200]}")
                    
                    # Check for errors/changes
                    has_error = any(kw in analysis.lower() for kw in ["error", "dialog", "popup", "unexpected", "changed", "warning"])
                    is_different = analysis != last_analysis
                    
                    if has_error and (time.time() - last_alert) > ALERT_COOLDOWN:
                        alert = f"🚨 <b>Arc Browser Alert</b>\n\n{analysis}"
                        print(f"[{ts}] ⚠️ ERROR DETECTED! Sending alert...")
                        send_telegram(alert, frame)
                        last_alert = time.time()
                    
                    last_analysis = analysis
                else:
                    print(f"[{ts}] AI analysis returned empty")
            else:
                print(f"[{ts}] Frame #{frame_count} captured ({len(frame)} bytes)")
            
            time.sleep(CHECK_INTERVAL)
            
        except KeyboardInterrupt:
            print(f"\n[Watcher] Stopped. Total frames: {frame_count}")
            break
        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
