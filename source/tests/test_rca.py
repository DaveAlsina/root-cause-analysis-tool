"""The RCA workbench: behaviour that must survive the shared-core refactor."""
from harness import REPO, Page

import os
APP = os.environ.get("RCA_APP", "/uchuva-rca.html")
RCA_JSON = (REPO / "uchuva-rca.json").read_text(encoding="utf-8")
BIB = (REPO / "refs.bib").read_text(encoding="utf-8")


def opened(b, base):
    p = Page(b, base + APP)
    p.js("t => window.__rca.loadText(t, 'uchuva-rca.json', null)", RCA_JSON)
    p.page.wait_for_timeout(500)
    p.js("document.querySelectorAll('.overlay').forEach(o => o.hidden = true)")
    return p


def test_boot_offers_new(b, base):
    p = Page(b, base + APP)
    assert p.js("!document.querySelector('#m-new').hidden"), "a first visit should open the New RCA dialog"
    p.page.fill("#new-title", "Test RCA")
    p.page.click("#new-form button[type=submit]")
    p.page.wait_for_timeout(700)
    assert p.js("window.__rca.doc.title") == "Test RCA"
    assert p.js("window.__rca.doc.nodes.length") == 1
    p.assert_clean(); p.close()


def test_open_render(b, base):
    p = opened(b, base)
    n = p.js("window.__rca.doc.nodes.length")
    assert n > 100, n
    assert p.js("window.__rca.cy().nodes('[fill]').length") == n
    assert p.js("window.__rca.doc.languages") == ["en", "es"]
    p.assert_clean(); p.close()


def test_edit_undo_redo(b, base):
    p = opened(b, base)
    n = p.js("window.__rca.doc.nodes.length")
    p.js("window.__rca.commit(() => window.__rca.doc.nodes.splice(0, 1))")
    p.page.wait_for_timeout(200)
    assert p.js("window.__rca.doc.nodes.length") == n - 1
    p.page.mouse.click(700, 450)  # focus the canvas, not a field
    p.page.keyboard.press("Control+z"); p.page.wait_for_timeout(200)
    assert p.js("window.__rca.doc.nodes.length") == n
    p.page.keyboard.press("Control+Shift+z"); p.page.wait_for_timeout(200)
    assert p.js("window.__rca.doc.nodes.length") == n - 1
    p.assert_clean(); p.close()


def test_inline_edit_two_languages(b, base):
    p = opened(b, base)
    p.js("window.__rca.view.lang = 'en'")
    nid = p.js("window.__rca.doc.nodes[0].id")
    p.js(f"document.querySelector('#side-open').click()")
    p.js(f"void window.__rca.cy().getElementById('{nid}').emit('tap')")
    p.page.wait_for_timeout(200)
    p.page.keyboard.press("Enter"); p.page.wait_for_timeout(150)
    p.page.keyboard.press("Control+a"); p.page.keyboard.type("Edited EN"); p.page.keyboard.press("Enter")
    p.page.keyboard.press("Control+a"); p.page.keyboard.type("Editado ES"); p.page.keyboard.press("Enter")
    p.page.wait_for_timeout(300)
    n = p.js(f"window.__rca.nodeById('{nid}')")
    assert n["text"] == "Edited EN" and n["textTr"]["es"] == "Editado ES", n
    p.assert_clean(); p.close()


def test_tags_dialog(b, base):
    p = opened(b, base)
    tags = p.js("window.__rca.doc.tags.length")
    p.js("document.querySelector('[data-act=tags]').click()")
    assert p.js("!document.querySelector('#m-tags').hidden")
    assert p.js("document.querySelectorAll('#tag-rows .trow').length") == tags
    p.js("document.querySelector('#tag-save').click()"); p.page.wait_for_timeout(300)
    assert p.js("window.__rca.doc.tags.length") == tags
    p.assert_clean(); p.close()


