"""
AI Screen Watcher - Monitors a window stream and alerts on errors.

Connects to the Screen Watcher MJPEG stream, periodically captures frames,
sends them to an AI vision model for analysis, and sends Telegram alerts
when errors or problems are detected.

Usage:
    python ai_watcher.py --stream http://localhost:8080/stream --interval 10
    python ai_watcher.py --stream http://localhost:8080/stream --interval 5 --sensitivity high
"""
import argparse
import time
import json
import io
import sys
import os
import urllib.request
import urllib.error
from datetime import datetime


def capture_frame_from_stream(stream_url):
    """Capture a single JPEG frame from the MJPEG stream."""
    try:
        req = urllib.request.Request(stream_url, headers={
            'User-Agent': 'ScreenWatcher-AI/1.0'
        })
        resp = urllib.request.urlopen(req, timeout=10)
        data = resp.read()
        # If it's MJPEG, extract first JPEG frame
        if data.startswith(b'--frame') or data.startswith(b'--'):
            # Find JPEG data
            start = data.find(b'\xff\xd8\xff')
            end = data.find(b'\xff\xd9', start)
            if start != -1 and end != -1:
                return data[start:end+2]
        # If it's a plain JPEG
        if data[:3] == b'\xff\xd8\xff':
            return data
        return None
    except Exception as e:
        print(f"[AIWatcher] Frame capture error: {e}")
        return None


def capture_snapshot(snapshot_url):
    """Capture a single snapshot from the /snapshot endpoint."""
    try:
        req = urllib.request.Request(snapshot_url, headers={
            'User-Agent': 'ScreenWatcher-AI/1.0'
        })
        resp = urllib.request.urlopen(req, timeout=10)
        data = resp.read()
        if data[:3] == b'\xff\xd8\xff':
            return data
        return None
    except Exception as e:
        print(f"[AIWatcher] Snapshot error: {e}")
        return None


