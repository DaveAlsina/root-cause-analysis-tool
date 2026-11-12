/* ================= System map: model and geometry =================
   doc.system holds the system analysis that the function analysis builds on:
   levels   nested rings, outermost first (landscape ⊃ farm ⊃ field ⊃ pathogen); their size follows their order
   elements what the system is made of: a name in every language, a kind, needs (actors), notes and sources.
            An element appears on one or more levels: each appearance is a circle in a level's ring, at an angle `a`
            and a depth `t` across the ring (0 inner edge, 1 outer edge), so renaming, adding or reordering levels
            never moves it out of its level. An appearance dropped outside every ring has level null and plain x, y.
            Water in the landscape and water on the plant are one element with two appearances: the name is shared,
            while the group, the tags (the chain stage) and the boundaries it is inside belong to each appearance.
   groups   dotted outlines around appearances (a sub-system such as "asexual reproduction"); one group per appearance
   boundaries  named sets of appearances: the system boundary a function-analysis variant works in
   chain    when on, the tags of one tag group are drawn in their order as the chain of stages under the rings
   Functions act on appearances (Water · Plant), while externals and flows point at the element (Water). */

const KINDS = {
  actor: { name: "Actor", es: "Actor", hint: "a person or organisation, with needs" },
  organism: { name: "Organism", es: "Organismo", hint: "a living thing: plant, pathogen, beneficial" },
  object: { name: "Object", es: "Objeto", hint: "a thing or resource: fruit, machine, water" },
  factor: { name: "Condition", es: "Condición", hint: "a condition or driver: rain, heat, humidity, price" },
};
const KIND_COLORS = { // fill and stroke in light mode; dark mode uses the stroke over the panel colour
  actor: ["#FFF3DC", "#B7791F"], organism: ["#E6F4E1", "#3F8A3A"], object: ["#FFFFFF", "#6B7A74"], factor: ["#E3EEF9", "#3F73B0"],
};
const LEVEL_COLORS = [ // the four of Moreira et al. (2023), then more
  { fill: "#ECE7F6", stroke: "#8F7FC0" }, { fill: "#E2EDF8", stroke: "#7B9FCB" }, { fill: "#FBE9DA", stroke: "#D99A68" },
  { fill: "#E6F1E0", stroke: "#86B07A" }, { fill: "#F8F1D3", stroke: "#C5A43A" }, { fill: "#DFF1EF", stroke: "#5FA8A0" },
];
const DEFAULT_SYS_LEVELS = [["Landscape", "Paisaje"], ["Farm", "Finca"], ["Field", "Lote"], ["Pathogen", "Patógeno"]];
const RING = { innerRx: 240, innerRy: 150, stepRx: 170, stepRy: 104, shift: .45, elMaxW: 92 };

function defaultSystem(langs = ["en"]) {
  const es = langs[0] === "es";
  return { levels: DEFAULT_SYS_LEVELS.map(([en, s], i) => ({ id: uid("lv"), name: es ? s : en, nameTr: langs.includes(es ? "en" : "es") ? { [es ? "en" : "es"]: es ? en : s } : {}, ...LEVEL_COLORS[i] })),
    elements: [], groups: [], boundaries: [], chain: { on: false, group: null }, apart: [] };
}
const newAppearance = (place = {}) => ({ id: uid("p"), level: null, a: -Math.PI / 2, t: .5, x: 0, y: 0, group: null, tags: [], ...place });
function newElement(text, kind = "object", place) { return { id: uid("e"), text: text || "", textTr: {}, kind, needs: "", notes: "", sources: [], at: [newAppearance(place)] }; }

/* `remap` collects, for files from before appearances, which element id became which appearance id,
   so boundaries and "acts on" (now pointing at appearances) can follow */
