#!/usr/bin/env python3
"""HTTP smoke check: serves-side verification for the V5 questioner update.

Mirrors the parts of tests/browser_smoke.py that are possible without a
browser binary: every offline-shell asset must be served with HTTP 200,
the two question banks must parse and carry 800 valid questions each,
the embedded fallbacks must expose the same data, and index.html must
reference all same-origin scripts it uses.

Runs against GEON_BASE_URL if set; otherwise it starts a local server.
"""
import json
import os
import re
import sys
import threading
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def start_http_server():
    handler = lambda *args, **kwargs: SimpleHTTPRequestHandler(*args, directory=str(ROOT), **kwargs)
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, f"http://127.0.0.1:{server.server_port}/"


BASE = os.environ.get("GEON_BASE_URL")
own_server = None
if not BASE:
    own_server, BASE = start_http_server()

failures = []


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=10) as resp:
        return resp.status, resp.headers.get("content-type", ""), resp.read()


def check(name, ok, detail=""):
    print(("PASS  " if ok else "FAIL  ") + name + (f" — {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(name)


try:
    worker = (ROOT / "service-worker.js").read_text(encoding="utf-8")
    shell_match = re.search(r"const SHELL = \[(.*?)\];", worker, re.S)
    shell = re.findall(r'"([^"]+)"', shell_match.group(1))

    for asset in shell:
        path = asset.lstrip("./")
        if path == ".":
            path = "index.html"
        try:
            status, ctype, body = get(path)
            check(f"asset {asset}", status == 200, f"HTTP {status}")
        except Exception as exc:  # noqa: BLE001
            check(f"asset {asset}", False, str(exc))

    # Question banks over HTTP
    for filename, mode in [("questions.json", "previous"), ("questions.new.json", "new")]:
        status, ctype, body = get(filename)
        check(f"{filename} served as JSON", status == 200 and "json" in ctype, f"HTTP {status} {ctype}")
        bank = json.loads(body)
        rows = [q for subject in bank.values() for rows in subject.values() for q in rows]
        check(f"{filename} has 800 questions", len(rows) == 800, f"found {len(rows)}")
        check(
            f"{filename} ids isolated to {mode}",
            all(q["id"].startswith(mode.upper() + "-") for q in rows),
        )
        check(
            f"{filename} answers all in choices",
            all(q["answer"] in q["choices"] for q in rows),
        )
        check(
            f"{filename} no placeholder choices",
            not any(re.match(r"^\s*(option\s*\d*|choice\s*\d*)\b", str(c), re.I) for q in rows for c in q["choices"]),
        )

    prev = json.loads(get("questions.json")[2])
    new = json.loads(get("questions.new.json")[2])
    norm = lambda t: re.sub(r"\s+", " ", str(t or "")).strip().lower()
    prev_texts = {norm(q["question"]) for s in prev.values() for r in s.values() for q in r}
    new_texts = {norm(q["question"]) for s in new.values() for r in s.values() for q in r}
    check("banks isolated (no shared question text)", not (prev_texts & new_texts))

    # Embedded fallbacks expose the same banks
    embedded = {}
    for filename, var in [("questions.embedded.js", "questionBank"), ("questions.new.embedded.js", "newQuestionBank")]:
        status, ctype, body = get(filename)
        m = re.search(r"window\." + var + r"\s*=\s*(\{.*\})\s*;\s*$", body.decode("utf-8"), re.S)
        ok = status == 200 and m is not None
        check(f"{filename} exposes window.{var}", ok, f"HTTP {status}")
        if ok:
            embedded[var] = json.loads(m.group(1))
    check("embedded PREVIOUS mirrors questions.json", embedded.get("questionBank") == prev)
    check("embedded NEW mirrors questions.new.json", embedded.get("newQuestionBank") == new)

    # index.html references all same-origin scripts
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    script_srcs = re.findall(r'<script[^>]+src="([^"]+)"', html)
    for src in script_srcs:
        status, _, _ = get(src.lstrip("./"))
        check(f"index.html script {src}", status == 200, f"HTTP {status}")
finally:
    if own_server:
        own_server.shutdown()

print()
if failures:
    print(f"HTTP SMOKE: {len(failures)} FAILURE(S)")
    sys.exit(1)
print("HTTP SMOKE: ALL CHECKS PASSED")
