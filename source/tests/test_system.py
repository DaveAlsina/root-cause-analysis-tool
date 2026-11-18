"""The system map (second mode of the function-analysis file) and its links to the function analysis."""
import json
from harness import Page

APP = "/function-analysis.html"


def example(b, base, mode="system"):
    """The worked example, opened in a mode, with the panel open."""
    p = Page(b, base + APP + "#" + mode)
    p.page.on("dialog", lambda d: d.accept())
    p.js("document.querySelectorAll('.overlay').forEach(o => o.hidden = true)")
    p.js("document.querySelector('#side-open').click()"); p.page.wait_for_timeout(200)
    p.js("window.__fa.render({fit: true})"); p.page.wait_for_timeout(400)
    return p


def el(p, text):
    return p.js(f"window.__fa.doc.system.elements.find(e => e.text === {text!r})")


def ap(p, text, k=0):
    """The id of an element's k-th circle (appearance)."""
    return el(p, text)["at"][k]["id"]


def lv(p, text, k=0):
    return el(p, text)["at"][k]["level"]


def screen(p, node_id):
    return p.js(f"(() => {{ const r = document.querySelector('#cy').getBoundingClientRect(); const n = window.__fa.cy().getElementById({node_id!r}); const q = n.renderedPosition(); return {{ x: r.left + q.x, y: r.top + q.y }}; }})()")


def model_to_screen(p, x, y):
    return p.js(f"(() => {{ const r = document.querySelector('#cy').getBoundingClientRect(), c = window.__fa.cy(); return {{ x: r.left + {x} * c.zoom() + c.pan().x, y: r.top + {y} * c.zoom() + c.pan().y }}; }})()")


def test_sys_mode_switch_and_hash(b, base):
    p = example(b, base, "functions")
    assert p.js("window.__fa.mode") == "functions" and not p.js("document.body.classList.contains('sys')")
    p.js("document.querySelector('#modeseg [data-mode=system]').click()"); p.page.wait_for_timeout(400)
    assert p.js("window.__fa.mode") == "system" and p.js("location.hash") == "#system"
    assert p.js("window.__fa.cy().nodes('.ring').length") == 4 and p.js("window.__fa.cy().nodes('.elem').length") == 17, "16 elements, Humidity on two levels"
    assert p.js("document.querySelector('#modenav [aria-current]').textContent") == "System"
    assert p.js("getComputedStyle(document.querySelector('#variant')).display") == "none", "function-analysis controls hide in system mode"
    p.js("location.hash = '#functions'"); p.page.wait_for_timeout(400)
    assert p.js("window.__fa.mode") == "functions" and p.js("window.__fa.cy().nodes('.elem').length") == 0
    p.assert_clean(); p.close()


def test_sys_old_file_gets_a_system(b, base):
    p = example(b, base)
    old = p.js("(() => { const d = JSON.parse(JSON.stringify(window.__fa.doc)); delete d.system; d.schema = 1; d.functions.forEach(f => { delete f.actsOn; delete f.key; }); d.variants.forEach(v => { delete v.systemBoundary; v.externals.forEach(x => delete x.ref); }); return JSON.stringify(d); })()")
    d = p.js("t => { const d = window.__fa.normalizeDoc(JSON.parse(t)); return { levels: d.system.levels.map(l => l.name), els: d.system.elements.length, acts: d.functions.map(f => f.actsOn.length) }; }", old)
    assert d["levels"] == ["Landscape", "Farm", "Field", "Pathogen"] and d["els"] == 0 and set(d["acts"]) == {0}
    p.assert_clean(); p.close()


def test_sys_ring_sets_level(b, base):
    p = example(b, base)
    lv = p.js("window.__fa.doc.system.levels.map(l => l.id)")
    rt = p.js("""() => { const G = window.__fa.ringGeom(); return G.map(g => window.__fa.placeAt(g.cx, g.cy - g.ry + 30).level); }""")
    assert rt == lv, "a point just inside the top of each ring belongs to that ring"
    assert p.js("window.__fa.placeAt(5000, 0).level") is None
    # placing and re-reading a position stays put
    back = p.js("""() => { const q = window.__fa.placeAt(-200, -300); const e = { level: q.level, a: q.a, t: q.t }; const r = window.__fa.elPos(e); return Math.hypot(r.x + 200, r.y + 300); }""")
    assert back < 3, back
    p.assert_clean(); p.close()


