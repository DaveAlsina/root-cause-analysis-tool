#!/usr/bin/env python3
"""Build each tool into one offline HTML file: the app's own files plus the shared core, libraries and fonts.

    python3 build.py            builds every tool
    python3 build.py rca        builds one

Each tool's script is its config.js, then the shared core, then its own files, concatenated in that
order into one <script>. The core calls functions each app defines (listed at the top of every core file).
"""
import base64, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).parent
NM = ROOT / "node_modules"
SRC = ROOT / "src"
DIST = ROOT / "dist"; DIST.mkdir(exist_ok=True)
REPO = ROOT.parent

FONTS = [
    ("IBM Plex Sans", 400, "normal", "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2"),
    ("IBM Plex Sans", 400, "italic", "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-italic.woff2"),
    ("IBM Plex Sans", 500, "normal", "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2"),
    ("IBM Plex Sans", 600, "normal", "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2"),
    ("IBM Plex Sans", 700, "normal", "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff2"),
    ("IBM Plex Mono", 400, "normal", "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2"),
    ("IBM Plex Mono", 500, "normal", "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2"),
    ("IBM Plex Sans Condensed", 600, "normal", "@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-600-normal.woff2"),
]

CORE = ["core/base.js", "core/store.js", "core/files.js", "core/versions.js", "core/tags.js", "core/langs.js", "core/bib.js", "core/menus.js", "core/modes.js"]

APPS = {
    "rca": {
        "html": "rca/app.html", "css": ["core/base.css"],
        "js": ["rca/config.js", *CORE, "rca/model.js", "rca/canvas.js", "rca/panel.js", "rca/io.js", "rca/publish.js", "rca/interviews.js", "rca/boot.js"],
        "out": "uchuva-rca.html", "docs": True,
    },
    "home": {  # the start page: links to each tool, shows what is open in each; no diagram code
        "html": "home/index.html", "css": ["core/base.css", "home/home.css"], "js": [],
        "out": "index.html", "docs": False,
    },
    "fa": {
        "html": "fa/app.html", "css": ["core/base.css", "fa/fa.css"],
        "js": ["fa/config.js", *CORE, "fa/model.js", "fa/system.js", "fa/goals.js", "fa/checks.js", "fa/canvas.js", "fa/panel.js", "fa/syspanel.js", "fa/goalspanel.js", "fa/dialogs.js", "fa/io.js", "fa/boot.js"],
        "out": "function-analysis.html", "docs": False,
    },
}


def font_css():
    out = []
    for fam, w, st, p in FONTS:
        b64 = base64.b64encode((NM / p).read_bytes()).decode()
        out.append(f"@font-face{{font-family:'{fam}';font-style:{st};font-weight:{w};font-display:swap;"
                   f"src:url(data:font/woff2;base64,{b64}) format('woff2')}}")
    return "\n".join(out)


def script(path):
    return (NM / path).read_text(encoding="utf-8").replace("</script", "<\\/script")


DECL = re.compile(r"^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:const|let|var)\s+(.+?)(?:=|;)", re.M)


def top_level_names(js):
    """Names declared at the top level (lines with no indent). A name defined twice would silently shadow the first."""
    names = []
    for m in DECL.finditer(js):
        if m.group(1):
            names.append(m.group(1))
        else:  # const a = 1, b = 2  /  let x = null, y = null: split only at commas outside brackets and strings
            line = re.sub(r"^(const|let|var)\s+", "", js[m.start():js.find("\n", m.start())])
            parts, depth, quote, cur = [], 0, None, ""
            for i, ch in enumerate(line):
                if quote:
                    if ch == quote and line[i - 1] != "\\":
                        quote = None
                elif ch in "\"'`":
                    quote = ch
                elif ch in "([{":
                    depth += 1
                elif ch in ")]}":
                    depth -= 1
                elif ch == "," and depth == 0:
                    parts.append(cur); cur = ""; continue
                cur += ch
            parts.append(cur)
            for part in parts:
                nm = re.match(r"\s*([A-Za-z_$][\w$]*)\s*(=|;|$)", part)
                if nm:
                    names.append(nm.group(1))
    return names


def app_js(spec):
    parts = []
    for f in spec["js"]:
        parts.append(f"/* ---- {f} ---- */\n" + (SRC / f).read_text(encoding="utf-8"))
    js = "\n".join(parts)
    seen, dups = set(), []
    for n in top_level_names(js):
        (dups.append(n) if n in seen else seen.add(n))
    assert not dups, f"defined twice at the top level: {sorted(set(dups))}"
    return js


def check_syntax(js, name):
    tmp = DIST / f".{name}.check.js"
    tmp.write_text(js, encoding="utf-8")
    r = subprocess.run(["node", "--check", str(tmp)], capture_output=True, text=True)
    tmp.unlink()
    assert r.returncode == 0, r.stderr


def build(name, spec, fonts):
    html = (SRC / spec["html"]).read_text(encoding="utf-8")
    html = re.sub(r"<!--INCLUDE (\S+)-->", lambda m: (SRC / m.group(1)).read_text(encoding="utf-8"), html)
    parts = {
        "/*FONTS*/": fonts,
        "/*CSS*/": "\n".join((SRC / c).read_text(encoding="utf-8") for c in spec["css"]),
    }
    if spec["js"]:  # a diagram tool: libraries and its own code
        js = app_js(spec)
        check_syntax(js, name)
        parts.update({
            "/*CYTOSCAPE*/": script("cytoscape/dist/cytoscape.min.js"),
            "/*ELK*/": script("elkjs/lib/elk.bundled.js"),
            "/*APP*/": js.replace("</script", "<\\/script"),
        })
    for k, v in parts.items():
        assert k in html, (name, k)
        html = html.replace(k, v)
    (DIST / spec["out"]).write_text(html, encoding="utf-8")
    (REPO / spec["out"]).write_text(html, encoding="utf-8")
    if spec["docs"]:
        # the same app, published as a GitHub Pages site in ../docs: index.html opens docs/rca.json read-only,
        # index.html?edit opens the editor (work stays in the visitor's browser and files).
        docs = REPO / "docs"; docs.mkdir(exist_ok=True)
        site = html.replace('<meta name="viewport"', '<meta name="rca-publish" content="rca.json">\n<meta name="viewport"', 1)
        site = site.replace("<title>Uchuva RCA Workbench</title>", "<title>Root-cause analysis viewer</title>", 1)
        (docs / "index.html").write_text(site, encoding="utf-8")
        (docs / ".nojekyll").write_text("", encoding="utf-8")
    print(f"{spec['out']:26} {round(len(html) / 1024)} KB")


if __name__ == "__main__":
    want = sys.argv[1:] or list(APPS)
    fonts = font_css()
    for n in want:
        if n == "fa" and not (SRC / APPS[n]["html"]).exists():
            continue
        build(n, APPS[n], fonts)