function normalizeSystem(s, out, remap = new Map()) {
  const S = defaultSystem(out.languages);
  if (!s || typeof s !== "object") return S;
  const tagIds = new Set(out.tags.map(t => t.id));
  if (Array.isArray(s.levels)) S.levels = s.levels.filter(l => l && l.id).map((l, i) => ({ id: String(l.id), name: String(l.name ?? ""), nameTr: trObj(l.nameTr),
    fill: l.fill || LEVEL_COLORS[i % LEVEL_COLORS.length].fill, stroke: l.stroke || LEVEL_COLORS[i % LEVEL_COLORS.length].stroke }));
  const lv = new Set(S.levels.map(l => l.id));
  S.groups = (Array.isArray(s.groups) ? s.groups : []).filter(g => g && g.id).map(g => ({ id: String(g.id), text: String(g.text ?? ""), textTr: trObj(g.textTr), notes: String(g.notes || "") }));
  const gs = new Set(S.groups.map(g => g.id)), seen = new Set();
  const apOf = (p, id) => { let i = String(id); while (seen.has(i)) i = uid("p"); seen.add(i);
    return { id: i, level: lv.has(p.level) ? p.level : null, a: Number.isFinite(+p.a) ? +p.a : -Math.PI / 2, t: Number.isFinite(+p.t) ? Math.max(0, Math.min(1, +p.t)) : .5,
      x: Math.round(+p.x || 0), y: Math.round(+p.y || 0), group: gs.has(p.group) ? p.group : null, tags: Array.isArray(p.tags) ? [...new Set(p.tags.map(String))].filter(t => tagIds.has(t)) : [] }; };
  S.elements = (Array.isArray(s.elements) ? s.elements : []).filter(e => e && e.id).map(e => {
    let at = (Array.isArray(e.at) ? e.at : []).filter(p => p && p.id).map(p => apOf(p, p.id));
    if (!at.length) { const id = "p" + e.id; at = [apOf(e, id)]; remap.set(String(e.id), at[0].id); } // one level each, as before
    return { id: String(e.id), text: String(e.text ?? ""), textTr: trObj(e.textTr), kind: KINDS[e.kind] ? e.kind : "object",
      needs: String(e.needs || ""), notes: String(e.notes || ""), sources: Array.isArray(e.sources) ? e.sources.map(String) : [], at };
  });
  const aps = new Set(S.elements.flatMap(e => e.at.map(p => p.id)));
  S.boundaries = (Array.isArray(s.boundaries) ? s.boundaries : []).filter(b => b && b.id).map(b => ({ id: String(b.id), name: String(b.name ?? "Boundary"), nameTr: trObj(b.nameTr),
    note: String(b.note || ""), members: [...new Set((Array.isArray(b.members) ? b.members : []).map(id => remap.get(String(id)) || String(id)).filter(id => aps.has(id)))] }));
  const groupIds = new Set(out.tagGroups.map(g => g.id));
  S.chain = { on: !!(s.chain && s.chain.on), group: s.chain && groupIds.has(s.chain.group) ? s.chain.group : (out.tagGroups[0] || {}).id || null };
  S.apart = Array.isArray(s.apart) ? [...new Set(s.apart.map(String))] : [];
  return S;
}
/* a saved version from before appearances: the same migration, so restoring or comparing it works */
function migrateCore(c) {
  const S = c && c.system;
  if (!S || !Array.isArray(S.elements) || S.elements.every(e => Array.isArray(e.at) && e.at.length)) return c;
  const remap = new Map(), langs = Array.isArray(c.languages) && c.languages.length ? c.languages : ["en"];
  c.system = normalizeSystem(S, { languages: langs, tags: Array.isArray(c.tags) ? c.tags : [], tagGroups: Array.isArray(c.tagGroups) && c.tagGroups.length ? c.tagGroups : groupsFor(langs) }, remap);
  (c.functions || []).forEach(f => { if (Array.isArray(f.actsOn)) f.actsOn = f.actsOn.map(id => remap.get(id) || id); });
  return c;
}

/* ---- lookups ---- */
const elById = id => doc.system.elements.find(e => e.id === id);
const grpById = id => doc.system.groups.find(g => g.id === id);
const bndById = id => doc.system.boundaries.find(b => b.id === id);
const lvById = id => doc.system.levels.find(l => l.id === id);
const membersOf = id => { const b = bndById(id); return new Set(b ? b.members : []); };
const kindName = k => curLang() === "es" ? KINDS[k].es : KINDS[k].name;
function levelIndex(id) { return doc.system.levels.findIndex(l => l.id === id); }
function apById(id) { // an appearance and its element
  for (const el of doc.system.elements) { const ap = el.at.find(p => p.id === id); if (ap) return { el, ap }; }
  return null;
}
const elOf = id => elById(id) || (apById(id) || {}).el; // the element of an appearance (or an element id)
const allAps = () => doc.system.elements.flatMap(el => el.at.map(ap => ({ el, ap })));
const apIdsOf = id => { const e = elOf(id); return e ? e.at.map(p => p.id) : []; };
function apsInOrder(el) { // outermost level first, then round the ring; this order gives the numbers I, II, III
  const k = p => p.level ? levelIndex(p.level) : 1e3;
  return [...el.at].sort((p, q) => k(p) - k(q) || (p.a || 0) - (q.a || 0));
}
const apNumber = (el, id) => apsInOrder(el).findIndex(p => p.id === id) + 1;
function apLabel(id, always = false) { // "Water · Plant"; the level only when it is on more than one, unless asked
  const r = apById(id); if (!r) { const e = elById(id); return e ? tx(e) : "?"; }
  return (tx(r.el) || "(no text)") + (always || r.el.at.length > 1 ? " · " + levelName(r.ap.level) : "");
}
const tagHolderOf = id => { const r = apById(id); return r ? r.ap : findEditable(id); }; // tags sit on the appearance
const levelName = id => { const l = lvById(id); return l ? tx(l, "name") || "Level" : "Outside every level"; };

