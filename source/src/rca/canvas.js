/* ================= Graph analysis ================= */
function analyze(d = doc) {
  const ids = d.nodes.map(n => n.id);
  const out = new Map(ids.map(i => [i, []])), inn = new Map(ids.map(i => [i, []]));
  d.edges.forEach(e => { if (out.has(e.source) && out.has(e.target)) { out.get(e.source).push(e.target); inn.get(e.target).push(e.source); } });
  const roots = ids.filter(i => inn.get(i).length === 0);
  const depth = new Map(); const q = [];
  roots.forEach(r => { depth.set(r, 1); q.push(r); });
  while (q.length) { const u = q.shift(); for (const v of out.get(u)) if (!depth.has(v)) { depth.set(v, depth.get(u) + 1); q.push(v); } }
  // Tarjan's strongly connected components -> boxes caught in loops
  let index = 0; const st = [], on = new Set(), idx = new Map(), low = new Map(), cyc = new Set();
  const strong = v => {
    idx.set(v, index); low.set(v, index); index++; st.push(v); on.add(v);
    for (const w of out.get(v)) {
      if (!idx.has(w)) { strong(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (on.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
    }
    if (low.get(v) === idx.get(v)) {
      const comp = []; let w;
      do { w = st.pop(); on.delete(w); comp.push(w); } while (w !== v);
      if (comp.length > 1) comp.forEach(c => cyc.add(c));
    }
  };
  ids.forEach(v => { if (!idx.has(v)) strong(v); });
  // number of distinct chains from the top problem(s) to each box (Kahn order)
  const indeg = new Map(ids.map(i => [i, inn.get(i).length])); const paths = new Map(); const kq = roots.slice();
  roots.forEach(r => paths.set(r, 1));
  while (kq.length) { const u = kq.shift(); for (const v of out.get(u)) { paths.set(v, (paths.get(v) || 0) + paths.get(u)); indeg.set(v, indeg.get(v) - 1); if (indeg.get(v) === 0) kq.push(v); } }
  return { ids, out, inn, roots, depth, cyc, paths };
}
function keyChecks(A) { // boxes whose colour says something the arrows contradict
  const out = [];
  doc.nodes.forEach(n => {
    const role = catById(n.cat).role, kids = A.out.get(n.id).length;
    if (role === "intermediate" && kids === 0) out.push({ id: n.id, kind: "open", msg: "Marked as an intermediate cause but nothing explains it yet" });
    if (role === "root" && kids > 0) out.push({ id: n.id, kind: "deeper", msg: `Marked as a root cause but it has ${kids} deeper cause${kids > 1 ? "s" : ""}` });
  });
  return out;
}
function bfs(starts, out, stop) {
  const s = new Set(starts); const q = [...starts];
  while (q.length) { const u = q.shift(); if (stop(u)) continue; for (const v of out.get(u) || []) if (!s.has(v)) { s.add(v); q.push(v); } }
  return s;
}
function reaches(from, to) { const A = analyze(); return bfs([from], A.out, () => false).has(to); }
function redundantEdges(ids, edges) { // transitive reduction: arrows implied by a longer path
  const out = new Map([...ids].map(i => [i, []])); edges.forEach(e => out.get(e.source).push(e));
  const red = new Set();
  for (const e of edges) {
    const seen = new Set([e.source]); const stack = out.get(e.source).filter(x => x !== e).map(x => x.target); let found = false;
    while (stack.length) { const u = stack.pop(); if (u === e.target) { found = true; break; } if (seen.has(u)) continue; seen.add(u); out.get(u).forEach(x => stack.push(x.target)); }
    if (found) red.add(e.id);
  }
  return red;
}
function chainTo(id) {
  const A = analyze(); const prev = new Map(); const seen = new Set(A.roots); const q = [...A.roots];
  while (q.length) { const u = q.shift(); if (u === id) break; for (const v of A.out.get(u)) if (!seen.has(v)) { seen.add(v); prev.set(v, u); q.push(v); } }
  const c = [id]; let x = id; while (prev.has(x)) { x = prev.get(x); c.unshift(x); } return c;
}

/* ================= View state ================= */
const view = Object.assign({}, DEFAULT_VIEW, { folded: new Set(), hiddenCats: new Set(), tagFilter: new Set(), diff: null });
const pins = new Map(); // ref -> {x,y} in Untangle coordinates, for boxes without arrows
try { Object.assign(view, JSON.parse(lsGet(LS_VIEW) || "{}")); } catch (e) {}
view.folded = new Set(); view.hiddenCats = new Set(); view.tagFilter = new Set(); view.diff = null;
let GRADING = false; // interview grading: the diagram is locked, boxes get scores
const LS_VPREF = "uchuva-rca:viewer";
function saveViewerPref() { if (VIEWER) lsSet(LS_VPREF, JSON.stringify({ lang: view.lang, tagChips: view.tagChips, gates: view.gates, kinds: view.kinds })); }
function saveView() { if (VIEWER) return; const { folded, hiddenCats, tagFilter, diff, ...rest } = view; lsSet(LS_VIEW, JSON.stringify(rest)); }

let selRef = null, selCopy = null, selEdge = null, multi = [];
let lastRender = null, manualCrossings = 0, lastTries = 1;

/* ================= Branches: the dominator tree =================
   Box B belongs to branch A when every chain from the top problem to B passes through A.
   A cause shared by two branches belongs to the nearest box that both branches go through. */
function dominatorTree(A) {
  const R = "__root";
  const starts = [...A.roots]; let reach = bfs(starts, A.out, () => false);
  for (const id of A.ids) if (!reach.has(id)) { starts.push(id); reach = bfs(starts, A.out, () => false); }
  const startSet = new Set(starts);
  const succ = u => (u === R ? starts : A.out.get(u));
  const preds = v => { const p = A.inn.get(v).slice(); if (startSet.has(v)) p.push(R); return p; };
  const order = [], seen = new Set([R]), stack = [[R, 0]];
  while (stack.length) {
    const top = stack[stack.length - 1], ch = succ(top[0]);
    if (top[1] < ch.length) { const v = ch[top[1]++]; if (!seen.has(v)) { seen.add(v); stack.push([v, 0]); } }
    else { order.push(top[0]); stack.pop(); }
  }
  const po = new Map(order.map((v, i) => [v, i])), rpo = order.slice().reverse();
  const idom = new Map([[R, R]]);
  const meet = (a, b) => { while (a !== b) { while (po.get(a) < po.get(b)) a = idom.get(a); while (po.get(b) < po.get(a)) b = idom.get(b); } return a; };
  for (let changed = true; changed;) {
    changed = false;
    for (const v of rpo) {
      if (v === R) continue;
      const ps = preds(v).filter(x => idom.has(x)); if (!ps.length) continue;
      let nd = ps[0]; for (const x of ps.slice(1)) nd = meet(x, nd);
      if (idom.get(v) !== nd) { idom.set(v, nd); changed = true; }
    }
  }
  const kids = new Map(); idom.forEach((d, v) => { if (v === R) return; if (!kids.has(d)) kids.set(d, []); kids.get(d).push(v); });
  const trunk = []; let end = R;
  while ((kids.get(end) || []).length === 1) { end = kids.get(end)[0]; trunk.push(end); }
  const subCache = new Map();
  const sub = id => {
    if (subCache.has(id)) return subCache.get(id);
    const s = new Set([id]), q = [id];
    while (q.length) { const u = q.pop(); (kids.get(u) || []).forEach(c => { if (!s.has(c)) { s.add(c); q.push(c); } }); }
    subCache.set(id, s); return s;
  };
  const ancestors = id => { const a = []; let x = idom.get(id); while (x && x !== R) { a.push(x); x = idom.get(x); } return a; };
  const yOf = new Map(doc.nodes.map(n => [n.id, n.y]));
  const top = (kids.get(end) || []).slice().sort((a, b) => (yOf.get(a) || 0) - (yOf.get(b) || 0));
  const shared = id => A.inn.get(id).length > 1; // reached from more than one box above it
  return { R, idom, kids, trunk, end, top, sub, ancestors, shared };
}
function branchOf(D, id) { // the top-level branch a box belongs to (null for the trunk)
  if (!D.idom.has(id) || D.trunk.includes(id)) return null;
  let x = id; while (x && D.idom.get(x) !== D.end && D.idom.get(x) !== D.R) x = D.idom.get(x);
  return D.top.includes(x) ? x : null;
}
const short = (s, n = 46) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function computeView(A, D) {
  const reachAll = bfs(A.roots, A.out, () => false);
  const vis = bfs(A.roots, A.out, u => view.folded.has(u));
  A.ids.forEach(id => { if (!reachAll.has(id)) vis.add(id); });
  if (view.branch && D && D.idom.has(view.branch)) { // one branch plus the boxes above it that lead there
    const keep = new Set(D.sub(view.branch));
    if (view.mode === "untangle") D.ancestors(view.branch).forEach(a => keep.add(a)); // in My layout those boxes sit far away
    for (const id of [...vis]) if (!keep.has(id)) vis.delete(id);
  }
  const catOf = new Map(doc.nodes.map(n => [n.id, n.cat]));
  for (const id of [...vis]) if (view.hiddenCats.has(catOf.get(id))) vis.delete(id);
  let focusActive = false;
  if (view.focusR > 0 && selRef && vis.has(selRef)) {
    focusActive = true;
    const f = new Set([selRef]); let fr = [selRef];
    for (let k = 0; k < view.focusR; k++) {
      const nx = [];
      fr.forEach(u => [...A.out.get(u), ...A.inn.get(u)].forEach(v => { if (vis.has(v) && !f.has(v)) { f.add(v); nx.push(v); } }));
      fr = nx;
    }
    for (const id of [...vis]) if (!f.has(id)) vis.delete(id);
  }
  let edges = doc.edges.filter(e => vis.has(e.source) && vis.has(e.target));
  const redundant = redundantEdges(vis, edges);
  if (view.redundant === "hide") edges = edges.filter(e => !redundant.has(e.id));
  const hiddenBelow = new Map();
  view.folded.forEach(id => { if (vis.has(id)) hiddenBelow.set(id, [...bfs([id], A.out, () => false)].filter(x => x !== id && !vis.has(x)).length); });
  return { vis, edges, redundant, focusActive, hiddenBelow };
}

/* Split shared causes: unfold the graph into a tree of copies */
function unfold(vis, edges, repeat) {
  const out = new Map([...vis].map(id => [id, []])); edges.forEach(e => out.get(e.source).push(e));
  const indeg = new Map([...vis].map(id => [id, 0])); edges.forEach(e => indeg.set(e.target, indeg.get(e.target) + 1));
  const roots = [...vis].filter(id => indeg.get(id) === 0);
  const copies = [], cedges = [], count = new Map();
  const mk = (ref, kind) => { const k = count.get(ref) || 0; count.set(ref, k + 1); const id = k === 0 ? ref : ref + "~" + k; copies.push({ id, ref, kind, k }); return id; };
  const LIMIT = 1500;
  if (repeat) {
    let overflow = false;
    const walk = (ref, cid, path) => {
      for (const e of out.get(ref)) {
        if (copies.length > LIMIT) { overflow = true; return; }
        const t = e.target;
        const c = mk(t, path.has(t) ? "loop" : "full");
        cedges.push({ id: e.id + "@" + c, ref: e.id, source: cid, target: c });
        if (!path.has(t)) { path.add(t); walk(t, c, path); path.delete(t); }
      }
    };
    roots.forEach(r => walk(r, mk(r, "full"), new Set([r])));
    [...vis].forEach(id => { if (!count.has(id)) walk(id, mk(id, "full"), new Set([id])); });
    if (overflow) return null;
  } else {
    const expanded = new Set(); const q = [];
    const run = () => {
      while (q.length) {
        const [ref, cid] = q.shift();
        for (const e of out.get(ref)) {
          const t = e.target;
          if (!expanded.has(t)) { expanded.add(t); const c = mk(t, "full"); cedges.push({ id: e.id + "@" + c, ref: e.id, source: cid, target: c }); q.push([t, c]); }
          else { const c = mk(t, "ref"); cedges.push({ id: e.id + "@" + c, ref: e.id, source: cid, target: c }); }
        }
      }
    };
    roots.forEach(r => { expanded.add(r); q.push([r, mk(r, "full")]); }); run();
    [...vis].forEach(id => { if (!expanded.has(id)) { expanded.add(id); q.push([id, mk(id, "full")]); run(); } });
  }
  copies.forEach(c => (c.total = count.get(c.ref)));
  return { copies, cedges };
}

/* ================= Crossings ================= */
function segCross(a, b, c, d) {
  const o = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const e = 1e-6, d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
  return ((d1 > e && d2 < -e) || (d1 < -e && d2 > e)) && ((d3 > e && d4 < -e) || (d3 < -e && d4 > e));
}
function countCrossings(cedges, pos, routes) {
  const P = cedges.map(e => {
    const pts = (routes && routes.get(e.id)) || [pos.get(e.source), pos.get(e.target)];
    if (pts.some(p => !p)) return null;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    pts.forEach(p => { x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y); x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y); });
    return { e, pts, x1, y1, x2, y2 };
  }).filter(Boolean);
  let c = 0;
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const a = P[i], b = P[j];
    if (a.e.source === b.e.source || a.e.source === b.e.target || a.e.target === b.e.source || a.e.target === b.e.target) continue;
    if (a.x2 < b.x1 || b.x2 < a.x1 || a.y2 < b.y1 || b.y2 < a.y1) continue;
    for (let s = 0; s < a.pts.length - 1; s++) for (let t = 0; t < b.pts.length - 1; t++)
      if (segCross(a.pts[s], a.pts[s + 1], b.pts[t], b.pts[t + 1])) c++;
  }
  return c;
}

