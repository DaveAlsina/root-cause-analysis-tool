"""The function analysis workbench."""
import json
from harness import REPO, Page

APP = "/function-analysis.html"
RCA_JSON = (REPO / "uchuva-rca.json").read_text(encoding="utf-8")
BIB = (REPO / "refs.bib").read_text(encoding="utf-8")


def fresh(b, base, langs=("en",)):
    """A new, empty analysis made through the New dialog."""
    p = Page(b, base + APP)
    p.page.on("dialog", lambda d: d.accept())
    assert p.js("!document.querySelector('#m-new').hidden"), "first visit opens the New dialog over the example"
    p.page.fill("#new-title", "Uchuva chain")
    p.page.fill("#new-root", "Deliver sound uchuva")
    p.page.fill("#new-boundary", "Farm gate → importer")
    p.page.fill("#new-variant", "A: whole chain")
    for l in langs[1:]:
        p.page.check(f"#new-extra input[value={l}]")
    p.page.click("#new-form button[type=submit]")
    p.page.wait_for_timeout(500)
    return p


def build_nested(p):
    """root > f1, f2 > (f21, f22); grower -> f1 -> f21 -> f22 -> importer"""
    return p.js("""() => { const A = window.__fa, V = A.curVar(), d = A.doc;
      const mk = (t, parent, x, y) => { const f = { id: 'f' + t.replace(/\\W/g, ''), text: t, textTr: {}, kind: 'main', key: false, actsOn: [], notes: '', sources: [], tags: [], rcaLinks: [] };
        d.functions.push(f); V.placed[f.id] = { x, y, parent }; return f.id; };
      let ids;
      return A.commit(() => {
        const f1 = mk('Assess fruit', null, 0, 0), f2 = mk('Keep fruit cold', null, 300, 0), f21 = mk('Remove field heat', f2, 260, 0), f22 = mk('Hold temperature', f2, 420, 0);
        V.externals.push({ id: 'xg', text: 'Grower', textTr: {}, notes: '', x: -300, y: 0 }, { id: 'xi', text: 'Importer', textTr: {}, notes: '', x: 800, y: 0 });
        const fl = (s, t, type) => V.flows.push({ id: 'l' + s + t, source: s, target: t, type, text: s + '>' + t, textTr: {}, element: null, unwanted: false, notes: '', sources: [], tags: [] });
        fl('xg', f1, 'material'); fl(f1, f21, 'material'); fl(f21, f22, 'energy'); fl(f22, 'xi', 'material');
        ids = { f1, f2, f21, f22 };
      }).then(() => ids); }""")


def test_fa_new_dialog(b, base):
    p = fresh(b, base, ("en", "es"))
    d = p.js("window.__fa.doc")
    assert d["title"] == "Uchuva chain" and d["languages"] == ["en", "es"]
    assert len(d["functions"]) == 1 and d["functions"][0]["text"] == "Deliver sound uchuva"
    v = d["variants"][0]
    assert v["name"] == "A: whole chain" and v["boundary"] == "Farm gate → importer" and v["root"] == d["functions"][0]["id"]
    assert [t["nameTr"].get("es") for t in d["flowTypes"]] == ["Material", "Energía", "Señal"]
    p.assert_clean(); p.close()


def test_fa_doubleclick_adds_function_and_external(b, base):
    p = fresh(b, base, ("en", "es"))
    box = p.js("(() => { const r = document.querySelector('#cy').getBoundingClientRect(); const n = window.__fa.cy().getElementById(window.__fa.curVar().root); const bb = n.renderedBoundingBox(); return { x: r.left + (bb.x1 + bb.x2) / 2, y: r.top + (bb.y1 + bb.y2) / 2 + 30, ox: r.left + bb.x1 - 120, oy: r.top + bb.y1 + 20 }; })()")
    p.page.mouse.dblclick(box["x"], box["y"]); p.page.wait_for_timeout(300)
    assert p.js("!document.querySelector('#inline').hidden"), "the inline editor opens on the new function"
    p.page.keyboard.type("Keep fruit cold"); p.page.wait_for_timeout(100)
    p.page.keyboard.press("Enter"); p.page.keyboard.type("Mantener la fruta fría"); p.page.keyboard.press("Enter"); p.page.wait_for_timeout(300)
    V = p.js("window.__fa.curVar()")
    fid = list(V["placed"].keys())[0]
    f = p.js(f"window.__fa.fnById('{fid}')")
    assert f["text"] == "Keep fruit cold" and f["textTr"]["es"] == "Mantener la fruta fría"
    assert V["placed"][fid]["parent"] is None and p.js(f"window.__fa.depthOf('{fid}')") == 1
    out = p.js("(() => { const r = document.querySelector('#cy').getBoundingClientRect(); const bb = window.__fa.cy().getElementById(window.__fa.curVar().root).renderedBoundingBox(); return { x: r.left + (bb.x1 + bb.x2) / 2, y: r.top + Math.min(bb.y2 + 70, r.height - 40) }; })()")
    p.page.mouse.dblclick(out["x"], out["y"]); p.page.wait_for_timeout(300)
    p.page.keyboard.type("Grower"); p.page.keyboard.press("Enter"); p.page.keyboard.type("Productor"); p.page.keyboard.press("Enter"); p.page.wait_for_timeout(300)
    assert [x["text"] for x in p.js("window.__fa.curVar().externals")] == ["Grower"]
    p.assert_clean(); p.close()