def analyze_frame_with_ai(frame_data, prompt, api_url=None, api_key=None):
    """
    Send frame to AI vision model for analysis.
    Returns (is_problem, description) tuple.
    """
    import base64

    # Encode image as base64 data URL
    b64 = base64.b64encode(frame_data).decode()
    data_url = f"data:image/jpeg;base64,{b64}"

    # Default: use OpenRouter vision API
    if not api_url:
        api_url = "https://openrouter.ai/api/v1/chat/completions"

    # Build the vision request
    payload = {
        "model": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url}
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ],
        "max_tokens": 500
    }

    headers = {
        "Content-Type": "application/json"
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        data = json.dumps(payload).encode()
        req = urllib.request.Request(api_url, data=data, headers=headers)
        resp = urllib.request.urlopen(req, timeout=60)
        result = json.loads(resp.read().decode())

        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        return content
    except Exception as e:
        print(f"[AIWatcher] AI analysis error: {e}")
        return None


def send_telegram_alert(bot_token, chat_id, message, image_data=None):
    """Send alert to Telegram. Optionally include the screenshot."""
    try:
        if image_data:
            # Send photo with caption
            import urllib.parse
            url = f"https://api.telegram.org/bot{bot_token}/sendPhoto"
            # Use multipart form data
            boundary = b'----WebKitFormBoundary7MA4YWxkTrZu0gW'
            body = b''
            body += b'--' + boundary + b'\r\n'
            body += b'Content-Disposition: form-data; name="chat_id"\r\n\r\n'
            body += chat_id.encode() + b'\r\n'
            body += b'--' + boundary + b'\r\n'
            body += b'Content-Disposition: form-data; name="caption"\r\n\r\n'
            body += message.encode() + b'\r\n'
            body += b'--' + boundary + b'\r\n'
            body += b'Content-Disposition: form-data; name="photo"; filename="screenshot.jpg"\r\n'
            body += b'Content-Type: image/jpeg\r\n\r\n'
            body += image_data + b'\r\n'
            body += b'--' + boundary + b'--\r\n'

            req = urllib.request.Request(url, data=body, headers={
                'Content-Type': f'multipart/form-data; boundary={boundary.decode()}'
            })
        else:
            # Send text only
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            payload = json.dumps({
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "HTML"
            }).encode()
            req = urllib.request.Request(url, data=payload, headers={
                'Content-Type': 'application/json'
            })

        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read().decode()).get("ok", False)
    except Exception as e:
        print(f"[AIWatcher] Telegram send error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='AI Screen Watcher - Monitor window for errors')
    parser.add_argument('--stream', '-s', required=True, help='Screen watcher stream URL (e.g., http://localhost:8080)')
    parser.add_argument('--interval', '-i', type=int, default=10, help='Check interval in seconds (default: 10)')
    parser.add_argument('--sensitivity', choices=['low', 'medium', 'high'], default='medium',
                        help='Detection sensitivity (default: medium)')
    parser.add_argument('--prompt', type=str, default=None, help='Custom analysis prompt')
    parser.add_argument('--telegram-token', type=str, default=os.environ.get('TELEGRAM_BOT_TOKEN'),
                        help='Telegram bot token (or set TELEGRAM_BOT_TOKEN env var)')
    parser.add_argument('--telegram-chat', type=str, default=os.environ.get('TELEGRAM_CHAT_ID'),
                        help='Telegram chat ID (or set TELEGRAM_CHAT_ID env var)')
    parser.add_argument('--openrouter-key', type=str, default=os.environ.get('OPENROUTER_API_KEY'),
                        help='OpenRouter API key (or set OPENROUTER_API_KEY env var)')
    parser.add_argument('--save-frames', type=str, default=None,
                        help='Directory to save captured frames for debugging')
    parser.add_argument('--dry-run', action='store_true',
                        help='Analyze but do not send Telegram alerts')
    args = parser.parse_args()

    # Build analysis prompt based on sensitivity
    if args.prompt:
        base_prompt = args.prompt
    else:
        base_prompt = """You are monitoring a screen share of a developer's window (terminal, code editor, etc.).
Analyze this screenshot carefully and answer:

1. Is there any ERROR, CRASH, FAILURE, or PROBLEM visible? (Yes/No)
2. If yes, describe the error briefly (what went wrong, what tool/app is showing it)
3. Is the developer currently stuck or blocked by something?
4. Rate urgency: LOW / MEDIUM / HIGH / CRITICAL

Respond in this exact format:
ERROR: Yes/No
DESCRIPTION: [brief description or "None"]
STUCK: Yes/No
URGENCY: [LOW/MEDIUM/HIGH/CRITICAL]"""

    if args.sensitivity == 'high':
        base_prompt += "\n\nBe very sensitive - flag anything unusual, warnings, yellow indicators, or potential issues."
    elif args.sensitivity == 'low':
        base_prompt += "\n\nOnly flag clear, obvious errors. Ignore warnings and minor issues."

    print(f"[AIWatcher] Starting monitoring")
    print(f"[AIWatcher] Stream: {args.stream}")
    print(f"[AIWatcher] Interval: {args.interval}s")
    print(f"[AIWatcher] Sensitivity: {args.sensitivity}")
    print(f"[AIWatcher] Dry run: {args.dry_run}")
    print(f"[AIWatcher] Press Ctrl+C to stop\n")

    last_alert_time = 0
    alert_cooldown = 60  # Don't send more than 1 alert per minute
    frame_count = 0
    error_count = 0

    while True:
        try:
            # Capture frame
            snapshot_url = args.stream.rstrip('/') + '/snapshot'
            frame = capture_snapshot(snapshot_url)

            if not frame:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Failed to capture frame, retrying...")
                time.sleep(5)
                continue

            frame_count += 1

            # Save frame if requested
            if args.save_frames:
                os.makedirs(args.save_frames, exist_ok=True)
                ts = datetime.now().strftime('%Y%m%d_%H%M%S')
                with open(os.path.join(args.save_frames, f'frame_{ts}.jpg'), 'wb') as f:
                    f.write(frame)

            # Analyze with AI
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Analyzing frame #{frame_count}...")
            result = analyze_frame_with_ai(
                frame, base_prompt,
                api_key=args.openrouter_key
            )

            if not result:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] AI analysis failed, skipping...")
                time.sleep(args.interval)
                continue

            print(f"[{datetime.now().strftime('%H:%M:%S')}] AI Response:\n{result}\n")

            # Parse result
            is_error = 'ERROR: Yes' in result or 'ERROR:yes' in result.lower()
            urgency = 'LOW'
            for level in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
                if f'URGENCY: {level}' in result or f'URGENCY:{level}' in result:
                    urgency = level
                    break

            # Send alert if error detected
            if is_error:
                error_count += 1
                now = time.time()

                if now - last_alert_time > alert_cooldown:
                    alert_msg = f"""🚨 <b>Screen Watcher Alert</b>

<b>Time:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
<b>Urgency:</b> {urgency}
<b>Frame:</b> #{frame_count}

{result}"""

                    if not args.dry_run:
                        if args.telegram_token and args.telegram_chat:
                            success = send_telegram_alert(
                                args.telegram_token,
                                args.telegram_chat,
                                alert_msg,
                                image_data=frame
                            )
                            if success:
                                print(f"[{datetime.now().strftime('%H:%M:%S')}] ✅ Telegram alert sent!")
                                last_alert_time = now
                            else:
                                print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Failed to send Telegram alert")
                        else:
                            print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ No Telegram credentials, alert not sent")
                            print(alert_msg)
                    else:
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] 🔍 DRY RUN - Alert would be sent:")
                        print(alert_msg)
                else:
                    remaining = int(alert_cooldown - (now - last_alert_time))
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Error detected but in cooldown ({remaining}s remaining)")

            time.sleep(args.interval)

        except KeyboardInterrupt:
            print(f"\n[AIWatcher] Stopping. Total frames: {frame_count}, Errors detected: {error_count}")
            break
        except Exception as e:
            print(f"[AIWatcher] Unexpected error: {e}")
            time.sleep(5)


if __name__ == '__main__':
    main()