/* ================= ELK (untangle) ================= */
const elk = new ELK();
async function elkLayout(copies, cedges, sizes) {
  const tries = [1, 1, 3, 6, 10][view.effort - 1];
  const thor = [3, 7, 12, 25, 50][view.effort - 1];
  const opt = {
    "elk.algorithm": "layered", "elk.direction": "RIGHT",
    "elk.layered.spacing.nodeNodeBetweenLayers": String(view.levelSp),
    "elk.spacing.nodeNode": String(view.nodeSp),
    "elk.spacing.edgeNode": "10", "elk.spacing.edgeEdge": "6",
    "elk.layered.spacing.edgeNodeBetweenLayers": "12", "elk.layered.spacing.edgeEdgeBetweenLayers": "6",
    "elk.edgeRouting": view.route === "STRAIGHT" ? "POLYLINE" : view.route,
    "elk.layered.thoroughness": String(thor),
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    "elk.layered.crossingMinimization.greedySwitch.type": view.effort >= 3 ? "TWO_SIDED" : "ONE_SIDED",
    "elk.layered.mergeEdges": String(view.route === "ORTHOGONAL"),
    "elk.separateConnectedComponents": "true",
    "elk.layered.cycleBreaking.strategy": "DEPTH_FIRST",
  };
  if (view.place === 0) Object.assign(opt, { "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF", "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED" });
  if (view.place === 1) Object.assign(opt, { "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF", "elk.layered.nodePlacement.favorStraightEdges": "true" });
  if (view.place === 2) Object.assign(opt, { "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX" });
  let kids = copies;
  if (view.keepOrder) {
    const y = new Map(doc.nodes.map(n => [n.id, n.y]));
    kids = copies.slice().sort((a, b) => (y.get(a.ref) - y.get(b.ref)) || (a.k - b.k));
    Object.assign(opt, { "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES" });
  }
  let best = null;
  for (let s = 0; s < tries; s++) {
    const g = { id: "root", layoutOptions: { ...opt, "elk.randomSeed": String(s * 7919 + 1) },
      children: kids.map(c => ({ id: c.id, width: sizes.get(c.id).w, height: sizes.get(c.id).h })),
      edges: cedges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] })) };
    const r = await elk.layout(g);
    const pos = new Map(r.children.map(ch => [ch.id, { x: ch.x + ch.width / 2, y: ch.y + ch.height / 2 }]));
    const routes = new Map();
    if (view.route !== "STRAIGHT") (r.edges || []).forEach(e => {
      const sc = e.sections && e.sections[0];
      if (sc) routes.set(e.id, [sc.startPoint, ...(sc.bendPoints || []), sc.endPoint].map(p => ({ x: p.x, y: p.y })));
    });
    const crossings = countCrossings(cedges, pos, routes);
    if (!best || crossings < best.crossings) best = { pos, routes, crossings };
    if (crossings === 0) break;
  }
  best.tries = tries;
  return best;
}