def test_fa_verb_suggestions(b, base):
    p = fresh(b, base)
    p.js("window.__fa.addSubfunction(window.__fa.curVar().root)"); p.page.wait_for_timeout(300)
    p.page.keyboard.type("rem"); p.page.wait_for_timeout(100)
    assert "remove" in p.js("[...document.querySelectorAll('#verbs [data-verb]')].map(b => b.dataset.verb)")
    p.page.click("#verbs [data-verb=remove]"); p.page.keyboard.type("field heat"); p.page.keyboard.press("Enter"); p.page.wait_for_timeout(300)
    assert p.js("window.__fa.doc.functions[1].text") == "remove field heat"
    p.assert_clean(); p.close()


def test_fa_levels_blackbox_and_lifting(b, base):
    p = fresh(b, base)
    ids = build_nested(p)
    assert [p.js(f"window.__fa.depthOf('{ids[k]}')") for k in ("f1", "f2", "f21")] == [1, 1, 2]
    lv = p.js("window.__fa.doc.levels")
    fill = lambda i: p.js(f"window.__fa.cy().getElementById('{i}').data('fill')")
    assert fill(ids["f1"]) == lv[1]["fill"] and fill(ids["f21"]) == lv[2]["fill"], "box colour follows the level"
    assert p.js(f"window.__fa.cy().getElementById('{ids['f2']}').isParent()"), "a decomposed function opens as a container"
    p.js("window.__fa.view.depth = '1'; window.__fa.render()"); p.page.wait_for_timeout(200)
    edges = p.js("window.__fa.cy().edges().map(e => [e.data('source'), e.data('target')])")
    assert [ids["f1"], ids["f2"]] in edges and [ids["f2"], "xi"] in edges, edges
    assert not any(ids["f21"] in e for e in edges), "flows inside a closed box disappear"
    p.js("window.__fa.view.depth = '0'; window.__fa.render()"); p.page.wait_for_timeout(200)
    root = p.js("window.__fa.curVar().root")
    edges = p.js("window.__fa.cy().edges().map(e => [e.data('source'), e.data('target')])")
    assert sorted(edges) == sorted([["xg", root], [root, "xi"]]), edges
    assert p.js("window.__fa.cy().nodes(':visible').length") == 3, "black box: boundary plus two externals"
    p.assert_clean(); p.close()


def test_fa_parent_aux_and_delete(b, base):
    p = fresh(b, base)
    ids = build_nested(p)
    p.js(f"window.__fa.setParent('{ids['f1']}', '{ids['f2']}')"); p.page.wait_for_timeout(200)
    assert p.js(f"window.__fa.depthOf('{ids['f1']}')") == 2
    p.js(f"window.__fa.setParent('{ids['f2']}', '{ids['f21']}')"); p.page.wait_for_timeout(200)
    assert p.js(f"window.__fa.curVar().placed['{ids['f2']}'].parent") is None, "a box cannot go inside its own subfunction"
    p.js(f"void window.__fa.cy().getElementById('{ids['f22']}').emit('tap')"); p.page.wait_for_timeout(150)
    p.page.keyboard.press("a"); p.page.wait_for_timeout(200)
    assert p.js(f"window.__fa.fnById('{ids['f22']}').kind") == "aux"
    assert p.js(f"window.__fa.cy().getElementById('{ids['f22']}').data('bs')") == "double"
    p.js(f"void window.__fa.cy().getElementById('{ids['f2']}').emit('tap')"); p.page.wait_for_timeout(150)
    p.page.keyboard.press("Delete"); p.page.wait_for_timeout(200)
    V = p.js("window.__fa.curVar()")
    assert ids["f2"] not in V["placed"] and V["placed"][ids["f21"]]["parent"] is None, "children move up a level"
    assert p.js(f"!!window.__fa.fnById('{ids['f2']}')"), "a removed function stays in the catalogue"
    p.assert_clean(); p.close()