def test_sys_doubleclick_adds_element_in_ring(b, base):
    p = example(b, base)
    farm = p.js("window.__fa.doc.system.levels[1].id")
    g = p.js("window.__fa.ringGeom()[1]")
    pt = model_to_screen(p, g["cx"] - g["rx"] + 70, g["cy"])
    p.page.mouse.dblclick(pt["x"], pt["y"]); p.page.wait_for_timeout(300)
    assert p.js("!document.querySelector('#inline').hidden")
    p.page.keyboard.type("Truck driver"); p.page.keyboard.press("Enter"); p.page.wait_for_timeout(300)
    e = el(p, "Truck driver")
    assert e and len(e["at"]) == 1 and e["at"][0]["level"] == farm, e
    p.assert_clean(); p.close()


def test_sys_drag_changes_level(b, base):
    p = example(b, base)
    inner = p.js("window.__fa.ringGeom()[3]")
    a, dst = screen(p, ap(p, "Pickers")), model_to_screen(p, inner["cx"] + 60, inner["cy"] - inner["ry"] + 60)
    p.page.mouse.move(a["x"], a["y"]); p.page.mouse.down(); p.page.mouse.move(dst["x"], dst["y"], steps=10); p.page.mouse.up(); p.page.wait_for_timeout(400)
    assert lv(p, "Pickers") == p.js("window.__fa.doc.system.levels[3].id")
    p.page.mouse.click(5, 400); p.page.keyboard.press("Control+z"); p.page.wait_for_timeout(300)
    assert lv(p, "Pickers") == p.js("window.__fa.doc.system.levels[1].id"), "undo puts it back"
    p.assert_clean(); p.close()


def test_sys_levels_dialog_keeps_elements(b, base):
    p = example(b, base)
    before = {e["text"]: [x["level"] for x in e["at"]] for e in p.js("window.__fa.doc.system.elements")}
    p.js("document.querySelector('[data-act=levels]').click()")
    p.js("document.querySelector('#lv-add').click()")
    p.js("document.querySelector('[data-lvup=\"4\"]').click()")  # the new level, moved between Crop and Fruit
    p.js("document.querySelector('#lv-save').click()"); p.page.wait_for_timeout(400)
    names = p.js("window.__fa.doc.system.levels.map(l => l.name)")
    assert names == ["Landscape", "Farm", "Crop", "New level", "Fruit"], names
    after = {e["text"]: [x["level"] for x in e["at"]] for e in p.js("window.__fa.doc.system.elements")}
    assert after == before, "elements keep their level"
    # deleting a level moves its elements inwards
    p.js("document.querySelector('[data-act=levels]').click()")
    p.js("document.querySelector('[data-lvdel=\"2\"]').click()")  # Crop
    p.js("document.querySelector('#lv-save').click()"); p.page.wait_for_timeout(400)
    newlv = p.js("window.__fa.doc.system.levels.find(l => l.name === 'New level').id")
    assert lv(p, "Plants") == newlv
    p.assert_clean(); p.close()


def test_sys_group_and_ungroup(b, base):
    p = example(b, base)
    a, c = ap(p, "Packhouse"), ap(p, "Cold room")
    p.js(f"window.__fa.selectItem('{a}')"); p.js(f"window.__fa.selectItem('{c}', true)"); p.page.wait_for_timeout(100)
    p.js("document.activeElement.blur()")
    p.js("window.__fa.groupSelection()"); p.page.wait_for_timeout(300)
    p.page.keyboard.type("Postharvest"); p.page.keyboard.press("Enter"); p.page.wait_for_timeout(300)
    g = p.js("window.__fa.doc.system.groups.find(g => g.text === 'Postharvest')")
    assert g and el(p, "Packhouse")["at"][0]["group"] == g["id"] and el(p, "Cold room")["at"][0]["group"] == g["id"]
    assert p.js(f"window.__fa.cy().getElementById('{g['id']}').isParent()")
    p.js(f"window.__fa.selectItem('{g['id']}')"); p.page.wait_for_timeout(200)
    p.js("document.querySelector('#p-ungrp').click()"); p.page.wait_for_timeout(300)
    assert el(p, "Packhouse")["at"][0]["group"] is None and not p.js("window.__fa.doc.system.groups.some(g => g.text === 'Postharvest')")
    p.assert_clean(); p.close()


