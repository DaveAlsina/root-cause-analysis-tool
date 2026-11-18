/* ================= What is drawn =================
   The overall function is a dashed container: the system boundary. A function whose subfunctions are shown becomes
   a container too, so opening a box is literally opening it. "Show down to level k" closes every box below level k;
   flows into a closed box are drawn to the closed box, and flows that stay inside it disappear (the black box idea). */
function computeView(V = curVar()) {
  const k = view.depth === "all" ? Infinity : +view.depth;
  const ids = Object.keys(V.placed);
  const depth = new Map([[V.root, 0], ...ids.map(id => [id, depthOf(id, V)])]);
  const visible = new Set([V.root, ...ids.filter(id => depth.get(id) <= k)]);
  const ext = new Set(V.externals.map(x => x.id));
  const rep = id => { if (ext.has(id)) return id; if (!depth.has(id)) return null; let x = id; while (x && !visible.has(x)) x = parentOf(x, V); return x; };
  const kids = new Map();
  visible.forEach(id => { if (id === V.root) return; const p = parentOf(id, V); if (!kids.has(p)) kids.set(p, []); kids.get(p).push(id); });
  const hidden = new Map(); // closed boxes: how many subfunctions they hide
  visible.forEach(id => { if (kids.has(id)) return; const d = id === V.root ? ids : descendantsOf(id, V); if (d.length) hidden.set(id, d.length); });
  return { k, depth, visible, rep, kids, hidden, ext };
}
/* where a box sits: its own position, or the middle of what it hides */
function centreOf(id, V = curVar()) {
  const d = (id === V.root ? Object.keys(V.placed) : descendantsOf(id, V)).filter(x => !childrenOf(x, V).length);
  if (!d.length) return id === V.root ? { x: 0, y: 0 } : { x: V.placed[id].x, y: V.placed[id].y };
  const xs = d.map(x => V.placed[x].x), ys = d.map(x => V.placed[x].y);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

let cy = null;
function isDark() { const g = css("--ground").replace("#", ""); return g.length === 6 && parseInt(g.slice(0, 2), 16) < 90; }
function styleSheet() {
  const ink = css("--ink"), ground = css("--ground"), hi = css("--edge-hi"), muted = css("--muted"), dark = isDark();
  return [
    { selector: "node", style: {
      shape: "round-rectangle", "corner-radius": 7, width: "data(w)", height: "data(h)",
      "background-color": "data(fill)", "border-color": "data(stroke)", "border-width": "data(bw)", "border-style": "data(bs)",
      label: "data(label)", color: "data(font)", "font-family": FONT_STACK, "font-size": FONT_PX, "line-height": LINE / FONT_PX, "font-style": "data(fs)",
      "text-wrap": "wrap", "text-max-width": MAXW * 3, "text-valign": "center", "text-halign": "center", "min-zoomed-font-size": 4 } },
    { selector: "node.ext", style: { "corner-radius": 18 } },
    { selector: "node:parent", style: { "background-opacity": dark ? .22 : .14, "text-valign": "top", "text-halign": "center", "text-margin-y": -4, color: ink,
      "font-weight": 600, padding: 22, "text-max-width": 360, "min-width": "data(w)",
      "text-background-color": ground, "text-background-opacity": .88, "text-background-padding": 3, "text-background-shape": "round-rectangle" } },
    { selector: "node.root:parent", style: { "background-opacity": dark ? .07 : .55, "font-size": 15, "text-max-width": 480, padding: 34 } },
    { selector: "node.root:childless", style: { "font-weight": 600, "font-size": 15 } },
    { selector: "edge", style: {
      width: "data(w)", "line-color": "data(c)", "target-arrow-color": "data(c)", "line-style": "data(ls)", "line-cap": "round",
      "target-arrow-shape": "triangle", "target-arrow-fill": "data(af)", "arrow-scale": 1.15, "curve-style": "bezier", "control-point-step-size": 34,
      label: "data(label)", "font-family": FONT_STACK, "font-size": 11, color: ink, "text-wrap": "wrap", "text-max-width": 130,
      "text-background-color": ground, "text-background-opacity": .9, "text-background-padding": 2, "text-background-shape": "round-rectangle",
      "line-dash-pattern": [8, 5], "min-zoomed-font-size": 6 } },
    { selector: "edge.lifted", style: { opacity: .85 } },
    { selector: "edge.typeoff", style: { display: "none" } },
    { selector: ".faded", style: { opacity: .13 } },
    { selector: ".tagoff", style: { opacity: .16 } },
    { selector: "node.tagon", style: { "underlay-color": "#FF6A3D", "underlay-opacity": .5, "underlay-padding": 8 } },
    { selector: "edge.tagon", style: { "underlay-color": "#FF6A3D", "underlay-opacity": .45, "underlay-padding": 6 } },
    { selector: "node.sel", style: { "underlay-color": hi, "underlay-opacity": .35, "underlay-padding": 7 } },
    { selector: "edge.sel", style: { "underlay-color": hi, "underlay-opacity": .4, "underlay-padding": 6, "z-index": 10 } },
    { selector: "edge.hl", style: { "z-index": 9, "underlay-color": hi, "underlay-opacity": .18, "underlay-padding": 4 } },
    { selector: "node.match", style: { "underlay-color": "#F5B700", "underlay-opacity": .6, "underlay-padding": 7 } },
    { selector: "edge.match", style: { "underlay-color": "#F5B700", "underlay-opacity": .6, "underlay-padding": 6 } },
    { selector: "node.diff-add", style: { "underlay-color": "#15924F", "underlay-opacity": .5, "underlay-padding": 8 } },
    { selector: "node.diff-chg", style: { "underlay-color": "#E0A100", "underlay-opacity": .55, "underlay-padding": 8 } },
    { selector: "node.drop", style: { "underlay-color": hi, "underlay-opacity": .55, "underlay-padding": 10 } },
    { selector: "node.badge", style: { shape: "round-rectangle", "corner-radius": 9, width: "data(w)", height: 21, "background-color": ground, "border-color": muted, "border-width": 1,
      label: "data(label)", color: ink, "font-family": EMOJI_FONT, "font-size": 13, "font-weight": 400, "font-style": "normal", events: "no", "z-index": 21, "text-valign": "center", "text-halign": "center" } },
    ...sysStyles(ink, ground, muted, dark),
  ];
}

function nodeVisual(o, lv, extra = "", pre = "", boxW = null) {
  const missing = doc.languages.length > 1 && txMissing(o);
  const sz = measureText(pre + (tx(o) || " ") + extra, boxW), box = boxSize(o, extra, pre, boxW);
  return { label: sz.lines.join("\n"), w: box.w, h: box.h, fs: missing ? "italic" : "normal", lv };
}
function chipFor(o) { // tag emojis in the corner, as in the RCA
  if (view.tagChips === false) return null;
  const ts = orderedTags(o.tags || []); if (!ts.length) return null;
  const label = ts.slice(0, 3).map(t => t.emoji).join("") + (ts.length > 3 ? ` +${ts.length - 3}` : "");
  mctx.font = `13px ${EMOJI_FONT}`;
  return { label, w: Math.ceil(mctx.measureText(label).width) + 12 };
}
function flowVisual(l) {
  const t = typeById(l.type);
  return { c: l.unwanted ? UNWANTED_COLOR : t.color, w: t.width, ls: dashPattern(t) ? "dashed" : "solid", dp: dashPattern(t), af: l.unwanted ? "hollow" : "filled",
    label: view.labels === false ? "" : (l.unwanted ? "⚠ " : "") + flowText(l) };
}
function flowText(l) { return tx(l) || (l.element && elById(l.element) ? tx(elById(l.element)) : ""); } // its own label, or the element that flows
function syncExtRefs() { // a linked external shows its element's name in every language
  doc.variants.forEach(V => V.externals.forEach(x => { const e = x.ref && elById(x.ref); if (!e) { delete x.ref; return; } x.text = e.text; x.textTr = clone(e.textTr); }));
}

async function render(opts = {}) {
  if (!cy || !doc) return;
  document.body.classList.toggle("sys", view.mode === "system");
  if (view.mode === "system") return renderSystem(opts);
  $("#sysover-g").innerHTML = ""; $("#sysbar").hidden = true;
  syncExtRefs();
  const V = curVar(), M = computeView(V);
  const els = [];
  const root = fnById(V.root);
  const rootTxt = tx(root) || "Overall function";
  const bnd = tx(V, "boundary");
  { // the system boundary
    const childless = !M.kids.has(V.root);
    const hid = M.hidden.get(V.root);
    const label = rootTxt + (childless && hid ? `  ▸ +${hid}` : "") + (bnd ? `\n${childless ? "" : "Boundary: "}${bnd}` : "");
    mctx.font = `600 15px ${FONT_STACK}`;
    const lw = Math.min(480, Math.max(...label.split("\n").map(s => mctx.measureText(s).width))) + 40;
    const s = levelStyle(0);
    els.push({ group: "nodes", data: { id: V.root, kind: "root", label, w: childless ? Math.max(260, lw) : lw, h: childless ? 150 : 40, fill: s.fill, stroke: s.stroke, font: s.font,
      bw: root.kind === "aux" ? AUX_BORDER.width : 2, bs: "dashed", fs: "normal" }, classes: "root", position: childless ? centreOf(V.root, V) : undefined });
  }
  const order = [...M.visible].filter(id => id !== V.root).sort((a, b) => M.depth.get(a) - M.depth.get(b));
  order.forEach(id => {
    const f = fnById(id), lv = M.depth.get(id), s = levelStyle(lv), open = M.kids.has(id), hid = M.hidden.get(id);
    const v = nodeVisual(f, lv, hid ? `  ▸ +${hid}` : "", f.key ? "★ " : "", open ? null : V.placed[id].bw);
    const aux = f.kind === "aux";
    els.push({ group: "nodes", data: { id, kind: "fn", parent: parentOf(id, V), label: v.label, w: v.w, h: v.h, fill: s.fill, stroke: s.stroke, font: s.font, fs: v.fs,
      bw: aux ? AUX_BORDER.width : 1.3, bs: aux ? AUX_BORDER.style : "solid" }, classes: "fn" + (aux ? " aux" : "") + (hid ? " closed" : ""),
      position: open ? undefined : centreOf(id, V) });
  });
  V.externals.forEach(x => {
    const v = nodeVisual(x, -1, "", "", x.bw);
    els.push({ group: "nodes", data: { id: x.id, kind: "ext", label: v.label, w: v.w, h: v.h, fill: css("--panel"), stroke: css("--muted"), font: css("--ink"), fs: v.fs || "normal", bw: 1.3, bs: "solid" },
      classes: "ext", position: { x: x.x, y: x.y } });
  });
  V.flows.forEach(l => {
    const s = M.rep(l.source), t = M.rep(l.target);
    if (!s || !t || s === t) return;
    const lifted = s !== l.source || t !== l.target;
    els.push({ group: "edges", data: { id: l.id, source: s, target: t, ...flowVisual(l) },
      classes: (lifted ? "lifted" : "") + (view.hiddenTypes.has(l.type) ? " typeoff" : "") });
  });
  cy.batch(() => { cy.elements().remove(); cy.add(els); });
  shapeFlows(V);
  // tag chips sit on the top-left corner of their box once the boxes are placed
  const chips = [];
  [...M.visible].forEach(id => { const f = fnById(id), ch = chipFor(f); const el = cy.getElementById(id); if (!ch || el.empty()) return;
    const bb = el.boundingBox({ includeLabels: false }); chips.push({ group: "nodes", data: { id: "t:" + id, label: ch.label, w: ch.w }, classes: "badge", position: { x: bb.x1 + ch.w / 2 - 4, y: bb.y1 - 1 } }); });
  if (chips.length) cy.add(chips);
  cy.nodes().forEach(n => (n.hasClass("badge") || VIEWER) ? n.ungrabify() : n.grabify());
  lastRender = { V, M };
  updateChrome(); renderLegend(); renderTagbar(); syncControls();
  if (!opts.skipPanel) renderPanel();
  applySelection(); applyTagFilter(); applyDiff(); doSearch(false); updateOverlays();
  if (opts.fit) fitView();
}

function fitView(anim) {
  const eles = cy.elements().filter(e => e.visible());
  if (!eles.length) return;
  const bb = eles.boundingBox({ includeLabels: true });
  const aw = Math.max(200, cy.width() - 60), ah = Math.max(200, cy.height() - 110);
  const z = Math.min(aw / bb.w, ah / bb.h, 1.3);
  const target = { zoom: z, pan: { x: 30 + (aw - bb.w * z) / 2 - bb.x1 * z, y: 60 + (ah - bb.h * z) / 2 - bb.y1 * z } };
  if (anim) cy.animate(target, { duration: 250 }); else cy.viewport(target);
}

/* ================= Selection ================= */
function pruneSelection() {
  if (view.mode === "system") { const ok = id => apById(id) || grpById(id); if (selId && !ok(selId)) selId = null; selFlow = null; multi = multi.filter(ok); return; }
  if (selId && !inVariant(selId)) selId = null;
  if (selFlow && !flowById(selFlow)) selFlow = null;
  multi = multi.filter(id => inVariant(id));
}
function selectItem(id, additive) {
  flushField(true);
  if (additive && selId) { multi = multi.includes(id) ? multi.filter(x => x !== id) : [...new Set([...(multi.length ? multi : [selId]), id])]; selId = multi[multi.length - 1] || null; }
  else { selId = id; multi = [id]; }
  selFlow = null; openSide(true); applySelection(); renderPanel(); updateOverlays();
}
function selectFlow(id) { flushField(true); selFlow = id; selId = null; multi = []; openSide(true); applySelection(); renderPanel(); updateOverlays(); }
function clearSelection() { flushField(true); selId = null; selFlow = null; multi = []; applySelection(); renderPanel(); updateOverlays(); }
function openSide(open) { $("main").classList.toggle("side-closed", !open); setTimeout(() => cy && cy.resize(), 0); }
function applySelection() {
  if (!cy) return;
  cy.elements().removeClass("sel hl");
  const ids = multi.length ? multi : selId ? [selId] : [];
  ids.forEach(id => { const n = cy.getElementById(id); n.addClass("sel"); n.connectedEdges().addClass("hl"); });
  if (selFlow) cy.getElementById(selFlow).addClass("sel");
  markSiblings(ids);
}
function markSiblings(ids) { // the other circles of a selected element glow, so its other levels are easy to find
  cy.nodes(".sib").removeClass("sib");
  if (view.mode !== "system") return;
  const sel = new Set(ids); ids.forEach(id => apIdsOf(id).forEach(s => { if (!sel.has(s) && apById(id)) cy.getElementById(s).addClass("sib"); }));
}
function applyTagFilter() {
  cy.elements().removeClass("tagon tagoff");
  cy.nodes(".stage").removeClass("on");
  if (!view.tagFilter.size) return;
  const has = o => o && (o.tags || []).some(t => view.tagFilter.has(t));
  const skip = n => n.hasClass("badge") || n.hasClass("ring") || n.hasClass("ringlabel") || n.hasClass("chainlbl");
  cy.nodes(".stage").forEach(n => n.toggleClass("on", view.tagFilter.has(n.data("tag"))));
  cy.nodes().forEach(n => { if (skip(n) || n.hasClass("stage")) return; const o = tagHolderOf(n.id()); if (has(o)) n.addClass("tagon"); else if (!n.isParent()) n.addClass("tagoff"); });
  cy.edges().forEach(e => { if (e.hasClass("chainedge")) return; has(flowById(e.id())) ? e.addClass("tagon") : e.addClass("tagoff"); });
}
function applyDiff() {
  cy.nodes().removeClass("diff-add diff-chg");
  if (!view.diff) return;
  view.diff.added.forEach(id => cy.getElementById(id).addClass("diff-add"));
  view.diff.changed.forEach(id => cy.getElementById(id).addClass("diff-chg"));
}
function goTo(id) {
  if (elById(id)) id = elById(id).at[0].id; // an element: its first circle
  if (apById(id) || grpById(id)) { // an element of the system map
    const go = () => { selId = id; selFlow = null; multi = [id]; openSide(true); applySelection(); renderPanel(); const el = cy.getElementById(id); if (el.nonempty()) cy.animate({ center: { eles: el }, zoom: Math.max(cy.zoom(), .8) }, { duration: 260 }); };
    if (view.mode !== "system") return setMode("system").then(go); go(); return Promise.resolve();
  }
  if (view.mode === "system" && (isFunction(id) || flowById(id) || extById(id))) return setMode("functions").then(() => goTo(id));
  const V = curVar();
  if (!inVariant(id) && !flowById(id)) return Promise.resolve();
  const f = flowById(id);
  const visibleNow = () => cy.getElementById(id).nonempty();
  const after = () => { const el = cy.getElementById(id); if (el.nonempty()) cy.animate({ center: { eles: el }, zoom: Math.max(cy.zoom(), .9) }, { duration: 260 }); };
  if (f) selectFlow(id); else { selId = id; selFlow = null; multi = [id]; openSide(true); }
  if (!visibleNow()) { view.depth = "all"; saveView(); return render().then(after); }
  applySelection(); renderPanel(); updateOverlays(); after(); return Promise.resolve();
}

/* ================= Editing ================= */
const VERB_HINT = "Verb + noun, e.g. keep fruit cold";
/* the box that contains a point, innermost first (a function container or the boundary) */
function containerAt(x, y) {
  let best = null, area = Infinity;
  cy.nodes().forEach(n => {
    if (n.hasClass("badge") || n.hasClass("ext") || !n.visible()) return;
    if (!n.isParent() && !n.hasClass("root")) return;
    const bb = n.boundingBox({ includeLabels: false }); if (x < bb.x1 || x > bb.x2 || y < bb.y1 || y > bb.y2) return;
    const a = bb.w * bb.h; if (a < area) { area = a; best = n.id(); }
  });
  return best;
}
async function addFunctionAt(x, y, parentId, from, init) {
  if (VIEWER) return;
  const V = curVar(); const f = Object.assign(newFunction(""), init || {});
  await commit(() => {
    doc.functions.push(f);
    V.placed[f.id] = { x: Math.round(x), y: Math.round(y), parent: parentId && parentId !== V.root ? parentId : null };
    if (from) V.flows.push(newFlow(from, f.id, view.flowType));
    if (view.depth !== "all" && depthOf(f.id, V) > +view.depth) view.depth = "all";
  });
  selId = f.id; selFlow = null; multi = [f.id]; applySelection(); renderPanel();
  inlineEdit(f.id, true);
}
function addSubfunction(pid) { // "how?": one level down
  const V = curVar(); if (!(pid === V.root || V.placed[pid])) return;
  const kids = childrenOf(pid, V);
  const c = pid === V.root ? centreOf(V.root, V) : kids.length ? null : { x: V.placed[pid].x, y: V.placed[pid].y };
  let x, y;
  if (kids.length) { const last = kids.map(k => V.placed[k]).sort((a, b) => b.x - a.x)[0]; x = last.x + MAXW + 60; y = last.y; }
  else { x = c.x; y = c.y + (pid === V.root ? 0 : 10); }
  addFunctionAt(x, y, pid);
}
function addSibling(id) { // same level, to the right
  const V = curVar(); if (!V.placed[id]) return addSubfunction(V.root);
  const p = V.placed[id]; const b = boxSize(fnById(id));
  addFunctionAt(p.x + b.w + 80, p.y, p.parent || V.root);
}
async function addExternalAt(x, y, from, to) {
  if (VIEWER) return;
  const V = curVar(); const e = newExternal("", x, y);
  await commit(() => {
    V.externals.push(e);
    if (from) V.flows.push(newFlow(from, e.id, view.flowType));
    if (to) V.flows.push(newFlow(e.id, to, view.flowType));
  });
  selId = e.id; selFlow = null; multi = [e.id]; applySelection(); renderPanel();
  inlineEdit(e.id, true);
}
function addFlow(s, t) {
  if (VIEWER) return;
  if (s === t) return toast("A flow needs two different ends.");
  const V = curVar(); const l = newFlow(s, t, view.flowType);
  if (V.externals.some(x => x.id === s) && V.externals.some(x => x.id === t)) toast("Both ends are outside the boundary: this flow never enters the system.", 4500);
  commit(() => V.flows.push(l)).then(() => { selFlow = l.id; selId = null; multi = []; applySelection(); renderPanel(); inlineEdit(l.id, false, { flow: true }); });
}
function rewire(flowId, end, id) {
  const l = flowById(flowId); if (!l) return;
  const s = end === "source" ? id : l.source, t = end === "target" ? id : l.target;
  if (s === t) return toast("A flow needs two different ends.");
  if (s === l.source && t === l.target) return;
  commit(() => { l.source = s; l.target = t; if (l.geo) { delete l.geo[end === "source" ? "s" : "t"]; delete l.geo.bend; const n = geoOf(l.geo); if (n) l.geo = n; else delete l.geo; } }); toast("Flow rewired.");
}
function reverseFlow(id) { const l = flowById(id); if (l) commit(() => { [l.source, l.target] = [l.target, l.source]; }); }
function setParent(id, pid) {
  const V = curVar(); if (!V.placed[id]) return;
  if (pid === id || (pid !== V.root && isAncestor(id, pid, V))) return toast("A function cannot sit inside itself or inside one of its own subfunctions.");
  commit(() => { V.placed[id].parent = pid === V.root ? null : pid; if (view.depth !== "all" && depthOf(id, V) > +view.depth) view.depth = "all"; });
}
function placeFunction(fid) { // bring a catalogue function into this variant
  const V = curVar(); if (inVariant(fid)) return goTo(fid);
  const c = centreOf(V.root, V);
  commit(() => { V.placed[fid] = { x: Math.round(c.x), y: Math.round(c.y + 40), parent: null }; }).then(() => goTo(fid));
}
function deleteSelection() {
  if (VIEWER) return;
  if (view.mode === "system") { const ids = multi.length ? multi : selId ? [selId] : []; selId = null; multi = []; return deleteElements(ids); }
  const V = curVar();
  if (selFlow) { const id = selFlow; selFlow = null; commit(() => { V.flows = V.flows.filter(l => l.id !== id); }); toast("Flow deleted. Ctrl Z to undo."); return; }
  const ids = new Set((multi.length ? multi : selId ? [selId] : []).filter(id => id !== V.root));
  if (selId === V.root && ids.size === 0) return toast("The overall function is the boundary itself. Rename it, or make another variant.");
  if (!ids.size) return;
  const fns = [...ids].filter(id => V.placed[id]).length;
  selId = null; multi = [];
  commit(() => {
    ids.forEach(id => {
      if (V.placed[id]) { const up = V.placed[id].parent; childrenOf(id, V).forEach(c => { V.placed[c].parent = up; }); delete V.placed[id]; }
      V.externals = V.externals.filter(x => x.id !== id);
    });
    V.flows = V.flows.filter(l => !ids.has(l.source) && !ids.has(l.target));
  });
  toast(fns ? `Removed from this variant. ${fns === 1 ? "The function stays" : "The functions stay"} in the catalogue with notes and sources; Ctrl Z to undo.` : "Deleted. Ctrl Z to undo.", 4500);
}
function removeFromCatalogue(fid) {
  const vs = usedIn(fid);
  if (vs.some(v => v.root === fid)) return toast("This is the overall function of a variant. Delete that variant first.");
  if (vs.length && !confirm(`Delete “${tx(fnById(fid))}” from the catalogue and from ${vs.length} variant${vs.length > 1 ? "s" : ""}? Ctrl Z brings it back.`)) return;
  commit(() => {
    doc.variants.forEach(V => { if (V.placed[fid]) { const up = V.placed[fid].parent; childrenOf(fid, V).forEach(c => { V.placed[c].parent = up; }); delete V.placed[fid]; }
      V.flows = V.flows.filter(l => l.source !== fid && l.target !== fid); });
    doc.functions = doc.functions.filter(f => f.id !== fid);
  });
}

/* inline text editor over a box or a flow: asks for each language in turn */
function inlineEdit(id, isNew, opts = {}) {
  if (VIEWER) return;
  const el = cy.getElementById(id); if (el.empty()) return;
  const o = findEditable(id); if (!o) return;
  const isFlow = el.isEdge(), isFn = !!fnById(id);
  const first = curLang();
  const langs = opts.langs || [first, ...doc.languages.filter(l => l !== first)];
  const many = doc.languages.length > 1;
  const vals = {}; langs.forEach(l => (vals[l] = isNew ? "" : txRaw(o, "text", l)));
  const ta = $("#inline"), lab = $("#inline-lang"), vb = $("#verbs");
  let left, top, w, h;
  if (isFlow) { const m = el.renderedMidpoint(); w = 220; h = 54; left = m.x - w / 2; top = m.y - h / 2; }
  else { const bb = el.isParent() ? { x1: el.renderedBoundingBox({ includeLabels: false }).x1, y1: el.renderedBoundingBox({ includeLabels: false }).y1 - 30, w: el.renderedBoundingBox({ includeLabels: false }).w, h: 30 } : el.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
    w = Math.max(bb.w, 230); h = Math.max(bb.h, 60); left = bb.x1 + bb.w / 2 - w / 2; top = bb.y1 + bb.h / 2 - h / 2; }
  ta.style.left = left + "px"; ta.style.top = top + "px"; ta.style.width = w + "px"; ta.style.height = h + "px";
  ta.style.fontSize = Math.max(12, Math.min(18, FONT_PX * cy.zoom())) + "px";
  lab.style.left = left + "px"; lab.style.width = w + "px"; lab.style.bottom = (cy.height() - top + 4) + "px";
  vb.style.left = left + "px"; vb.style.top = (top + h + 4) + "px"; vb.style.width = w + "px";
  let i = 0, done = false;
  const ph = () => isFlow ? "What flows? e.g. fruit, cold air, temperature reading" : isFn ? VERB_HINT : apById(id) ? "Element, e.g. grower, fruit, rain, Botrytis conidia" : grpById(id) ? "Group, e.g. asexual reproduction" : "Outside the boundary, e.g. grower, importer, environment";
  const showVerbs = () => {
    const l = langs[i]; const caret = ta.selectionStart; const before = ta.value.slice(0, caret);
    const sug = isFn && !/\s/.test(before.trim()) ? verbSuggestions(before, l) : [];
    vb.hidden = !sug.length;
    vb.innerHTML = sug.map(s => `<button type="button" data-verb="${esc(s.word)}"${s.head && s.head !== s.word ? ` title="Synonym of “${esc(s.head)}” in the functional basis"` : ""}>${esc(s.word)}${s.head && s.head !== s.word ? `<small>${esc(s.head)}</small>` : ""}</button>`).join("") + `<span class="vb-h">function verbs</span>`;
  };
  const show = () => {
    const l = langs[i];
    ta.value = vals[l]; ta.placeholder = i === 0 && !opts.langs ? ph() : `${langName(l)} text`;
    const src = vals[langs[0]] && i > 0 ? vals[langs[0]] : (opts.langs && !isNew ? tx(o, "text", mainLang()) : "");
    lab.hidden = !(many || opts.pass);
    lab.innerHTML = `<b>${esc(l.toUpperCase())}</b>${langs.length > 1 ? ` ${i + 1}/${langs.length}` : ""}` + (opts.pass ? ` item ${opts.pass.i} of ${opts.pass.n}` : "") +
      ((src && l !== langs[0]) || opts.langs ? `<span class="src">${esc(src)}</span>` : "") +
      `<span class="keys">${i < langs.length - 1 ? "Enter: next language" : opts.pass ? "Enter: next" : "Enter: done"} · Shift+Enter: new line · Esc: ${opts.pass ? "stop" : "cancel"}</span>`;
    ta.hidden = false; ta.focus(); ta.select(); showVerbs();
  };
  const clean = cleanText; // Shift+Enter starts a new line
  const finish = save => {
    if (done) return; done = true; vals[langs[i]] = ta.value;
    ta.hidden = true; lab.hidden = true; vb.hidden = true;
    ta.removeEventListener("keydown", onKey); ta.removeEventListener("blur", onBlur); ta.removeEventListener("input", showVerbs); ta.removeEventListener("click", showVerbs);
    const apply = m => langs.forEach(l => { const v = clean(vals[l]); if (v || l !== mainLang() || !isNew) txSet(m, "text", l, v); });
    const changed = langs.some(l => clean(vals[l]) !== txRaw(o, "text", l));
    if (isNew) {
      if (!save || langs.every(l => !clean(vals[l]))) { restoreCore(undoStack.pop()); pruneSelection(); touch(); render(); }
      else { const m = findEditable(id); if (m) { m.text = ""; apply(m); } touch(); render(); }
    } else if (save && changed) {
      const probe = clone(o); apply(probe);
      if (!isFlow && !txAll(probe).length) toast("A box needs some text. Delete it with Del instead.");
      else commit(() => { const m = findEditable(id); if (m) apply(m); });
    }
    if (opts.onDone) opts.onDone(save);
  };
  const onKey = e => {
    e.stopPropagation();
    if (e.key === "Escape") { e.preventDefault(); finish(false); return; }
    if ((e.key === "Enter" && !e.shiftKey) || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault(); vals[langs[i]] = ta.value;
      if (i < langs.length - 1) { i++; show(); return; }
      finish(true);
      if (e.key === "Tab" && !opts.pass && isFn) setTimeout(() => addSubfunction(id), 30);
      return;
    }
    if (e.key === "Tab" && e.shiftKey) { e.preventDefault(); vals[langs[i]] = ta.value; if (i > 0) { i--; show(); } }
  };
  const onBlur = () => setTimeout(() => { if (document.activeElement !== ta && !vb.matches(":hover")) finish(true); }, 0);
  ta.addEventListener("keydown", onKey); ta.addEventListener("blur", onBlur); ta.addEventListener("input", showVerbs); ta.addEventListener("click", showVerbs);
  vb.onmousedown = e => { const b = e.target.closest("[data-verb]"); if (!b) return; e.preventDefault();
    ta.value = b.dataset.verb + " " + ta.value.replace(/^\s*\S*\s*/, ""); ta.setSelectionRange(ta.value.length, ta.value.length); showVerbs(); ta.focus(); };
  show();
}

/* walk through every item of this variant missing a language */
async function translatePass(lang) {
  if (VIEWER) return;
  const V = curVar();
  const todo = (view.mode === "system" ? [...doc.system.elements.map(e => e.at[0].id), ...doc.system.groups.map(g => g.id)]
    : [V.root, ...Object.keys(V.placed).sort((a, b) => depthOf(a, V) - depthOf(b, V)), ...V.externals.map(x => x.id), ...V.flows.filter(l => txAll(l).length).map(l => l.id)])
    .filter(id => txMissing(findEditable(id), "text", lang));
  if (!todo.length) return toast(`Everything in this variant already has ${langName(lang)} text.`);
  $$(".overlay").forEach(o => (o.hidden = true));
  if (view.depth !== "all") { view.depth = "all"; await render(); }
  let k = 0;
  const step = async () => {
    while (k < todo.length && !txMissing(findEditable(todo[k]) || {}, "text", lang)) k++;
    if (k >= todo.length) { toast(`${langName(lang)} translations complete in this variant.`); return; }
    const id = todo[k]; k++;
    await goTo(id);
    setTimeout(() => inlineEdit(id, false, { langs: [lang], pass: { i: k, n: todo.length }, onDone: saved => { if (saved) setTimeout(step, 60); else toast("Translation pass stopped."); } }), 300);
  };
  step();
}

/* ================= Canvas overlays: connect handle, rewire grips ================= */
let hoverId = null, hoverTimer = null, dragging = null;
const toRendered = p => ({ x: p.x * cy.zoom() + cy.pan().x, y: p.y * cy.zoom() + cy.pan().y });
/* ================= The shape of a flow =================
   Kept per variant in l.geo, only once the author shapes a flow:
   shape  auto (a gentle curve; parallel flows spread apart) | straight | curved | angled | elbow
   bend   curved: its control point; angled: its corner. As {w, d}: the fraction along the line between the centres of
          the two boxes, and the distance across it (positive to the left), so a bend follows when the boxes move.
          elbow: w alone, where it turns
   s, t   where the flow leaves and enters its box, as fractions of the box from its centre: [.5, 0] is the middle of the right side
   lab    how far the label was dragged from its place, px
   A flow drawn to a closed box (lifted) ignores its shape: its ends are not the boxes it was shaped for. */
const FLOW_SHAPES = [["auto", "Auto"], ["straight", "Straight"], ["curved", "Curved"], ["angled", "Angled"], ["elbow", "Elbow"]];
const relTo = (p, S, T) => { const dx = T.x - S.x, dy = T.y - S.y, L2 = dx * dx + dy * dy || 1;
  return { w: ((p.x - S.x) * dx + (p.y - S.y) * dy) / L2, d: ((p.y - S.y) * dx - (p.x - S.x) * dy) / Math.sqrt(L2) }; };
function geoStyle(g) {
  const st = {}; if (!g) return st;
  const b = g.bend;
  if (g.shape === "straight") st["curve-style"] = "straight";
  else if (g.shape === "curved" && b) Object.assign(st, { "curve-style": "unbundled-bezier", "edge-distances": "node-position", "control-point-weights": b.w, "control-point-distances": b.d });
  else if (g.shape === "angled" && b) Object.assign(st, { "curve-style": "segments", "edge-distances": "node-position", "segment-weights": b.w, "segment-distances": b.d });
  else if (g.shape === "elbow") Object.assign(st, { "curve-style": "taxi", "taxi-direction": "auto", "taxi-turn": Math.round((b ? b.w : .5) * 100) + "%", "taxi-turn-min-distance": 8 });
  if (g.s) st["source-endpoint"] = `${Math.round(g.s[0] * 100)}% ${Math.round(g.s[1] * 100)}%`;
  if (g.t) st["target-endpoint"] = `${Math.round(g.t[0] * 100)}% ${Math.round(g.t[1] * 100)}%`;
  if (g.lab) { st["text-margin-x"] = g.lab[0]; st["text-margin-y"] = g.lab[1]; }
  return st;
}
function shapeFlows(V = curVar()) {
  cy.batch(() => cy.edges().forEach(e => {
    const dp = e.data("dp"); if (dp) e.style("line-dash-pattern", dp);
    const l = flowById(e.id(), V); if (l && l.geo && !e.hasClass("lifted")) e.style(geoStyle(l.geo));
  }));
  spreadParallelLabels(V);
}
/* two or more flows between the same two boxes: their labels are stacked so none hides another (unless one was placed by hand) */
function spreadParallelLabels(V = curVar()) {
  const groups = new Map();
  cy.edges().forEach(e => { if (!e.visible() || !e.data("label")) return; const l = flowById(e.id(), V); if (l && l.geo && !e.hasClass("lifted") && (l.geo.lab || (l.geo.shape && l.geo.shape !== "auto"))) return;
    const k = [e.data("source"), e.data("target")].sort().join("|"); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); });
  groups.forEach(es => {
    if (es.length < 2) return;
    const bbs = es.map(e => e.boundingBox({ includeEdges: false, includeNodes: false, includeLabels: true }));
    const ord = es.map((e, i) => i).sort((a, b) => (bbs[a].y1 + bbs[a].y2) - (bbs[b].y1 + bbs[b].y2) || (bbs[a].x1 - bbs[b].x1));
    const hs = ord.map(i => bbs[i].h), total = hs.reduce((a, b) => a + b, 0) + 4 * (es.length - 1);
    const cy0 = bbs.reduce((a, b) => a + (b.y1 + b.y2) / 2, 0) / es.length, cx0 = bbs.reduce((a, b) => a + (b.x1 + b.x2) / 2, 0) / es.length;
    let y = cy0 - total / 2;
    ord.forEach((i, k) => { const b = bbs[i]; es[i].style({ "text-margin-x": Math.round(cx0 - (b.x1 + b.x2) / 2), "text-margin-y": Math.round(y + hs[k] / 2 - (b.y1 + b.y2) / 2) }); y += hs[k] + 4; });
  });
}
function placeLabelGrip(lb) { // an outline round the label, and a tab on its corner to drag it by (the label itself stays clickable)
  Object.assign($("#lab-box").style, { left: lb.x1 - 2 + "px", top: lb.y1 - 2 + "px", width: lb.w + 4 + "px", height: lb.h + 4 + "px" });
  Object.assign($("#grip-l").style, { left: lb.x2 + 3 + "px", top: lb.y1 - 9 + "px" });
}
const toModelPt = (ev, box = $("#cy").getBoundingClientRect()) => { const z = cy.zoom(), p = cy.pan(); return { x: (ev.clientX - box.left - p.x) / z, y: (ev.clientY - box.top - p.y) / z }; };
const bendPoint = e => { const l = flowById(e.id()), sh = l && l.geo && l.geo.shape; const sp = sh === "angled" && e.segmentPoints(); return sp && sp.length ? sp[0] : e.midpoint(); };
/* dragging the round grip bends the flow; dragging its label moves the label. Esc cancels */
function startShapeDrag(kind, ev) {
  ev.preventDefault(); ev.stopPropagation();
  const e = cy.getElementById(selFlow), l = flowById(selFlow); if (!l || e.empty() || e.hasClass("lifted")) return;
  const box = $("#cy").getBoundingClientRect(), S = e.source().position(), T = e.target().position();
  const g0 = clone(l.geo || {}), g = clone(g0), start = toModelPt(ev, box);
  if (!g.shape) g.shape = "auto";
  const px = v => parseFloat(String(v)) || 0, l0 = g0.lab || [px(e.style("text-margin-x")), px(e.style("text-margin-y"))]; // where the label is now, spread apart or not
  dragging = { kind }; updateOverlays();
  const grip = kind === "bend" ? $("#grip-m") : $("#grip-l"); grip.hidden = false; grip.classList.add("live"); if (kind === "label") $("#lab-box").classList.add("live");
  const move = ev2 => {
    const p = toModelPt(ev2, box);
    if (kind === "bend") {
      if (g.shape === "auto" || g.shape === "straight") g.shape = "curved";
      if (g.shape === "curved") { const s = e.sourceEndpoint(), t = e.targetEndpoint(); g.bend = relTo({ x: 2 * p.x - (s.x + t.x) / 2, y: 2 * p.y - (s.y + t.y) / 2 }, S, T); } // the curve's middle follows the pointer
      else if (g.shape === "angled") g.bend = relTo(p, S, T);
      else { const hor = Math.abs(T.x - S.x) >= Math.abs(T.y - S.y), w = hor ? (p.x - S.x) / ((T.x - S.x) || 1) : (p.y - S.y) / ((T.y - S.y) || 1); g.bend = { w: Math.max(.05, Math.min(.95, w)), d: 0 }; }
      grip.style.left = (ev2.clientX - box.left) + "px"; grip.style.top = (ev2.clientY - box.top) + "px";
    } else {
      g.lab = [Math.round(l0[0] + p.x - start.x), Math.round(l0[1] + p.y - start.y)];
      e.style(geoStyle(g)); placeLabelGrip(e.renderedBoundingBox({ includeEdges: false, includeNodes: false, includeLabels: true }));
    }
    e.style(geoStyle(g));
  };
  const stop = save => {
    window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("keydown", key, true);
    dragging = null; grip.classList.remove("live"); $("#lab-box").classList.remove("live");
    if (save) commit(() => { const L = flowById(l.id); const n = geoOf(g); if (n) L.geo = n; else delete L.geo; }, { skipPanel: kind === "label" });
    else render({ skipPanel: true });
  };
  const up = () => stop(true);
  const key = k => { if (k.key === "Escape") { k.stopPropagation(); stop(false); } };
  window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("keydown", key, true);
}
/* where a flow's end sits on its box: the point of the box's outline nearest the pointer, as fractions from the centre */
function anchorOn(n, p) {
  const bb = n.boundingBox({ includeLabels: false, includeOverlays: false }), c = { x: (bb.x1 + bb.x2) / 2, y: (bb.y1 + bb.y2) / 2 };
  let fx = Math.max(-.5, Math.min(.5, (p.x - c.x) / bb.w)), fy = Math.max(-.5, Math.min(.5, (p.y - c.y) / bb.h));
  if (Math.abs(fx) < .5 && Math.abs(fy) < .5) { if ((.5 - Math.abs(fx)) * bb.w < (.5 - Math.abs(fy)) * bb.h) fx = fx < 0 ? -.5 : .5; else fy = fy < 0 ? -.5 : .5; }
  const snap = v => Math.abs(v) < .07 ? 0 : Math.round(v * 100) / 100; // close to the middle of a side: exactly the middle
  return [Math.abs(fx) === .5 ? fx : snap(fx), Math.abs(fy) === .5 ? fy : snap(fy)];
}
function setFlowEnd(flowId, end, at) {
  commit(() => { const l = flowById(flowId); if (!l) return; const g = l.geo || {}; g[end === "source" ? "s" : "t"] = at; const n = geoOf(g); if (n) l.geo = n; else delete l.geo; }, { skipPanel: true });
}
function resetFlowShape(flowId) { commit(() => { const l = flowById(flowId); if (l) delete l.geo; }); }
function setFlowShape(flowId, shape) {
  const e = cy.getElementById(flowId);
  commit(() => { const l = flowById(flowId); if (!l) return; const g = l.geo || {}; g.shape = shape;
    if ((shape === "curved" || shape === "angled") && !g.bend && e.nonempty()) g.bend = { w: .5, d: shape === "curved" ? 60 : 40 }; // start from a gentle bend
    if (shape === "elbow" && !g.bend) g.bend = { w: .5, d: 0 };
    if (shape === "auto" || shape === "straight") delete g.bend;
    const n = geoOf(g); if (n) l.geo = n; else delete l.geo; });
}
/* ---- a box's width: drag the grip on its bottom-right corner; double-click it to go back to the automatic width ---- */
function widthTarget() {
  if (VIEWER || view.mode === "system" || !selId || multi.length > 1 || selFlow) return null;
  const n = cy.getElementById(selId); if (n.empty() || !n.visible() || n.isParent() || n.hasClass("root")) return null;
  return fnById(selId) || extById(selId) ? n : null;
}
function visualAt(id, bw) { // the box as drawn at width bw
  const x = extById(id); if (x) return nodeVisual(x, -1, "", "", bw);
  const f = fnById(id), M = lastRender.M, hid = M.hidden.get(id);
  return nodeVisual(f, M.depth.get(id), hid ? `  ▸ +${hid}` : "", f.key ? "★ " : "", bw);
}
function startWidthDrag(ev) {
  ev.preventDefault(); ev.stopPropagation();
  const n = widthTarget(); if (!n) return;
  const id = n.id(), box = $("#cy").getBoundingClientRect(), bb = n.boundingBox({ includeLabels: false, includeOverlays: false }), x1 = bb.x1, y = n.position().y;
  dragging = { kind: "width" }; updateOverlays();
  const grip = $("#grip-w"); grip.hidden = false; grip.classList.add("live");
  let w = Math.round(bb.w);
  const move = ev2 => {
    const p = toModelPt(ev2, box); w = Math.round(Math.max(BOX_W[0], Math.min(BOX_W[1], p.x - x1)));
    const v = visualAt(id, w); n.data({ w: v.w, h: v.h, label: v.label }); n.position({ x: x1 + v.w / 2, y });
    const r = n.renderedBoundingBox({ includeLabels: false, includeOverlays: false }); grip.style.left = r.x2 + "px"; grip.style.top = r.y2 + "px";
  };
  const stop = save => {
    window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("keydown", key, true);
    dragging = null; grip.classList.remove("live");
    if (save) setBoxWidth(id, w, x1); else render({ skipPanel: true });
  };
  const up = () => stop(true);
  const key = k => { if (k.key === "Escape") { k.stopPropagation(); stop(false); } };
  window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("keydown", key, true);
}
function setBoxWidth(id, w, keepLeft) { // w null: back to the automatic width. The left side stays where it was
  commit(() => {
    const V = curVar(), x = extById(id), p = x || V.placed[id]; if (!p) return;
    const hides = !x && descendantsOf(id, V).length; // a closed box sits in the middle of what it hides: it grows both ways
    if (w) p.bw = w; else delete p.bw;
    if (keepLeft != null && !hides) p.x = Math.round(keepLeft + visualAt(id, w).w / 2);
  });
}

