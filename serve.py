#!/usr/bin/env python3
"""Local server for Phaser Lab.

Serves only the files that are deployed (index.html, preview.html, css/, js/, vendor/) and sends the same response
headers as vercel.json, so what works here works on Vercel. Pages are never cached locally, so edits
show up on reload. Usage: python3 serve.py [port] [--open]
"""
import http.server
import json
import re
import socketserver
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PUBLIC = {"index.html", "preview.html"}
PUBLIC_DIRS = ("css/", "js/", "vendor/")
TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
         ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png"}


def load_rules():
    """Vercel header rules as (regex, headers) pairs. Only the simple "(...)" sources used here."""
    config = json.loads((ROOT / "vercel.json").read_text())
    rules = []
    for rule in config.get("headers", []):
        pattern = "^" + rule["source"].replace("(.*)", ".*") + "$"
        rules.append((re.compile(pattern), {h["key"]: h["value"] for h in rule["headers"]}))
    return rules


RULES = load_rules()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        relative = "index.html" if path == "/" else path.lstrip("/")
        if ".." in relative or not (relative in PUBLIC or relative.startswith(PUBLIC_DIRS)):
            self.send_error(404, "Not found")
            return None
        return super().send_head()

    def guess_type(self, path):
        return TYPES.get(Path(path).suffix, super().guess_type(path))

    def end_headers(self):
        path = self.path.split("?", 1)[0]
        headers = {}
        for pattern, values in RULES:
            if pattern.match(path):
                headers.update(values)
        if not path.startswith("/vendor/"):
            headers["Cache-Control"] = "no-store"
        for key, value in headers.items():
            self.send_header(key, value)
        super().end_headers()

    def log_message(self, format, *args):
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(format, *args)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    port = int(args[0]) if args else 8765
    for candidate in range(port, port + 20):
        try:
            server = Server(("127.0.0.1", candidate), Handler)
            break
        except OSError:
            continue
    else:
        sys.exit(f"No free port between {port} and {port + 19}.")
    url = f"http://127.0.0.1:{server.server_address[1]}/"
    print(f"Phaser Lab running at {url}  (Ctrl+C to stop)")
    if "--open" in sys.argv:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
