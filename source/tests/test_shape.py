"""Shaping a diagram by hand: bent flows, where flows attach, label places, box widths, line breaks, dash patterns."""
import json
import test_fa as fa_tests

F = "window.__fa"


def setup(b, base):
    """The nested example of test_fa, zoomed in, with the flow f1 → f21 selected."""
    p = fa_tests.fresh(b, base)
    p.page.set_viewport_size({"width": 1400, "height": 900})
    ids = fa_tests.build_nested(p)
    p.js(f"void {F}.cy().fit(undefined, 80)"); p.page.wait_for_timeout(200)
    return p, ids


def grip(p, sel):
    """Where an overlay grip is, in page pixels."""
    r = p.js(f"(() => {{ const e = document.querySelector('{sel}'); if (e.hidden) return null; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }})()")
    assert r, f"{sel} is not showing"
    return r


def drag(p, start, end, steps=8):
    p.page.mouse.move(*start); p.page.mouse.down(); p.page.mouse.move(*end, steps=steps); p.page.mouse.up(); p.page.wait_for_timeout(300)


def page_of(p, model):
    """A model point in page pixels."""
    return p.js(f"(() => {{ const c = {F}.cy(), r = document.querySelector('#cy').getBoundingClientRect(), z = c.zoom(), q = c.pan(); return [r.left + {model['x']} * z + q.x, r.top + {model['y']} * z + q.y]; }})()")


def test_shape_bend_and_shapes(b, base):
    p, ids = setup(b, base)
    lid = f"l{ids['f1']}{ids['f21']}"
    p.js(f"{F}.selectFlow('{lid}')"); p.page.wait_for_timeout(200)
    m = grip(p, "#grip-m")
    drag(p, m, (m[0] + 10, m[1] + 80))
    g = p.js(f"{F}.flowById('{lid}').geo")
    assert g["shape"] == "curved" and g["bend"]["d"] != 0, g
    now = grip(p, "#grip-m")
    assert abs(now[0] - m[0] - 10) < 6 and abs(now[1] - m[1] - 80) < 6, ("the curve's middle is where it was dropped", now, m)
    # the bend is relative to the two boxes: moving one keeps the flow bent the same way
    p.js(f"{F}.commit(() => {{ {F}.curVar().placed['{ids['f1']}'].x -= 60; }})"); p.page.wait_for_timeout(200)
    assert p.js(f"{F}.cy().$id('{lid}').style('curve-style')") == "unbundled-bezier"
    # the panel offers the other shapes and a way back
    p.js(f"{F}.selectFlow('{lid}')"); p.page.wait_for_timeout(150)
    for shape, style in [("angled", "segments"), ("elbow", "taxi"), ("straight", "straight")]:
        p.js(f"document.querySelector('.shapeseg [data-shape={shape}]').click()"); p.page.wait_for_timeout(200)
        assert p.js(f"{F}.cy().$id('{lid}').style('curve-style')") == style, shape
        assert p.js(f"{F}.flowById('{lid}').geo.shape") == shape
    p.js("document.querySelector('#p-shape0').click()"); p.page.wait_for_timeout(200)
    assert p.js(f"{F}.flowById('{lid}').geo") is None and p.js(f"{F}.cy().$id('{lid}').style('curve-style')") == "bezier"
    # an angled flow's grip is its corner
    p.js(f"document.querySelector('.shapeseg [data-shape=angled]').click()"); p.page.wait_for_timeout(200)
    m = grip(p, "#grip-m"); drag(p, m, (m[0], m[1] - 70))
    corner = p.js(f"{F}.cy().$id('{lid}').segmentPoints()[0]")
    assert abs(page_of(p, corner)[1] - (m[1] - 70)) < 6
    p.page.keyboard.press("Control+z"); p.page.wait_for_timeout(200)
    assert p.js(f"{F}.flowById('{lid}').geo.bend.d") == 40, "undo brings back the bend before the drag"
    p.assert_clean(); p.close()