/* ================= Cytoscape ================= */
let cy = null;
function styleSheet() {
  const edge = css("--edge"), hi = css("--edge-hi"), ink = css("--ink"), ground = css("--ground");
  return [
    { selector: "node[fill]", style: {
      shape: "round-rectangle", "corner-radius": 7, width: "data(w)", height: "data(h)",
      "background-color": "data(fill)", "border-color": "data(stroke)", "border-width": "data(bw)", "border-style": "data(bs)",
      label: "data(label)", color: "data(font)", "font-family": FONT_STACK, "font-size": FONT_PX, "line-height": LINE / FONT_PX,
      "text-wrap": "wrap", "text-max-width": MAXW * 3, "text-valign": "center", "text-halign": "center",
      "font-style": "data(fs)",
      "min-zoomed-font-size": 4, "transition-property": "opacity", "transition-duration": "140ms" } },
    { selector: "node.q", style: { "font-weight": 700, "font-size": 15 } },
    { selector: "node.ref", style: { opacity: .78, "border-style": "dashed", "border-width": 2 } },
    { selector: "node.refuted", style: { opacity: .5 } },
    { selector: "node.cyc", style: { "underlay-color": "#D23B3B", "underlay-opacity": .35, "underlay-padding": 7 } },
    { selector: "node.badge", style: {
      shape: "round-rectangle", "corner-radius": 9, width: "data(w)", height: 19, "background-color": ink, "border-color": ground, "border-width": 2,
      label: "data(label)", color: ground, "font-family": '"IBM Plex Sans Condensed", ' + FONT_STACK, "font-weight": 600, "font-size": 12,
      "text-valign": "center", "text-halign": "center", events: "no", "z-index": 20, "z-compound-depth": "top" } },
    { selector: "node.gradechip", style: {
      shape: "round-rectangle", "corner-radius": 9, width: "data(w)", height: 19, "background-color": "#3B2F7A", "border-color": ground, "border-width": 2,
      label: "data(label)", color: "#ffffff", "font-family": '"IBM Plex Mono", monospace', "font-weight": 500, "font-size": 11,
      "text-valign": "center", "text-halign": "center", events: "no", "z-index": 22 } },
    { selector: "node.gatechip", style: {
      shape: "round-rectangle", "corner-radius": 4, width: "data(w)", height: 17, "background-color": ink, "border-color": ground, "border-width": 2,
      label: "data(label)", color: ground, "font-family": '"IBM Plex Sans Condensed", ' + FONT_STACK, "font-weight": 600, "font-size": 10.5,
      "text-valign": "center", "text-halign": "center", events: "no", "z-index": 23 } },
    { selector: "node.gatechip.or", style: { "background-color": ground, color: ink, "border-color": ink, "border-width": 1.5 } },
    { selector: "node.kindchip", style: {
      shape: "round-rectangle", "corner-radius": 9, width: "data(w)", height: 17, "background-color": ground, "border-color": edge, "border-width": 1, "border-style": "dashed",
      label: "data(label)", color: ink, "font-family": '"IBM Plex Sans Condensed", ' + FONT_STACK, "font-weight": 600, "font-size": 10.5,
      "text-valign": "center", "text-halign": "center", events: "no", "z-index": 21 } },
    { selector: "node.shade", style: { "underlay-color": "#6E56CF", "underlay-padding": 9 } },
    { selector: "node.tagchip", style: {
      shape: "round-rectangle", "corner-radius": 10, width: "data(w)", height: 21, "background-color": ground, "border-color": edge, "border-width": 1,
      label: "data(label)", color: ink, "font-family": EMOJI_FONT, "font-size": 13, "font-weight": 400, "text-valign": "center", "text-halign": "center",
      events: "no", "z-index": 21 } },
    { selector: "edge", style: {
      width: 1.4, "line-color": edge, "target-arrow-color": edge, "target-arrow-shape": "triangle", "arrow-scale": 1,
      "curve-style": "straight", "transition-property": "opacity", "transition-duration": "140ms" } },
    { selector: "edge.redundant", style: { "line-style": "dashed", "line-dash-pattern": [6, 4] } },
    { selector: ".faded", style: { opacity: .13 } },
    { selector: "node.badge.faded", style: { opacity: .2 } },
    { selector: "node.path", style: { "border-width": 2.5, "border-color": hi } },
    { selector: "edge.path", style: { width: 2.6, "line-color": hi, "target-arrow-color": hi, "z-index": 9 } },
    { selector: "node.twin", style: { "underlay-color": hi, "underlay-opacity": .25, "underlay-padding": 6 } },
    { selector: "node.sel", style: { "underlay-color": hi, "underlay-opacity": .35, "underlay-padding": 7, "border-width": 3, "border-color": hi } },
    { selector: "edge.sel", style: { width: 3.4, "line-color": hi, "target-arrow-color": hi, "z-index": 10 } },
    { selector: "node.match", style: { "underlay-color": "#F5B700", "underlay-opacity": .6, "underlay-padding": 7 } },
    { selector: "node.diff-add", style: { "underlay-color": "#15924F", "underlay-opacity": .5, "underlay-padding": 8 } },
    { selector: "node.diff-chg", style: { "underlay-color": "#E0A100", "underlay-opacity": .55, "underlay-padding": 8 } },
    { selector: ".tagoff", style: { opacity: .16 } },
    { selector: "node.tagon", style: { "underlay-color": "#FF6A3D", "underlay-opacity": .5, "underlay-padding": 8 } },
    { selector: "node.drop", style: { "underlay-color": hi, "underlay-opacity": .55, "underlay-padding": 10 } },
  ];
}

