#!/usr/bin/env python3
"""Serve the Figma scripts of the figma-* skills to the Desktop Bridge plugin, with CONFIG overrides.

Why: figma_execute only takes code as text, so every run used to mean pasting a whole script (the Design
Tokens page script is about 1000 lines). The plugin sandbox can fetch from an allowed localhost port and
eval the result, so a call can be this short instead:

    const u = "http://localhost:9231/figma-spacing/scripts/spacing_scale.js?cfg=" + encodeURIComponent(JSON.stringify({ DRY_RUN: true }));
    return await (0, eval)("(async()=>{" + await (await fetch(u)).text() + "})()");

Usage:  python3 serve_scripts.py [--port 9231] [--root <folder holding the figma-* skills>]

- Port: the Desktop Bridge plugin only lets the sandbox reach http://localhost on its own ports (9223 to 9232).
  The MCP server uses 9223 and up, so the default is 9231.
- Only files matching <skill>/scripts/*.js under the root are served, read only, on 127.0.0.1.
- ?cfg=<json> overrides CONFIG constants by name: {"SECTIONS": ["health"], "EXPECT_FILE": "My file"}.
  An override replaces the whole constant (give the full object for REQUEST or SCALE). A name that is not
  in the script's CONFIG block is refused, so a typo cannot silently run with defaults.
"""
import argparse
import json
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

DEFAULT_PORT = 9231
BLOCK = re.compile(r"(// ---- CONFIG ----\n)(.*?)(// ---- END CONFIG ----[^\n]*\n)", re.S)
NAME = re.compile(r"^const (\w+)\s*=", re.M)


def apply_config(source, overrides):
    """Return the script with the CONFIG constants in `overrides` replaced. Raises ValueError for unknown names."""
    m = BLOCK.search(source)
    if not m:
        raise ValueError("this script has no CONFIG block")
    names = NAME.findall(m.group(2))
    unknown = [k for k in overrides if k not in names]
    if unknown:
        raise ValueError(f"not in the CONFIG block: {', '.join(unknown)}. Available: {', '.join(names)}")
    if not overrides:
        return source
    body = NAME.sub(lambda x: f"let {x.group(1)} =", m.group(2))
    assigns = "".join(f"{k} = {json.dumps(v)};\n" for k, v in overrides.items())
    return source[:m.start(2)] + body + m.group(3) + assigns + source[m.end(3):]


def make_handler(root):
    root = Path(root).resolve()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def reply(self, code, body, ctype="text/plain; charset=utf-8"):
            data = body.encode()
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Access-Control-Allow-Origin", "*")  # the plugin sandbox sends a null origin
            self.end_headers()
            self.wfile.write(data)

        def do_OPTIONS(self):
            self.reply(204, "")

        def do_GET(self):
            url = urlparse(self.path)
            if url.path == "/health":
                return self.reply(200, "ok")
            parts = [p for p in url.path.split("/") if p]
            if len(parts) != 3 or parts[1] != "scripts" or not parts[0].startswith("figma-") or not parts[2].endswith(".js"):
                return self.reply(404, "Use /<figma-skill>/scripts/<name>.js")
            path = (root / parts[0] / "scripts" / parts[2]).resolve()
            if root not in path.parents or not path.is_file():
                return self.reply(404, "No such script")
            try:
                cfg = json.loads(parse_qs(url.query).get("cfg", ["{}"])[0])
                if not isinstance(cfg, dict):
                    raise ValueError("cfg must be a JSON object")
                self.reply(200, apply_config(path.read_text(), cfg), "text/javascript; charset=utf-8")
            except (ValueError, json.JSONDecodeError) as e:
                self.reply(400, f"Bad cfg: {e}")

    return Handler


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--port", type=int, default=DEFAULT_PORT)
    ap.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    args = ap.parse_args(argv)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(args.root))
    print(f"Serving figma-* scripts from {args.root} on http://localhost:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main(sys.argv[1:])