function updateOverlays() {
  const h = $("#handle"), gs = $("#grip-s"), gt = $("#grip-t"), gm = $("#grip-m"), gl = $("#grip-l"), lbx = $("#lab-box"), gw = $("#grip-w");
  if (VIEWER || !cy || view.mode === "system") { h.hidden = gs.hidden = gt.hidden = gm.hidden = gl.hidden = lbx.hidden = gw.hidden = true; return; }
  if (dragging) { gm.hidden = gl.hidden = gw.hidden = true; if (dragging.kind !== "label") lbx.hidden = true; } // the one being dragged shows itself
  else {
    const fe = selFlow ? cy.getElementById(selFlow) : null, ok = fe && fe.nonempty() && fe.visible() && !fe.hasClass("lifted");
    if (ok) { const m = toRendered(bendPoint(fe)); gm.style.left = m.x + "px"; gm.style.top = m.y + "px"; gm.hidden = false; } else gm.hidden = true;
    const lb = ok && fe.data("label") ? fe.renderedBoundingBox({ includeEdges: false, includeNodes: false, includeLabels: true }) : null;
    if (lb && lb.w > 0) { placeLabelGrip(lb); gl.hidden = lbx.hidden = false; } else gl.hidden = lbx.hidden = true;
    const wn = widthTarget();
    if (wn) { const r = wn.renderedBoundingBox({ includeLabels: false, includeOverlays: false }); gw.style.left = r.x2 + "px"; gw.style.top = r.y2 + "px"; gw.hidden = false; } else gw.hidden = true; /* bottom-right corner: the middle of the right side is for drawing flows */
  }
  const tid = hoverId && cy.getElementById(hoverId).nonempty() ? hoverId : (selId && multi.length <= 1 ? selId : null);
  const target = tid ? cy.getElementById(tid) : null;
  if (target && target.nonempty() && !dragging && $("#inline").hidden && target.visible()) {
    const bb = target.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
    h.style.left = (bb.x2 + 2) + "px"; h.style.top = (bb.y1 + Math.min(bb.h / 2, 40)) + "px"; h.hidden = false; h.dataset.id = target.id();
  } else h.hidden = true;
  const e = selFlow ? cy.getElementById(selFlow) : null;
  if (e && e.nonempty() && e.visible() && !dragging) {
    const s = toRendered(e.sourceEndpoint()), t = toRendered(e.targetEndpoint());
    gs.style.left = s.x + "px"; gs.style.top = s.y + "px"; gt.style.left = t.x + "px"; gt.style.top = t.y + "px";
    gs.hidden = gt.hidden = false; gs.dataset.edge = gt.dataset.edge = e.id();
  } else gs.hidden = gt.hidden = true;
}
function nodeAtRendered(rx, ry) { // the innermost box under the pointer
  const z = cy.zoom(), pan = cy.pan(); const mx = (rx - pan.x) / z, my = (ry - pan.y) / z;
  let hit = null, area = Infinity;
  cy.nodes().forEach(n => {
    if (n.hasClass("badge") || !n.visible()) return;
    const bb = n.boundingBox({ includeLabels: false, includeOverlays: false });
    const top = n.isParent() ? bb.y1 - 28 : bb.y1; // an open box's label sits just above it
    if (mx >= bb.x1 && mx <= bb.x2 && my >= top && my <= bb.y2 && bb.w * bb.h < area) { hit = n; area = bb.w * bb.h; }
  });
  return { node: hit, model: { x: mx, y: my } };
}
function startDrag(kind, ev, info) {
  ev.preventDefault(); ev.stopPropagation();
  const box = $("#cy").getBoundingClientRect();
  const line = $("#dl"), svg = $("#dragline");
  let fixed;
  if (kind === "connect") { const bb = cy.getElementById(info.id).renderedBoundingBox({ includeLabels: false }); fixed = { x: bb.x2, y: bb.y1 + Math.min(bb.h / 2, 40) }; }
  else { const e = cy.getElementById(info.edge); fixed = toRendered(kind === "rewire-source" ? e.targetEndpoint() : e.sourceEndpoint()); }
  dragging = { kind, info }; updateOverlays(); svg.removeAttribute("hidden");
  let over = null;
  const move = e => {
    const rx = e.clientX - box.left, ry = e.clientY - box.top;
    if (kind === "rewire-source") { line.setAttribute("x1", rx); line.setAttribute("y1", ry); line.setAttribute("x2", fixed.x); line.setAttribute("y2", fixed.y); }
    else { line.setAttribute("x1", fixed.x); line.setAttribute("y1", fixed.y); line.setAttribute("x2", rx); line.setAttribute("y2", ry); }
    const { node } = nodeAtRendered(rx, ry);
    const n = node && (kind !== "connect" || node.id() !== info.id) ? node : null;
    if (over && over !== n) over.removeClass("drop");
    over = n; if (over) over.addClass("drop");
  };
  const up = e => {
    window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("keydown", key, true);
    svg.setAttribute("hidden", ""); if (over) over.removeClass("drop"); dragging = null;
    if (e && e.type === "pointerup") {
      const rx = e.clientX - box.left, ry = e.clientY - box.top;
      const { node, model } = nodeAtRendered(rx, ry);
      const inside = rx >= 0 && ry >= 0 && rx <= box.width && ry <= box.height;
      const far = Math.hypot(rx - fixed.x, ry - fixed.y) > 30;
      if (kind === "connect") {
        const from = info.id;
        if (node && node.id() !== from && !(node.isParent() && far && containerAt(model.x, model.y) === node.id() && dropIsEmpty(node, model))) addFlow(from, node.id());
        else if (inside && far) {
          const c = containerAt(model.x, model.y);
          if (c) addFunctionAt(model.x + MAXW / 2 + PADX, model.y, c, from); else addExternalAt(model.x + MAXW / 2 + PADX, model.y, from);
        }
      } else if (node) {
        const e = cy.getElementById(info.edge), end = kind === "rewire-source" ? "source" : "target";
        const own = end === "source" ? e.source() : e.target();
        if (own.nonempty() && node.id() === own.id() && !e.hasClass("lifted")) setFlowEnd(info.edge, end, anchorOn(node, model)); // same box: where it attaches
        else rewire(info.edge, end, node.id());
      }
    }
    updateOverlays();
  };
  const key = e => { if (e.key === "Escape") { e.stopPropagation(); up(null); } };
  window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("keydown", key, true);
  move(ev);
}
/* dropping inside an open container, away from its label, makes a new subfunction there instead of a flow to the container */
function dropIsEmpty(node, p) { const bb = node.boundingBox({ includeLabels: false }); return p.y > bb.y1; }