def test_languages(b, base):
    p = opened(b, base)
    first = p.js("window.__rca.doc.nodes[0].text")
    p.js("window.__rca.makeMainLang('es')"); p.page.wait_for_timeout(300)
    assert p.js("window.__rca.doc.languages[0]") == "es"
    assert p.js("window.__rca.doc.nodes[0].textTr.en") == first
    p.js("document.querySelector('[data-act=langs]').click()")
    assert p.js("document.querySelectorAll('#lang-body .langrow').length") == 2
    p.assert_clean(); p.close()


def test_versions(b, base):
    p = opened(b, base)
    v = p.js("window.__rca.doc.versions.length")
    p.js("document.querySelector('[data-act=versions]').click()")
    p.page.fill("#ver-name", "Test version")
    p.js("document.querySelector('#ver-form button[type=submit]').click()"); p.page.wait_for_timeout(200)
    assert p.js("window.__rca.doc.versions.length") == v + 1
    p.js("window.__rca.commit(() => window.__rca.doc.nodes.splice(0, 2))"); p.page.wait_for_timeout(200)
    p.js("document.querySelector('[data-act=versions]').click()")
    p.js("document.querySelector('[data-vcmp]').click()")
    html = p.js("document.querySelector('#ver-diff').innerHTML")
    assert "Removed boxes" in html and "−2" in html, html[:300]
    p.js("document.querySelector('#vd-show').click()"); p.page.wait_for_timeout(200)
    assert p.js("!document.querySelector('#diffbar').hidden")
    p.assert_clean(); p.close()


def test_bib_autocomplete(b, base):
    p = opened(b, base)
    p.js("t => { const e = window.__rca.parseBib(t); window.__rca.setBib('refs.bib', e); }", BIB)
    assert p.js("document.querySelector('[data-act=bib]').textContent").startswith("Bibliography: refs.bib")
    nid = p.js("window.__rca.doc.nodes[3].id")
    p.js("document.querySelector('#side-open').click()")
    p.js(f"void window.__rca.cy().getElementById('{nid}').emit('tap')"); p.page.wait_for_timeout(200)
    p.page.click("#f-src"); p.page.keyboard.press("Control+End"); p.page.keyboard.type("\n@asian")
    p.page.wait_for_timeout(150)
    assert p.js("document.querySelectorAll('#bibpop .opt').length") >= 1
    p.page.keyboard.press("Enter"); p.page.wait_for_timeout(900)
    assert any(s.startswith("@asiandevelopmentbank") for s in p.js(f"window.__rca.nodeById('{nid}').sources"))
    p.assert_clean(); p.close()


def test_exports(b, base):
    p = opened(b, base)
    svg = p.js("window.__rca.exportSVG().svg")
    assert svg.startswith("<svg") or svg.startswith("<?xml"), svg[:60]
    for act, ext in [("exp-json", ".json"), ("exp-nodes", ".csv"), ("exp-edges", ".csv"), ("exp-graphml", ".graphml"), ("exp-drawio", ".drawio")]:
        name, body = p.download(f"[data-act={act}]")
        assert name.endswith(ext) and len(body) > 200, (act, name)
    p.assert_clean(); p.close()


def test_grade_mode(b, base):
    p = opened(b, base)
    p.js("document.querySelector('#work-grade').click()")
    assert p.js("!document.querySelector('#m-istart').hidden")
    p.page.fill("#is-code", "EXP-99")
    p.js("document.querySelector('#istart-form button[type=submit]').click()"); p.page.wait_for_timeout(500)
    assert p.js("document.body.classList.contains('grading')")
    nid = p.js("window.__rca.doc.nodes[2].id")
    p.js(f"void window.__rca.cy().getElementById('{nid}').emit('tap')"); p.page.wait_for_timeout(150)
    p.page.mouse.click(5, 300); p.js(f"void window.__rca.cy().getElementById('{nid}').emit('tap')")
    p.page.keyboard.press("2"); p.page.wait_for_timeout(200)
    grades = p.js(f"window.__rca.activeSession().grades['{nid}']")
    assert grades and any(g['v'] == 2 for g in grades.values()), grades
    p.assert_clean(); p.close()