def test_fa_variants_share_catalogue(b, base):
    p = fresh(b, base)
    ids = build_nested(p)
    a = p.js("window.__fa.curVar().id")
    p.js("document.querySelector('[data-act=variants]').click()")
    p.page.fill("#var-name", "B: packhouse"); p.page.select_option("#var-root", "__dup")
    p.js("document.querySelector('#var-form button[type=submit]').click()"); p.page.wait_for_timeout(400)
    bvar = p.js("window.__fa.curVar()")
    assert bvar["name"] == "B: packhouse" and bvar["id"] != a and set(bvar["placed"]) == set(ids.values())
    assert not set(x["id"] for x in bvar["externals"]) & {"xg", "xi"}, "externals and flows get their own ids"
    p.js(f"void window.__fa.cy().getElementById('{ids['f1']}').emit('tap')"); p.page.wait_for_timeout(150)
    p.page.fill("#f-notes", "shared note"); p.page.keyboard.press("Tab"); p.page.wait_for_timeout(900)
    p.js(f"void window.__fa.cy().getElementById('{ids['f1']}').emit('tap')"); p.page.wait_for_timeout(100)
    p.page.keyboard.press("Escape"); p.js("document.activeElement.blur()")
    p.js(f"void window.__fa.cy().getElementById('{ids['f22']}').emit('tap')"); p.page.wait_for_timeout(100)
    p.page.keyboard.press("Delete"); p.page.wait_for_timeout(200)
    p.js(f"window.__fa.switchVariant('{a}')"); p.page.wait_for_timeout(300)
    assert p.js(f"window.__fa.fnById('{ids['f1']}').notes") == "shared note"
    assert ids["f22"] in p.js("window.__fa.curVar().placed"), "removing from B leaves A alone"
    # a variant with a new overall function
    p.js("document.querySelector('[data-act=variants]').click()")
    p.page.fill("#var-name", "C: shelf"); p.page.select_option("#var-root", "__new"); p.page.fill("#var-newroot", "Present sound uchuva")
    p.js("document.querySelector('#var-form button[type=submit]').click()"); p.page.wait_for_timeout(300)
    assert p.js("window.__fa.fnById(window.__fa.curVar().root).text") == "Present sound uchuva"
    assert len(p.js("window.__fa.doc.variants")) == 3
    # catalogue: functions from other variants can be placed here
    p.js("window.__fa.selectItem(null)"); p.page.keyboard.press("Escape"); p.page.wait_for_timeout(200)
    assert p.js("document.querySelectorAll('[data-place]').length") >= 4
    p.js("document.querySelector('[data-place]').click()"); p.page.wait_for_timeout(300)
    assert len(p.js("window.__fa.curVar().placed")) == 1
    p.assert_clean(); p.close()


def test_fa_method_steps_and_verbs(b, base):
    p = Page(b, base + APP)
    p.js("document.querySelectorAll('.overlay').forEach(o => o.hidden = true)")
    st = {s["id"]: s for s in p.js("window.__fa.methodSteps()")}
    assert st["boundary"]["status"] == "done" and st["blackbox"]["status"] == "done"
    assert st["wording"]["status"] == "done", "every box of the example starts with a function verb or a synonym"
    assert st["auxiliary"]["status"] == "done" and st["variants"]["status"] == "todo"
    p.js("window.__fa.commit(() => { window.__fa.doc.functions.find(f => f.text === 'Remove free water').text = 'Ozonate fruit'; })"); p.page.wait_for_timeout(200)
    st = {s["id"]: s for s in p.js("window.__fa.methodSteps()")}
    assert st["wording"]["status"] == "warn" and any("Ozonate" in i["label"] for i in st["wording"]["issues"])
    p.js("document.querySelector('#side-open').click()"); p.page.wait_for_timeout(200)
    p.js("document.querySelector('[data-verbok]').click()"); p.page.wait_for_timeout(300)
    assert p.js("window.__fa.doc.verbs") == ["ozonate"]
    assert {s["id"]: s for s in p.js("window.__fa.methodSteps()")}["wording"]["status"] == "done"
    p.js("document.querySelector('[data-tick=variants]').click()"); p.page.wait_for_timeout(200)
    assert {s["id"]: s for s in p.js("window.__fa.methodSteps()")}["variants"]["status"] == "done"
    assert p.js("window.__fa.verbOK({text: 'Apply fludioxonil dip', textTr: {}})") is False
    assert p.js("window.__fa.verbOK({text: 'Keeps fruit cold', textTr: {}})") is True
    p.assert_clean(); p.close()


