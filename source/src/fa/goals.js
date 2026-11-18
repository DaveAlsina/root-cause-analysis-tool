/* ================= Goals: what the design must achieve, one tree per system boundary =================
   doc.goals holds the goal trees between the system map and the function analysis:
   root          the main goal of the project, in every language; the root of every tree
   catalogue     goals: a text, how it is measured (for a leaf, its performance specification), notes and sources.
                 One goal can sit in several trees, with its own place and scores in each.
   stakeholders  who scores the goals: the analyst and, say, each exporter interviewed
   trees         one per system boundary (or one without a boundary). Each holds an ordered list of nodes
                 { goal, parent (a goal id, or null under the root), out (out of scope here), scores { stakeholder: 1–5 } }
   active        the tree on screen
   method        how scores combine down a path: "absolute" (Π s/5) or "normalised" (s / Σ siblings, multiplied down)
   aggregate     how stakeholders' scores combine on one goal: "geometric", "arithmetic" or "median"
   A score is local: how much achieving the goal contributes to its parent. Functions say which goals they serve
   (f.serves); a function's relevance follows from the goals it serves in its variant's tree. */

const GOAL_ROOT = "groot";
const GOAL_METHODS = {
  absolute: { name: "Absolute", short: "relevance",
    how: "Each score is divided by 5 and the results are multiplied down the path: relevance = Π s/5. A goal scored 5 under parents scored 5 gets 1.00.",
    good: "Splitting a goal into more subgoals doesn't dilute them, so the ranking doesn't depend on how finely you happened to decompose a branch.",
    use: "Use it to rank goals, to decide which functions are key, and to order the morphological chart. The values don't sum to 1, so they are not weights." },
  normalised: { name: "Normalised", short: "weight",
    how: "Each score is divided by the sum of its siblings' scores, and the results are multiplied down the path (the weighted objectives method, Cross 2008). The leaves sum to 100 %.",
    good: "The leaves work as weights for scoring concepts with a weighted sum.",
    use: "A goal with many siblings gets a smaller share, and an only child always gets its parent's whole share, whatever its score. Use it when you need weights to evaluate concepts." },
};
const GOAL_AGGREGATES = {
  geometric: { name: "Geometric mean",
    how: "The n-th root of the product of the scores. 1 and 5 give 2.2.",
    why: "It agrees with multiplying down the tree: combining the scores first and computing relevance after gives the same result as computing each stakeholder's relevance and combining after. It keeps ratios, which is why AHP combines individual judgements this way (Aczél & Saaty 1983). Disagreement pulls it down, so a goal only scores high when stakeholders agree it matters." },
  arithmetic: { name: "Arithmetic mean",
    how: "The plain average. 1 and 5 give 3.",
    why: "Easy to explain, and treats the 1–5 scale as equal steps. It doesn't commute with multiplying down the tree, so combined relevance differs a little from the average of each stakeholder's relevance." },
  median: { name: "Median",
    how: "The middle score; with an even number, the mean of the two middle ones. 1, 2 and 5 give 2.",
    why: "Robust to one stakeholder far from the rest, and makes the fewest assumptions about the scale. With few stakeholders it moves in big steps and ignores how far apart they are." },
};
const SCORE_QUESTION = "How much does achieving this goal contribute to its parent?";
const SCORE_ANCHORS = ["", "marginal", "helps a little", "clearly helps", "matters a lot", "the parent fails without it"];
const REL_HIGH = .6, REL_LOW = .3; // relevance relative to the most relevant leaf: above HIGH is high, below LOW is low
const GOAL_GAP = { x: 64, y: 30 };

function defaultGoals() {
  return { root: { text: "", textTr: {} }, catalogue: [], stakeholders: [{ id: uid("sh"), name: "You", note: "" }], trees: [], active: null, method: "absolute", aggregate: "geometric" };
}
const newGoal = text => ({ id: uid("go"), text: text || "", textTr: {}, measure: "", measureTr: {}, notes: "", sources: [] });
const newGoalTree = boundary => ({ id: uid("gt"), boundary: boundary || null, note: "", nodes: [] });