def test_sys_boundary_focus_and_members(b, base):
    p = example(b, base)
    bid = p.js("window.__fa.doc.system.boundaries[0].id")
    p.js(f"document.querySelector('[data-focus=\"{bid}\"]').click()"); p.page.wait_for_timeout(400)
    grower = ap(p, "Grower")
    assert p.js(f"window.__fa.cy().getElementById('{grower}').hasClass('faded')"), "outside the boundary fades"
    assert p.js("document.querySelector('#sysover-g path').getAttribute('d').length") > 50
    p.js("document.querySelector('#sb-edit').click()"); p.page.wait_for_timeout(200)
    assert p.js("window.__fa.sysEditing")
    pos = screen(p, grower)
    p.page.mouse.click(pos["x"], pos["y"]); p.page.wait_for_timeout(300)
    assert grower in p.js(f"window.__fa.doc.system.boundaries[0].members")
    # a level name toggles the whole level
    lvl = p.js("window.__fa.doc.system.levels[2].id")
    pos = screen(p, "lvl:" + lvl)
    p.page.mouse.click(pos["x"], pos["y"]); p.page.wait_for_timeout(300)
    crop = [x["id"] for e in p.js("window.__fa.doc.system.elements") for x in e["at"] if x["level"] == lvl]
    assert set(crop) <= set(p.js("window.__fa.doc.system.boundaries[0].members"))
    p.js("document.querySelector('#sb-done').click()"); p.js("document.querySelector('#sb-clear').click()"); p.page.wait_for_timeout(200)
    assert not p.js("window.__fa.sysFocus") and p.js("document.querySelector('#sysover-g').innerHTML") == ""
    p.assert_clean(); p.close()


def test_sys_new_boundary_from_selection(b, base):
    p = example(b, base)
    ids = [ap(p, t) for t in ("Fruit", "Calyx")]
    p.js(f"window.__fa.selectItem('{ids[0]}')"); p.js(f"window.__fa.selectItem('{ids[1]}', true)")
    p.js(f"window.__fa.newBoundary({json.dumps(ids)})"); p.page.wait_for_timeout(300)
    bs = p.js("window.__fa.doc.system.boundaries")
    assert len(bs) == 3 and bs[2]["members"] == ids and p.js("window.__fa.sysFocus") == bs[2]["id"]
    p.assert_clean(); p.close()


def test_sys_chain_and_ordering(b, base):
    p = example(b, base)
    stages = p.js("window.__fa.cy().nodes('.stage').map(n => n.data('tag'))")
    assert stages[:3] == ["t-culture", "t-harvest", "t-drying"] and len(stages) == 9
    p.js("document.querySelector('[data-tdown=\"t-culture\"]').click()"); p.page.wait_for_timeout(300)
    stages = p.js("window.__fa.cy().nodes('.stage').map(n => n.data('tag'))")
    assert stages[:2] == ["t-harvest", "t-culture"], stages
    assert [t["id"] for t in p.js("window.__fa.doc.tags")][:2] == ["t-harvest", "t-culture"], "the tag editor shows the same order"
    pos = screen(p, "stage:t-storage")
    p.page.mouse.click(pos["x"], pos["y"]); p.page.wait_for_timeout(200)
    assert p.js("window.__fa.view.tagFilter.has('t-storage')") and p.js("window.__fa.cy().getElementById('stage:t-storage').hasClass('on')")
    assert p.js(f"window.__fa.cy().getElementById('{ap(p, 'Cold room')}').hasClass('tagon')")
    p.js("document.querySelector('#ch-on').click()"); p.page.wait_for_timeout(300)
    assert p.js("window.__fa.cy().nodes('.stage').length") == 0
    p.assert_clean(); p.close()