def test_shape_label_and_ends(b, base):
    p, ids = setup(b, base)
    lid = f"l{ids['f1']}{ids['f21']}"
    p.js(f"{F}.selectFlow('{lid}')"); p.page.wait_for_timeout(200)
    before = p.js(f"{F}.cy().$id('{lid}').renderedBoundingBox({{ includeEdges: false, includeNodes: false, includeLabels: true }})")
    t = grip(p, "#grip-l")
    drag(p, t, (t[0] + 30, t[1] - 40))
    after = p.js(f"{F}.cy().$id('{lid}').renderedBoundingBox({{ includeEdges: false, includeNodes: false, includeLabels: true }})")
    assert abs(after["x1"] - before["x1"] - 30) < 3 and abs(after["y1"] - before["y1"] + 40) < 3, (before, after)
    assert p.js(f"{F}.flowById('{lid}').geo.lab") is not None
    # a round end dropped on its own box moves where the flow attaches; the flow keeps its ends
    bb = p.js(f"{F}.cy().$id('{ids['f1']}').boundingBox({{ includeLabels: false }})")
    s = grip(p, "#grip-s")
    drag(p, s, page_of(p, {"x": (bb["x1"] + bb["x2"]) / 2 + 3, "y": bb["y2"] - 3}))
    l = p.js(f"{F}.flowById('{lid}')")
    assert l["source"] == ids["f1"] and l["geo"]["s"] == [0, 0.5], l
    ep = p.js(f"{F}.cy().$id('{lid}').sourceEndpoint()")
    assert abs(ep["y"] - bb["y2"]) < 2 and abs(ep["x"] - (bb["x1"] + bb["x2"]) / 2) < 2, "it leaves from the middle of the bottom side"
    # dropped on another box, it rewires and forgets where it attached
    other = p.js(f"{F}.cy().$id('xg').position()")
    drag(p, grip(p, "#grip-s"), page_of(p, other))
    l = p.js(f"{F}.flowById('{lid}')")
    assert l["source"] == "xg" and "s" not in (l.get("geo") or {}), l
    # Esc while bending cancels
    p.js(f"{F}.selectFlow('{lid}')"); p.page.wait_for_timeout(150)
    m = grip(p, "#grip-m"); p.page.mouse.move(*m); p.page.mouse.down(); p.page.mouse.move(m[0], m[1] + 60, steps=4)
    p.page.keyboard.press("Escape"); p.page.mouse.up(); p.page.wait_for_timeout(200)
    assert "bend" not in (p.js(f"{F}.flowById('{lid}').geo") or {})
    p.assert_clean(); p.close()


def test_shape_kept_lifted_arranged_and_saved(b, base):
    p, ids = setup(b, base)
    lid = f"l{ids['f1']}{ids['f21']}"
    p.js(f"{F}.commit(() => {{ {F}.flowById('{lid}').geo = {{ shape: 'curved', bend: {{ w: .5, d: 80 }}, t: [-.5, 0], lab: [10, 20] }}; }})"); p.page.wait_for_timeout(200)
    # saved and opened again
    d = p.js(f"{F}.normalizeDoc(JSON.parse(JSON.stringify({F}.doc)))")
    l = [x for x in d["variants"][0]["flows"] if x["id"] == lid][0]
    assert l["geo"] == {"shape": "curved", "bend": {"w": 0.5, "d": 80}, "t": [-0.5, 0], "lab": [10, 20]}, l
    bad = p.js(f"{F}.normalizeDoc({{ ...JSON.parse(JSON.stringify({F}.doc)), variants: [{{ ...JSON.parse(JSON.stringify({F}.curVar())), flows: [{{ ...JSON.parse(JSON.stringify({F}.flowById('{lid}'))), geo: {{ shape: 'wavy', s: [3, 'x'] }} }}] }}] }}).variants[0].flows[0].geo")
    assert bad == {"s": [0.5, 0]}, bad
    # drawn to a closed box, the flow ignores its shape
    p.js(f"{F}.view.depth = '1'; {F}.render()"); p.page.wait_for_timeout(200)
    e = p.js(f"{F}.cy().edges().filter(e => e.id() === '{lid}').map(e => [e.data('target'), e.style('curve-style')])")
    assert e == [[ids["f2"], "bezier"]], e
    p.js(f"{F}.view.depth = 'all'; {F}.render()"); p.page.wait_for_timeout(200)
    assert p.js(f"{F}.cy().$id('{lid}').style('curve-style')") == "unbundled-bezier"
    # auto-arrange starts every flow afresh
    p.js(f"{F}.autoArrange()"); p.page.wait_for_timeout(1500)
    assert p.js(f"{F}.flowById('{lid}').geo") is None
    p.page.keyboard.press("Control+z"); p.page.wait_for_timeout(300)
    assert p.js(f"{F}.flowById('{lid}').geo.bend.d") == 80
    # the SVG draws the curve and puts the label where it was moved
    name, svg = p.download("[data-act=exp-svg]")
    assert svg.count(" Q") >= 1
    p.assert_clean(); p.close()