function nodeVisual(n, extraLabel) {
  const c = catById(n.cat), st = STATUSES[n.status] || STATUSES.unassessed;
  const extra = extraLabel || "";
  const sz = measureText((tx(n) || " ") + extra), box = boxSize(n, extra);
  const missing = doc.languages.length > 1 && txMissing(n);
  return { label: sz.lines.join("\n"), w: box.w, h: box.h, fill: c.fill, font: c.font, fs: missing ? "italic" : "normal",
    stroke: st.color || n.outline || c.stroke, bw: st.width, bs: st.style };
}
const kindName = (k, l = curLang()) => KINDS[k] ? (l === "es" ? KINDS[k].es : KINDS[k].name) : "";
const logicName = (k, l = curLang()) => LOGIC[k] ? (l === "es" ? LOGIC[k].es : LOGIC[k].name) : "";
function gateChipLabel(n, A) { // AND/OR on a box whose causes it combines; hidden with the View panel switch
  if (view.gates === false || !n || !LOGIC[n.logic] || !A || (A.out.get(n.id) || []).length < 2) return null;
  const label = logicName(n.logic); return { label, w: label.length * 7 + 12 };
}
function tagChipLabel(n) {
  const ts = orderedTags(n.tags || []); if (!ts.length) return null;
  const shown = ts.slice(0, 3).map(t => t.emoji).join(""), more = ts.length - 3;
  const label = shown + (more > 0 ? ` +${more}` : "");
  mctx.font = `13px ${EMOJI_FONT}`;
  return { label, w: Math.ceil(mctx.measureText(label).width) + 12, title: ts.map(t => tx(t, "name")).join(", ") };
}

async function render(opts = {}) {
  const my = (render.token = (render.token || 0) + 1);
  const A = analyze(); const D = dominatorTree(A);
  if (view.branch && !D.idom.has(view.branch)) view.branch = null;
  const V = computeView(A, D);
  const byId = new Map(doc.nodes.map(n => [n.id, n]));
  let U;
  const untangle = view.mode === "untangle";
  if (untangle && view.split) {
    U = unfold(V.vis, V.edges, view.repeat);
    if (!U) { toast("Too many copies to repeat every branch. Showing each branch once instead."); view.repeat = false; syncControls(); U = unfold(V.vis, V.edges, false); }
  } else {
    U = { copies: [...V.vis].map(id => ({ id, ref: id, kind: "full", total: 1, k: 0 })),
          cedges: V.edges.map(e => ({ id: e.id, ref: e.id, source: e.source, target: e.target })) };
  }
  const vis = new Map();
  U.copies.forEach(c => {
    const n = byId.get(c.ref); const hb = V.hiddenBelow.get(c.ref);
    vis.set(c.id, nodeVisual(n, hb != null && c.kind === "full" ? `  ▸ +${hb}` : ""));
  });
  // manual-layout crossings, always on the base graph (for comparison)
  const mpos = new Map(doc.nodes.map(n => [n.id, { x: n.x, y: n.y }]));
  manualCrossings = countCrossings(V.edges, mpos, null);
  let pos, routes = null, crossings;
  if (untangle) {
    const linked = new Set(); U.cedges.forEach(e => { linked.add(e.source); linked.add(e.target); });
    const pinned = U.copies.filter(c => pins.has(c.ref) && !linked.has(c.id));
    const pinnedIds = new Set(pinned.map(c => c.id));
    const rest = U.copies.filter(c => !pinnedIds.has(c.id));
    const r = rest.length ? await elkLayout(rest, U.cedges, vis) : { pos: new Map(), routes: new Map(), crossings: 0, tries: 1 };
    if (my !== render.token) return;
    pinned.forEach(c => r.pos.set(c.id, { ...pins.get(c.ref) }));
    pos = r.pos; routes = r.routes; crossings = r.crossings; lastTries = r.tries;
  } else {
    pos = new Map(U.copies.map(c => [c.id, mpos.get(c.ref)]));
    crossings = manualCrossings;
  }
  lastRender = { A, D, V, U, pos, routes, crossings };
  renderBranchUI();
  applyToCy(U, V, A, byId, vis, pos, routes, opts);
  updateChrome(true); renderLegend(); renderTagbar(); syncControls();
  if (!opts.skipPanel) renderPanel();
  applySelection(); applyTagFilter(); applyGradeVisuals(); doSearch(false); renderGradebar();
  if (opts.fit) {
    cy.resize();
    if (opts.animate) setTimeout(() => { fitView(opts.readable); updateOverlays(); }, 360);
    else fitView(opts.readable);
  }
  updateOverlays();
}