def test_sys_actor_needs_and_kind(b, base):
    p = example(b, base)
    w = ap(p, "Weather")
    p.js(f"window.__fa.selectItem('{w}')"); p.page.wait_for_timeout(200)
    assert not p.js("!!document.querySelector('#f-needs')"), "only actors have needs"
    p.js("document.querySelector('.kindsel [data-kind=actor]').click()"); p.page.wait_for_timeout(300)
    p.page.fill("#f-needs", "Nothing, it is the weather"); p.page.keyboard.press("Tab"); p.page.wait_for_timeout(900)
    e = el(p, "Weather")
    assert e["kind"] == "actor" and e["needs"] == "Nothing, it is the weather"
    p.assert_clean(); p.close()


def test_sys_checks_and_moved(b, base):
    p = example(b, base, "functions")
    c = p.js("window.__fa.systemChecks()")
    names = sorted(p.js(f"window.__fa.apLabel({i!r}, true)") for i in c["unaddressed"])
    assert names == ["Conidia · Fruit", "Exporter · Landscape", "Humidity · Fruit", "Mycelium · Fruit", "Packhouse · Farm", "Pickers · Farm"], names
    assert c["outside"] == [] and c["extInside"] == []
    # moving the variant to the other boundary: what moved, and the gaps it makes
    b2 = p.js("window.__fa.doc.system.boundaries[1].id")
    p.page.select_option("#f-sysb", b2); p.page.wait_for_timeout(400)
    note = p.js("document.querySelector('.movednote').textContent")
    assert "Now inside" in note and "Grower" in note and "Now outside" in note and "Packhouse" in note, note
    c = p.js("window.__fa.systemChecks()")
    assert len(c["extInside"]) == 1, "the Grower external is now inside the boundary"
    out = [(o["fn"], o["el"]) for o in c["outside"]]
    assert any(e == ap(p, "Cold room") for _, e in out), "Record condition acts on the cold room, now outside"
    p.js("document.querySelector('#mv-ok').click()"); p.page.wait_for_timeout(200)
    assert not p.js("!!document.querySelector('.movednote')")
    p.assert_clean(); p.close()


def test_sys_add_function_and_external_from_gaps(b, base):
    p = example(b, base, "functions")
    con = ap(p, "Conidia")
    p.js(f"document.querySelector('[data-fnfor=\"{con}\"]').click()"); p.page.wait_for_timeout(300)
    p.page.keyboard.type("Inhibit fungal growth"); p.page.keyboard.press("Enter"); p.page.wait_for_timeout(300)
    f = p.js("window.__fa.doc.functions.find(f => f.text === 'Inhibit fungal growth')")
    assert f and f["actsOn"] == [con]
    assert con not in p.js("window.__fa.systemChecks().unaddressed")
    p.js("window.__fa.selectItem(null)"); p.page.keyboard.press("Escape"); p.page.wait_for_timeout(200)
    nb = el(p, "Neighbouring farms")["id"]
    p.js(f"document.querySelector('[data-addext=\"{nb}\"]').click()"); p.page.wait_for_timeout(300)
    x = [x for x in p.js("window.__fa.curVar().externals") if x.get("ref") == nb]
    assert len(x) == 1 and x[0]["text"] == "Neighbouring farms"
    # renaming the element renames the external
    p.js(f"window.__fa.commit(() => {{ window.__fa.elById('{nb}').text = 'Nearby farms'; }})"); p.page.wait_for_timeout(300)
    assert [x for x in p.js("window.__fa.curVar().externals") if x.get("ref") == nb][0]["text"] == "Nearby farms"
    p.assert_clean(); p.close()


