"""Shared helpers for the browser tests: a local web server, a Chromium page and a list of page errors.

Run every test with:  python3 source/tests/run.py
"""
import contextlib, functools, http.server, os, pathlib, socketserver, threading
from playwright.sync_api import sync_playwright

REPO = pathlib.Path(__file__).resolve().parents[2]
CHROMIUM = os.environ.get("CHROMIUM", "/opt/pw-browsers/chromium")
NOISE = ("agent-proxy", "status of 404", "connect_rejected", "favicon", "ERR_TUNNEL", "net::ERR")


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


@contextlib.contextmanager
def server():
    handler = functools.partial(_Quiet, directory=str(REPO))
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as httpd:
        t = threading.Thread(target=httpd.serve_forever, daemon=True)
        t.start()
        try:
            yield f"http://127.0.0.1:{httpd.server_address[1]}"
        finally:
            httpd.shutdown()


@contextlib.contextmanager
def browser():
    with sync_playwright() as p:
        kw = {"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}
        b = p.chromium.launch(**kw)
        try:
            yield b
        finally:
            b.close()


class Page:
    """A fresh page with an empty browser storage; collects console errors and uncaught exceptions."""

    def __init__(self, b, url):
        self.ctx = b.new_context(accept_downloads=True, viewport={"width": 1400, "height": 900})
        self.page = self.ctx.new_page()
        self.errors = []
        self.page.on("pageerror", lambda e: self.errors.append(f"pageerror: {e}"))
        self.page.on("console", lambda m: m.type == "error" and not any(n in m.text for n in NOISE) and self.errors.append(f"console: {m.text}"))
        self.page.goto(url)
        self.page.wait_for_timeout(600)

    def js(self, expr, arg=None):
        return self.page.evaluate(expr, arg) if arg is not None else self.page.evaluate(expr)

    def download(self, click_selector):
        with self.page.expect_download() as d:
            self.page.evaluate(f'document.querySelector({click_selector!r}).click()')
        dl = d.value
        return dl.suggested_filename, pathlib.Path(dl.path()).read_text(encoding="utf-8")

    def assert_clean(self):
        assert not self.errors, "\n".join(self.errors)

    def close(self):
        self.ctx.close()