function applyToCy(U, V, A, byId, vis, pos, routes, opts) {
  const nodes = [], edges = [];
  const diff = view.diff;
  U.copies.forEach(c => {
    const n = byId.get(c.ref), v = vis.get(c.id);
    const cls = [isQ(n) ? "q" : "", c.kind !== "full" ? "ref" : "", n.status === "refuted" ? "refuted" : "", A.cyc.has(n.id) ? "cyc" : "",
      diff && diff.added.has(n.id) ? "diff-add" : "", diff && diff.changed.has(n.id) ? "diff-chg" : ""].filter(Boolean).join(" ");
    nodes.push({ group: "nodes", data: { id: c.id, ref: c.ref, kind: c.kind, total: c.total, ...v }, classes: cls, position: { ...pos.get(c.id) } });
    const chip = view.tagChips !== false && tagChipLabel(n);
    if (chip) {
      const p = pos.get(c.id);
      nodes.push({ group: "nodes", data: { id: "t:" + c.id, owner: c.id, label: chip.label, w: chip.w, h: 21 }, classes: "badge tagchip",
        position: { x: p.x - v.w / 2 + chip.w / 2 - 6, y: p.y - v.h / 2 - 1 } });
    }
    const gchip = GRADING && gradeChipLabel(n);
    if (gchip) {
      const p = pos.get(c.id);
      nodes.push({ group: "nodes", data: { id: "g:" + c.id, owner: c.id, label: gchip.label, w: gchip.w, h: 19 }, classes: "badge gradechip",
        position: { x: p.x + v.w / 2 - gchip.w / 2 + 6, y: p.y + v.h / 2 + 2 } });
    }
    const gate = gateChipLabel(n, A);
    if (gate) {
      const p = pos.get(c.id);
      nodes.push({ group: "nodes", data: { id: "a:" + c.id, owner: c.id, label: gate.label, w: gate.w, h: 17 }, classes: "badge gatechip " + n.logic,
        position: { x: p.x + v.w / 2 + gate.w / 2 - 3, y: p.y - v.h / 2 + 8 + (c.total >= 2 ? 20 : 0) } }); // top right, clear of the edit handle
    }
    const kchip = view.kinds === true && n.kind && KINDS[n.kind] && !isQ(n);
    if (kchip) {
      const p = pos.get(c.id), label = kindName(n.kind).toLowerCase(), w = label.length * 6 + 14;
      nodes.push({ group: "nodes", data: { id: "k:" + c.id, owner: c.id, label, w, h: 17 }, classes: "badge kindchip",
        position: { x: p.x - v.w / 2 + w / 2 + 4, y: p.y + v.h / 2 + 2 } });
    }
    if (c.total >= 2) {
      const r = roman(c.total), p = pos.get(c.id);
      nodes.push({ group: "nodes", data: { id: "b:" + c.id, owner: c.id, label: r, w: 12 + r.length * 7.5, h: 19 }, classes: "badge",
        position: { x: p.x + v.w / 2 - 2, y: p.y - v.h / 2 + 1 } });
    }
  });
  U.cedges.forEach(e => {
    edges.push({ group: "edges", data: { id: e.id, ref: e.ref, source: e.source, target: e.target },
      classes: V.redundant.has(e.ref) && view.redundant === "dashed" ? "redundant" : "" });
  });
  const want = new Map([...nodes, ...edges].map(d => [d.data.id, d]));
  const routeJobs = [];
  const animate = opts.animate && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  cy.batch(() => {
    cy.elements().forEach(el => { if (!want.has(el.id())) el.remove(); });
    nodes.forEach(d => {
      const el = cy.getElementById(d.data.id);
      if (el.nonempty()) {
        el.data(d.data); el.classes(d.classes);
        const p = el.position();
        if (Math.abs(p.x - d.position.x) > .5 || Math.abs(p.y - d.position.y) > .5) {
          if (animate) el.animate({ position: d.position }, { duration: 320, easing: "ease-in-out-cubic" }); else el.position(d.position);
        }
      } else cy.add(d);
    });
    edges.forEach(d => {
      let el = cy.getElementById(d.data.id);
      if (el.nonempty() && (el.data("source") !== d.data.source || el.data("target") !== d.data.target)) { el.remove(); el = cy.collection(); }
      if (el.nonempty()) { el.data("ref", d.data.ref); el.classes(d.classes); } else el = cy.add(d);
      routeJobs.push([el, routes && routes.get(d.data.id), pos.get(d.data.source), pos.get(d.data.target)]);
    });
  });
  const gen = (applyToCy.gen = (applyToCy.gen || 0) + 1);
  const runRoutes = () => gen === applyToCy.gen && cy.batch(() => routeJobs.forEach(j => { if (!j[0].removed()) setRoute(...j); }));
  if (animate) { cy.batch(() => routeJobs.forEach(j => j[0].removeStyle("curve-style segment-weights segment-distances edge-distances"))); setTimeout(runRoutes, 340); }
  else runRoutes();
  cy.autoungrabify(false);
  cy.nodes().forEach(n => { const ok = !VIEWER && !GRADING && !n.hasClass("badge") && (view.mode === "manual" || (pins.has(n.data("ref")) && n.connectedEdges().empty())); ok ? n.grabify() : n.ungrabify(); });
}