def test_fa_drag_to_connect(b, base):
    p = fresh(b, base)
    ids = build_nested(p)
    p.js("window.__fa.view.flowType = 'signal'")
    pos = lambda i: p.js(f"(() => {{ const r = document.querySelector('#cy').getBoundingClientRect(); const bb = window.__fa.cy().getElementById('{i}').renderedBoundingBox(); return {{ x: r.left + (bb.x1 + bb.x2) / 2, y: r.top + (bb.y1 + bb.y2) / 2 }}; }})()")
    a, c = pos(ids["f1"]), pos(ids["f22"])
    p.page.mouse.move(a["x"], a["y"]); p.page.wait_for_timeout(200)
    h = p.js("(() => { const b = document.querySelector('#handle').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()")
    p.page.mouse.move(h["x"], h["y"]); p.page.mouse.down(); p.page.mouse.move(c["x"], c["y"], steps=8); p.page.mouse.up(); p.page.wait_for_timeout(400)
    p.page.keyboard.type("temperature reading"); p.page.keyboard.press("Enter"); p.page.wait_for_timeout(300)
    new = [l for l in p.js("window.__fa.curVar().flows") if l["source"] == ids["f1"] and l["target"] == ids["f22"]]
    assert len(new) == 1 and new[0]["type"] == "signal" and new[0]["text"] == "temperature reading", new
    p.assert_clean(); p.close()


def test_fa_flow_panel_type_and_unwanted(b, base):
    p = fresh(b, base)
    build_nested(p)
    lid = p.js("window.__fa.curVar().flows[0].id")
    p.js(f"window.__fa.selectFlow('{lid}')"); p.page.wait_for_timeout(200)
    p.js("document.querySelector('.typeseg [data-type=energy]').click()"); p.page.wait_for_timeout(200)
    p.js("document.querySelector('#f-unwanted').click()"); p.page.wait_for_timeout(200)
    l = p.js(f"window.__fa.flowById('{lid}')")
    assert l["type"] == "energy" and l["unwanted"]
    e = p.js(f"(() => {{ const e = window.__fa.cy().getElementById('{lid}'); return [e.data('ls'), e.data('af'), e.data('c')]; }})()")
    assert e == ["dashed", "hollow", "#C0392B"], e
    p.assert_clean(); p.close()


def test_fa_tags_bib_and_languages(b, base):
    p = fresh(b, base, ("en", "es"))
    ids = build_nested(p)
    p.js("document.querySelector('[data-act=tags]').click()")
    p.js("document.querySelector('#tag-template').click()"); p.js("document.querySelector('#tag-save').click()"); p.page.wait_for_timeout(300)
    assert len(p.js("window.__fa.doc.tags")) == 11
    p.js(f"void window.__fa.cy().getElementById('{ids['f1']}').emit('tap')"); p.page.wait_for_timeout(200)
    p.js("document.querySelector('#f-tags [data-tag=t-sorting]').click()"); p.page.wait_for_timeout(200)
    assert p.js(f"window.__fa.fnById('{ids['f1']}').tags") == ["t-sorting"]
    assert p.js(f"window.__fa.cy().getElementById('t:{ids['f1']}').data('label')") == "🔍"
    p.js("t => { window.__fa.setBib('refs.bib', window.__fa.parseBib(t)); }", BIB)
    p.js(f"void window.__fa.cy().getElementById('{ids['f1']}').emit('tap')"); p.page.wait_for_timeout(200)
    p.page.click("#f-src"); p.page.keyboard.type("@asian"); p.page.wait_for_timeout(150)
    p.page.keyboard.press("Enter"); p.page.wait_for_timeout(900)
    assert p.js(f"window.__fa.fnById('{ids['f1']}').sources")[0].startswith("@asiandevelopmentbank")
    assert p.js("document.querySelectorAll('#langseg button').length") == 2
    p.js("window.__fa.makeMainLang('es')"); p.page.wait_for_timeout(300)
    assert p.js(f"window.__fa.fnById('{ids['f1']}').textTr.en") == "Assess fruit"
    p.assert_clean(); p.close()