function normalizeGoals(g, out) {
  const G = defaultGoals();
  if (!g || typeof g !== "object") return G;
  if (g.root && typeof g.root === "object") G.root = { text: String(g.root.text ?? ""), textTr: trObj(g.root.textTr) };
  G.catalogue = (Array.isArray(g.catalogue) ? g.catalogue : []).filter(x => x && x.id).map(x => ({ id: String(x.id), text: String(x.text ?? ""), textTr: trObj(x.textTr),
    measure: String(x.measure || ""), measureTr: trObj(x.measureTr), notes: String(x.notes || ""), sources: Array.isArray(x.sources) ? x.sources.map(String) : [] }));
  if (Array.isArray(g.stakeholders) && g.stakeholders.length) G.stakeholders = g.stakeholders.filter(s => s && s.id).map(s => ({ id: String(s.id), name: String(s.name ?? "Stakeholder"), note: String(s.note || "") }));
  if (!G.stakeholders.length) G.stakeholders = defaultGoals().stakeholders;
  const gIds = new Set(G.catalogue.map(x => x.id)), sIds = new Set(G.stakeholders.map(s => s.id)), bIds = new Set(out.system.boundaries.map(b => b.id));
  G.trees = (Array.isArray(g.trees) ? g.trees : []).filter(t => t && t.id).map(t => {
    const seen = new Set();
    const nodes = (Array.isArray(t.nodes) ? t.nodes : []).filter(n => n && gIds.has(n.goal) && !seen.has(n.goal) && seen.add(n.goal)).map(n => {
      const scores = {}; Object.entries(n.scores || {}).forEach(([s, v]) => { const x = Math.round(+v); if (sIds.has(s) && x >= 1 && x <= 5) scores[s] = x; });
      return { goal: String(n.goal), parent: n.parent ? String(n.parent) : null, out: !!n.out, scores };
    });
    nodes.forEach(n => { if (n.parent && !seen.has(n.parent)) n.parent = null; });
    const T = { id: String(t.id), boundary: bIds.has(t.boundary) ? String(t.boundary) : null, note: String(t.note || ""), nodes };
    breakGoalLoops(T);
    return T;
  });
  G.active = G.trees.some(t => t.id === g.active) ? String(g.active) : (G.trees[0] || {}).id || null;
  G.method = GOAL_METHODS[g.method] ? g.method : "absolute";
  G.aggregate = GOAL_AGGREGATES[g.aggregate] ? g.aggregate : "geometric";
  return G;
}
function breakGoalLoops(T) { // a goal cannot sit under itself, however far down
  const by = new Map(T.nodes.map(n => [n.goal, n]));
  T.nodes.forEach(n => { const seen = new Set([n.goal]); let p = n.parent; while (p) { if (seen.has(p)) { n.parent = null; break; } seen.add(p); p = (by.get(p) || {}).parent; } });
}

/* ---- lookups ---- */
const goalById = id => doc.goals.catalogue.find(g => g.id === id);
const goalTreeById = id => doc.goals.trees.find(t => t.id === id);
const shById = id => doc.goals.stakeholders.find(s => s.id === id);
const curTree = () => goalTreeById(doc.goals.active) || doc.goals.trees[0] || null;
const gnode = (T, gid) => T ? T.nodes.find(n => n.goal === gid) : null;
const inTree = (gid, T = curTree()) => !!gnode(T, gid);
const goalKids = (T, gid) => T ? T.nodes.filter(n => (n.parent || null) === (gid === GOAL_ROOT ? null : gid)).map(n => n.goal) : [];
function goalDepth(T, gid) { let d = 1, n = gnode(T, gid); while (n && n.parent) { d++; n = gnode(T, n.parent); } return n ? d : 0; }
function goalPath(T, gid) { const p = []; let n = gnode(T, gid); while (n) { p.unshift(n.goal); n = n.parent ? gnode(T, n.parent) : null; } return p; } // first family … the goal itself
function goalDesc(T, gid) { const out = [], q = [gid]; while (q.length) { const u = q.shift(); goalKids(T, u).forEach(k => { out.push(k); q.push(k); }); } return out; }
const goalOut = (T, gid) => goalPath(T, gid).some(id => gnode(T, id).out); // out of scope, itself or through a parent
const treeName = T => !T ? "" : T.boundary && bndById(T.boundary) ? tx(bndById(T.boundary), "name") : "No boundary";
const treeOfBoundary = b => doc.goals.trees.find(t => t.boundary === (b || null));
const treeForVariant = V => V ? treeOfBoundary(V.systemBoundary) : null;
const variantsOfTree = T => T ? doc.variants.filter(v => (v.systemBoundary || null) === T.boundary) : [];
const goalLabel = gid => gid === GOAL_ROOT ? tx(doc.goals.root) || "Main goal" : tx(goalById(gid)) || "(no text)";
const treesWith = gid => doc.goals.trees.filter(t => inTree(gid, t));