function setRoute(el, pts, S, T) {
  if (!pts || !S || !T) { el.removeStyle("curve-style segment-weights segment-distances edge-distances"); return; }
  const dx = T.x - S.x, dy = T.y - S.y, L2 = dx * dx + dy * dy || 1, L = Math.sqrt(L2);
  const ws = [], ds = [];
  const inner = pts.slice(1, -1);
  if (!inner.length) { el.removeStyle("curve-style segment-weights segment-distances edge-distances"); return; }
  inner.forEach(p => { ws.push(((p.x - S.x) * dx + (p.y - S.y) * dy) / L2); ds.push(((p.y - S.y) * dx - (p.x - S.x) * dy) / L); });
  el.style({ "curve-style": "segments", "edge-distances": "node-position",
    "segment-weights": ws.map(v => v.toFixed(4)).join(" "), "segment-distances": ds.map(v => v.toFixed(2)).join(" ") });
}

function fitView(readable, anim) {
  const eles = cy.elements();
  if (!eles.length) return;
  const vp = $("#viewpanel"); const left = vp.open ? vp.offsetWidth + 24 : 12;
  const bb = eles.boundingBox({ includeLabels: false, includeOverlays: false });
  const aw = Math.max(200, cy.width() - left - 30), ah = Math.max(200, cy.height() - 90);
  const z = Math.min(aw / bb.w, ah / bb.h, 1.4);
  const target = { zoom: z, pan: { x: left + (aw - bb.w * z) / 2 - bb.x1 * z, y: 50 + (ah - bb.h * z) / 2 - bb.y1 * z } };
  if (anim) cy.animate(target, { duration: 250 }); else cy.viewport(target);
  if (readable && cy.zoom() < .72) {
    const r = cy.nodes().filter(n => !n.hasClass("badge") && n.indegree(false) === 0)[0] || cy.nodes()[0];
    cy.zoom(.85); const p = r.renderedPosition();
    const vp = $("#viewpanel"); const left = vp.open ? vp.offsetWidth + 40 : 30;
    cy.panBy({ x: left + r.renderedWidth() / 2 - p.x, y: cy.height() / 2 - p.y });
  }
}

/* ================= Selection ================= */
function pruneSelection() {
  if (selRef && !nodeById(selRef)) { selRef = null; selCopy = null; }
  if (selEdge && !doc.edges.some(e => e.id === selEdge)) selEdge = null;
  multi = multi.filter(id => nodeById(id));
}
function selectNode(ref, copyId, additive) {
  flushField(true);
  selEdge = null;
  if (additive) {
    if (multi.includes(ref)) multi = multi.filter(x => x !== ref); else multi.push(ref);
    selRef = multi.length === 1 ? multi[0] : null; selCopy = selRef ? (copyId || selRef) : null;
  } else { selRef = ref; selCopy = copyId || ref; multi = [ref]; }
  afterSelection();
}
function selectEdge(ref) { flushField(true); selEdge = ref; selRef = null; selCopy = null; multi = []; afterSelection(); }
function clearSelection() { flushField(true); selRef = null; selCopy = null; selEdge = null; multi = []; afterSelection(); }
function openSide(open) {
  $("main").classList.toggle("side-closed", !open);
  $("#side-open").hidden = open;
}
function afterSelection() {
  if (selRef || selEdge || multi.length) openSide(true);
  if (view.focusR > 0) { render(); return; }
  applySelection(); renderPanel(); updateOverlays();
}
function copiesOf(ref) { return cy.nodes().filter(n => n.data("ref") === ref && !n.hasClass("badge")); }
function applySelection() {
  cy.batch(() => {
    cy.elements().removeClass("sel faded path twin");
    multi.forEach(r => copiesOf(r).addClass("sel"));
    if (selEdge) cy.edges().filter(e => e.data("ref") === selEdge).addClass("sel");
    if (selRef && multi.length <= 1 && view.trace) {
      let n = cy.getElementById(selCopy); if (n.empty()) n = copiesOf(selRef)[0];
      if (n && n.nonempty()) {
        const keep = n.predecessors().union(n.successors()).union(n);
        const badges = cy.nodes(".badge").filter(b => keep.contains(cy.getElementById(b.data("owner"))));
        cy.elements().not(keep).not(badges).addClass("faded");
        keep.addClass("path");
        copiesOf(selRef).not(n).addClass("twin").removeClass("faded");
      }
    }
  });
}

function applyTagFilter() {
  cy.batch(() => {
    cy.elements().removeClass("tagon tagoff");
    if (!view.tagFilter.size) return;
    const on = new Set(doc.nodes.filter(n => (n.tags || []).some(t => view.tagFilter.has(t))).map(n => n.id));
    cy.nodes().forEach(el => {
      if (el.hasClass("badge")) return;
      el.addClass(on.has(el.data("ref")) ? "tagon" : "tagoff");
    });
    cy.nodes(".badge").forEach(b => { if (cy.getElementById(b.data("owner")).hasClass("tagoff")) b.addClass("tagoff"); });
    cy.edges().forEach(e => { if (e.source().hasClass("tagoff") || e.target().hasClass("tagoff")) e.addClass("tagoff"); });
  });
}