def test_fa_versions_and_roundtrip(b, base):
    p = fresh(b, base)
    build_nested(p)
    p.js("document.querySelector('[data-act=versions]').click()")
    p.page.fill("#ver-name", "Before"); p.js("document.querySelector('#ver-form button[type=submit]').click()"); p.page.wait_for_timeout(200)
    p.js("window.__fa.addSubfunction(window.__fa.curVar().root)"); p.page.wait_for_timeout(200)
    p.page.keyboard.type("Record condition"); p.page.keyboard.press("Enter"); p.page.wait_for_timeout(300)
    p.js("document.querySelector('[data-act=versions]').click()"); p.js("document.querySelector('[data-vcmp]').click()")
    html = p.js("document.querySelector('#ver-diff').innerHTML")
    assert "Record condition" in html and "+1" in html, html[:400]
    text = p.js("JSON.stringify(window.__fa.doc)")
    back = p.js("t => JSON.stringify(window.__fa.normalizeDoc(JSON.parse(t)).functions)", text)
    assert json.loads(back) == p.js("window.__fa.doc.functions")
    p.assert_clean(); p.close()


def test_fa_exports(b, base):
    p = Page(b, base + APP)
    p.js("document.querySelectorAll('.overlay').forEach(o => o.hidden = true)")
    svg = p.js("window.__fa.exportSVG().svg")
    assert svg.startswith("<svg") and "Keep fruit cold" in svg and 'fill="none"' in svg
    expect = {"exp-json": (".json", '"format": "function-analysis"'), "exp-functions": ("functions.csv", "level_in_open_variant"),
              "exp-flows": ("flows.csv", "crosses_boundary"), "exp-morph": ("morphological-chart.csv", "means_1")}
    for act, (end, needle) in expect.items():
        name, body = p.download(f"[data-act={act}]")
        assert name.endswith(end) and needle in body, (act, name, body[:120])
    p.assert_clean(); p.close()


def test_fa_link_rca(b, base):
    p = fresh(b, base)
    ids = build_nested(p)
    p.js("t => window.__fa.applyRCALink('uchuva-rca.json', t, 'yes')", RCA_JSON); p.page.wait_for_timeout(300)
    d = p.js("window.__fa.doc")
    assert d["rca"]["file"] == "uchuva-rca.json" and len(d["rca"]["boxes"]) > 100 and len(d["tags"]) >= 10
    p.js(f"void window.__fa.cy().getElementById('{ids['f1']}').emit('tap')"); p.page.wait_for_timeout(200)
    first = d["rca"]["boxes"][5]
    p.page.fill("#f-rca", first["text"]); p.js("document.querySelector('#f-rca').dispatchEvent(new Event('change'))"); p.page.wait_for_timeout(300)
    assert p.js(f"window.__fa.fnById('{ids['f1']}').rcaLinks") == [first["id"]]
    err = p.js("t => { try { window.__fa.normalizeDoc(JSON.parse(t)); return ''; } catch (e) { return e.message; } }", RCA_JSON)
    assert "root-cause analysis file" in err
    p.assert_clean(); p.close()


def test_fa_auto_arrange(b, base):
    p = fresh(b, base)
    ids = build_nested(p)
    before = p.js("JSON.stringify(window.__fa.curVar().placed)")
    p.js("window.__fa.autoArrange()"); p.page.wait_for_timeout(1500)
    V = p.js("window.__fa.curVar()")
    assert json.dumps(V["placed"]) != before
    assert V["placed"][ids["f21"]]["parent"] == ids["f2"], "arranging never changes the decomposition"
    xg = [x for x in V["externals"] if x["id"] == "xg"][0]["x"]; xi = [x for x in V["externals"] if x["id"] == "xi"][0]["x"]
    assert xg < V["placed"][ids["f1"]]["x"] < xi, "inputs left, outputs right"
    p.assert_clean(); p.close()