/* ================= Scores and relevance ================= */
function combine(xs, how = doc.goals.aggregate) {
  if (!xs.length) return null;
  if (how === "arithmetic") return xs.reduce((a, b) => a + b, 0) / xs.length;
  if (how === "median") { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  return Math.exp(xs.reduce((a, b) => a + Math.log(b), 0) / xs.length);
}
/* the score of one goal: one stakeholder's, or all of them combined ({ s, n, lo, hi }), or null when nobody scored it */
function goalScore(T, gid, scorer = "all") {
  const n = gnode(T, gid); if (!n) return null;
  if (scorer !== "all") { const v = n.scores[scorer]; return v ? { s: v, n: 1, lo: v, hi: v } : null; }
  const xs = doc.goals.stakeholders.map(s => n.scores[s.id]).filter(Boolean);
  return xs.length ? { s: combine(xs), n: xs.length, lo: Math.min(...xs), hi: Math.max(...xs) } : null;
}
/* relevance of every goal in scope: absolute (Π s/5) and normalised (Π s / Σ siblings). `over` replaces some scores,
   for the sensitivity check. Goals without a score, and everything under them, get null. */
function goalResults(T, scorer = "all", over = null) {
  const R = new Map(); if (!T) return R;
  const sc = gid => over && over.has(gid) ? over.get(gid) : (goalScore(T, gid, scorer) || {}).s ?? null;
  const walk = (pid, abs, norm) => {
    const kids = goalKids(T, pid).filter(k => !gnode(T, k).out);
    const scored = kids.map(k => [k, sc(k)]);
    const sum = scored.reduce((a, [, s]) => a + (s || 0), 0);
    scored.forEach(([k, s]) => {
      const ok = s != null && abs != null;
      const a = ok ? abs * s / 5 : null, w = ok && sum ? norm * s / sum : null;
      R.set(k, { s, abs: a, norm: w, siblings: kids.length, sum });
      walk(k, a, w);
    });
  };
  walk(GOAL_ROOT, 1, 1);
  return R;
}
const relOf = (r, method = doc.goals.method) => r ? (method === "normalised" ? r.norm : r.abs) : null;
function goalLeaves(T) { // in scope, with nothing in scope under them
  return T ? T.nodes.filter(n => !goalOut(T, n.goal) && !goalKids(T, n.goal).some(k => !gnode(T, k).out)).map(n => n.goal) : [];
}
function rankOf(vals) { // competition ranking, highest first: 1, 2, 2, 4
  const ok = [...vals].filter(([, v]) => v != null).sort((a, b) => b[1] - a[1]);
  const r = new Map(); ok.forEach(([id, v], i) => r.set(id, i && Math.abs(v - ok[i - 1][1]) < 1e-9 ? r.get(ok[i - 1][0]) : i + 1));
  return r;
}
function leafRanks(T, scorer = "all", over = null, method = doc.goals.method) {
  const R = goalResults(T, scorer, over);
  return rankOf(goalLeaves(T).map(id => [id, relOf(R.get(id), method)]));
}
/* sensitivity: move each score by ±1 (kept within 1–5), one at a time, and see how the ranking of the leaves moves */
function goalSensitivity(T, scorer = "all", method = doc.goals.method) {
  const base = leafRanks(T, scorer, null, method), R = goalResults(T, scorer);
  const top = r => [...r].filter(([, k]) => k <= 3).map(([id]) => id).sort().join("|");
  const top0 = top(base), range = new Map([...base].map(([id, k]) => [id, { lo: k, hi: k }])), changes = [];
  [...R].forEach(([gid, r]) => { if (r.s == null) return;
    [-1, 1].forEach(d => { const s2 = Math.max(1, Math.min(5, r.s + d)); if (Math.abs(s2 - r.s) < 1e-9) return;
      const k2 = leafRanks(T, scorer, new Map([[gid, s2]]), method);
      k2.forEach((k, id) => { const x = range.get(id); if (x) { x.lo = Math.min(x.lo, k); x.hi = Math.max(x.hi, k); } });
      if (top(k2) !== top0) changes.push({ gid, from: r.s, to: s2, top: [...k2].filter(([, k]) => k <= 3).sort((a, b) => a[1] - b[1]).map(([id]) => id) });
    }); });
  return { base, range, changes, top: [...base].filter(([, k]) => k <= 3).sort((a, b) => a[1] - b[1]).map(([id]) => id) };
}
/* a function's relevance in a tree: the goals it serves there (a goal served together with one of its parents counts once,
   through the parent); absolute takes the most relevant, normalised adds the weights up */
function fnRelevance(f, T, R = goalResults(T), method = doc.goals.method) {
  const serves = (f.serves || []).filter(g => goalById(g));
  if (!T) return { rel: null, goals: [], elsewhere: serves };
  const here = serves.filter(g => inTree(g, T) && !goalOut(T, g)), elsewhere = serves.filter(g => !here.includes(g));
  const top = here.filter(g => !goalPath(T, g).slice(0, -1).some(p => here.includes(p)));
  const vals = top.map(g => relOf(R.get(g), method)).filter(v => v != null);
  return { rel: vals.length ? (method === "normalised" ? vals.reduce((a, b) => a + b, 0) : Math.max(...vals)) : null, goals: here, elsewhere };
}
const maxLeafRel = (T, R = goalResults(T)) => Math.max(0, ...goalLeaves(T).map(id => relOf(R.get(id)) || 0));
function fmtScore(s) { return s == null ? "–" : Math.abs(s - Math.round(s)) < .05 ? String(Math.round(s)) : s.toFixed(1); }
function fmtRel(v, method = doc.goals.method) { return v == null ? "–" : method === "normalised" ? (v * 100).toFixed(1) + " %" : v.toFixed(2); }
const fmtRange = (lo, hi) => lo === hi ? String(lo) : `${lo}–${hi}`;

/* every gap worth looking at in one tree */
function goalChecks(T) {
  if (!T) return null;
  const R = goalResults(T), leaves = goalLeaves(T), max = maxLeafRel(T, R) || 1, inScope = T.nodes.filter(n => !goalOut(T, n.goal)).map(n => n.goal);
  const vs = variantsOfTree(T), served = new Set();
  const fnRows = vs.flatMap(V => [V.root, ...Object.keys(V.placed)].map(fnById).filter(Boolean).map(f => { const fr = fnRelevance(f, T, R); fr.goals.forEach(g => served.add(g)); return { f, V, ...fr }; }));
  served.forEach(g => goalDesc(T, g).forEach(d => served.add(d))); // serving a goal serves what is under it
  return { R, max,
    single: inScope.filter(g => goalKids(T, g).filter(k => !gnode(T, k).out).length === 1),
    noMeasure: leaves.filter(g => !txAll(goalById(g), "measure").length),
    unscored: inScope.filter(g => !goalScore(T, g)),
    disagree: inScope.filter(g => { const s = goalScore(T, g); return s && s.n > 1 && s.hi - s.lo >= 2; }),
    unserved: vs.length ? leaves.filter(g => !served.has(g)) : [],
    noGoal: fnRows.filter(x => x.f.id !== x.V.root && !x.goals.length),
    keyLow: fnRows.filter(x => x.f.key && (x.rel == null || x.rel / max < REL_LOW)),
    highNoKey: fnRows.filter(x => !x.f.key && x.rel != null && x.rel / max >= REL_HIGH),
    elsewhere: fnRows.filter(x => x.elsewhere.length),
    variants: vs };
}

/* ================= Editing ================= */
function needTree() { if (curTree()) return true; toast("Start a goals tree first: pick a boundary in the side panel."); return false; }
async function addGoal(parent = GOAL_ROOT, after = null) {
  if (VIEWER || !needTree()) return;
  const T = curTree(), g = newGoal("");
  await commit(() => {
    doc.goals.catalogue.push(g);
    const n = { goal: g.id, parent: parent === GOAL_ROOT ? null : parent, out: false, scores: {} }, t = goalTreeById(T.id);
    const i = after ? t.nodes.findIndex(x => x.goal === after) : -1;
    if (i >= 0) t.nodes.splice(i + 1, 0, n); else t.nodes.push(n);
  });
  selId = g.id; selFlow = null; multi = [g.id]; applySelection(); renderPanel();
  inlineEdit(g.id, true);
}
function addGoalSibling(gid) { const n = gnode(curTree(), gid); return n ? addGoal(n.parent || GOAL_ROOT, gid) : addGoal(GOAL_ROOT); }
function placeGoal(gid, parent = GOAL_ROOT) {
  if (!needTree() || inTree(gid)) return goTo(gid);
  commit(() => { curTree().nodes.push({ goal: gid, parent: parent === GOAL_ROOT ? null : parent, out: false, scores: {} }); }).then(() => goTo(gid));
}
function setGoalParent(gid, pid) {
  const T = curTree(), n = gnode(T, gid); if (!n) return;
  pid = pid === GOAL_ROOT ? null : pid;
  if (pid === gid || (pid && goalPath(T, pid).includes(gid))) return toast("A goal cannot sit under itself or under one of its own subgoals.");
  if ((n.parent || null) === pid) return render({ skipPanel: true });
  commit(() => { const m = gnode(curTree(), gid), t = curTree(); m.parent = pid; t.nodes.splice(t.nodes.indexOf(m), 1); t.nodes.push(m); });
  toast(`Moved under “${goalLabel(pid || GOAL_ROOT)}”. Its scores stay: check that they still answer “${SCORE_QUESTION.replace("its parent", "the new parent")}”`, 5500);
}
function moveGoal(gid, dir) { // earlier or later among its siblings
  const T = curTree(), n = gnode(T, gid); if (!n) return;
  const sibs = T.nodes.filter(x => (x.parent || null) === (n.parent || null)), i = sibs.indexOf(n), j = i + dir;
  if (j < 0 || j >= sibs.length) return;
  commit(() => { const t = curTree(), a = t.nodes.indexOf(gnode(t, gid)), b = t.nodes.indexOf(gnode(t, sibs[j].goal)); [t.nodes[a], t.nodes[b]] = [t.nodes[b], t.nodes[a]]; });
}
function removeGoals(ids) { // from this tree; their subgoals move up; the goals stay in the catalogue
  const T = curTree(), set = new Set(ids.filter(id => inTree(id, T))); if (!set.size) return;
  commit(() => { const t = curTree();
    t.nodes.forEach(n => { let p = n.parent; while (p && set.has(p)) p = (gnode(t, p) || {}).parent || null; n.parent = p; });
    t.nodes = t.nodes.filter(n => !set.has(n.goal)); });
  toast(`Removed from this tree; ${set.size === 1 ? "the goal stays" : "the goals stay"} in the catalogue with notes and sources. Subgoals moved up. Ctrl Z to undo.`, 4500);
}
function deleteGoal(gid) { // from the catalogue, every tree and every function
  const ts = treesWith(gid), fs = doc.functions.filter(f => (f.serves || []).includes(gid));
  if ((ts.length || fs.length) && !confirm(`Delete “${goalLabel(gid)}” everywhere? It is in ${ts.length} tree${ts.length === 1 ? "" : "s"}${fs.length ? ` and ${fs.length} function${fs.length === 1 ? " serves" : "s serve"} it` : ""}. Ctrl Z brings it back.`)) return;
  commit(() => {
    doc.goals.trees.forEach(t => { const up = (gnode(t, gid) || {}).parent || null; t.nodes.forEach(n => { if (n.parent === gid) n.parent = up; }); t.nodes = t.nodes.filter(n => n.goal !== gid); });
    doc.goals.catalogue = doc.goals.catalogue.filter(g => g.id !== gid);
    doc.functions.forEach(f => { f.serves = (f.serves || []).filter(x => x !== gid); });
  });
}
function setScore(gid, sid, v) {
  const T = curTree(); if (!gnode(T, gid) || !shById(sid)) return;
  commit(() => { const n = gnode(curTree(), gid); if (v) n.scores[sid] = v; else delete n.scores[sid]; }, { skipPanel: false });
}
function scoreSelected(v) { // keys 1–5 (0 clears) score the selected goal as the stakeholder on screen
  const T = curTree(); if (!selId || !gnode(T, selId)) return;
  const sh = doc.goals.stakeholders, sid = view.scorer !== "all" && shById(view.scorer) ? view.scorer : sh.length === 1 ? sh[0].id : null;
  if (!sid) return toast("Pick who is scoring in the toolbar first; the combined view can't be scored directly.", 4500);
  setScore(selId, sid, v);
}
async function startTree(boundary, copyFrom) {
  if (treeOfBoundary(boundary)) { doc.goals.active = treeOfBoundary(boundary).id; return render({ fit: true }); }
  const T = newGoalTree(boundary), src = copyFrom && goalTreeById(copyFrom);
  if (src) T.nodes = src.nodes.map(n => ({ goal: n.goal, parent: n.parent, out: n.out, scores: {} }));
  await commit(() => { doc.goals.trees.push(T); doc.goals.active = T.id; }, { fit: true });
  selId = null; multi = []; renderPanel();
  toast(src ? `Started from the structure of “${treeName(src)}”. Scores start empty: the same goal can matter differently inside another boundary.` : "Double-click the canvas, or press Tab on the main goal, to add the first family of goals.", 6000);
}
function deleteTree(tid) {
  const T = goalTreeById(tid); if (!T) return;
  if (!confirm(`Delete the goals tree of “${treeName(T)}” with its scores? Its goals stay in the catalogue. Ctrl Z brings it back.`)) return;
  commit(() => { doc.goals.trees = doc.goals.trees.filter(t => t.id !== tid); if (doc.goals.active === tid) doc.goals.active = (doc.goals.trees[0] || {}).id || null; }, { fit: true });
}
function switchTree(tid) {
  if (!goalTreeById(tid) || tid === doc.goals.active) return;
  flushField(true); doc.goals.active = tid; selId = selFlow = null; multi = []; touch(); render({ fit: true });
}
function addStakeholder(name) {
  const s = { id: uid("sh"), name: name || `Stakeholder ${doc.goals.stakeholders.length + 1}`, note: "" };
  commit(() => doc.goals.stakeholders.push(s)).then(() => { view.scorer = s.id; render({ skipPanel: false }); });
  return s;
}
function deleteStakeholder(sid) {
  const s = shById(sid); if (!s) return;
  if (doc.goals.stakeholders.length < 2) return toast("Keep at least one stakeholder: someone has to score.");
  const n = doc.goals.trees.reduce((a, t) => a + t.nodes.filter(x => x.scores[sid]).length, 0);
  if (n && !confirm(`Delete “${s.name}” and their ${n} score${n === 1 ? "" : "s"}? Ctrl Z brings them back.`)) return;
  commit(() => { doc.goals.stakeholders = doc.goals.stakeholders.filter(x => x.id !== sid); doc.goals.trees.forEach(t => t.nodes.forEach(x => delete x.scores[sid])); if (view.scorer === sid) view.scorer = "all"; });
}

/* ================= Drawing the tree, left to right ================= */
function goalBox(gid) {
  const o = gid === GOAL_ROOT ? doc.goals.root : goalById(gid);
  const pre = gid !== GOAL_ROOT && (gnode(curTree(), gid) || {}).out ? "⊘ " : "";
  const empty = gid === GOAL_ROOT && !txAll(o).length;
  const v = nodeVisual(empty ? { text: "Main goal: double-click to write it", textTr: {} } : o, 0, "", pre);
  return { ...v, w: Math.max(v.w, gid === GOAL_ROOT ? 150 : 110) };
}
function goalLayout(T) { // the root, then a column per level; leaves stacked, a parent centred on its children
  const size = new Map(), colW = [];
  const measure = (gid, d) => { const s = goalBox(gid); size.set(gid, s); colW[d] = Math.max(colW[d] || 0, s.w); goalKids(T, gid).forEach(k => measure(k, d + 1)); };
  measure(GOAL_ROOT, 0);
  const colX = []; let x = 0; colW.forEach((w, d) => { colX[d] = x; x += w + GOAL_GAP.x; });
  const pos = new Map(); let y = 0;
  const place = (gid, d) => {
    const kids = goalKids(T, gid), s = size.get(gid);
    if (!kids.length) { pos.set(gid, { x: colX[d] + s.w / 2, y: y + s.h / 2 }); y += s.h + GOAL_GAP.y; return; }
    kids.forEach(k => place(k, d + 1));
    const a = pos.get(kids[0]).y, b = pos.get(kids[kids.length - 1]).y;
    pos.set(gid, { x: colX[d] + s.w / 2, y: (a + b) / 2 });
  };
  place(GOAL_ROOT, 0);
  return { pos, size };
}
const GOAL_TINT = () => isDark() ? "#1F4A3A" : "#CDEBDD";
async function renderGoals(opts = {}) {
  const T = curTree(), dark = isDark(), R = goalResults(T, view.scorer), L = goalLayout(T);
  const max = Math.max(1e-9, ...goalLeaves(T).map(id => relOf(R.get(id)) || 0), ...[...R.values()].map(r => relOf(r) || 0));
  const els = [];
  const rs = L.size.get(GOAL_ROOT);
  els.push({ group: "nodes", data: { id: GOAL_ROOT, label: rs.label, w: rs.w, h: rs.h, fill: dark ? "#0E6B4E" : "#0E6B4E", stroke: "#08402F", font: "#FFFFFF", bw: 1.5, bs: "solid",
    fs: txAll(doc.goals.root).length ? (doc.languages.length > 1 && txMissing(doc.goals.root) ? "italic" : "normal") : "italic" }, position: L.pos.get(GOAL_ROOT), classes: "groot" });
  (T ? T.nodes : []).forEach(n => {
    const s = L.size.get(n.goal), r = R.get(n.goal), out = goalOut(T, n.goal), rel = out ? null : relOf(r);
    els.push({ group: "nodes", data: { id: n.goal, label: s.label, w: s.w, h: s.h, fill: css("--panel"), stroke: out ? css("--muted") : "#3E9A78", font: css("--ink"), bw: 1.4, bs: out ? "dashed" : "solid",
      fs: s.fs, gp: rel == null ? 0 : Math.round(Math.max(0, Math.min(1, rel / max)) * 100), gt: GOAL_TINT(), gb: css("--panel") },
      position: L.pos.get(n.goal), classes: "goal" + (out ? " gout" : "") + (rel != null ? " hasrel" : "") });
    els.push({ group: "edges", data: { id: "ge:" + n.goal, source: n.parent || GOAL_ROOT, target: n.goal }, classes: "gedge" + (out ? " gout" : "") });
  });
  cy.batch(() => { cy.elements().remove(); cy.add(els); });
  // chips on the bottom edge of each goal: its score (with the spread when stakeholders differ) and its relevance
  const chips = [];
  mctx.font = `600 10.5px ${FONT_STACK}`;
  const chip = (id, label, cls, x, y) => { const w = Math.ceil(mctx.measureText(label).width) + 14; chips.push({ group: "nodes", data: { id, label, w }, classes: "badge gchip " + cls, position: { x: x + (cls === "grel" ? -w / 2 : w / 2), y } }); };
  (T ? T.nodes : []).forEach(n => { if (goalOut(T, n.goal)) return;
    const el = cy.getElementById(n.goal), bb = el.boundingBox({ includeLabels: false }), sc = goalScore(T, n.goal, view.scorer), r = R.get(n.goal);
    chip("gs:" + n.goal, sc ? (sc.n > 1 && sc.hi > sc.lo ? `${fmtScore(sc.s)} · ${sc.lo}–${sc.hi}` : fmtScore(sc.s)) : "no score", "gscore" + (sc ? "" : " none"), bb.x1 + 8, bb.y2);
    if (r && relOf(r) != null) chip("gr:" + n.goal, fmtRel(relOf(r)), "grel", bb.x2 - 8, bb.y2);
  });
  if (chips.length) cy.add(chips);
  cy.nodes().forEach(n => (n.hasClass("goal") && !VIEWER) ? n.grabify() : n.ungrabify());
  lastRender = { goals: true };
  updateChrome(); renderLegend(); renderTagbar(); syncControls();
  if (!opts.skipPanel) renderPanel();
  applySelection(); applyTagFilter(); doSearch(false); updateOverlays();
  if (opts.fit) fitView();
}
function goalStyles(ink, ground, muted, dark) {
  return [
    { selector: "node.goal", style: { "text-max-width": 300 } },
    { selector: "node.goal.hasrel", style: { "background-fill": "linear-gradient", "background-gradient-direction": "to-right",
      "background-gradient-stop-colors": e => `${e.data("gt")} ${e.data("gt")} ${e.data("gb")} ${e.data("gb")}`,
      "background-gradient-stop-positions": e => `0% ${e.data("gp")}% ${e.data("gp")}% 100%` } },
    { selector: "node.gout", style: { opacity: .55 } },
    { selector: "node.groot", style: { "font-weight": 600, "text-max-width": 300 } },
    { selector: "edge.gedge", style: { "curve-style": "taxi", "taxi-direction": "rightward", "taxi-turn": "50%", "source-endpoint": "90deg", "target-endpoint": "270deg",
      width: 1.5, "line-color": muted, "line-style": "solid", "target-arrow-shape": "none", label: "", events: "no" } },
    { selector: "edge.gedge.gout", style: { "line-style": "dashed", "line-dash-pattern": [5, 5], opacity: .6 } },
    { selector: "node.gchip", style: { shape: "round-rectangle", "corner-radius": 9, height: 18, "font-family": FONT_STACK, "font-size": 10.5, "font-weight": 600, "z-index": 22, color: ink } },
    { selector: "node.gscore", style: { "background-color": dark ? "#4A3A12" : "#FFF4D6", "border-color": "#C5A43A" } },
    { selector: "node.gscore.none", style: { "background-color": ground, "border-color": muted, "border-style": "dashed", color: muted, "font-weight": 400 } },
    { selector: "node.grel", style: { "background-color": dark ? "#123D2E" : "#E2F3EA", "border-color": "#3E9A78" } },
  ];
}

/* the tree as a picture, as on screen */
function exportGoalsSVG() {
  const ink = "#1b2420", muted = "#5f6e68";
  const bb = cy.elements().boundingBox({ includeLabels: true });
  const pad = 26, W = Math.ceil(bb.w + pad * 2), H = Math.ceil(bb.h + pad * 2 + 26), ox = pad - bb.x1, oy = pad - bb.y1;
  const X = v => (v + ox).toFixed(1), Y = v => (v + oy).toFixed(1);
  const T = curTree();
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="IBM Plex Sans, Helvetica, Arial, sans-serif">`,
    `<title>${esc(tx(doc, "title"))} · goals · ${esc(treeName(T))}</title>`, `<rect width="100%" height="100%" fill="#ffffff"/>`, `<defs>`];
  const defs = out.length - 1, grads = [];
  cy.edges(".gedge").forEach(e => { const s = e.source().boundingBox({ includeLabels: false }), t = e.target().boundingBox({ includeLabels: false });
    const x1 = s.x2, y1 = (s.y1 + s.y2) / 2, x2 = t.x1, y2 = (t.y1 + t.y2) / 2, xm = (x1 + x2) / 2;
    out.push(`<path d="M${X(x1)} ${Y(y1)} H${X(xm)} V${Y(y2)} H${X(x2)}" fill="none" stroke="${muted}" stroke-width="1.5"${e.hasClass("gout") ? ` stroke-dasharray="5 5" opacity="0.6"` : ""}/>`); });
  cy.nodes(".goal, .groot").forEach(n => { const d = n.data(), b = n.boundingBox({ includeLabels: false }), p = n.position(), root = n.hasClass("groot");
    let fill = root ? "#0E6B4E" : "#ffffff";
    if (n.hasClass("hasrel")) { const gid = "g" + grads.length; grads.push(`<linearGradient id="${gid}" x1="0" x2="1" y1="0" y2="0"><stop offset="${d.gp}%" stop-color="#CDEBDD"/><stop offset="${d.gp}%" stop-color="#ffffff"/></linearGradient>`); fill = `url(#${gid})`; }
    out.push(`<g${n.hasClass("gout") ? ` opacity="0.55"` : ""}><rect x="${X(b.x1)}" y="${Y(b.y1)}" width="${b.w.toFixed(1)}" height="${b.h.toFixed(1)}" rx="7" fill="${fill}" stroke="${root ? "#08402F" : n.hasClass("gout") ? muted : "#3E9A78"}" stroke-width="1.4"${d.bs === "dashed" ? ` stroke-dasharray="6 4"` : ""}/>`);
    const lines = d.label.split("\n"), y0 = p.y - (lines.length - 1) * LINE / 2;
    lines.forEach((l, i) => out.push(`<text x="${X(p.x)}" y="${Y(y0 + i * LINE)}" font-size="${FONT_PX}"${root ? ` font-weight="600"` : ""}${d.fs === "italic" ? ` font-style="italic"` : ""} fill="${root ? "#ffffff" : ink}" text-anchor="middle" dominant-baseline="central">${esc(l)}</text>`));
    out.push(`</g>`); });
  cy.nodes(".gchip").forEach(n => { const d = n.data(), p = n.position(), sc = n.hasClass("gscore"), none = n.hasClass("none");
    out.push(`<rect x="${X(p.x - d.w / 2)}" y="${Y(p.y - 9)}" width="${d.w}" height="18" rx="9" fill="${none ? "#ffffff" : sc ? "#FFF4D6" : "#E2F3EA"}" stroke="${none ? muted : sc ? "#C5A43A" : "#3E9A78"}" stroke-width="1"${none ? ` stroke-dasharray="3 2"` : ""}/>`);
    out.push(`<text x="${X(p.x)}" y="${Y(p.y)}" font-size="10.5" font-weight="${none ? 400 : 600}" fill="${none ? muted : ink}" text-anchor="middle" dominant-baseline="central">${esc(d.label)}</text>`); });
  out[defs] = `<defs>${grads.join("")}`; out.splice(defs + 1, 0, `</defs>`);
  const M = GOAL_METHODS[doc.goals.method], who = view.scorer === "all" ? `${GOAL_AGGREGATES[doc.goals.aggregate].name.toLowerCase()} of ${doc.goals.stakeholders.length} stakeholder${doc.goals.stakeholders.length === 1 ? "" : "s"}` : (shById(view.scorer) || {}).name;
  out.push(`<text x="${pad}" y="${H - 14}" font-size="11" fill="${muted}">Score 1–5 (${esc(who)}) · ${esc(M.name.toLowerCase())} ${esc(M.short)} · the shaded part of a goal is its relevance next to the most relevant one</text>`);
  out.push(`</svg>`);
  return { svg: out.join("\n"), W, H };
}