/* ================= Editing operations ================= */
function untangleToManual(x, y, skip) { // place the box near the same neighbour it sits next to on screen
  let best = null, bd = Infinity;
  cy.nodes().forEach(el => {
    if (el.hasClass("badge") || !el.visible() || el.data("ref") === skip) return; const n = nodeById(el.data("ref")); if (!n) return;
    const p = el.position(), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = { n, p }; }
  });
  return best ? { x: best.n.x + (x - best.p.x), y: best.n.y + (y - best.p.y) } : { x, y };
}
async function addNodeAt(x, y, fromRef, origin) {
  if (VIEWER || (GRADING && !origin)) return;
  const m = view.mode === "untangle" ? untangleToManual(x, y) : { x, y };
  if (fromRef) { // a cause added from a box slides down until it has room
    const sz = measureText("New cause");
    for (let g = 0; g < 80 && doc.nodes.some(o => { const b = boxSize(o); return Math.abs(o.x - m.x) < (b.w + sz.w) / 2 + 10 && Math.abs(o.y - m.y) < (b.h + sz.h) / 2 + 10; }); g++) m.y += 24;
  }
  const n = newNode("New cause", "cause", m.x, m.y);
  const live = doc.activeSession && activeSession();
  if (origin || live) n.origin = origin || { session: live.code, at: nowISO() };
  if (view.mode === "untangle" && !fromRef) pins.set(n.id, { x, y });
  await commit(() => {
    doc.nodes.push(n);
    if (fromRef) { doc.edges.push({ id: uid("e"), source: fromRef, target: n.id }); view.folded.delete(fromRef); }
  });
  selRef = n.id; selCopy = n.id; selEdge = null; multi = [n.id]; applySelection(); renderPanel();
  inlineEdit(n.id, true, origin ? { langs: [curLang()], quick: true } : {});
}
function addChild(pref, origin) {
  if (VIEWER || (GRADING && !origin)) return;
  const p = nodeById(pref); if (!p) return;
  const kids = doc.edges.filter(e => e.source === pref).map(e => nodeById(e.target)).filter(Boolean);
  const x = p.x + boxSize(p).w / 2 + 40 + MAXW / 2 + PADX;
  const y = kids.length ? Math.max(...kids.map(k => k.y + boxSize(k).h / 2)) + 40 : p.y;
  addNodeAt(x, y, pref, origin);
}
function addEdge(s, t) {
  if (VIEWER || GRADING) return;
  if (s === t) return toast("A box can't explain itself.");
  if (doc.edges.some(e => e.source === s && e.target === t)) return toast("These boxes are already connected.");
  const loop = reaches(t, s);
  pins.delete(s); pins.delete(t);
  commit(() => { doc.edges.push({ id: uid("e"), source: s, target: t }); view.folded.delete(s); });
  if (loop) toast("This arrow closes a loop (circular reasoning). Boxes in the loop glow red.", 5000);
}
function rewire(edgeId, end, ref) {
  if (VIEWER || GRADING) return;
  const e = doc.edges.find(x => x.id === edgeId); if (!e) return;
  const s = end === "source" ? ref : e.source, t = end === "target" ? ref : e.target;
  if (s === t) return toast("A box can't explain itself.");
  if (doc.edges.some(x => x !== e && x.source === s && x.target === t)) return toast("These boxes are already connected.");
  if (s === e.source && t === e.target) return;
  commit(() => { e.source = s; e.target = t; });
  toast("Arrow rewired.");
}
function reverseEdge(edgeId) {
  if (VIEWER || GRADING) return;
  const e = doc.edges.find(x => x.id === edgeId); if (!e) return;
  if (doc.edges.some(x => x.source === e.target && x.target === e.source)) return toast("The opposite arrow already exists.");
  commit(() => { [e.source, e.target] = [e.target, e.source]; });
}
function deleteSelection() {
  if (VIEWER || GRADING) return;
  if (selEdge) { const id = selEdge; selEdge = null; commit(() => { doc.edges = doc.edges.filter(e => e.id !== id); }); toast("Arrow deleted. Ctrl Z to undo."); return; }
  const ids = new Set(multi.length ? multi : selRef ? [selRef] : []);
  if (!ids.size) return;
  selRef = null; selCopy = null; multi = [];
  commit(() => {
    doc.nodes = doc.nodes.filter(n => !ids.has(n.id));
    doc.edges = doc.edges.filter(e => !ids.has(e.source) && !ids.has(e.target));
  });
  toast(`Deleted ${ids.size} box${ids.size > 1 ? "es" : ""}. Ctrl Z to undo.`);
}
function toggleFold(ref) {
  if (!doc.edges.some(e => e.source === ref)) return toast("This box has no causes to fold.");
  view.folded.has(ref) ? view.folded.delete(ref) : view.folded.add(ref);
  $("#depth").value = "all";
  render({ animate: true });
}

/* inline text editor over a box: asks for each language in turn */
function inlineEdit(copyId, isNew, opts = {}) {
  if (VIEWER || (GRADING && !opts.quick)) return;
  const el = cy.getElementById(copyId); if (el.empty()) return;
  const ref = el.data("ref"); const n = nodeById(ref); if (!n) return;
  const first = curLang();
  const langs = opts.langs || [first, ...doc.languages.filter(l => l !== first)];
  const multi = doc.languages.length > 1;
  const vals = {}; langs.forEach(l => (vals[l] = isNew ? "" : txRaw(n, "text", l)));
  const ta = $("#inline"), lab = $("#inline-lang");
  const bb = el.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
  const z = cy.zoom(), w = Math.max(bb.w, 220), h = Math.max(bb.h, 60);
  const left = bb.x1 + bb.w / 2 - w / 2, top = bb.y1 + bb.h / 2 - h / 2;
  ta.style.left = left + "px"; ta.style.top = top + "px";
  ta.style.width = w + "px"; ta.style.height = h + "px"; ta.style.fontSize = Math.max(12, Math.min(18, FONT_PX * z)) + "px";
  lab.style.left = left + "px"; lab.style.width = w + "px"; lab.style.bottom = (cy.height() - top + 4) + "px";
  let i = 0, done = false;
  const show = () => {
    const l = langs[i];
    ta.value = vals[l];
    ta.placeholder = i === 0 && !opts.langs ? "What explains it?" : `${langName(l)} text`;
    const src = vals[langs[0]] && i > 0 ? vals[langs[0]] : (opts.langs && !isNew ? tx(n, "text", mainLang()) : "");
    lab.hidden = !(multi || opts.pass);
    lab.innerHTML = `<b>${esc(l.toUpperCase())}</b>${langs.length > 1 ? ` ${i + 1}/${langs.length}` : ""}` +
      (opts.pass ? ` box ${opts.pass.i} of ${opts.pass.n}` : "") +
      (src && l !== langs[0] || opts.langs ? `<span class="src">${esc(src)}</span>` : "") +
      `<span class="keys">${i < langs.length - 1 ? "Enter: next language" : opts.pass ? "Enter: next box" : "Enter: done"} · Esc: ${opts.pass ? "stop" : "cancel"}</span>`;
    ta.hidden = false; ta.focus(); ta.select();
  };
  const clean = v => v.replace(/\s+/g, " ").trim();
  const finish = save => {
    if (done) return; done = true; vals[langs[i]] = ta.value;
    ta.hidden = true; lab.hidden = true;
    ta.removeEventListener("keydown", onKey); ta.removeEventListener("blur", onBlur);
    const apply = m => langs.forEach(l => { const v = clean(vals[l]); if (v || l !== mainLang() || !isNew) txSet(m, "text", l, v); });
    const changed = langs.some(l => clean(vals[l]) !== txRaw(n, "text", l));
    if (isNew) {
      if (!save || langs.every(l => !clean(vals[l]))) { restoreCore(undoStack.pop()); pruneSelection(); touch(); render(); }
      else { const m = nodeById(ref); if (m) { m.text = ""; apply(m); } touch(); render(); }
    } else if (save && changed) {
      const probe = clone(n); apply(probe);
      if (!txAll(probe).length) toast("A box needs some text. Delete it with Del instead.");
      else commit(() => { const m = nodeById(ref); if (m) apply(m); });
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
      if (e.key === "Tab" && !opts.pass) setTimeout(() => addChild(ref), 30);
      return;
    }
    if (e.key === "Tab" && e.shiftKey) { e.preventDefault(); vals[langs[i]] = ta.value; if (i > 0) { i--; show(); } }
  };
  const onBlur = () => setTimeout(() => { if (document.activeElement !== ta) finish(true); }, 0);
  ta.addEventListener("keydown", onKey); ta.addEventListener("blur", onBlur);
  show();
}