def test_sys_function_acts_on_and_key(b, base):
    p = example(b, base, "functions")
    fid = p.js("window.__fa.doc.functions.find(f => f.text === 'Assess fruit').id")
    p.js(f"void window.__fa.cy().getElementById('{fid}').emit('tap')"); p.page.wait_for_timeout(200)
    farms = ap(p, "Neighbouring farms")
    p.page.select_option("#f-acts", farms); p.page.wait_for_timeout(300)
    assert farms in p.js(f"window.__fa.fnById('{fid}').actsOn")
    assert p.js("!!document.querySelector('.rcachip.warnchip')"), "an element outside the boundary is flagged"
    p.page.mouse.click(5, 400); p.js(f"void window.__fa.cy().getElementById('{fid}').emit('tap')"); p.page.wait_for_timeout(100)
    p.js("document.activeElement.blur()"); p.page.keyboard.press("k"); p.page.wait_for_timeout(300)
    assert p.js(f"window.__fa.fnById('{fid}').key") is True
    assert p.js(f"window.__fa.cy().getElementById('{fid}').data('label')").startswith("★ ")
    p.assert_clean(); p.close()


def test_sys_delete_element_cleans_links(b, base):
    p = example(b, base)
    fr = ap(p, "Fruit"); imp = ap(p, "Importer")
    p.js(f"window.__fa.selectItem('{fr}')"); p.js(f"window.__fa.selectItem('{imp}', true)"); p.page.wait_for_timeout(100)
    p.js("document.activeElement.blur()"); p.page.keyboard.press("Delete"); p.page.wait_for_timeout(400)
    d = p.js("window.__fa.doc")
    assert not any(fr in f["actsOn"] for f in d["functions"])
    assert not any(fr in b_["members"] for b_ in d["system"]["boundaries"])
    ext = [x for v in d["variants"] for x in v["externals"] if x["text"] == "Importer"]
    assert ext and "ref" not in ext[0], "the external keeps its name and loses the link"
    p.assert_clean(); p.close()


def test_sys_exports(b, base):
    p = example(b, base)
    bid = p.js("window.__fa.doc.system.boundaries[0].id")
    p.js(f"window.__fa.focusBoundary('{bid}')"); p.page.wait_for_timeout(300)
    name, svg = p.download("[data-act=exp-svg]")
    assert name.endswith("-system.svg") and svg.count("<ellipse") == 4 and "Cold room" in svg and "Farm gate to importer" in svg and "CHAIN OF STAGES" in svg
    name, csv = p.download("[data-act=exp-elements]")
    head = csv.lstrip("﻿").splitlines()[0]
    assert name.endswith("system-elements.csv") and "in_farm-gate-to-importer" in head and "needs" in head and "acted_on_by" in head, head
    assert "Keep fruit cold" in csv
    p.assert_clean(); p.close()


def test_sys_translation_and_versions(b, base):
    p = example(b, base)
    p.js("window.__fa.commit(() => { window.__fa.doc.languages.push('es'); })"); p.page.wait_for_timeout(300)
    miss = p.js("window.__fa.doc.system.elements.filter(e => !e.textTr.es).length")
    assert miss == 16
    p.js("document.querySelector('[data-act=versions]').click()")
    p.page.fill("#ver-name", "Before"); p.js("document.querySelector('#ver-form button[type=submit]').click()"); p.page.wait_for_timeout(200)
    p.js("document.querySelectorAll('.overlay').forEach(o => o.hidden = true)")
    w = ap(p, "Weather")
    p.js(f"window.__fa.selectItem('{w}')"); p.js("document.activeElement.blur()"); p.page.keyboard.press("Delete"); p.page.wait_for_timeout(300)
    assert not el(p, "Weather")
    p.js("document.querySelector('[data-act=versions]').click()"); p.js("document.querySelector('[data-vcmp]').click()")
    assert "elements" in p.js("document.querySelector('#ver-diff').innerHTML") and "−1" in p.js("document.querySelector('#ver-diff .chg').parentElement.innerHTML")
    p.assert_clean(); p.close()


# ---------------- one element on several levels ----------------