/* one row per goal and tree: every stakeholder's score, the combined score, both relevances, rank and its range under ±1 */
function exportGoalsCSV() {
  const Lg = doc.languages, S = doc.goals.stakeholders, meth = doc.goals.method;
  const head = ["tree", "id", "level", "path", ...Lg.map(l => "text_" + l), ...Lg.map(l => "measure_" + l), "in_scope", "leaf",
    ...S.map(s => "score_" + slug(s.name).toLowerCase()), `combined_${doc.goals.aggregate}`, "spread", "relevance_absolute", "weight_normalised",
    `rank_${meth}`, "rank_range_plus_minus_1", ...S.map(s => `${meth === "normalised" ? "weight" : "relevance"}_${slug(s.name).toLowerCase()}`), "functions_serving", "notes", "sources"];
  const rows = [head];
  doc.goals.trees.forEach(T => {
    const R = goalResults(T), sens = goalSensitivity(T), leaves = new Set(goalLeaves(T)), per = S.map(s => goalResults(T, s.id));
    const walk = gid => goalKids(T, gid).forEach(k => {
      const g = goalById(k), n = gnode(T, k), sc = goalScore(T, k), r = R.get(k), rg = sens.range.get(k);
      rows.push([treeName(T), k, goalDepth(T, k), goalPath(T, k).map(goalLabel).join(" > "), ...Lg.map(l => txRaw(g, "text", l)), ...Lg.map(l => txRaw(g, "measure", l)),
        goalOut(T, k) ? "no" : "yes", leaves.has(k) ? "yes" : "no", ...S.map(s => n.scores[s.id] || ""), sc ? +sc.s.toFixed(3) : "", sc && sc.n > 1 ? `${sc.lo}-${sc.hi}` : "",
        r && r.abs != null ? +r.abs.toFixed(4) : "", r && r.norm != null ? +r.norm.toFixed(4) : "", sens.base.get(k) || "", rg ? fmtRange(rg.lo, rg.hi) : "",
        ...per.map(P => { const v = relOf(P.get(k), meth); return v == null ? "" : +v.toFixed(4); }),
        doc.functions.filter(f => (f.serves || []).includes(k)).map(f => tx(f)).join(" | "), g.notes, g.sources.join(" | ")]);
      walk(k); });
    walk(GOAL_ROOT);
  });
  const name = `${baseName()}-goals.csv`; download(name, toCSV(rows), "text/csv"); toast(`${name} exported: every tree, both relevances, and the ranks under ±1.`, 4500);
}