/* walk through every box missing a language, one after the other */
async function translatePass(lang) {
  if (VIEWER) return;
  const A = analyze();
  const todo = doc.nodes.filter(n => txMissing(n, "text", lang))
    .sort((a, b) => (A.depth.get(a.id) || 99) - (A.depth.get(b.id) || 99) || a.y - b.y).map(n => n.id);
  if (!todo.length) return toast(`Every box already has ${langName(lang)} text.`);
  $$(".overlay").forEach(o => (o.hidden = true));
  let k = 0;
  const step = async () => {
    while (k < todo.length && !txMissing(nodeById(todo[k]) || {}, "text", lang)) k++;
    if (k >= todo.length) { toast(`${langName(lang)} translations complete.`); return; }
    const id = todo[k]; k++;
    await goTo(id);
    setTimeout(() => inlineEdit(id, false, { langs: [lang], pass: { i: k, n: todo.length }, onDone: saved => { if (saved) setTimeout(step, 60); else toast("Translation pass stopped."); } }), 330);
  };
  step();
}

/* ================= Canvas overlays: connect handle, rewire grips ================= */
let hoverCopy = null, hoverTimer = null, dragging = null;
const toRendered = p => ({ x: p.x * cy.zoom() + cy.pan().x, y: p.y * cy.zoom() + cy.pan().y });
function updateOverlays() {
  const h = $("#handle"), gs = $("#grip-s"), gt = $("#grip-t");
  if (VIEWER || GRADING) { h.hidden = gs.hidden = gt.hidden = true; return; }
  const target = hoverCopy && cy.getElementById(hoverCopy).nonempty() ? cy.getElementById(hoverCopy)
    : (selCopy && multi.length <= 1 ? cy.getElementById(selCopy) : null);
  if (target && target.nonempty() && !dragging && $("#inline").hidden && target.visible()) {
    const bb = target.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
    h.style.left = (bb.x2 + 2) + "px"; h.style.top = (bb.y1 + bb.h / 2) + "px"; h.hidden = false; h.dataset.copy = target.id();
  } else h.hidden = true;
  const e = selEdge ? cy.edges().filter(x => x.data("ref") === selEdge)[0] : null;
  if (e && !dragging) {
    const s = toRendered(e.sourceEndpoint()), t = toRendered(e.targetEndpoint());
    gs.style.left = s.x + "px"; gs.style.top = s.y + "px"; gt.style.left = t.x + "px"; gt.style.top = t.y + "px";
    gs.hidden = gt.hidden = false; gs.dataset.edge = gt.dataset.edge = e.id();
  } else gs.hidden = gt.hidden = true;
}
function nodeAtRendered(rx, ry) {
  const z = cy.zoom(), pan = cy.pan(); const mx = (rx - pan.x) / z, my = (ry - pan.y) / z;
  let hit = null;
  cy.nodes().forEach(n => {
    if (n.hasClass("badge") || !n.visible()) return;
    const bb = n.boundingBox({ includeLabels: false, includeOverlays: false });
    if (mx >= bb.x1 && mx <= bb.x2 && my >= bb.y1 && my <= bb.y2) hit = n;
  });
  return { node: hit, model: { x: mx, y: my } };
}
function startDrag(kind, ev, info) {
  ev.preventDefault(); ev.stopPropagation();
  const box = $("#cy").getBoundingClientRect();
  const line = $("#dl"), svg = $("#dragline");
  let fixed; // rendered point of the end that stays put
  if (kind === "connect") { const n = cy.getElementById(info.copy); const bb = n.renderedBoundingBox({ includeLabels: false }); fixed = { x: bb.x2, y: bb.y1 + bb.h / 2 }; }
  else { const e = cy.getElementById(info.edge); fixed = toRendered(kind === "rewire-source" ? e.targetEndpoint() : e.sourceEndpoint()); }
  dragging = { kind, info }; updateOverlays(); svg.removeAttribute("hidden");
  let over = null;
  const move = e => {
    const rx = e.clientX - box.left, ry = e.clientY - box.top;
    if (kind === "rewire-source") { line.setAttribute("x1", rx); line.setAttribute("y1", ry); line.setAttribute("x2", fixed.x); line.setAttribute("y2", fixed.y); }
    else { line.setAttribute("x1", fixed.x); line.setAttribute("y1", fixed.y); line.setAttribute("x2", rx); line.setAttribute("y2", ry); }
    const { node } = nodeAtRendered(rx, ry);
    if (over && over !== node) over.removeClass("drop");
    over = node; if (over) over.addClass("drop");
  };
  const up = e => {
    window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("keydown", key, true);
    svg.setAttribute("hidden", ""); if (over) over.removeClass("drop"); dragging = null;
    if (e && e.type === "pointerup") {
      const rx = e.clientX - box.left, ry = e.clientY - box.top;
      const { node, model } = nodeAtRendered(rx, ry);
      const inside = rx >= 0 && ry >= 0 && rx <= box.width && ry <= box.height;
      if (kind === "connect") {
        const from = cy.getElementById(info.copy).data("ref");
        if (node) addEdge(from, node.data("ref"));
        else if (inside && Math.hypot(rx - fixed.x, ry - fixed.y) > 30) addNodeAt(model.x + MAXW / 2 + PADX, model.y, from);
      } else if (node) {
        const ref = cy.getElementById(info.edge).data("ref");
        rewire(ref, kind === "rewire-source" ? "source" : "target", node.data("ref"));
      }
    }
    updateOverlays();
  };
  const key = e => { if (e.key === "Escape") { e.stopPropagation(); up(null); } };
  window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("keydown", key, true);
  move(ev);
}