def test_sys_flat_file_migrates_to_appearances(b, base):
    """A file saved before appearances: each element becomes one circle, and boundaries, acts-on and versions follow."""
    p = example(b, base)
    old = p.js("""(() => { const d = JSON.parse(JSON.stringify(window.__fa.doc)); const map = {};
      d.system.elements.forEach(e => { const a = e.at[0]; map[a.id] = e.id; Object.assign(e, { level: a.level, a: a.a, t: a.t, x: a.x, y: a.y, group: a.group, tags: a.tags }); delete e.at; });
      d.system.boundaries.forEach(b => { b.members = [...new Set(b.members.map(id => map[id]))]; });
      d.functions.forEach(f => { f.actsOn = f.actsOn.map(id => map[id]); });
      d.versions = [{ id: 'v0', name: 'old', snapshot: JSON.parse(JSON.stringify(d)) }]; delete d.versions[0].snapshot.versions; d.schema = 2;
      return JSON.stringify(d); })()""")
    r = p.js("""t => { const d = window.__fa.normalizeDoc(JSON.parse(t)); const ok = d.system.elements.every(e => e.at.length === 1 && e.at[0].id === 'p' + e.id);
      const aps = new Set(d.system.elements.map(e => e.at[0].id));
      return { ok, members: d.system.boundaries.every(b => b.members.length && b.members.every(id => aps.has(id))), acts: d.functions.every(f => f.actsOn.every(id => aps.has(id))),
        nacts: d.functions.reduce((a, f) => a + f.actsOn.length, 0), cold: d.system.elements.find(e => e.text === 'Cold room').at[0].tags,
        snap: d.versions[0].snapshot.system.elements.every(e => e.at && e.at[0].id === 'p' + e.id) }; }""", old)
    assert r == {"ok": True, "members": True, "acts": True, "nacts": 5, "cold": ["t-storage"], "snap": True}, r
    p.assert_clean(); p.close()


def test_sys_add_appearance_badges_and_siblings(b, base):
    p = example(b, base)
    crop = p.js("window.__fa.doc.system.levels[2].id")
    fr = ap(p, "Fruit")
    p.js(f"window.__fa.selectItem('{fr}')"); p.page.wait_for_timeout(200)
    p.page.select_option("#f-addlv", crop); p.page.wait_for_timeout(500)
    e = el(p, "Fruit")
    assert len(e["at"]) == 2 and {x["level"] for x in e["at"]} == {crop, p.js("window.__fa.doc.system.levels[3].id")}
    new = [x for x in e["at"] if x["level"] == crop][0]
    assert p.js("window.__fa.selId") == new["id"], "the new circle is selected"
    # numerals: I on the outer level (Crop), II on the inner one (Fruit)
    assert p.js(f"window.__fa.cy().getElementById('n:{new['id']}').data('label')") == "I"
    assert p.js(f"window.__fa.cy().getElementById('n:{fr}').data('label')") == "II"
    assert p.js(f"window.__fa.cy().getElementById('{fr}').hasClass('sib')"), "its other circle glows"
    # the panel: shared name, this circle's level, its levels listed
    assert "On 2 levels" in p.js("document.querySelector('#panel').textContent")
    assert p.js("document.querySelectorAll('.aplist li').length") == 2
    # tags and boundaries per circle
    p.js("document.querySelector('#f-tags [data-tag=t-harvest]').click()"); p.page.wait_for_timeout(300)
    e = el(p, "Fruit")
    assert [x["tags"] for x in e["at"] if x["id"] == new["id"]][0] == ["t-harvest"] and [x["tags"] for x in e["at"] if x["id"] == fr][0] == []
    b1 = p.js("window.__fa.doc.system.boundaries[0].id")
    assert fr in p.js("window.__fa.doc.system.boundaries[0].members") and new["id"] not in p.js("window.__fa.doc.system.boundaries[0].members")
    p.js(f"document.querySelector('[data-inb=\"{b1}\"]').click()"); p.page.wait_for_timeout(300)
    assert new["id"] in p.js("window.__fa.doc.system.boundaries[0].members")
    # renaming is shared
    p.js(f"window.__fa.commit(() => {{ window.__fa.elOf('{new['id']}').text = 'Berries'; }})"); p.page.wait_for_timeout(300)
    assert p.js(f"window.__fa.cy().getElementById('{fr}').data('label')") == "Berries"
    assert p.js(f"window.__fa.apLabel('{new['id']}')") == "Berries · Crop"
    p.assert_clean(); p.close()