/* moving boxes: a closed box carries everything it hides; the childless boundary carries every function */
function moveItem(id, dx, dy, abs) {
  if (apById(id)) return moveElement(id, abs);
  const V = curVar(), x = extById(id);
  if (x) { x.x = Math.round(abs.x); x.y = Math.round(abs.y); return; }
  const shift = ids => ids.forEach(d => { V.placed[d].x = Math.round(V.placed[d].x + dx); V.placed[d].y = Math.round(V.placed[d].y + dy); });
  if (id === V.root) return shift(Object.keys(V.placed));
  if (!V.placed[id]) return;
  const d = descendantsOf(id, V);
  if (d.length) shift([id, ...d]); else { V.placed[id].x = Math.round(abs.x); V.placed[id].y = Math.round(abs.y); }
}

/* ================= Auto-arrange (ELK, left to right) ================= */
let elk = null;
async function autoArrange() {
  if (VIEWER) return;
  if (view.mode === "system") return toast("Arrange the system map by hand: an element's ring is its level.");
  elk = elk || new ELK();
  const vis = cy.nodes().filter(n => !n.hasClass("badge") && n.visible());
  const elkNode = n => { const kids = n.children().filter(c => !c.hasClass("badge") && c.visible());
    return kids.length ? { id: n.id(), layoutOptions: { "elk.padding": n.hasClass("root") ? "[top=60,left=34,bottom=34,right=34]" : "[top=34,left=22,bottom=22,right=22]" }, children: kids.map(elkNode) }
      : { id: n.id(), width: n.data("w"), height: n.data("h") }; };
  mctx.font = `11px ${FONT_STACK}`; // flow labels need room too
  const edges = cy.edges().filter(e => e.visible()).map(e => ({ id: e.id(), sources: [e.data("source")], targets: [e.data("target")],
    labels: e.data("label") ? [{ text: e.data("label"), width: Math.ceil(mctx.measureText(e.data("label")).width) + 8, height: 16 }] : [] }));
  const graph = edgeList => ({ id: "__top", layoutOptions: { "elk.algorithm": "layered", "elk.direction": "RIGHT", "elk.hierarchyHandling": "INCLUDE_CHILDREN",
    "elk.spacing.nodeNode": "40", "elk.layered.spacing.nodeNodeBetweenLayers": "60", "elk.layered.spacing.edgeNodeBetweenLayers": "24", "elk.spacing.edgeNode": "24", "elk.spacing.edgeLabel": "4",
    "elk.edgeLabels.placement": "CENTER", "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF", "elk.layered.crossingMinimization.semiInteractive": "false" },
    children: vis.orphans().map(elkNode), edges: edgeList });
  let res;
  try { res = await elk.layout(graph(edges)); }
  catch (e) { // flows into an open container can trip ELK; arrange without them
    const leaf = new Set(vis.filter(n => !n.isParent()).map(n => n.id()));
    try { res = await elk.layout(graph(edges.filter(e => leaf.has(e.sources[0]) && leaf.has(e.targets[0])))); } catch (e2) { return toast("Auto-arrange failed: " + e2.message, 5000); }
  }
  const centres = new Map();
  const walk = (n, ox, oy) => { const x = ox + (n.x || 0), y = oy + (n.y || 0);
    if (n.children && n.children.length) n.children.forEach(c => walk(c, x, y)); else if (n.id !== "__top") centres.set(n.id, { x: x + n.width / 2, y: y + n.height / 2 }); };
  res.children.forEach(c => walk(c, 0, 0));
  let shaped = 0;
  await commit(() => {
    centres.forEach((p, id) => { const el = cy.getElementById(id); if (el.empty()) return; const o = el.position(); moveItem(id, p.x - o.x, p.y - o.y, p); });
    curVar().flows.forEach(l => { if (l.geo) { shaped++; delete l.geo; } }); // bends and label places were made for the old layout
  }, { fit: true });
  toast(`Arranged left to right${shaped ? `; ${shaped} hand-shaped flow${shaped === 1 ? "" : "s"} back to automatic` : ""}. Ctrl Z brings back your layout.`, 4500);
}