def test_box_width(b, base):
    p, ids = setup(b, base)
    f1 = ids["f1"]
    p.js(f"{F}.commit(() => {{ {F}.doc.functions.find(f => f.id === '{f1}').text = 'Assess the quality of every fruit before it is sorted'; }})"); p.page.wait_for_timeout(200)
    lines = lambda: p.js(f"{F}.cy().$id('{f1}').data('label')").count("\n") + 1
    w0, n0 = p.js(f"{F}.cy().$id('{f1}').width()"), lines()
    p.js(f"{F}.selectItem('{f1}')"); p.page.wait_for_timeout(200)
    left = p.js(f"{F}.cy().$id('{f1}').boundingBox({{ includeLabels: false }}).x1")
    g = grip(p, "#grip-w")
    drag(p, g, (g[0] - 50 * p.js(f"{F}.cy().zoom()"), g[1]))
    bw = p.js(f"{F}.curVar().placed['{f1}'].bw")
    assert bw and abs(bw - (w0 - 50)) < 4, (bw, w0)
    assert lines() > n0, "narrower: the text takes more lines"
    assert abs(p.js(f"{F}.cy().$id('{f1}').boundingBox({{ includeLabels: false }}).x1") - left) < 3, "the left side stays put"
    assert "Width set by hand" in p.js("document.querySelector('#panel').textContent")
    # wider than the automatic width works too: one line
    g = grip(p, "#grip-w"); drag(p, g, (g[0] + 250 * p.js(f"{F}.cy().zoom()"), g[1]))
    assert lines() == 1
    # per variant: a copy keeps it, changing the copy does not touch the original
    p.js(f"(() => {{ const c = {F}.duplicateVariant({F}.curVar(), 'B'); {F}.commit(() => {F}.doc.variants.push(c)); }})()"); p.page.wait_for_timeout(200)
    vs = p.js(f"{F}.doc.variants.map(v => v.placed['{f1}'].bw)")
    assert vs[0] == vs[1]
    # double-click the grip: automatic again
    p.js(f"{F}.selectItem('{f1}')"); p.page.wait_for_timeout(150)
    p.page.mouse.dblclick(*grip(p, "#grip-w")); p.page.wait_for_timeout(300)
    assert "bw" not in p.js(f"{F}.curVar().placed['{f1}']") and lines() == n0
    # externals too
    p.js(f"{F}.selectItem('xg')"); p.page.wait_for_timeout(150)
    g = grip(p, "#grip-w"); drag(p, g, (g[0] + 120, g[1]))
    assert p.js(f"{F}.curVar().externals.find(x => x.id === 'xg').bw")
    p.assert_clean(); p.close()