def test_sys_acts_on_an_appearance(b, base):
    p = example(b, base, "functions")
    fid = p.js("window.__fa.doc.functions.find(f => f.text === 'Assess fruit').id")
    p.js(f"void window.__fa.cy().getElementById('{fid}').emit('tap')"); p.page.wait_for_timeout(200)
    opts = p.js("[...document.querySelectorAll('#f-acts option')].map(o => o.textContent)")
    assert "Humidity · Crop (I)" in opts and "Humidity · Fruit (II)" in opts, opts
    hc = ap(p, "Humidity", 0)
    p.page.select_option("#f-acts", hc); p.page.wait_for_timeout(300)
    chips = p.js("[...document.querySelectorAll('.rcachip')].map(c => c.textContent)")
    assert any("Humidity · Crop" in c and c.startswith("⚠") for c in chips), chips  # Crop is outside the variant's boundary
    hf = ap(p, "Humidity", 1)
    assert hf in p.js("window.__fa.systemChecks().unaddressed") and hc not in p.js("window.__fa.systemChecks().unaddressed")
    # the element panel lists it, with the level it acts on
    p.js(f"window.__fa.setMode('system')"); p.page.wait_for_timeout(400)
    p.js(f"window.__fa.selectItem('{hf}')"); p.page.wait_for_timeout(200)
    assert "Assess fruit → Crop" in p.js("document.querySelector('#panel').textContent")
    p.assert_clean(); p.close()


def test_sys_delete_one_circle_or_all(b, base):
    p = example(b, base)
    hf = ap(p, "Humidity", 1)
    p.js(f"window.__fa.selectItem('{hf}')"); p.page.wait_for_timeout(200)
    assert "Remove from this level" in p.js("document.querySelector('#p-del').textContent")
    p.js("document.activeElement.blur()"); p.page.keyboard.press("Delete"); p.page.wait_for_timeout(400)
    e = el(p, "Humidity")
    assert e and len(e["at"]) == 1 and hf not in p.js("window.__fa.doc.system.boundaries[0].members")
    p.page.mouse.click(5, 400); p.page.keyboard.press("Control+z"); p.page.wait_for_timeout(400)
    assert len(el(p, "Humidity")["at"]) == 2
    p.js(f"window.__fa.selectItem('{ap(p, 'Humidity', 0)}')"); p.page.wait_for_timeout(200)
    p.js("document.querySelector('#p-delall').click()"); p.page.wait_for_timeout(400)
    assert not el(p, "Humidity") and p.js("window.__fa.cy().nodes('.elem').length") == 15
    p.assert_clean(); p.close()


def test_sys_split_then_merge_back(b, base):
    p = example(b, base)
    hf = ap(p, "Humidity", 1)
    b1 = p.js("window.__fa.doc.system.boundaries[0].members")
    p.js(f"window.__fa.selectItem('{hf}')"); p.page.wait_for_timeout(200)
    p.js("document.querySelector('#p-split').click()"); p.page.wait_for_timeout(400)
    hums = p.js("window.__fa.doc.system.elements.filter(e => e.text === 'Humidity')")
    assert len(hums) == 2 and all(len(h["at"]) == 1 for h in hums) and hums[0]["notes"] == hums[1]["notes"]
    assert hf in p.js("window.__fa.doc.system.boundaries[0].members"), "the split-off circle keeps its boundaries"
    split = [h for h in hums if h["at"][0]["id"] == hf][0]
    # an external linked to the split-off element: merging back points it at the one kept
    p.js(f"window.__fa.commit(() => {{ const V = window.__fa.curVar(); V.externals[2].ref = '{split['id']}'; }})"); p.page.wait_for_timeout(200)
    # the overview suggests them, and Review selects both
    p.js("window.__fa.selectItem(null)"); p.page.keyboard.press("Escape"); p.page.wait_for_timeout(200)
    assert "Same name, separate elements · 1" in p.js("document.querySelector('#panel').textContent")
    p.js("document.querySelector('.samelist [data-same].btn').click()"); p.page.wait_for_timeout(400)
    assert len(p.js("window.__fa.doc.system.elements.filter(e => e.text === 'Humidity')")) == 2
    keep = [h for h in hums if h["id"] != split["id"]][0]
    assert p.js("document.querySelectorAll('[data-merge]').length") == 2
    p.js(f"document.querySelector('[data-merge=\"{keep['id']}\"]').click()"); p.page.wait_for_timeout(400)
    hums = p.js("window.__fa.doc.system.elements.filter(e => e.text === 'Humidity')")
    assert len(hums) == 1 and hums[0]["id"] == keep["id"] and len(hums[0]["at"]) == 2
    assert p.js("window.__fa.doc.system.boundaries[0].members") == b1
    assert p.js("window.__fa.curVar().externals[2].ref") == keep["id"]
    p.assert_clean(); p.close()