/* ---- ring geometry: outermost first; inner rings sit low, like Fig. 2 of Moreira et al. (2023) ---- */
function ringGeom() {
  const L = doc.system.levels, n = L.length;
  const rx = i => RING.innerRx + (n - 1 - i) * RING.stepRx, ry = i => RING.innerRy + (n - 1 - i) * RING.stepRy;
  const ry0 = n ? ry(0) : 0;
  return L.map((l, i) => ({ id: l.id, i, cx: 0, cy: (ry0 - ry(i)) * RING.shift, rx: rx(i), ry: ry(i) }));
}
const onEllipse = (g, a) => ({ x: g.cx + g.rx * Math.cos(a), y: g.cy + g.ry * Math.sin(a) });
const insideEllipse = (g, x, y) => ((x - g.cx) / g.rx) ** 2 + ((y - g.cy) / g.ry) ** 2 <= 1;
function ringSegment(G, i, a) { // the line across ring i at angle a, inner edge to outer edge
  const out = onEllipse(G[i], a), inn = G[i + 1] ? onEllipse(G[i + 1], a) : { x: G[i].cx, y: G[i].cy + G[i].ry * .15 };
  return [inn, out];
}
function elPos(ap, G = ringGeom()) { // where an appearance is drawn
  const i = ap.level ? G.findIndex(g => g.id === ap.level) : -1;
  if (i < 0) return { x: ap.x, y: ap.y };
  const [p, q] = ringSegment(G, i, ap.a);
  return { x: p.x + (q.x - p.x) * ap.t, y: p.y + (q.y - p.y) * ap.t };
}
function placeAt(x, y, G = ringGeom()) { // the level, angle and depth of a point
  let i = -1; for (let k = G.length - 1; k >= 0; k--) if (insideEllipse(G[k], x, y)) { i = k; break; }
  if (i < 0) return { level: null, x: Math.round(x), y: Math.round(y) };
  const fit = a => { const [p, q] = ringSegment(G, i, a); const dx = q.x - p.x, dy = q.y - p.y, L2 = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((x - p.x) * dx + (y - p.y) * dy) / L2)); return { u, d: Math.hypot(p.x + dx * u - x, p.y + dy * u - y) }; };
  let best = { a: 0, d: Infinity, u: .5 };
  for (let k = 0; k < 360; k++) { const a = (k / 180 - 1) * Math.PI, f = fit(a); if (f.d < best.d) best = { a, ...f }; }
  for (let k = -20; k <= 20; k++) { const a = best.a + k * Math.PI / 3600, f = fit(a); if (f.d < best.d) best = { a, ...f }; }
  const lo = G[i + 1] ? .07 : 0;
  return { level: G[i].id, a: best.a, t: Math.max(lo, Math.min(.93, best.u)), x: Math.round(x), y: Math.round(y) };
}
function elSize(e) { // a circle big enough for the text in every language
  const all = txAll(e); if (!all.length) all.push(" ");
  let d = 58;
  all.forEach(t => { const m = wrap(t, RING.elMaxW); d = Math.max(d, Math.ceil(Math.hypot(m.w, m.lines.length * (LINE - 1))) + 14); });
  return d;
}

/* ================= Boundary outline: a smooth contour around the members, kept away from non-members =================
   A field that is high near members and along the shortest tree joining them (so one boundary reads as one shape),
   pushed down near every other element, then cut at a threshold with marching squares. */