def test_viewer(b, base):
    p = Page(b, base + "/docs/index.html")
    p.page.wait_for_timeout(800)
    assert p.js("window.__rca.VIEWER")
    assert p.js("window.__rca.cy().nodes('[fill]').length") > 50
    p.assert_clean(); p.close()


def test_share_link_roundtrip(b, base):
    p = opened(b, base)
    same = p.js("async () => { const d = window.__rca.publishedDoc({notes:true,sources:true,status:true,versions:false}); const s = await window.__rca.encodeShare(d); const back = await window.__rca.decodeShare(s); return back.nodes.length === d.nodes.length; }")
    assert same
    p.assert_clean(); p.close()


def test_kind_and_logic(b, base):
    p = opened(b, base)
    d = p.js("t => window.__rca.normalizeDoc(JSON.parse(t)).nodes.slice(0, 2).map(n => [n.kind, n.logic])", RCA_JSON)
    assert d == [["", ""], ["", ""]], d
    kept = p.js("() => { const x = { nodes: [{ id: 'a', text: 'A', kind: 'barrier', logic: 'or' }, { id: 'b', text: 'B', kind: 'nope', logic: 'xor' }], edges: [] }; return window.__rca.normalizeDoc(x).nodes.map(n => [n.kind, n.logic]); }")
    assert kept == [["barrier", "or"], ["", ""]], kept
    # a box with two or more causes gets the AND/OR switch; setting it draws a chip on the canvas
    nid = p.js("(() => { const A = window.__rca.analyze(); return window.__rca.doc.nodes.find(n => A.out.get(n.id).length >= 2).id; })()")
    p.js("document.querySelector('#side-open').click()")
    p.js(f"void window.__rca.cy().getElementById('{nid}').emit('tap')"); p.page.wait_for_timeout(200)
    p.js("document.querySelector('[data-logic=and]').click()"); p.page.wait_for_timeout(300)
    assert p.js(f"window.__rca.nodeById('{nid}').logic") == "and"
    assert p.js(f"window.__rca.cy().getElementById('a:{nid}').nonempty()")
    p.js("(() => { const s = document.querySelector('#f-kind'); s.value = 'mechanism'; s.dispatchEvent(new Event('change')); })()"); p.page.wait_for_timeout(300)
    assert p.js(f"window.__rca.nodeById('{nid}').kind") == "mechanism"
    p.js("(() => { const c = document.querySelector('#v-gates'); c.checked = false; c.dispatchEvent(new Event('change')); })()"); p.page.wait_for_timeout(300)
    assert p.js(f"window.__rca.cy().getElementById('a:{nid}').empty()")
    name, body = p.download("[data-act=exp-nodes]")
    head = body.splitlines()[0]
    assert "kind" in head and "causes_combine" in head, head
    assert "Mechanism" in body and ",AND," in body
    p.assert_clean(); p.close()