def test_sys_merge_fills_translations_and_keep_apart(b, base):
    p = example(b, base)
    p.js("""window.__fa.commit(() => { const d = window.__fa.doc; d.languages.push('es');
      const S = d.system, lv = S.levels; const mk = (text, es, l, a, notes) => ({ id: 'e' + text + l, text, textTr: es ? { es } : {}, kind: 'object', needs: '', notes, sources: [notes ? '@janssen2023' : ''].filter(Boolean),
        at: [{ id: 'p' + text + l, level: lv[l].id, a, t: .5, x: 0, y: 0, group: null, tags: [] }] });
      S.elements.push(mk('Roads', '', 0, 2.2, 'gravel'), mk('Road', 'Carreteras', 1, 2.4, ''), mk('Carreteras', '', 0, 2.8, ''), mk('Paths', 'Caminos', 1, 2.0, ''), mk('Walking paths', 'Caminos', 2, 2.0, '')); })""")
    p.page.wait_for_timeout(300)
    sets = p.js("window.__fa.sameNameSets().map(s => s.map(id => window.__fa.elById(id).text).sort())")
    assert sorted(sets) == [["Carreteras", "Road"], ["Paths", "Walking paths"]], sets  # by any language, accents and case aside
    p.js("window.__fa.mergeElements('eRoads0', ['eRoads0', 'eRoad1'])"); p.page.wait_for_timeout(400)
    r = el(p, "Roads")
    assert r["textTr"] == {"es": "Carreteras"} and r["notes"] == "gravel" and r["sources"] == ["@janssen2023"] and len(r["at"]) == 2
    assert not el(p, "Road")
    # Roads (now "Carreteras" in Spanish) and the element called Carreteras
    sets = p.js("window.__fa.sameNameSets().map(s => s.map(id => window.__fa.elById(id).text).sort())")
    assert ["Carreteras", "Roads"] in sets
    p.js("window.__fa.selectItem(null)"); p.page.keyboard.press("Escape"); p.page.wait_for_timeout(200)
    n = p.js("document.querySelectorAll('.samelist > li').length")
    p.js("document.querySelector('.samelist [data-apart]').click()"); p.page.wait_for_timeout(300)
    assert p.js("document.querySelectorAll('.samelist > li').length") == n - 1 and len(p.js("window.__fa.doc.system.apart")) == 1
    p.assert_clean(); p.close()


def test_sys_exports_with_appearances(b, base):
    p = example(b, base)
    name, csv = p.download("[data-act=exp-elements]")
    rows = [r for r in csv.lstrip("﻿").splitlines() if ",Humidity," in r]
    assert len(rows) == 2 and "I of 2" in rows[0] and "II of 2" in rows[1] and "Crop" in rows[0] and "Fruit" in rows[1], rows
    name, svg = p.download("[data-act=exp-svg]")
    assert svg.count(">II</text>") == 1 and svg.count(">I</text>") == 1
    p.assert_clean(); p.close()
