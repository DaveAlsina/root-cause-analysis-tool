#!/usr/bin/env python3
"""Inline the app, libraries and fonts into one offline HTML file: dist/uchuva-rca.html"""
import base64, pathlib, re

ROOT = pathlib.Path(__file__).parent
NM = ROOT / "node_modules"
SRC = ROOT / "src"
DIST = ROOT / "dist"; DIST.mkdir(exist_ok=True)

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

def font_css():
    out = []
    for fam, w, st, p in FONTS:
        b64 = base64.b64encode((NM / p).read_bytes()).decode()
        out.append(f"@font-face{{font-family:'{fam}';font-style:{st};font-weight:{w};font-display:swap;"
                   f"src:url(data:font/woff2;base64,{b64}) format('woff2')}}")
    return "\n".join(out)

def script(path):
    js = (NM / path).read_text(encoding="utf-8")
    return js.replace("</script", "<\\/script")

html = (SRC / "app.html").read_text(encoding="utf-8")
parts = {
    "/*FONTS*/": font_css(),
    "/*CSS*/": (SRC / "app.css").read_text(encoding="utf-8"),
    "/*CYTOSCAPE*/": script("cytoscape/dist/cytoscape.min.js"),
    "/*ELK*/": script("elkjs/lib/elk.bundled.js"),
    "/*APP*/": (SRC / "app.js").read_text(encoding="utf-8").replace("</script", "<\\/script"),
}
for k, v in parts.items():
    assert k in html, k
    html = html.replace(k, v)
(DIST / "uchuva-rca.html").write_text(html, encoding="utf-8")
print("dist/uchuva-rca.html", round(len(html) / 1024), "KB")