def test_grade_anchors_dont_know_who(b, base):
    p = opened(b, base)
    p.js("window.__rca.commit(() => { const d = window.__rca.doc; d.scales = window.__rca.defaultScales(d.languages); })"); p.page.wait_for_timeout(200)
    sc = p.js("window.__rca.doc.scales.find(s => s.id === 'feasibility')")
    assert len(sc["anchors"]) == 5 and len(sc["who"]) == 4 and sc["anchorsTr"]["es"]["3"].startswith("Posible"), sc
    assert sc["kinds"] == ["actionable", "barrier", "infogap"]
    back = p.js("s => window.__rca.normScale(s)", sc)
    assert back["anchors"] == sc["anchors"] and back["who"] == sc["who"]
    p.js("document.querySelector('#work-grade').click()"); p.page.fill("#is-code", "EXP-98")
    p.js("document.querySelector('#istart-form button[type=submit]').click()"); p.page.wait_for_timeout(500)
    ids = p.js("window.__rca.doc.nodes.slice(2, 5).map(n => n.id)")
    p.js(f"window.__rca.commit(() => {{ window.__rca.nodeById('{ids[1]}').kind = 'constraint'; window.__rca.nodeById('{ids[2]}').kind = 'exogenous'; }})"); p.page.wait_for_timeout(200)
    # who could act, then a value: the anchor of that value shows under the buttons
    p.js(f"void window.__rca.cy().getElementById('{ids[0]}').emit('tap')"); p.page.wait_for_timeout(200)
    p.js(f"window.__rca.setGrade('{ids[0]}', 'relevance', 4)"); p.page.wait_for_timeout(200)
    p.js("document.querySelector('[data-scale=feasibility] [data-who=w2]').click()"); p.page.wait_for_timeout(150)
    p.js("document.querySelector('[data-scale=feasibility] [data-sv=\"3\"]').click()"); p.page.wait_for_timeout(200)
    g = p.js(f"window.__rca.activeSession().grades['{ids[0]}'].feasibility")
    assert g["v"] == 3 and g["who"] == "w2", g
    assert "moderate investment" in p.js("document.querySelector('[data-scale=feasibility] .anchor').textContent")
    # don't know, with its reason, replaces the value and closes the gate below it
    p.js("document.querySelector('[data-scale=relevance] [data-sdk]').click()"); p.page.wait_for_timeout(100)
    p.js("document.querySelector('[data-scale=relevance] [data-dk=notmine]').click()"); p.page.wait_for_timeout(200)
    r = p.js(f"window.__rca.activeSession().grades['{ids[0]}'].relevance")
    assert r.get("dk") == "notmine" and "v" not in r, r
    # a constraint is asked whether it holds, an exogenous condition gets relevance but not feasibility
    p.js(f"void window.__rca.cy().getElementById('{ids[1]}').emit('tap')"); p.page.wait_for_timeout(200)
    assert p.js("document.querySelectorAll('[data-scale]').length") == 0
    p.js("document.querySelector('[data-holds=no]').click()"); p.page.wait_for_timeout(200)
    p.js(f"void window.__rca.cy().getElementById('{ids[2]}').emit('tap')"); p.page.wait_for_timeout(200)
    assert p.js("[...document.querySelectorAll('[data-scale]')].map(x => x.dataset.scale)") == ["relevance"]
    rows = p.js(f"window.__rca.interviewRows(window.__rca.doc).rows.filter(r => {ids!r}.includes(r.box_id))")
    by = {r["box_id"]: r for r in rows}
    assert by[ids[0]]["relevance_state"] == "not my part of the chain" and by[ids[0]]["feasibility_who"] == "Through the grower"
    assert by[ids[1]]["holds"] == "no" and by[ids[1]]["feasibility_state"].startswith("not asked")
    assert by[ids[2]]["feasibility_state"] == "not asked (exogenous condition)"
    p.js("document.querySelector('#gb-pin').click()"); p.page.wait_for_timeout(200)
    assert p.js("!document.querySelector('#anchorpin').hidden")
    p.assert_clean(); p.close()


def test_rca_v4_is_a_fault_tree(b, base):
    """uchuva-rca-4.json: every box with two or more causes says AND or OR, every non-problem box has a kind."""
    p = Page(b, base + APP)
    p.js("t => window.__rca.loadText(t, 'uchuva-rca-4.json', null)", (REPO / "uchuva-rca-4.json").read_text(encoding="utf-8"))
    p.page.wait_for_timeout(600)
    r = p.js("""(() => { const R = window.__rca, A = R.analyze(), d = R.doc, q = n => n.text.trim() === '?';
      const prob = new Set(d.categories.filter(c => c.role === 'problem').map(c => c.id));
      return { cyc: A.cyc.size, noLogic: d.nodes.filter(n => A.out.get(n.id).length >= 2 && !n.logic).length,
        badLogic: d.nodes.filter(n => n.logic && A.out.get(n.id).length < 2).length,
        noKind: d.nodes.filter(n => !q(n) && !n.kind && !prob.has(n.cat)).length, roots: A.roots.length,
        feas: d.scales.find(s => s.id === 'feasibility').who.length }; })()""")
    assert r == {"cyc": 0, "noLogic": 0, "badLogic": 0, "noKind": 0, "roots": 1, "feas": 4}, r
    p.assert_clean(); p.close()