function boundaryContour(memberIds, ndata) {
  const mem = ndata.filter(n => memberIds.has(n.id)), non = ndata.filter(n => !memberIds.has(n.id));
  if (!mem.length) return "";
  const pad = 120, step = 9;
  const x0 = Math.min(...mem.map(n => n.x - n.r)) - pad, x1 = Math.max(...mem.map(n => n.x + n.r)) + pad;
  const y0 = Math.min(...mem.map(n => n.y - n.r)) - pad, y1 = Math.max(...mem.map(n => n.y + n.r)) + pad;
  const W = Math.ceil((x1 - x0) / step) + 1, H = Math.ceil((y1 - y0) / step) + 1;
  const near = non.filter(n => n.x + n.r + 40 > x0 && n.x - n.r - 40 < x1 && n.y + n.r + 40 > y0 && n.y - n.r - 40 < y1);
  const bump = x => x < 1 ? (1 - x * x) ** 2 : 0, T = .18;
  const tree = []; // minimum spanning tree over the members (Prim)
  if (mem.length > 1) { const inT = new Set([0]); while (inT.size < mem.length) { let best = null;
    inT.forEach(i => mem.forEach((n, j) => { if (inT.has(j)) return; const d = Math.hypot(n.x - mem[i].x, n.y - mem[i].y); if (!best || d < best.d) best = { i, j, d }; }));
    inT.add(best.j); tree.push([mem[best.i], mem[best.j]]); } }
  const segDist = (x, y, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / L2)); return Math.hypot(a.x + dx * u - x, a.y + dy * u - y); };
  const F = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = x0 + i * step, y = y0 + j * step; let f = 0;
    for (const n of mem) f += bump(Math.hypot(x - n.x, y - n.y) / (n.r + 70));
    for (const [a, b] of tree) f += .75 * bump(segDist(x, y, a, b) / 44);
    for (const n of near) f -= 1.6 * bump(Math.hypot(x - n.x, y - n.y) / (n.r + 22));
    F[j * W + i] = f - T;
  }
  const segs = [], P = (i, j) => [x0 + i * step, y0 + j * step];
  const lerp = (a, b, fa, fb) => { const t = fa / (fa - fb); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
    const f = [F[j * W + i], F[j * W + i + 1], F[(j + 1) * W + i + 1], F[(j + 1) * W + i]];
    const c = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
    const code = (f[0] > 0 ? 8 : 0) | (f[1] > 0 ? 4 : 0) | (f[2] > 0 ? 2 : 0) | (f[3] > 0 ? 1 : 0);
    if (code === 0 || code === 15) continue;
    const e = k => lerp(c[k], c[(k + 1) % 4], f[k], f[(k + 1) % 4]); // edge k between corner k and k+1
    const T2 = { 1: [[2, 3]], 2: [[1, 2]], 3: [[1, 3]], 4: [[0, 1]], 5: [[0, 3], [1, 2]], 6: [[0, 2]], 7: [[0, 3]], 8: [[0, 3]], 9: [[0, 2]], 10: [[0, 1], [2, 3]], 11: [[0, 1]], 12: [[1, 3]], 13: [[1, 2]], 14: [[2, 3]] };
    T2[code].forEach(([a, b]) => segs.push([e(a), e(b)]));
  }
  // join the little segments into closed loops
  const key = p => `${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`;
  const ends = new Map(); segs.forEach((s, k) => [0, 1].forEach(w => { const kk = key(s[w]); if (!ends.has(kk)) ends.set(kk, []); ends.get(kk).push(k); }));
  const used = new Uint8Array(segs.length), loops = [];
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue; used[k] = 1;
    const loop = [segs[k][0], segs[k][1]];
    for (let guard = 0; guard < segs.length; guard++) {
      const last = loop[loop.length - 1], cand = (ends.get(key(last)) || []).find(m => !used[m]);
      if (cand == null) break;
      used[cand] = 1; const s = segs[cand]; loop.push(key(s[0]) === key(last) ? s[1] : s[0]);
    }
    if (loop.length > 4) loops.push(loop);
  }
  const smooth = pts => { let p = pts; for (let r = 0; r < 2; r++) { const q = []; for (let k = 0; k < p.length; k++) { const a = p[k], b = p[(k + 1) % p.length];
    q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } p = q; } return p; };
  return loops.map(l => { const s = smooth(l); return "M" + s.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L") + "Z"; }).join(" ");
}

/* ================= System map: drawing ================= */
let sysFocus = null, sysEditing = false; // the boundary in focus, and whether clicks change its members
let sysContour = { path: "", label: null };
function kindColors(k) { const [fill, stroke] = KIND_COLORS[k] || KIND_COLORS.object; return isDark() ? { fill: css("--panel-2"), stroke } : { fill, stroke }; }
async function renderSystem(opts = {}) {
  const S = doc.system, G = ringGeom(), dark = isDark();
  const els = [];
  G.forEach((g, i) => {
    const l = S.levels[i];
    els.push({ group: "nodes", data: { id: "ring:" + l.id, w: g.rx * 2, h: g.ry * 2, fill: dark ? l.stroke : l.fill, stroke: l.stroke }, position: { x: g.cx, y: g.cy }, classes: "ring" + (dark ? " dark" : "") });
    els.push({ group: "nodes", data: { id: "lvl:" + l.id, label: tx(l, "name") || "Level " + (i + 1) }, position: { x: g.cx, y: g.cy - g.ry + 17 }, classes: "ringlabel" });
  });
  S.groups.forEach(gp => els.push({ group: "nodes", data: { id: gp.id, label: tx(gp) || "Group", fs: doc.languages.length > 1 && txMissing(gp) ? "italic" : "normal" }, classes: "grp" }));
  const used = new Set(allAps().map(x => x.ap.group).filter(Boolean));
  S.elements.forEach(e => {
    const d = elSize(e), c = kindColors(e.kind), label = wrap(tx(e) || " ", RING.elMaxW).lines.join("\n"), many = e.at.length > 1;
    e.at.forEach(ap => els.push({ group: "nodes", data: { id: ap.id, el: e.id, parent: ap.group && used.has(ap.group) ? ap.group : undefined, label, w: d, h: d,
      fill: c.fill, stroke: c.stroke, font: css("--ink"), fs: doc.languages.length > 1 && txMissing(e) ? "italic" : "normal", bw: e.kind === "actor" ? 2.2 : 1.3 },
      position: elPos(ap, G), classes: "elem k-" + e.kind + (many ? " many" : "") }));
  });
  if (S.chain.on) chainNodes(G).forEach(x => els.push(x));
  cy.batch(() => { cy.elements().remove(); cy.add(els); });
  cy.nodes(".ring, .ringlabel, .stage, .chainlbl").ungrabify();
  const chips = [];
  mctx.font = `600 10px ${FONT_STACK}`;
  S.elements.forEach(e => e.at.forEach(ap => { const el = cy.getElementById(ap.id); if (el.empty()) return;
    const bb = el.boundingBox({ includeLabels: false }), ch = chipFor(ap);
    if (ch) chips.push({ group: "nodes", data: { id: "t:" + ap.id, label: ch.label, w: ch.w }, classes: "badge", position: { x: bb.x1 + ch.w / 2 + 2, y: bb.y1 + 4 } });
    if (e.at.length > 1) { // the same element on several levels: a numeral on each of its circles, I outermost
      const label = roman(apNumber(e, ap.id)), w = Math.max(20, Math.ceil(mctx.measureText(label).width) + 12);
      chips.push({ group: "nodes", data: { id: "n:" + ap.id, label, w }, classes: "badge apb", position: { x: bb.x2 - w / 2 + 2, y: bb.y1 + 6 } });
    }
  }));
  if (chips.length) cy.add(chips);
  cy.nodes(".badge").ungrabify();
  lastRender = { sys: true };
  if (sysFocus && !bndById(sysFocus)) { sysFocus = null; sysEditing = false; }
  applyFocus();
  updateChrome(); renderLegend(); renderTagbar(); syncControls();
  if (!opts.skipPanel) renderPanel();
  applySelection(); applyTagFilter(); doSearch(false); updateOverlays();
  if (opts.fit) fitView();
}
function chainNodes(G) { // the stages of the chain, in tag order, as a row of chips under the rings
  const S = doc.system, tags = doc.tags.filter(t => t.group === S.chain.group); if (!tags.length) return [];
  const g0 = G[0] || { cx: 0, cy: 0, rx: 400, ry: 200 };
  const y = g0.cy + g0.ry + 74;
  mctx.font = `500 12px ${FONT_STACK}`;
  const items = tags.map(t => { const n = allAps().filter(x => x.ap.tags.includes(t.id)).length; const label = `${t.emoji} ${tx(t, "name")}${n ? `  ${n}` : ""}`;
    return { t, label, w: Math.ceil(mctx.measureText(label).width) + 30 }; });
  const gap = 34, total = items.reduce((a, b) => a + b.w, 0) + gap * (items.length - 1);
  let x = g0.cx - total / 2; const out = [];
  const grp = doc.tagGroups.find(g => g.id === S.chain.group);
  out.push({ group: "nodes", data: { id: "chain:label", label: `Chain of stages · ${grp ? tx(grp, "name") : ""}` }, position: { x: g0.cx, y: y - 32 }, classes: "chainlbl" });
  items.forEach((it, k) => {
    out.push({ group: "nodes", data: { id: "stage:" + it.t.id, tag: it.t.id, label: it.label, w: it.w }, position: { x: x + it.w / 2, y }, classes: "stage" });
    if (k) out.push({ group: "edges", data: { id: "chain:" + k, source: "stage:" + items[k - 1].t.id, target: "stage:" + it.t.id }, classes: "chainedge" });
    x += it.w + gap;
  });
  return out;
}
function sysStyles(ink, ground, muted, dark) {
  return [
    { selector: "node.ring", style: { shape: "ellipse", width: "data(w)", height: "data(h)", "background-color": "data(fill)", "background-opacity": dark ? .1 : 1,
      "border-color": "data(stroke)", "border-width": 1.2, "border-opacity": .8, label: "", events: "no", "z-index": 0, "z-compound-depth": "bottom" } },
    { selector: "node.ringlabel", style: { shape: "rectangle", width: 10, height: 10, "background-opacity": 0, "border-width": 0, label: "data(label)", color: ink,
      "font-family": FONT_STACK, "font-size": 13, "font-weight": 600, "text-valign": "center", "text-halign": "center", "z-index": 1, "z-compound-depth": "bottom" } },
    { selector: "node.elem", style: { shape: "ellipse", "underlay-shape": "ellipse", "corner-radius": 0, "text-max-width": 200, "font-size": FONT_PX - 1, "line-height": (LINE - 1) / (FONT_PX - 1), "z-index": 10 } },
    { selector: "node.grp", style: { shape: "round-rectangle", "corner-radius": 60, "background-opacity": 0, "border-style": "dotted", "border-width": 1.6, "border-color": ink,
      label: "data(label)", "font-style": "data(fs)", color: ink, "font-family": FONT_STACK, "font-size": 12, "text-valign": "top", "text-halign": "center", "text-margin-y": 20,
      padding: 26, "z-index": 5, "text-background-opacity": 0 } },
    { selector: "node.stage", style: { shape: "round-rectangle", "corner-radius": 14, width: "data(w)", height: 30, "background-color": ground, "border-color": muted, "border-width": 1,
      label: "data(label)", color: ink, "font-family": FONT_STACK, "font-size": 12, "font-weight": 500, "font-style": "normal", "text-valign": "center", "text-halign": "center" } },
    { selector: "node.stage.on", style: { "background-color": dark ? "#4A2116" : "#FFE2D6", "border-color": "#FF6A3D", "border-width": 1.6 } },
    { selector: "node.chainlbl", style: { shape: "rectangle", width: 10, height: 10, "background-opacity": 0, "border-width": 0, label: "data(label)", color: muted,
      "font-family": FONT_STACK, "font-size": 11, "font-weight": 600, "text-transform": "uppercase", "text-valign": "center", "text-halign": "center", events: "no" } },
    { selector: "edge.chainedge", style: { width: 1.6, "line-color": muted, "target-arrow-color": muted, "target-arrow-shape": "triangle", "arrow-scale": 1, "curve-style": "straight", label: "", events: "no" } },
    { selector: "node.member", style: { "border-width": 2.6 } },
    { selector: "node.apb", style: { shape: "round-rectangle", "corner-radius": 9, height: 18, "background-color": dark ? "#4A3A12" : "#FFF4D6", "border-color": "#C5A43A",
      "font-family": FONT_STACK, "font-size": 10, "font-weight": 600, color: ink } },
    { selector: "node.elem.sib", style: { "underlay-color": "#E0A100", "underlay-opacity": .45, "underlay-padding": 7 } },
  ];
}

/* focus on a boundary: everything else fades, and a dashed outline goes around the members */
function applyFocus() {
  const g = $("#sysover-g"); if (!g) return;
  cy.nodes(".elem, .grp, .badge").removeClass("faded member");
  sysContour = { path: "", label: null };
  if (view.mode !== "system" || !sysFocus) { g.innerHTML = ""; $("#sysbar").hidden = true; return; }
  const m = membersOf(sysFocus);
  cy.nodes(".elem").forEach(n => { if (m.has(n.id())) n.addClass("member"); else { n.addClass("faded"); cy.getElementById("t:" + n.id()).addClass("faded"); cy.getElementById("n:" + n.id()).addClass("faded"); } });
  cy.nodes(".grp").forEach(n => { if (!n.children().some(c => m.has(c.id()))) n.addClass("faded"); });
  const nd = cy.nodes(".elem").map(n => ({ id: n.id(), x: n.position("x"), y: n.position("y"), r: n.width() / 2 }));
  const path = boundaryContour(m, nd);
  const top = nd.filter(n => m.has(n.id)).sort((a, b) => (a.y - a.r) - (b.y - b.r))[0];
  sysContour = { path, label: top ? { x: top.x, y: top.y - top.r - 52, text: tx(bndById(sysFocus), "name") } : null };
  drawContour();
  const b = bndById(sysFocus), bar = $("#sysbar"); bar.hidden = false;
  bar.innerHTML = sysEditing
    ? `<span><b>Editing “${esc(tx(b, "name"))}”</b>: click elements, a group or a level name to include or exclude them · ${m.size} inside</span><button class="btn small primary" id="sb-done">Done</button>`
    : `<span>Boundary <b>“${esc(tx(b, "name"))}”</b> · ${insideCount(b)}</span><button class="btn small" id="sb-edit">Edit members</button><button class="btn small" id="sb-clear">Show all</button>`;
  $("#sb-done") && ($("#sb-done").onclick = () => { sysEditing = false; applyFocus(); renderPanel(); });
  $("#sb-edit") && ($("#sb-edit").onclick = () => { sysEditing = true; applyFocus(); });
  $("#sb-clear") && ($("#sb-clear").onclick = () => focusBoundary(null));
}
function drawContour() {
  const g = $("#sysover-g"); if (!g) return;
  const c = sysContour;
  g.innerHTML = c.path ? `<path d="${c.path}" class="bnd-path" vector-effect="non-scaling-stroke"/>` +
    (c.label ? `<text x="${c.label.x}" y="${c.label.y}" class="bnd-label">${esc(c.label.text)}</text>` : "") : "";
  syncContour();
}
function syncContour() { // follow pan and zoom; the label keeps its size on screen
  const g = $("#sysover-g"); if (!g) return;
  const z = cy.zoom(), p = cy.pan();
  g.setAttribute("transform", `translate(${p.x},${p.y}) scale(${z})`);
  const t = g.querySelector("text"); if (t) t.style.fontSize = (13 / Math.max(z, .2)).toFixed(1) + "px";
}
function insideCount(b) { // "5 elements inside" or, when some are on several levels, "5 appearances of 4 elements inside"
  const n = b.members.length, e = new Set(b.members.map(id => (apById(id) || {}).el).filter(Boolean)).size;
  return n === e ? `${n} element${n === 1 ? "" : "s"} inside` : `${n} appearances of ${e} element${e === 1 ? "" : "s"} inside`;
}
function focusBoundary(id, edit = false) {
  sysFocus = id && bndById(id) ? id : null; sysEditing = !!(sysFocus && edit);
  applyFocus(); renderPanel();
}
function toggleMembers(ids) {
  const b = bndById(sysFocus); if (!b || !ids.length) return;
  const m = new Set(b.members), allIn = ids.every(id => m.has(id));
  commit(() => { const bb = bndById(sysFocus); const s = new Set(bb.members); ids.forEach(id => allIn ? s.delete(id) : s.add(id)); bb.members = allAps().map(x => x.ap.id).filter(id => s.has(id)); }, { skipPanel: false });
}

/* ================= System map: editing ================= */
async function addElementAt(x, y, kind = "object") {
  if (VIEWER) return;
  const q = placeAt(x, y), e = newElement("", kind, q);
  await commit(() => { doc.system.elements.push(e); if (sysFocus && sysEditing) bndById(sysFocus).members.push(e.at[0].id); });
  const id = e.at[0].id; selId = id; selFlow = null; multi = [id]; applySelection(); renderPanel();
  inlineEdit(id, true);
}
function moveElement(id, p) { const r = apById(id); if (r) Object.assign(r.ap, placeAt(p.x, p.y)); }
function freeAngle(levelId, near, skip) { // an angle on a level's ring where a new circle has room, close to `near`
  const G = ringGeom(), others = allAps().filter(x => x.ap.id !== skip).map(x => elPos(x.ap, G));
  const cands = Array.from({ length: 72 }, (_, k) => near + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 36);
  let best = { a: near, d: -1 };
  for (const a of cands) { const p = elPos({ level: levelId, a, t: .5 }, G), d = Math.min(Infinity, ...others.map(o => Math.hypot(o.x - p.x, o.y - p.y)));
    if (d > 95) return a; if (d > best.d) best = { a, d }; }
  return best.a;
}
/* the same element on one more level: a new circle there, with the tags of the appearance it came from */
async function addAppearance(fromId, levelId) {
  const r = apById(fromId) || (elById(fromId) && { el: elById(fromId), ap: elById(fromId).at[0] }); if (!r || !lvById(levelId)) return;
  const ap = newAppearance({ level: levelId, a: 0, t: .5, tags: [...r.ap.tags] });
  ap.a = freeAngle(levelId, r.ap.level ? r.ap.a : -Math.PI / 2);
  await commit(() => { elById(r.el.id).at.push(ap); if (sysFocus && sysEditing) bndById(sysFocus).members.push(ap.id); });
  toast(`“${tx(r.el)}” now also appears in ${levelName(levelId)}. Its name is shared; tags and boundaries are per level.`, 4500);
  return goTo(ap.id);
}
/* one appearance becomes an element of its own, with a copy of the name, kind, needs, notes and sources */
async function splitAppearance(id) {
  const r = apById(id); if (!r) return;
  if (r.el.at.length < 2) return toast("This element is on one level only: there is nothing to split off.");
  const ne = { ...clone(r.el), id: uid("e"), at: [] };
  await commit(() => { const el = elById(r.el.id), i = el.at.findIndex(p => p.id === id); ne.at = el.at.splice(i, 1); doc.system.elements.splice(doc.system.elements.indexOf(el) + 1, 0, ne); });
  toast(`Split: the circle in ${levelName(r.ap.level)} is now its own element. Rename it to tell them apart; Ctrl Z to undo.`, 4500);
  selId = id; multi = [id]; applySelection(); renderPanel();
}
/* several elements that are the same thing become one, named after `keepId`; every appearance, boundary, tag and
   "acts on" stays where it was, and externals and flows that pointed at the others now point at the one kept */
async function mergeElements(keepId, ids) {
  const keep = elById(keepId) || elOf(keepId), others = [...new Set(ids.map(elOf).filter(Boolean))].filter(e => e !== keep);
  if (!keep || !others.length) return;
  const K = keep.id, gone = new Set(others.map(e => e.id));
  await commit(() => {
    const k = elById(K), os = doc.system.elements.filter(e => gone.has(e.id));
    os.forEach(o => {
      if (!k.text.trim()) k.text = o.text;
      Object.entries(o.textTr || {}).forEach(([l, v]) => { if (v && !(k.textTr[l] || "").trim()) k.textTr[l] = v; });
      const join = (a, b, sep) => [a, b].map(x => (x || "").trim()).filter(Boolean).filter((x, i, A) => A.indexOf(x) === i).join(sep);
      k.needs = join(k.needs, o.needs, "\n"); k.notes = join(k.notes, o.notes, "\n\n");
      k.sources = [...new Set([...k.sources, ...o.sources])];
      k.at.push(...o.at);
    });
    doc.system.elements = doc.system.elements.filter(e => !gone.has(e.id));
    doc.variants.forEach(V => { V.externals.forEach(x => { if (gone.has(x.ref)) x.ref = K; }); V.flows.forEach(l => { if (gone.has(l.element)) l.element = K; }); });
  });
  const n = elById(K).at.length;
  toast(`Merged into “${tx(elById(K))}”, now with ${n} appearance${n === 1 ? "" : "s"}. Boundaries, tags and “acts on” stay with each one; Ctrl Z to undo.`, 4500);
  const first = elById(K).at[0].id; selId = first; multi = [first]; applySelection(); renderPanel();
}
const foldName = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
/* elements with the same name in any language: likely the same thing on several levels */
function sameNameSets() {
  const E = doc.system.elements, by = new Map(), parent = new Map(E.map(e => [e.id, e.id]));
  const find = x => parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x));
  E.forEach(e => new Set(txAll(e).map(foldName).filter(Boolean)).forEach(n => { if (by.has(n)) parent.set(find(e.id), find(by.get(n))); else by.set(n, e.id); }));
  const sets = new Map(); E.forEach(e => { const r = find(e.id); if (!sets.has(r)) sets.set(r, []); sets.get(r).push(e.id); });
  const apart = new Set(doc.system.apart || []);
  return [...sets.values()].filter(s => s.length > 1 && !apart.has([...s].sort().join("|")));
}
function groupSelection() {
  const ids = (multi.length ? multi : selId ? [selId] : []).filter(id => apById(id)); if (!ids.length) return toast("Select elements first: Shift-click to select several.");
  const gp = { id: uid("g"), text: "", textTr: {}, notes: "" };
  commit(() => { doc.system.groups.push(gp); ids.forEach(id => { apById(id).ap.group = gp.id; }); pruneGroups(); }).then(() => { selId = gp.id; multi = [gp.id]; applySelection(); renderPanel(); inlineEdit(gp.id, true); });
}
function ungroup(gid) { commit(() => { allAps().forEach(({ ap }) => { if (ap.group === gid) ap.group = null; }); doc.system.groups = doc.system.groups.filter(g => g.id !== gid); }); }
function pruneGroups() { const used = new Set(allAps().map(x => x.ap.group)); doc.system.groups = doc.system.groups.filter(g => used.has(g.id)); }
/* ids are appearances (or groups): an appearance of an element on several levels goes alone; the last one takes the element */
function deleteElements(ids, everywhere = false) {
  let set = new Set(ids); if (!set.size) return;
  if (everywhere) set = new Set([...set].flatMap(id => apById(id) ? apIdsOf(id) : [id]));
  let whole = 0, single = 0;
  commit(() => {
    const goneEl = new Set();
    doc.system.elements.forEach(e => { const n = e.at.length; e.at = e.at.filter(p => !set.has(p.id)); if (!e.at.length) { goneEl.add(e.id); whole++; } else if (e.at.length < n) single += n - e.at.length; });
    doc.system.elements = doc.system.elements.filter(e => !goneEl.has(e.id));
    doc.system.groups = doc.system.groups.filter(g => !set.has(g.id));
    allAps().forEach(({ ap }) => { if (set.has(ap.group)) ap.group = null; });
    pruneGroups();
    doc.system.boundaries.forEach(b => { b.members = b.members.filter(id => !set.has(id)); });
    doc.functions.forEach(f => { f.actsOn = (f.actsOn || []).filter(id => !set.has(id)); });
    doc.variants.forEach(V => { V.externals.forEach(x => { if (goneEl.has(x.ref)) delete x.ref; }); V.flows.forEach(l => { if (goneEl.has(l.element)) l.element = null; }); });
  });
  toast(single && !whole ? `Removed from ${single === 1 ? "that level" : single + " levels"}; the element stays on its other levels. Ctrl Z to undo.`
    : "Deleted. Functions, flows and externals that pointed at it keep their own text; Ctrl Z to undo.", 4500);
}
function newBoundary(fromIds) {
  const n = doc.system.boundaries.length;
  const b = { id: uid("b"), name: `Boundary ${String.fromCharCode(65 + (n % 26))}`, nameTr: {}, note: "", members: fromIds || [] };
  commit(() => doc.system.boundaries.push(b)).then(() => focusBoundary(b.id, true));
}
/* where functions act on some appearances: [{v, f, ap}] */
function actedOnBy(apIds) {
  const want = new Set(Array.isArray(apIds) ? apIds : [apIds]), out = [];
  doc.functions.forEach(f => (f.actsOn || []).filter(id => want.has(id)).forEach(ap => { const vs = usedIn(f.id); (vs.length ? vs : [null]).forEach(v => out.push({ v, f, ap })); }));
  return out;
}