def test_line_breaks(b, base):
    p = fa_tests.fresh(b, base, ("en", "es"))
    ids = fa_tests.build_nested(p)
    f1 = ids["f1"]
    p.js(f"{F}.selectItem('{f1}'); {F}.inlineEdit('{f1}', false)"); p.page.wait_for_timeout(200)
    assert "Shift+Enter: new line" in p.js("document.querySelector('#inline-lang').textContent")
    p.page.keyboard.press("Control+a"); p.page.keyboard.type("Assess"); p.page.keyboard.press("Shift+Enter"); p.page.keyboard.type("fruit  ")
    p.page.keyboard.press("Enter"); p.page.keyboard.type("Evaluar"); p.page.keyboard.press("Shift+Enter"); p.page.keyboard.press("Shift+Enter"); p.page.keyboard.type("fruta")
    p.page.keyboard.press("Enter"); p.page.wait_for_timeout(300)
    f = p.js(f"{F}.doc.functions.find(f => f.id === '{f1}')")
    assert f["text"] == "Assess\nfruit" and f["textTr"]["es"] == "Evaluar\nfruta", f
    assert p.js(f"{F}.cy().$id('{f1}').data('label')") == "Assess\nfruit"
    # flow labels, and the panel's text field
    lid = f"l{ids['f1']}{ids['f21']}"
    p.js(f"{F}.selectFlow('{lid}')"); p.page.wait_for_timeout(200)
    p.page.fill("#panel textarea[data-tf=text][data-lang=en]", "cold\n\nfruit")
    p.page.dispatch_event("#panel textarea[data-tf=text][data-lang=en]", "change"); p.page.wait_for_timeout(300)
    assert p.js(f"{F}.flowById('{lid}').text") == "cold\nfruit"
    name, svg = p.download("[data-act=exp-svg]")
    assert ">cold</text>" in svg and ">fruit</text>" in svg and ">Assess</text>" in svg
    # the verb check reads the first word as before
    assert p.js(f"{F}.verbOK({F}.doc.functions.find(f => f.id === '{f1}'), 'en')")
    p.assert_clean(); p.close()


def test_parallel_labels_and_dots(b, base):
    p, ids = setup(b, base)
    f1, f21 = ids["f1"], ids["f21"]
    p.js(f"""{F}.commit(() => {F}.curVar().flows.push({{ id: 'lsig', source: '{f1}', target: '{f21}', type: 'signal', text: 'berry state', textTr: {{}}, element: null, unwanted: false, notes: '', sources: [], tags: [] }}))""")
    p.page.wait_for_timeout(300)
    bbs = p.js(f"['l{f1}{f21}', 'lsig'].map(id => {F}.cy().$id(id).boundingBox({{ includeEdges: false, includeNodes: false, includeLabels: true }}))")
    a, c = bbs
    assert a["y2"] <= c["y1"] + 0.5 or c["y2"] <= a["y1"] + 0.5, ("two flows between the same boxes: labels do not overlap", bbs)
    # dots: round, with clear gaps; the spacing is set per flow type
    assert p.js(f"{F}.cy().$id('lsig').style('line-dash-pattern')") == "0.01 7"
    sw = p.js("document.querySelector('#legend').innerHTML")
    assert 'stroke-dasharray="0.01 7"' in sw or 'stroke-dasharray="0.01 7' in sw, "the legend draws the same dots"
    p.js("document.querySelector('[data-act=flowtypes]').click()"); p.page.wait_for_timeout(200)
    p.page.fill("#ft-rows input[data-k=gap][data-i='2']", "9"); p.page.wait_for_timeout(100)
    p.page.select_option("#ft-rows select[data-i='1']", "dashdot"); p.page.wait_for_timeout(100)
    p.js("document.querySelector('#ft-save').click()"); p.page.wait_for_timeout(300)
    t = p.js(f"{F}.doc.flowTypes")
    assert t[2]["gap"] == 9 and t[1]["style"] == "dashdot", t
    assert p.js(f"{F}.cy().$id('lsig').style('line-dash-pattern')") == "0.01 11"
    assert p.js(f"{F}.cy().$id('l{f21}{ids['f22']}').style('line-dash-pattern')").count(" ") == 3, "dash-dot: four lengths"
    name, svg = p.download("[data-act=exp-svg]")
    assert 'stroke-dasharray="0.01 11" stroke-linecap="round"' in svg
    p.assert_clean(); p.close()
