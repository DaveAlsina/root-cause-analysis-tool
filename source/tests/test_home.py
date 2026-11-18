"""The home page, the mode switcher in each tool, and the function verbs."""
from harness import Page
import test_fa as fa_tests


def test_home_cards_and_status(b, base):
    p = Page(b, base + "/index.html")
    assert p.js("document.querySelectorAll('.mode').length") == 3
    links = p.js("[...document.querySelectorAll('a.go')].map(a => a.getAttribute('href'))")
    assert links == ["uchuva-rca.html", "function-analysis.html#system", "function-analysis.html#functions"], links
    assert p.js("document.querySelectorAll('.status .muted').length") == 3, "nothing open yet in a fresh browser"
    # make a function analysis, then come back: the card shows what is open
    p.page.goto(base + "/function-analysis.html"); p.page.wait_for_timeout(600)
    p.page.fill("#new-title", "Uchuva chain"); p.page.fill("#new-root", "Deliver sound uchuva")
    p.page.click("#new-form button[type=submit]"); p.page.wait_for_timeout(400)
    p.page.goto(base + "/index.html"); p.page.wait_for_timeout(300)
    st = p.js("document.querySelectorAll('.mode[data-key=function-analysis] .status')[1].textContent")
    assert "Uchuva chain" in st and "1 function" in st, st
    st = p.js("document.querySelectorAll('.mode[data-key=function-analysis] .status')[0].textContent")
    assert "Uchuva chain" in st and "0 elements" in st and "0 boundaries" in st, st
    p.assert_clean(); p.close()


def test_mode_switcher(b, base):
    p = Page(b, base + "/function-analysis.html")
    nav = p.js("[...document.querySelectorAll('#modenav a, #modenav span')].map(e => [e.tagName, e.getAttribute('href'), e.textContent])")
    assert ["A", "index.html", "⌂"] in nav and ["A", "uchuva-rca.html", "Root causes"] in nav and ["SPAN", None, "Functions"] in nav, nav
    p.page.goto(base + "/uchuva-rca.html"); p.page.wait_for_timeout(500)
    assert p.js("document.querySelector('#modenav [aria-current]').textContent") == "Root causes"
    p.page.goto(base + "/docs/index.html"); p.page.wait_for_timeout(600)
    assert p.js("document.querySelector('#modenav').hidden"), "the published viewer has no links to tools that aren't published"
    p.assert_clean(); p.close()


def test_verb_synonyms(b, base):
    p = Page(b, base + "/function-analysis.html")
    ok = lambda t, l="en": p.js(f"window.__fa.verbOK({{text: {t!r}, textTr: {{}}}}, {l!r})") if l == "en" else p.js(f"(() => {{ const o = {{text: '', textTr: {{ {l}: {t!r} }} }}; return window.__fa.verbOK(o, {l!r}); }})()")
    for t in ["Dampen splash", "Minimise free water", "Minimize free water", "Dries the calyx", "Stopped growth", "Monitor temperature", "Inform the grower", "Chill fruit", "Attenuate inoculum"]:
        assert ok(t), t
    for t in ["Apply fungicide", "Fludioxonil dip", "Cold room"]:
        assert not ok(t), t
    for t in ["Atenuar el inóculo", "Secar el cáliz", "Informar al productor", "Minimizar el agua libre"]:
        assert ok(t, "es"), t
    sug = p.js("window.__fa.verbSuggestions('damp', 'en')")
    assert {"word": "dampen", "head": "decrement"} in sug, sug
    p.assert_clean(); p.close()


def test_verb_chips_show_basis_term(b, base):
    p = fa_tests.fresh(b, base)
    p.js("window.__fa.addSubfunction(window.__fa.curVar().root)"); p.page.wait_for_timeout(300)
    p.page.keyboard.type("atten"); p.page.wait_for_timeout(100)
    chip = p.js("document.querySelector('#verbs [data-verb=attenuate]').textContent")
    assert chip == "attenuatedecrement", chip
    p.page.keyboard.press("Escape")
    p.assert_clean(); p.close()
