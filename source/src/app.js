/* Uchuva RCA Workbench — offline root-cause-analysis editor.
   Data lives in one JSON document (boxes, arrows, colour key, versions). */
/* global cytoscape, ELK */
"use strict";

/* ================= Constants ================= */
const APP_VERSION = "1.0";
const FONT_PX = 13, LINE = 17, MAXW = 150, PADX = 11, PADY = 8;
const FONT_STACK = '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
const STATUSES = {
  unassessed: { name: "Not assessed", short: "None",       color: null,      style: "solid",  width: 1.3 },
  hypothesis: { name: "Hypothesis",   short: "Hypothesis", color: "#D99A00", style: "dashed", width: 3 },
  supported:  { name: "Supported by evidence", short: "Supported", color: "#15924F", style: "solid",  width: 3 },
  refuted:    { name: "Refuted",      short: "Refuted",    color: "#D23B3B", style: "dotted", width: 3 },
};
const ROLES = {
  none:         { name: "No rule",              hint: "" },
  problem:      { name: "Problem statement",    hint: "The problem being explained" },
  intermediate: { name: "Intermediate cause",   hint: "Should be explained by at least one deeper cause" },
  root:         { name: "Root cause",           hint: "Should be the end of its chain: no deeper causes" },
  uncertain:    { name: "Uncertain",            hint: "A cause you are not sure about" },
  question:     { name: "Open question",        hint: "A gap still to investigate" },
};
const DEFAULT_CATS = [
  { id: "problem",  name: "Root problem",       role: "problem",      desc: "The problem being explained.", fill: "#fff2cc", stroke: "#d6b656", font: "#1a1a1a" },
  { id: "cause",    name: "Intermediate cause", role: "intermediate", desc: "A cause that is itself explained by deeper causes.", fill: "#1ba1e2", stroke: "#006eaf", font: "#ffffff" },
  { id: "fact",     name: "Root cause",         role: "root",         desc: "The very root cause, or the last causal point I was able to determine.", fill: "#f5f5f5", stroke: "#666666", font: "#333333" },
  { id: "plant",    name: "Unsure",             role: "uncertain",    desc: "A cause I am not sure about. Shades of purple show the degree of doubt.", fill: "#e1d5e7", stroke: "#9673a6", font: "#1a1a1a" },
  { id: "question", name: "Open question",      role: "question",     desc: "A gap in the chain still to investigate.", fill: "#d80073", stroke: "#a50040", font: "#ffffff" },
];
// names the first version of the app guessed; files that still carry them get the real meanings
const OLD_GUESSES = { problem: "Observed problem", cause: "Cause", fact: "Supporting fact / condition", plant: "Plant-level factor", question: "Open question" };
const DEFAULT_VIEW = { mode: "manual", focusR: 0, trace: true, redundant: "show", effort: 3, place: 1,
  levelSp: 70, nodeSp: 14, route: "ORTHOGONAL", keepOrder: false, split: false, repeat: true };
const LS_DOC = "uchuva-rca:doc", LS_VIEW = "uchuva-rca:view", LS_FILE = "uchuva-rca:file";

/* ================= Built-in diagram (transcribed from draw.io, 27 Sep 2026) ================= */
// [id, text, x, y, w, h, kind]  kind: Y problem, B cause (blue outline), K cause (black outline), G fact, Q question, P plant
const RAW = [
 ["3","Some goldenberry is rejected at destination",-970,531.99,120,83.76,"Y"],
 ["16","Some pallets are infested with botrytis cinerea",-805,531.99,120,83.76,"Y"],
 ["10","Goldenberry is infected with the fungus",-610,486.91,140,50,"B"],
 ["14","Conditions are favorable for the germination and growth of the pathogen",-610,602,170,73.75,"B"],
 ["71","Infected fruits are not discarded",-610,385.75,120,50,"B"],
 ["72","Spores are too small",-632.5,267,80,50,"G"],
 ["73","damage is not visible",-547.5,266.99,80,50,"G"],
 ["60","Fungus was already inside the fruit in quiescent state",-400,162,130,61.89,"K"],
 ["51","Spores survived in the fruit surface since preharvest",-400,262,130,61.89,"K"],
 ["55","Spores get disseminated on the fruit surface at sorting facilities",-400,367,130,73.75,"K"],
 ["58","Spores get disseminated on the fruit surface during transport",-400,484,130,61.89,"K"],
 ["24","travel time of ~13 days overseas",-410,618.88,130,40,"G"],
 ["30","Pathogen gets access to sugars",-410,675.75,130,50,"K"],
 ["23","Temperature is allows the pathogen to develop",-410,748.99,130,61.89,"K"],
 ["79","Spores reached the flower",-220,167.94,90,50,"K"],
 ["81","Air conduction",-110,157,110,20,"K"],
 ["83","Water droplets",-110,182.94,110,20,"K"],
 ["85","Insect dispersal",-110,207.94,110,20,"K"],
 ["88","near by contaminated material",25,167.47,90,50,"K"],
 ["109","neighboring crops have the disease",142.5,138.94,90,50,"G"],
 ["110","infected crop debris in the field",140,196,95,50,"K"],
 ["68","Conditions where favorable for spore survival",-230,267,130,50,"K"],
 ["75","?",-70,281.99,20,20,"Q"],
 ["62","The drying process uses fans which blow air at a batch of physalis",-230,328,150,61.89,"G"],
 ["64","Inspection requires a manual process that implies touching fruits with & without spores",-220,397,130,83.76,"K"],
 ["74","The fruit is not visible directly as it is inside a calyx",-70,402.01,110,73.75,"G"],
 ["65","Transport means may be already contaminated with spores",-230,486.91,180,50,"G"],
 ["66","Transport happens in contact with open air",-230,542,180,40,"G"],
 ["27","Pathogen can break through the fruit outer membrane",-240,632,130,61.89,"K"],
 ["92","Fruit is too ripe",-235,712,120,50,"K"],
 ["61","There is uneven ventillation that generates favorable microclimates [**]",-240,802,130,61.89,"G"],
 ["17","Fungi can develop in temperatures as low 0°C",-240,874.65,130,61.89,"G"],
 ["19","Container temperatures are around 2°C and 8°C",-240,947,130,61.89,"K"],
 ["35","Fruit membrane is damaged",-80,637.94,80,50,"K"],
 ["101","Fruit membrane is too fragile",-80,705,90,50,"K"],
 ["94","Too ripe fruit passes the selection stage",-80,772,120,50,"K"],
 ["96","Cold chain is broken",-80,844.65,120,50,"K"],
 ["52","Fresh fruit cannot endure lower temperatures",-80,952.95,120,50,"G"],
 ["36","Mechanical damage during harvest",70,397.45,120,50,"K"],
 ["37","Mechanical damage during sorting",75,455.02,120,50,"K"],
 ["38","Mechanical damage during transportation",75,518.7,120,50,"K"],
 ["40","During field the fruit fills with too much water too quick",75,582.45,140,50,"K"],
 ["104","Plant absorbs less calcium",80,687.94,90,40,"K"],
 ["106","?",80,742,20,20,"Q"],
 ["95","Observer is not objective",70,772,120,50,"G"],
 ["114","At port 2-3 days long queue for inspection",75,834,120,50,"K"],
 ["99","?",80,895.59,20,20,"Q"],
 ["43","Sudden changes in soil humidity",235,523.23,110,40,"K"],
 ["45","Plant has a high cracking rate",235,579.35,110,40,"K"],
 ["107","Root inactivity",235,661,70,40,"P"],
 ["108","High humidity",235,702.99,70,40,"P"],
 ["115","High utilization of the port",260,807.12,95,40,"K"],
 ["116","Anti-narcotics check",260,849.77,95,40,"K"],
 ["117","Phytosanitary checks",260,892.18,95,40,"K"],
 ["48","Changes in rainfall patterns",380,472,110,40,"K"],
 ["49","Uneven irrigation",380,523.23,110,40,"K"],
 ["47","?",380,589.35,20,20,"Q"],
];
const RAW_EDGES = `3>16 16>10 16>14 16>71 10>60 10>51 10>55 10>58 14>24 14>30 14>23 71>72 71>73
60>79 79>81 79>83 79>85 81>88 83>88 85>88 88>109 88>110 51>68 68>75 55>62 55>64 64>74 58>65 58>66
30>27 30>92 27>35 27>101 35>36 35>37 35>38 35>40 40>43 40>45 43>48 43>49 45>47
101>104 101>106 104>107 104>108 92>61 92>94 92>96 94>95 96>114 96>99 114>115 114>116 114>117
23>19 23>17 23>61 19>52`;

/* ================= Small helpers ================= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const clone = o => JSON.parse(JSON.stringify(o));
const nowISO = () => new Date().toISOString();
function roman(n) {
  const m = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let s = ""; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s;
}
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) + " " +
         d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
let toastTimer = null;
function toast(msg, ms = 3200) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), ms);
}
function download(name, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };

/* ================= Text measuring ================= */
const mctx = document.createElement("canvas").getContext("2d");
function wrap(text, maxw = MAXW) {
  mctx.font = `${FONT_PX}px ${FONT_STACK}`;
  const words = String(text || " ").split(/\s+/); const lines = []; let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (mctx.measureText(t).width <= maxw || !cur) cur = t; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return { lines, w: Math.max(...lines.map(l => mctx.measureText(l).width)) };
}
const sizeCache = new Map();
function measureText(text) {
  if (sizeCache.has(text)) return sizeCache.get(text);
  let r;
  if (text.trim() === "?") r = { w: 30, h: 30, lines: ["?"] };
  else { const m = wrap(text); r = { w: Math.ceil(Math.min(MAXW, m.w)) + PADX * 2, h: m.lines.length * LINE + PADY * 2, lines: m.lines }; }
  sizeCache.set(text, r); return r;
}

/* ================= Document model ================= */
let doc = null;
let fileHandle = null, fileName = "uchuva-rca.json", dirty = false;
const undoStack = [], redoStack = [];

function emptyDoc() {
  return { format: "uchuva-rca", schema: 1, app: APP_VERSION, title: "Rejected uchuva: why?",
    categories: clone(DEFAULT_CATS), nodes: [], edges: [], versions: [],
    meta: { created: nowISO(), modified: nowISO() } };
}
function newNode(text, cat, x, y) {
  return { id: uid("n"), text, cat, status: "unassessed", notes: "", sources: [], x: Math.round(x), y: Math.round(y) };
}
function coreOf(d) { return { title: d.title, categories: d.categories, nodes: d.nodes, edges: d.edges }; }
function mkVersion(d, name, note) { return { id: uid("v"), name, note: note || "", at: nowISO(), snapshot: clone(coreOf(d)) }; }

function builtinDoc() {
  const K = { Y: ["problem"], B: ["cause"], K: ["cause", "#000000"], G: ["fact"], Q: ["question"], P: ["plant"] };
  const d = emptyDoc();
  d.nodes = RAW.map(([id, text, x, y, w, h, k]) => {
    const n = { id, text, cat: K[k][0], status: "unassessed", notes: "", sources: [],
      x: Math.round((x + w / 2) * 1.55), y: Math.round((y + h / 2) * 1.55) };
    if (K[k][1]) n.outline = K[k][1];
    return n;
  });
  d.edges = RAW_EDGES.trim().split(/\s+/).map((p, i) => { const [s, t] = p.split(">"); return { id: "e" + (i + 1), source: s, target: t }; });
  tidyPositions(d.nodes);
  d.versions = [mkVersion(d, "Imported from draw.io", "Transcribed from the draw.io root-cause diagram (57 boxes, 59 arrows).")];
  return d;
}

function normalizeDoc(d) {
  if (!d || typeof d !== "object" || !Array.isArray(d.nodes) || !Array.isArray(d.edges)) throw new Error("This JSON file is not an RCA file.");
  const out = emptyDoc();
  out.title = String(d.title || out.title);
  out.categories = Array.isArray(d.categories) && d.categories.length ? d.categories.map(c => {
    const r = { id: String(c.id), name: String(c.name || c.id), role: ROLES[c.role] ? c.role : "none", desc: String(c.desc || ""),
      fill: c.fill || "#ffffff", stroke: c.stroke || "#000000", font: c.font || "#000000" };
    const def = DEFAULT_CATS.find(x => x.id === r.id);
    if (def && OLD_GUESSES[r.id] === r.name && !c.role) { r.name = def.name; r.role = def.role; r.desc = def.desc; out._migrated = true; }
    return r;
  }) : clone(DEFAULT_CATS);
  const catIds = new Set(out.categories.map(c => c.id));
  const ids = new Set();
  let missingPos = false;
  out.nodes = d.nodes.map(n => {
    const id = String(n.id); ids.add(id);
    if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) missingPos = true;
    const r = { id, text: String(n.text ?? n.label ?? ""), cat: catIds.has(n.cat) ? n.cat : out.categories[0].id,
      status: STATUSES[n.status] ? n.status : "unassessed", notes: String(n.notes || ""),
      sources: Array.isArray(n.sources) ? n.sources.map(String) : [], x: Math.round(+n.x || 0), y: Math.round(+n.y || 0) };
    if (n.outline) r.outline = n.outline;
    return r;
  });
  const seen = new Set();
  out.edges = d.edges.map(e => ({ id: String(e.id || uid("e")), source: String(e.source), target: String(e.target) }))
    .filter(e => ids.has(e.source) && ids.has(e.target) && e.source !== e.target && !seen.has(e.source + ">" + e.target) && seen.add(e.source + ">" + e.target));
  out.versions = Array.isArray(d.versions) ? d.versions.filter(v => v && v.snapshot) : [];
  out.meta = Object.assign(out.meta, d.meta || {});
  if (missingPos) gridPositions(out);
  const migrated = !!out._migrated; delete out._migrated;
  if (migrated) out.meta.migratedKey = true;
  return out;
}
function gridPositions(d) { // crude level-based placement, then tidy
  const A = analyze(d); const col = new Map();
  d.nodes.forEach(n => { const lv = A.depth.get(n.id) || 1; const k = col.get(lv) || 0; col.set(lv, k + 1); n.x = lv * 230; n.y = k * 90; });
  tidyPositions(d.nodes);
}

/* Push overlapping boxes apart (mostly vertically, so columns stay intact) */
function tidyPositions(nodes, gap = 12) {
  const S = nodes.map(n => ({ n, ...measureText(n.text) }));
  for (let it = 0; it < 300; it++) {
    let moved = false;
    S.sort((a, b) => a.n.y - b.n.y || a.n.x - b.n.x);
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
      const a = S[i], b = S[j];
      const ox = (a.w + b.w) / 2 + gap - Math.abs(a.n.x - b.n.x);
      const oy = (a.h + b.h) / 2 + gap - Math.abs(a.n.y - b.n.y);
      if (ox > 0 && oy > 0) {
        moved = true;
        if (ox < 14 && ox < oy) { const s = a.n.x <= b.n.x ? 1 : -1; b.n.x += s * (ox / 2 + .5); a.n.x -= s * (ox / 2 + .5); }
        else { b.n.y += oy / 2 + .5; a.n.y -= oy / 2 + .5; }
      }
    }
    if (!moved) break;
  }
  nodes.forEach(n => { n.x = Math.round(n.x); n.y = Math.round(n.y); });
}

/* ================= Undo / commit ================= */
const snap = () => JSON.stringify(coreOf(doc));
function restoreCore(s) { const c = JSON.parse(s); doc.title = c.title; doc.categories = c.categories; doc.nodes = c.nodes; doc.edges = c.edges; }
function pushUndo(s) { undoStack.push(s); if (undoStack.length > 300) undoStack.shift(); redoStack.length = 0; }
function commit(fn, opts = {}) {
  flushField(true);
  pushUndo(snap());
  fn();
  touch();
  return render(opts);
}
function touch() {
  doc.meta.modified = nowISO(); dirty = true; autosave(); updateChrome();
}
function undo() {
  flushField(true);
  if (!undoStack.length) return toast("Nothing to undo");
  redoStack.push(snap()); restoreCore(undoStack.pop()); pruneSelection(); touch(); render({ animate: true });
}
function redo() {
  if (!redoStack.length) return toast("Nothing to redo");
  undoStack.push(snap()); restoreCore(redoStack.pop()); pruneSelection(); touch(); render({ animate: true });
}
let autosaveTimer = null;
function autosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    if (!lsSet(LS_DOC, JSON.stringify(doc))) console.warn("Autosave to browser storage failed");
    lsSet(LS_FILE, JSON.stringify({ fileName, dirty }));
  }, 300);
}
const nodeById = id => doc.nodes.find(n => n.id === id);
const catById = id => doc.categories.find(c => c.id === id) || { id, name: id, fill: "#ffffff", stroke: "#000000", font: "#000000" };
const isQ = n => n.text.trim() === "?";

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
const view = Object.assign({}, DEFAULT_VIEW, { folded: new Set(), hiddenCats: new Set(), diff: null });
const pins = new Map(); // ref -> {x,y} in Untangle coordinates, for boxes without arrows
try { Object.assign(view, JSON.parse(lsGet(LS_VIEW) || "{}")); } catch (e) {}
view.folded = new Set(); view.hiddenCats = new Set(); view.diff = null;
function saveView() { const { folded, hiddenCats, diff, ...rest } = view; lsSet(LS_VIEW, JSON.stringify(rest)); }

let selRef = null, selCopy = null, selEdge = null, multi = [];
let lastRender = null, manualCrossings = 0, lastTries = 1;

function computeView(A) {
  const reachAll = bfs(A.roots, A.out, () => false);
  const vis = bfs(A.roots, A.out, u => view.folded.has(u));
  A.ids.forEach(id => { if (!reachAll.has(id)) vis.add(id); });
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
      "min-zoomed-font-size": 4, "transition-property": "opacity", "transition-duration": "140ms" } },
    { selector: "node.q", style: { "font-weight": 700, "font-size": 15 } },
    { selector: "node.ref", style: { opacity: .78, "border-style": "dashed", "border-width": 2 } },
    { selector: "node.refuted", style: { opacity: .5 } },
    { selector: "node.cyc", style: { "underlay-color": "#D23B3B", "underlay-opacity": .35, "underlay-padding": 7 } },
    { selector: "node.badge", style: {
      shape: "round-rectangle", "corner-radius": 9, width: "data(w)", height: 19, "background-color": ink, "border-color": ground, "border-width": 2,
      label: "data(label)", color: ground, "font-family": '"IBM Plex Sans Condensed", ' + FONT_STACK, "font-weight": 600, "font-size": 12,
      "text-valign": "center", "text-halign": "center", events: "no", "z-index": 20, "z-compound-depth": "top" } },
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
    { selector: "node.drop", style: { "underlay-color": hi, "underlay-opacity": .55, "underlay-padding": 10 } },
  ];
}

function nodeVisual(n, extraLabel) {
  const c = catById(n.cat), st = STATUSES[n.status] || STATUSES.unassessed;
  const label = n.text + (extraLabel || "");
  const sz = measureText(label);
  return { label: sz.lines.join("\n"), w: sz.w, h: sz.h, fill: c.fill, font: c.font,
    stroke: st.color || n.outline || c.stroke, bw: st.width, bs: st.style };
}

async function render(opts = {}) {
  const my = (render.token = (render.token || 0) + 1);
  const A = analyze(); const V = computeView(A);
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
  lastRender = { A, V, U, pos, routes, crossings };
  applyToCy(U, V, A, byId, vis, pos, routes, opts);
  updateChrome(true); renderLegend(); syncControls();
  if (!opts.skipPanel) renderPanel();
  applySelection(); doSearch(false);
  if (opts.fit) {
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
  cy.nodes().forEach(n => { const ok = !n.hasClass("badge") && (view.mode === "manual" || (pins.has(n.data("ref")) && n.connectedEdges().empty())); ok ? n.grabify() : n.ungrabify(); });
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
function afterSelection() {
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

/* ================= Editing operations ================= */
function untangleToManual(x, y, skip) { // place the box near the same neighbour it sits next to on screen
  let best = null, bd = Infinity;
  cy.nodes().forEach(el => {
    if (el.hasClass("badge") || !el.visible() || el.data("ref") === skip) return; const n = nodeById(el.data("ref")); if (!n) return;
    const p = el.position(), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = { n, p }; }
  });
  return best ? { x: best.n.x + (x - best.p.x), y: best.n.y + (y - best.p.y) } : { x, y };
}
async function addNodeAt(x, y, fromRef) {
  const m = view.mode === "untangle" ? untangleToManual(x, y) : { x, y };
  const n = newNode("New cause", "cause", m.x, m.y);
  if (view.mode === "untangle" && !fromRef) pins.set(n.id, { x, y });
  await commit(() => {
    doc.nodes.push(n);
    if (fromRef) { doc.edges.push({ id: uid("e"), source: fromRef, target: n.id }); view.folded.delete(fromRef); }
  });
  selRef = n.id; selCopy = n.id; selEdge = null; multi = [n.id]; applySelection(); renderPanel();
  inlineEdit(n.id, true);
}
function addChild(pref) {
  const p = nodeById(pref); if (!p) return;
  const kids = doc.edges.filter(e => e.source === pref).map(e => nodeById(e.target)).filter(Boolean);
  const x = p.x + measureText(p.text).w / 2 + 40 + MAXW / 2 + PADX;
  const y = kids.length ? Math.max(...kids.map(k => k.y + measureText(k.text).h / 2)) + 40 : p.y;
  addNodeAt(x, y, pref);
}
function addEdge(s, t) {
  if (s === t) return toast("A box can't explain itself.");
  if (doc.edges.some(e => e.source === s && e.target === t)) return toast("These boxes are already connected.");
  const loop = reaches(t, s);
  pins.delete(s); pins.delete(t);
  commit(() => { doc.edges.push({ id: uid("e"), source: s, target: t }); view.folded.delete(s); });
  if (loop) toast("This arrow closes a loop (circular reasoning). Boxes in the loop glow red.", 5000);
}
function rewire(edgeId, end, ref) {
  const e = doc.edges.find(x => x.id === edgeId); if (!e) return;
  const s = end === "source" ? ref : e.source, t = end === "target" ? ref : e.target;
  if (s === t) return toast("A box can't explain itself.");
  if (doc.edges.some(x => x !== e && x.source === s && x.target === t)) return toast("These boxes are already connected.");
  if (s === e.source && t === e.target) return;
  commit(() => { e.source = s; e.target = t; });
  toast("Arrow rewired.");
}
function reverseEdge(edgeId) {
  const e = doc.edges.find(x => x.id === edgeId); if (!e) return;
  if (doc.edges.some(x => x.source === e.target && x.target === e.source)) return toast("The opposite arrow already exists.");
  commit(() => { [e.source, e.target] = [e.target, e.source]; });
}
function deleteSelection() {
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

/* inline text editor over a box */
function inlineEdit(copyId, isNew) {
  const el = cy.getElementById(copyId); if (el.empty()) return;
  const ref = el.data("ref"); const n = nodeById(ref); if (!n) return;
  const ta = $("#inline"); const bb = el.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
  const z = cy.zoom(), w = Math.max(bb.w, 190), h = Math.max(bb.h, 60);
  ta.style.left = (bb.x1 + bb.w / 2 - w / 2) + "px"; ta.style.top = (bb.y1 + bb.h / 2 - h / 2) + "px";
  ta.style.width = w + "px"; ta.style.height = h + "px"; ta.style.fontSize = Math.max(12, Math.min(18, FONT_PX * z)) + "px";
  ta.value = isNew ? "" : n.text; ta.placeholder = "What explains it?"; ta.hidden = false; ta.focus(); ta.select();
  let done = false;
  const finish = save => {
    if (done) return; done = true; ta.hidden = true;
    ta.removeEventListener("keydown", onKey); ta.removeEventListener("blur", onBlur);
    const v = ta.value.replace(/\s+/g, " ").trim();
    if (isNew) {
      if (!save || !v) { restoreCore(undoStack.pop()); pruneSelection(); if (!undoStack.length) {} touch(); render(); return; }
      const m = nodeById(ref); if (m) m.text = v; touch(); render();
    } else if (save && v && v !== n.text) commit(() => { const m = nodeById(ref); if (m) m.text = v; });
  };
  const onKey = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finish(true); }
    else if (e.key === "Escape") { e.preventDefault(); finish(false); }
    else if (e.key === "Tab") { e.preventDefault(); finish(true); setTimeout(() => addChild(ref), 30); }
    e.stopPropagation();
  };
  const onBlur = () => finish(true);
  ta.addEventListener("keydown", onKey); ta.addEventListener("blur", onBlur);
}

/* ================= Canvas overlays: connect handle, rewire grips ================= */
let hoverCopy = null, hoverTimer = null, dragging = null;
const toRendered = p => ({ x: p.x * cy.zoom() + cy.pan().x, y: p.y * cy.zoom() + cy.pan().y });
function updateOverlays() {
  const h = $("#handle"), gs = $("#grip-s"), gt = $("#grip-t");
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

/* ================= Side panel ================= */
const swatch = n => { const c = catById(n.cat); return `<span class="sw" style="background:${c.fill};border-color:${c.stroke}"></span>`; };
const nm = n => isQ(n) ? "<i>Open question (?)</i>" : esc(n.text);
function renderPanel() {
  const p = $("#panel");
  if (!lastRender) return;
  const { A } = lastRender;
  if (selEdge) {
    const e = doc.edges.find(x => x.id === selEdge); if (!e) { selEdge = null; return renderPanel(); }
    const s = nodeById(e.source), t = nodeById(e.target);
    p.innerHTML = `<div class="sec"><h2>Arrow</h2>
      <div class="sel-edge"><button class="btn" data-go="${esc(s.id)}">${swatch(s)}${nm(s)}</button>
      <span class="arrow">is explained by ↓</span>
      <button class="btn" data-go="${esc(t.id)}">${swatch(t)}${nm(t)}</button></div>
      <p class="muted">Drag either round end of the selected arrow onto another box to rewire it.</p>
      <div class="row"><button class="btn" id="p-rev">Reverse <kbd>R</kbd></button><button class="btn danger" id="p-del">Delete <kbd>Del</kbd></button></div></div>`;
    $("#p-rev").onclick = () => reverseEdge(selEdge); $("#p-del").onclick = deleteSelection;
    return;
  }
  if (multi.length > 1) {
    p.innerHTML = `<div class="sec"><h2>${multi.length} boxes selected</h2>
      <ul class="list">${multi.map(id => nodeById(id)).filter(Boolean).map(n => `<li><button data-go="${esc(n.id)}">${swatch(n)}<span>${nm(n)}</span></button></li>`).join("")}</ul>
      <div class="row"><button class="btn danger" id="p-del">Delete all <kbd>Del</kbd></button><button class="btn" id="p-clr">Clear selection</button></div></div>`;
    $("#p-del").onclick = deleteSelection; $("#p-clr").onclick = clearSelection; return;
  }
  const n = selRef && nodeById(selRef);
  if (!n) {
    const qs = doc.nodes.filter(isQ);
    const leaves = doc.nodes.filter(x => A.out.get(x.id).length === 0 && !isQ(x))
      .sort((a, b) => (A.paths.get(b.id) || 0) - (A.paths.get(a.id) || 0) || (A.depth.get(b.id) || 0) - (A.depth.get(a.id) || 0));
    const cyc = doc.nodes.filter(x => A.cyc.has(x.id));
    p.innerHTML = `
      <div class="sec"><h2>Getting around</h2>
      <p class="muted">Click a box to edit it and light up its chain. Double-click empty space to add a box; drag the green dot on a box onto its cause to connect them. Press <kbd>?</kbd> for all shortcuts.</p></div>
      ${cyc.length ? `<div class="warnbox"><b>Loop found.</b> ${cyc.length} boxes explain each other in a circle: ${cyc.map(x => esc(x.text)).join(" → ")}</div>` : ""}
      ${(() => { const ck = keyChecks(A); if (!ck.length) return "";
        const open = ck.filter(c => c.kind === "open"), deeper = ck.filter(c => c.kind === "deeper");
        return `<div class="sec"><h2>Colour key checks · ${ck.length}</h2>
        <p class="muted">Boxes whose colour and arrows disagree. Either the chain continues, or the colour should change.</p>
        ${open.length ? `<details class="ck"><summary>${open.length} intermediate cause${open.length > 1 ? "s" : ""} with nothing below</summary><ul class="list">${open.map(c => { const x = nodeById(c.id); return `<li><button data-go="${esc(x.id)}">${swatch(x)}<span>${nm(x)}</span></button></li>`; }).join("")}</ul></details>` : ""}
        ${deeper.length ? `<details class="ck" open><summary>${deeper.length} root cause${deeper.length > 1 ? "s" : ""} with deeper causes</summary><ul class="list">${deeper.map(c => { const x = nodeById(c.id); return `<li><button data-go="${esc(x.id)}">${swatch(x)}<span>${nm(x)}</span></button></li>`; }).join("")}</ul></details>` : ""}</div>`; })()}
      <div class="sec"><h2>Open questions · ${qs.length}</h2>
      <ul class="list">${qs.map(x => { const par = A.inn.get(x.id).map(nodeById)[0]; return `<li><button data-go="${esc(x.id)}">${swatch(x)}<span>Why does “${esc(par ? par.text : "?")}” happen?</span></button></li>`; }).join("") || `<p class="muted">None.</p>`}</ul></div>
      <div class="sec"><h2>Deepest causes · ${leaves.length}</h2>
      <p class="muted">Ranked by how many distinct chains connect them to the rejection.</p>
      <ul class="list">${leaves.map(x => `<li><button data-go="${esc(x.id)}">${swatch(x)}<span>${nm(x)}</span><span class="cnt">${A.paths.get(x.id) ? "×" + A.paths.get(x.id) : "–"}</span></button></li>`).join("")}</ul></div>`;
    return;
  }
  const causes = A.out.get(n.id).map(nodeById), effects = A.inn.get(n.id).map(nodeById);
  const below = [...bfs([n.id], A.out, () => false)].filter(x => x !== n.id);
  const qBelow = below.filter(id => isQ(nodeById(id))).length;
  const chain = chainTo(n.id).map(nodeById);
  const copies = lastRender.U.copies.filter(c => c.ref === n.id).length;
  p.innerHTML = `
    <div class="sec">
      <label class="field"><span>Text</span><textarea id="f-text" class="big" rows="3">${esc(n.text)}</textarea></label>
      <div class="field"><label for="f-cat">Category · <button type="button" class="linkbtn" id="p-cats">edit categories</button></label><select id="f-cat">${doc.categories.map(c => `<option value="${esc(c.id)}"${c.id === n.cat ? " selected" : ""}>${esc(c.name)}</option>`).join("")}<option disabled>──────────</option><option value="__new">＋ New category…</option><option value="__manage">Edit, delete or recolour categories…</option></select>
        ${catById(n.cat).desc ? `<span class="catdesc">${esc(catById(n.cat).desc)}</span>` : ""}
        ${keyChecks(A).filter(c => c.id === n.id).map(c => `<span class="ckwarn">${esc(c.msg)}.</span>`).join("")}</div>
      <div class="field"><span>Status</span><div class="status-seg" role="group" aria-label="Status">${Object.entries(STATUSES).map(([k, s]) =>
        `<button data-status="${k}" aria-pressed="${n.status === k}"><i style="border-color:${s.color || "var(--muted)"};border-style:${s.style}"></i>${s.short}</button>`).join("")}</div></div>
      <label class="field"><span>Notes</span><textarea id="f-notes" rows="3" placeholder="Reasoning, observations, what to check next">${esc(n.notes)}</textarea></label>
      <div class="field bibfield"><label for="f-src">Sources, one per line · type <kbd>@</kbd> to cite from your .bib</label><textarea id="f-src" rows="3" placeholder="@williamson2007botrytis or free text" autocomplete="off" spellcheck="false">${esc(n.sources.join("\n"))}</textarea><div class="bibpop" id="bibpop" role="listbox" hidden></div><ul class="bibres" id="bibres"></ul></div>
      <div class="row"><button class="btn" id="p-add">Add a cause <kbd>Tab</kbd></button>
        ${causes.length ? `<button class="btn" id="p-fold">${view.folded.has(n.id) ? "Unfold" : "Fold"} <kbd>F</kbd></button>` : ""}
        <button class="btn danger" id="p-del">Delete <kbd>Del</kbd></button></div>
      <dl class="kv"><dt>Level</dt><dd>${A.depth.get(n.id) || "–"}</dd>
        <dt>Chains to the rejection</dt><dd>${A.paths.get(n.id) || "–"}</dd>
        <dt>Causes below it</dt><dd>${below.length}</dd><dt>Open questions below</dt><dd>${qBelow}</dd>
        ${copies > 1 ? `<dt>Appears in view</dt><dd>${roman(copies)} (${copies}×)</dd>` : ""}</dl>
      ${A.cyc.has(n.id) ? `<div class="warnbox">This box is part of a loop. Check whether one of its arrows points the wrong way.</div>` : ""}
    </div>
    <div class="sec"><h2>Why? Explained by · ${causes.length}</h2>
      ${causes.length ? `<ul class="list">${causes.map(c => `<li><button data-go="${esc(c.id)}">${swatch(c)}<span>${nm(c)}</span></button></li>`).join("")}</ul>` : `<p class="muted">Nothing yet. The chain ends here.</p>`}</div>
    <div class="sec"><h2>It explains · ${effects.length}</h2>
      ${effects.length ? `<ul class="list">${effects.map(c => `<li><button data-go="${esc(c.id)}">${swatch(c)}<span>${nm(c)}</span></button></li>`).join("")}</ul>` : `<p class="muted">This is a top-level problem.</p>`}</div>
    <div class="sec"><h2>Chain from the rejection</h2>
      <ol class="chain">${chain.map(c => `<li><button data-go="${esc(c.id)}">${nm(c)}</button></li>`).join("")}</ol></div>`;
  const ref = n.id;
  $("#f-text").addEventListener("input", e => fieldEdit(ref, m => { m.text = e.target.value.replace(/\s+/g, " ").trim() || m.text; }));
  $("#f-notes").addEventListener("input", e => fieldEdit(ref, m => { m.notes = e.target.value; }));
  $("#f-src").addEventListener("input", e => { fieldEdit(ref, m => { m.sources = e.target.value.split("\n").map(s => s.trim()).filter(Boolean); }); showBibResolved(e.target.value); });
  attachBibComplete($("#f-src")); showBibResolved($("#f-src").value);
  ["#f-text", "#f-notes", "#f-src"].forEach(s => $(s).addEventListener("change", () => flushField()));
  $("#f-cat").onchange = e => {
    const v = e.target.value;
    if (v === "__new" || v === "__manage") { e.target.value = nodeById(ref).cat; openCats(v === "__new" ? ref : null); return; }
    commit(() => { nodeById(ref).cat = v; });
  };
  $("#p-cats").onclick = openCats;
  $$(".status-seg button").forEach(b => b.onclick = () => commit(() => { nodeById(ref).status = b.dataset.status; }));
  $("#p-add").onclick = () => addChild(ref);
  $("#p-fold") && ($("#p-fold").onclick = () => toggleFold(ref));
  $("#p-del").onclick = deleteSelection;
}
$("#panel").addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (b) goTo(b.dataset.go); });

/* panel text fields: commit after a pause in typing, keeping focus */
let fieldTimer = null, fieldPending = null;
function fieldEdit(ref, apply) { fieldPending = { ref, apply }; clearTimeout(fieldTimer); fieldTimer = setTimeout(() => flushField(), 700); }
function flushField(inCommit) {
  clearTimeout(fieldTimer);
  if (!fieldPending) return;
  const { ref, apply } = fieldPending; fieldPending = null;
  const n = nodeById(ref); if (!n) return;
  const tmp = clone(n); apply(tmp);
  if (JSON.stringify(tmp) === JSON.stringify(n)) return;
  pushUndo(snap()); apply(n); touch();
  if (!inCommit) render({ skipPanel: true });
}

function goTo(ref) {
  if (!nodeById(ref)) return;
  let changed = false;
  const A = analyze();
  // unfold anything hiding it
  const anc = new Set(); const q = [ref];
  while (q.length) { const u = q.shift(); for (const v of A.inn.get(u)) if (!anc.has(v)) { anc.add(v); q.push(v); } }
  anc.forEach(a => { if (view.folded.delete(a)) changed = true; });
  const c = nodeById(ref).cat; if (view.hiddenCats.delete(c)) changed = true;
  selRef = ref; selCopy = ref; selEdge = null; multi = [ref];
  const after = () => { const n = copiesOf(ref)[0]; if (n) cy.animate({ center: { eles: n }, zoom: Math.max(cy.zoom(), .9) }, { duration: 280 }); };
  if (changed || view.focusR > 0) { $("#depth").value = "all"; render().then(after); }
  else { applySelection(); renderPanel(); updateOverlays(); after(); }
}

/* ================= Chrome: header, stats, legend, controls ================= */
function updateChrome(full) {
  $("#doc-title").textContent = doc.title;
  document.title = (dirty ? "● " : "") + doc.title + " · Uchuva RCA";
  $("#file-name").textContent = fileName + (fileHandle ? "" : "");
  $("#dirty").hidden = !dirty;
  $("#b-undo").disabled = !undoStack.length; $("#b-redo").disabled = !redoStack.length;
  $("#ver-count").textContent = doc.versions.length || "";
  if (!lastRender || !full) return;
  const { A, V, crossings } = lastRender;
  const leaves = doc.nodes.filter(x => A.out.get(x.id).length === 0 && !isQ(x)).length;
  const qn = doc.nodes.filter(isQ).length, maxD = Math.max(0, ...A.depth.values());
  const hidden = doc.nodes.length - V.vis.size;
  $("#stats").innerHTML = `<span><b>${doc.nodes.length}</b> boxes</span><span><b>${doc.edges.length}</b> arrows</span><span><b>${maxD}</b> levels</span>` +
    `<span><b>${leaves}</b> deepest causes</span><span class="q"><b>${qn}</b> open questions</span>` +
    (A.cyc.size ? `<span class="bad"><b>${A.cyc.size}</b> boxes in loops</span>` : "") +
    (() => { const k = keyChecks(A).length; return k ? `<span class="warnstat"><b>${k}</b> colour key checks</span>` : ""; })() +
    (hidden ? `<span><b>${hidden}</b> hidden by folds or filters</span>` : "") +
    `<span><b>${Object.keys(STATUSES).filter(k => k !== "unassessed").map(k => doc.nodes.filter(n => n.status === k).length).join(" / ")}</b> hypothesis / supported / refuted</span>`;
  $("#xnum").textContent = crossings;
  $("#xline").innerHTML = view.mode === "untangle"
    ? `<b>${crossings}</b> crossings untangled vs <b>${manualCrossings}</b> in my layout${lastTries > 1 ? ` · best of ${lastTries} tries` : ""}.`
    : `<b>${crossings}</b> arrow crossings in my layout. Switch to <b>Untangle</b> to reduce them.`;
  $("#o-red").textContent = V.redundant.size ? `${V.redundant.size} found` : "none found";
}
function renderLegend() {
  const counts = {}; doc.nodes.forEach(n => (counts[n.cat] = (counts[n.cat] || 0) + 1));
  const open = view.legendOpen !== false;
  $("#legend").innerHTML = `<div class="h"><span>Colour key</span><span><button id="edit-cats">Edit</button> · <button id="fold-legend">${open ? "Collapse" : "Expand"}</button></span></div>` + (!open ? "" :
    doc.categories.map(c => `<button class="cat" title="${esc((c.desc ? c.desc + "\n" : "") + "Click to hide or show")}" data-cat="${esc(c.id)}" aria-pressed="${!view.hiddenCats.has(c.id)}"><span class="sw" style="background:${c.fill};border-color:${c.stroke}"></span>${esc(c.name)}<span class="n">${counts[c.id] || 0}</span></button>`).join("") +
    `<hr>` + Object.entries(STATUSES).filter(([k]) => k !== "unassessed").map(([k, s]) => `<span class="st"><i style="border-color:${s.color};border-style:${s.style}"></i>${s.name}</span>`).join(""));
  $("#edit-cats").onclick = openCats;
  $("#fold-legend").onclick = () => { view.legendOpen = !open; saveView(); renderLegend(); };
}
$("#legend").addEventListener("click", e => {
  const b = e.target.closest("[data-cat]"); if (!b) return;
  const k = b.dataset.cat; view.hiddenCats.has(k) ? view.hiddenCats.delete(k) : view.hiddenCats.add(k); render({ animate: true });
});
const PLACE = ["Compact", "Balanced", "Straight arrows"];
function syncControls() {
  $("#mode-manual").setAttribute("aria-pressed", view.mode === "manual");
  $("#mode-untangle").setAttribute("aria-pressed", view.mode === "untangle");
  $("#v-focus").value = view.focusR; $("#o-focus").textContent = view.focusR ? `${view.focusR} step${view.focusR > 1 ? "s" : ""} from the selected box` : "off";
  $("#v-trace").checked = view.trace;
  $$("[data-red]").forEach(b => b.setAttribute("aria-pressed", b.dataset.red === view.redundant));
  const un = view.mode === "untangle";
  $("#untangle-set").disabled = !un; $("#untangle-note").hidden = un; $("#manual-only").hidden = un;
  $("#v-effort").value = view.effort; $("#o-effort").textContent = `${view.effort} · ${[1, 1, 3, 6, 10][view.effort - 1]} tr${view.effort > 2 ? "ies" : "y"}`;
  $("#v-place").value = view.place; $("#o-place").textContent = PLACE[view.place];
  $("#v-level").value = view.levelSp; $("#o-level").textContent = view.levelSp + " px";
  $("#v-node").value = view.nodeSp; $("#o-node").textContent = view.nodeSp + " px";
  $$("[data-route]").forEach(b => b.setAttribute("aria-pressed", b.dataset.route === view.route));
  $("#v-order").checked = view.keepOrder; $("#v-split").checked = view.split; $("#v-repeat").checked = view.repeat;
  $("#v-repeat").disabled = !view.split;
  $("[data-act=keep]").disabled = view.split;
  $("[data-act=keep]").title = view.split ? "Turn off split shared causes first: copies have no single position" : "Copy these positions into My layout";
  saveView();
}
let sliderTimer = null;
function setView(patch, opts = {}) { Object.assign(view, patch); syncControls(); clearTimeout(sliderTimer); sliderTimer = setTimeout(() => render({ animate: true, ...opts }), opts.now ? 0 : 160); }
$("#v-focus").oninput = e => { if (+e.target.value > 0 && !selRef) toast("Select a box to focus on."); setView({ focusR: +e.target.value }, { now: true }); };
$("#v-trace").onchange = e => { view.trace = e.target.checked; syncControls(); applySelection(); };
$$("[data-red]").forEach(b => b.onclick = () => setView({ redundant: b.dataset.red }, { now: true }));
$("#v-effort").oninput = e => setView({ effort: +e.target.value });
$("#v-place").oninput = e => setView({ place: +e.target.value });
$("#v-level").oninput = e => setView({ levelSp: +e.target.value });
$("#v-node").oninput = e => setView({ nodeSp: +e.target.value });
$$("[data-route]").forEach(b => b.onclick = () => setView({ route: b.dataset.route }, { now: true }));
$("#v-order").onchange = e => setView({ keepOrder: e.target.checked }, { now: true });
$("#v-split").onchange = e => setView({ split: e.target.checked }, { now: true, fit: true });
$("#v-repeat").onchange = e => setView({ repeat: e.target.checked }, { now: true, fit: true });
function setMode(m) { if (view.mode === m) return; view.mode = m; syncControls(); render({ animate: true, fit: true }); }
$("#mode-manual").onclick = () => setMode("manual");
$("#mode-untangle").onclick = () => setMode("untangle");
$("#depth").onchange = e => {
  const v = e.target.value; view.folded.clear();
  if (v !== "all") { const A = analyze(); const L = +v; doc.nodes.forEach(n => { if (A.depth.get(n.id) === L && A.out.get(n.id).length) view.folded.add(n.id); }); }
  render({ animate: true });
};
$("#zin").onclick = () => cy.animate({ zoom: { level: cy.zoom() * 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } } }, { duration: 150 });
$("#zout").onclick = () => cy.animate({ zoom: { level: cy.zoom() / 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } } }, { duration: 150 });
$("#zfit").onclick = () => fitView(false, true);
$("#doc-title").ondblclick = () => { const t = prompt("Name of this RCA", doc.title); if (t && t.trim() && t.trim() !== doc.title) commit(() => { doc.title = t.trim(); }); };

/* ================= Search ================= */
let matches = [], matchIdx = -1;
function doSearch(jump) {
  const t = $("#q").value.trim().toLowerCase();
  cy.nodes().removeClass("match"); matches = [];
  if (!t) { $("#qcount").textContent = ""; return; }
  const refs = new Set(doc.nodes.filter(n => (n.text + " " + n.notes + " " + n.sources.map(sourceSearchText).join(" ")).toLowerCase().includes(t)).map(n => n.id));
  matches = [...refs];
  cy.nodes().filter(n => refs.has(n.data("ref")) && !n.hasClass("badge")).addClass("match");
  $("#qcount").textContent = matches.length ? (matchIdx >= 0 && jump ? `${matchIdx + 1}/${matches.length}` : matches.length) : "0";
}
$("#q").addEventListener("input", () => { matchIdx = -1; doSearch(false); });
$("#q").addEventListener("keydown", e => {
  if (e.key === "Enter" && matches.length) { matchIdx = (matchIdx + 1) % matches.length; goTo(matches[matchIdx]); doSearch(true); }
  if (e.key === "Escape") { $("#q").value = ""; doSearch(false); $("#q").blur(); }
});

/* ================= draw.io import ================= */
async function inflateRaw(bytes) {
  const ds = new DecompressionStream("deflate-raw");
  return await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
}
function htmlToText(v) {
  if (!v) return "";
  const d = new DOMParser().parseFromString("<body>" + v.replace(/<br\s*\/?>/gi, " ").replace(/<\/(div|p)>/gi, " ") + "</body>", "text/html");
  return (d.body.textContent || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
}
function parseStyle(s) { const o = {}; (s || "").split(";").forEach(kv => { const i = kv.indexOf("="); if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1); }); return o; }
async function parseDrawio(raw) {
  let txt = raw.trim();
  if (/^%3C/i.test(txt)) txt = decodeURIComponent(txt);
  let xml = new DOMParser().parseFromString(txt, "text/xml");
  if (xml.querySelector("parsererror")) throw new Error("That isn't valid draw.io XML. Copy it again from Extras → Edit Diagram.");
  let model = xml.querySelector("mxGraphModel");
  if (!model) {
    const dg = xml.querySelector("diagram"); if (!dg) throw new Error("No diagram found.");
    const b = Uint8Array.from(atob(dg.textContent.trim()), c => c.charCodeAt(0));
    let inner = await inflateRaw(b); try { inner = decodeURIComponent(inner); } catch (e) {}
    xml = new DOMParser().parseFromString(inner, "text/xml"); model = xml.querySelector("mxGraphModel");
    if (!model) throw new Error("The compressed diagram could not be read.");
  }
  const cats = doc ? clone(doc.categories) : clone(DEFAULT_CATS);
  const byFill = new Map(cats.map(c => [c.fill.toLowerCase(), c]));
  const nodes = [], edges = [];
  model.querySelectorAll("mxCell").forEach(c => {
    const st = parseStyle(c.getAttribute("style"));
    const wrapObj = c.parentElement && /^(UserObject|object)$/i.test(c.parentElement.tagName) ? c.parentElement : null;
    const cid = (wrapObj || c).getAttribute("id");
    const value = wrapObj ? wrapObj.getAttribute("label") : c.getAttribute("value");
    if (c.getAttribute("vertex") === "1") {
      const g = c.querySelector("mxGeometry");
      const fill = (st.fillColor || "#ffffff").toLowerCase();
      let cat = byFill.get(fill);
      if (!cat) { cat = { id: uid("c"), name: "Colour " + fill, fill, stroke: st.strokeColor || "#000000", font: st.fontColor || "#000000" }; cats.push(cat); byFill.set(fill, cat); }
      const w = +(g?.getAttribute("width") || 120), h = +(g?.getAttribute("height") || 50);
      const stt = wrapObj && STATUSES[wrapObj.getAttribute("status")] ? wrapObj.getAttribute("status") : "unassessed";
      const n = { id: cid, text: htmlToText(value) || " ", cat: cat.id, status: stt, notes: wrapObj ? (wrapObj.getAttribute("tooltip") || "").replace(/\nSources: .*$/s, "").replace(/^Sources: .*$/s, "") : "", sources: [],
        x: Math.round((+(g?.getAttribute("x") || 0) + w / 2) * 1.55), y: Math.round((+(g?.getAttribute("y") || 0) + h / 2) * 1.55) };
      const stroke = (st.strokeColor || "#000000").toLowerCase();
      if (stroke !== cat.stroke.toLowerCase() && stroke !== "none" && stt === "unassessed") n.outline = stroke;
      const tip = wrapObj && wrapObj.getAttribute("tooltip"); const m = tip && tip.match(/Sources: (.*)$/s);
      if (m) n.sources = m[1].split("; ").map(x => x.trim()).filter(Boolean);
      nodes.push(n);
    } else if (c.getAttribute("edge") === "1" && c.getAttribute("source") && c.getAttribute("target")) {
      edges.push({ id: "e" + cid, source: c.getAttribute("source"), target: c.getAttribute("target") });
    }
  });
  if (!nodes.length) throw new Error("The diagram has no boxes.");
  const ids = new Set(nodes.map(n => n.id));
  const used = new Set(nodes.map(n => n.cat));
  tidyPositions(nodes);
  return { categories: cats.filter(c => used.has(c.id) || DEFAULT_CATS.some(d => d.id === c.id)), nodes, edges: edges.filter(e => ids.has(e.source) && ids.has(e.target)) };
}

/* ================= Files ================= */
const FSA = "showOpenFilePicker" in window;
function setDoc(d, name, handle) {
  doc = d; fileName = name; fileHandle = handle || null; dirty = false;
  undoStack.length = 0; redoStack.length = 0; selRef = selCopy = selEdge = null; multi = [];
  view.folded.clear(); view.hiddenCats.clear(); view.diff = null; $("#diffbar").hidden = true; $("#depth").value = "all";
  autosave(); render({ fit: true, readable: true });
}
async function loadText(text, name, handle) {
  const t = text.trim();
  if (t.startsWith("{")) {
    let d; try { d = JSON.parse(t); } catch (e) { throw new Error("This file is not valid JSON."); }
    const nd = normalizeDoc(d); const mig = nd.meta.migratedKey; delete nd.meta.migratedKey;
    setDoc(nd, name, handle);
    if (mig) { dirty = true; updateChrome(); toast(`Opened ${name}. Its colour key was updated to your meanings; save to keep it.`, 5500); }
    else toast(`Opened ${name}`);
  } else {
    const g = await parseDrawio(t);
    const d = emptyDoc(); d.categories = g.categories; d.nodes = g.nodes; d.edges = g.edges;
    d.title = name.replace(/\.(drawio|xml|dio|txt)$/i, "");
    d.versions = [mkVersion(d, "Imported from draw.io", `Imported from ${name}`)];
    setDoc(d, name.replace(/\.(drawio|xml|dio|txt)$/i, "") + ".json", null);
    dirty = true; updateChrome();
    toast(`Imported ${name}. Save it to create the RCA file.`, 4500);
  }
}
async function openFile() {
  if (dirty && !confirm("You have unsaved changes. Open another file anyway? (They stay recoverable only until the new file is edited.)")) return;
  if (FSA) {
    try {
      const [h] = await window.showOpenFilePicker({ types: [{ description: "RCA file or draw.io diagram", accept: { "application/json": [".json"], "application/xml": [".drawio", ".xml", ".dio"] } }] });
      const f = await h.getFile();
      await loadText(await f.text(), f.name, f.name.toLowerCase().endsWith(".json") ? h : null);
    } catch (e) { if (e.name !== "AbortError") toast(e.message || "Could not open that file.", 5000); }
  } else $("#file-input").click();
}
$("#file-input").onchange = async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try { await loadText(await f.text(), f.name, null); } catch (err) { toast(err.message || "Could not open that file.", 5000); }
};
function docText() { doc.app = APP_VERSION; return JSON.stringify(doc, null, 2) + "\n"; }
async function saveFile(as) {
  flushField(true);
  if (FSA && fileHandle && !as) {
    try { const w = await fileHandle.createWritable(); await w.write(docText()); await w.close(); dirty = false; updateChrome(); autosave(); toast(`Saved to ${fileHandle.name}`); return; }
    catch (e) { if (e.name === "AbortError") return; toast("Could not write to the file. Choose where to save it."); }
  }
  if (FSA && window.showSaveFilePicker) {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: fileName, types: [{ description: "RCA file", accept: { "application/json": [".json"] } }] });
      const w = await h.createWritable(); await w.write(docText()); await w.close();
      fileHandle = h; fileName = h.name; dirty = false; updateChrome(); autosave(); toast(`Saved to ${h.name}`); return;
    } catch (e) { if (e.name === "AbortError") return; }
  }
  download(fileName, docText(), "application/json");
  dirty = false; updateChrome(); autosave();
  toast(`Downloaded ${fileName}. Replace your old copy with it.`, 4500);
}
function newEmpty() {
  if (dirty && !confirm("You have unsaved changes. Start a new empty RCA anyway?")) return;
  const d = emptyDoc(); d.title = "New root-cause analysis";
  d.nodes = [newNode("Problem observed", "problem", 0, 0)];
  d.versions = [mkVersion(d, "Started", "")];
  setDoc(d, "new-rca.json", null);
}

/* ================= Exports ================= */
function baseName() { return fileName.replace(/\.json$/i, ""); }
function exportSVG() {
  const ink = "#1b2420", edgeC = "#5f6e68";
  const vis = cy.elements().filter(e => e.visible());
  const bb = vis.boundingBox({ includeLabels: false, includeOverlays: false });
  const pad = 24, W = Math.ceil(bb.w + pad * 2), H = Math.ceil(bb.h + pad * 2), ox = pad - bb.x1, oy = pad - bb.y1;
  const P = p => `${(p.x + ox).toFixed(1)},${(p.y + oy).toFixed(1)}`;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="IBM Plex Sans, Helvetica, Arial, sans-serif">`,
    `<title>${esc(doc.title)}</title>`, `<rect width="100%" height="100%" fill="#ffffff"/>`];
  cy.edges().filter(e => e.visible()).forEach(e => {
    const pts = [e.sourceEndpoint(), ...(e.style("curve-style") === "segments" ? (e.segmentPoints() || []) : []), e.targetEndpoint()];
    if (pts.some(p => !p || !Number.isFinite(p.x))) return;
    const a = pts[pts.length - 2], b = pts[pts.length - 1]; const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, al = 9, aw = 4.5;
    const base = { x: b.x - ux * al, y: b.y - uy * al };
    const line = [...pts.slice(0, -1), base];
    const dash = e.hasClass("redundant") ? ` stroke-dasharray="6 4"` : "";
    out.push(`<polyline points="${line.map(P).join(" ")}" fill="none" stroke="${edgeC}" stroke-width="1.4"${dash}/>`);
    out.push(`<polygon points="${P(b)} ${P({ x: base.x - uy * aw, y: base.y + ux * aw })} ${P({ x: base.x + uy * aw, y: base.y - ux * aw })}" fill="${edgeC}"/>`);
  });
  cy.nodes().filter(n => n.visible()).forEach(n => {
    const d = n.data(), p = n.position();
    if (n.hasClass("badge")) {
      out.push(`<rect x="${(p.x - d.w / 2 + ox).toFixed(1)}" y="${(p.y - 9.5 + oy).toFixed(1)}" width="${d.w}" height="19" rx="9" fill="${ink}" stroke="#ffffff" stroke-width="2"/>`);
      out.push(`<text x="${(p.x + ox).toFixed(1)}" y="${(p.y + oy).toFixed(1)}" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${esc(d.label)}</text>`);
      return;
    }
    const dash = d.bs === "dashed" ? ` stroke-dasharray="7 4"` : d.bs === "dotted" ? ` stroke-dasharray="2 3"` : n.hasClass("ref") ? ` stroke-dasharray="5 3"` : "";
    const op = n.hasClass("refuted") ? ` opacity="0.5"` : n.hasClass("ref") ? ` opacity="0.8"` : "";
    out.push(`<g${op}><rect x="${(p.x - d.w / 2 + ox).toFixed(1)}" y="${(p.y - d.h / 2 + oy).toFixed(1)}" width="${d.w}" height="${d.h}" rx="7" fill="${d.fill}" stroke="${d.stroke}" stroke-width="${d.bw}"${dash}/>`);
    const lines = measureText(d.label).lines; const y0 = p.y - (lines.length - 1) * LINE / 2;
    const fw = n.hasClass("q") ? ` font-weight="700" font-size="15"` : ` font-size="${FONT_PX}"`;
    lines.forEach((l, i) => out.push(`<text x="${(p.x + ox).toFixed(1)}" y="${(y0 + i * LINE + oy).toFixed(1)}"${fw} fill="${d.font}" text-anchor="middle" dominant-baseline="central">${esc(l)}</text>`));
    out.push(`</g>`);
  });
  out.push(`</svg>`);
  return { svg: out.join("\n"), W, H };
}
function exportPNG() {
  const { svg, W, H } = exportSVG(); const img = new Image(); const s = 2;
  img.onload = () => {
    const c = document.createElement("canvas"); c.width = W * s; c.height = H * s;
    const g = c.getContext("2d"); g.scale(s, s); g.drawImage(img, 0, 0);
    c.toBlob(b => { download(baseName() + ".png", b); toast("PNG exported."); }, "image/png");
  };
  img.onerror = () => toast("PNG export failed in this browser. Use SVG instead.");
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function xmlEsc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function exportDrawio() {
  const cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];
  const idOf = new Map(doc.nodes.map((n, i) => [n.id, "n" + i]));
  doc.nodes.forEach(n => {
    const c = catById(n.cat), m = measureText(n.text), st = STATUSES[n.status];
    const stroke = st.color || n.outline || c.stroke;
    const style = `rounded=1;whiteSpace=wrap;html=1;fontSize=13;fillColor=${c.fill};strokeColor=${stroke};fontColor=${c.font};` +
      (st.style === "dashed" ? "dashed=1;" : st.style === "dotted" ? "dashed=1;dashPattern=1 2;" : "") + (st.width > 2 ? "strokeWidth=2;" : "");
    const tip = [n.notes, n.sources.length ? "Sources: " + n.sources.join("; ") : ""].filter(Boolean).join("\n");
    cells.push(`<UserObject label="${xmlEsc(n.text)}"${tip ? ` tooltip="${xmlEsc(tip)}"` : ""} status="${n.status}" id="${idOf.get(n.id)}"><mxCell style="${style}" vertex="1" parent="1"><mxGeometry x="${Math.round(n.x - m.w / 2)}" y="${Math.round(n.y - m.h / 2)}" width="${m.w}" height="${m.h}" as="geometry"/></mxCell></UserObject>`);
  });
  doc.edges.forEach((e, i) => cells.push(`<mxCell id="a${i}" style="rounded=0;html=1;endArrow=classic;" edge="1" parent="1" source="${idOf.get(e.source)}" target="${idOf.get(e.target)}"><mxGeometry relative="1" as="geometry"/></mxCell>`));
  const xml = `<mxfile host="uchuva-rca"><diagram name="${xmlEsc(doc.title)}" id="rca"><mxGraphModel><root>\n${cells.join("\n")}\n</root></mxGraphModel></diagram></mxfile>\n`;
  download(baseName() + ".drawio", xml, "application/xml"); toast("draw.io file exported (uses the positions from My layout).");
}
function exportGraphML() {
  const keys = [["text", "node"], ["category", "node"], ["status", "node"], ["notes", "node"], ["sources", "node"], ["x", "node", "double"], ["y", "node", "double"]];
  const out = [`<?xml version="1.0" encoding="UTF-8"?>`, `<graphml xmlns="http://graphml.graphdrawing.org/xmlns">`,
    ...keys.map(([k, f, t]) => `  <key id="${k}" for="${f}" attr.name="${k}" attr.type="${t || "string"}"/>`),
    `  <graph id="rca" edgedefault="directed">`];
  doc.nodes.forEach(n => out.push(`    <node id="${xmlEsc(n.id)}"><data key="text">${xmlEsc(n.text)}</data><data key="category">${xmlEsc(catById(n.cat).name)}</data><data key="status">${n.status}</data><data key="notes">${xmlEsc(n.notes)}</data><data key="sources">${xmlEsc(n.sources.join(" | "))}</data><data key="x">${n.x}</data><data key="y">${n.y}</data></node>`));
  doc.edges.forEach(e => out.push(`    <edge id="${xmlEsc(e.id)}" source="${xmlEsc(e.source)}" target="${xmlEsc(e.target)}"/>`));
  out.push(`  </graph>`, `</graphml>`, "");
  download(baseName() + ".graphml", out.join("\n"), "application/xml");
}
const csvCell = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function exportCSV(which) {
  const A = analyze();
  let rows;
  if (which === "nodes") rows = [["id", "text", "category", "status", "level", "chains_to_rejection", "notes", "sources"],
    ...doc.nodes.map(n => [n.id, n.text, catById(n.cat).name, n.status, A.depth.get(n.id) || "", A.paths.get(n.id) || "", n.notes, n.sources.join(" | ")])];
  else rows = [["source_id", "source_text", "target_id", "target_text"],
    ...doc.edges.map(e => [e.source, nodeById(e.source).text, e.target, nodeById(e.target).text])];
  download(`${baseName()}-${which === "nodes" ? "boxes" : "arrows"}.csv`, "﻿" + rows.map(r => r.map(csvCell).join(",")).join("\r\n") + "\r\n", "text/csv");
}

/* ================= Versions ================= */
function diffCores(a, b) { // a = old snapshot, b = new
  const an = new Map(a.nodes.map(n => [n.id, n])), bn = new Map(b.nodes.map(n => [n.id, n]));
  const added = b.nodes.filter(n => !an.has(n.id)), removed = a.nodes.filter(n => !bn.has(n.id));
  const changed = b.nodes.filter(n => { const o = an.get(n.id); return o && (o.text !== n.text || o.cat !== n.cat || o.status !== n.status || o.notes !== n.notes || (o.sources || []).join("\n") !== (n.sources || []).join("\n")); });
  const k = e => e.source + ">" + e.target;
  const ae = new Set(a.edges.map(k)), be = new Set(b.edges.map(k));
  return { added, removed, changed, edgesAdded: b.edges.filter(e => !ae.has(k(e))), edgesRemoved: a.edges.filter(e => !be.has(k(e))), an, bn };
}
const chgLine = d => `<span class="chg"><span class="p">+${d.added.length}</span> / <span class="m">−${d.removed.length}</span> boxes · <span class="c">${d.changed.length} edited</span> · arrows <span class="p">+${d.edgesAdded.length}</span> / <span class="m">−${d.edgesRemoved.length}</span></span>`;
function openVersions() {
  flushField(true);
  const list = $("#ver-list"); const vs = doc.versions.slice().reverse();
  list.innerHTML = vs.length ? vs.map(v => {
    const i = doc.versions.indexOf(v); const prev = doc.versions[i - 1];
    const d = prev ? diffCores(prev.snapshot, v.snapshot) : null;
    return `<div class="ver"><span class="nm">${esc(v.name)}</span>
      <span class="meta">${fmtDate(v.at)} · ${v.snapshot.nodes.length} boxes, ${v.snapshot.edges.length} arrows ${d ? "· " + chgLine(d) : ""}</span>
      ${v.note ? `<span class="nt">${esc(v.note)}</span>` : ""}
      <span class="acts"><button class="btn small" data-vcmp="${v.id}">Compare with now</button><button class="btn small" data-vres="${v.id}">Restore</button><button class="btn small icon" data-vdel="${v.id}" title="Delete this version" aria-label="Delete version">×</button></span></div>`;
  }).join("") : `<p class="muted" style="padding:12px">No versions yet.</p>`;
  $("#ver-diff").hidden = true;
  $("#m-versions").hidden = false; $("#ver-name").focus();
}
$("#ver-form").onsubmit = e => {
  e.preventDefault();
  const name = $("#ver-name").value.trim(); if (!name) return;
  doc.versions.push(mkVersion(doc, name, $("#ver-note").value.trim()));
  $("#ver-name").value = ""; $("#ver-note").value = "";
  touch(); openVersions(); toast(`Version “${name}” saved in the file. Press Ctrl S to write it to disk.`, 4500);
};
$("#ver-list").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.vdel) {
    const v = doc.versions.find(x => x.id === b.dataset.vdel);
    if (v && confirm(`Delete the version “${v.name}”? This cannot be undone.`)) { doc.versions = doc.versions.filter(x => x !== v); touch(); openVersions(); }
  }
  if (b.dataset.vres) {
    const v = doc.versions.find(x => x.id === b.dataset.vres); if (!v) return;
    commit(() => { restoreCore(JSON.stringify(v.snapshot)); pruneSelection(); }, { animate: true });
    $("#m-versions").hidden = true; toast(`Restored “${v.name}”. Ctrl Z brings back what you had.`, 4500);
  }
  if (b.dataset.vcmp) {
    const v = doc.versions.find(x => x.id === b.dataset.vcmp); if (!v) return;
    const d = diffCores(v.snapshot, coreOf(doc));
    const box = $("#ver-diff"); box.hidden = false;
    const li = arr => arr.length ? `<ul>${arr.slice(0, 40).map(x => `<li>${esc(x)}</li>`).join("")}${arr.length > 40 ? `<li>…and ${arr.length - 40} more</li>` : ""}</ul>` : `<p class="muted">None.</p>`;
    const et = (e, m) => `${(m.get(e.source) || {}).text || e.source} → ${(m.get(e.target) || {}).text || e.target}`;
    box.innerHTML = `<h4>Now compared with “${esc(v.name)}”</h4>${chgLine(d)}
      <b>New boxes</b>${li(d.added.map(n => n.text))}<b>Edited boxes</b>${li(d.changed.map(n => { const o = d.an.get(n.id); return o.text !== n.text ? `${o.text} ⟶ ${n.text}` : n.text; }))}
      <b>Removed boxes</b>${li(d.removed.map(n => n.text))}<b>New arrows</b>${li(d.edgesAdded.map(e => et(e, d.bn)))}<b>Removed arrows</b>${li(d.edgesRemoved.map(e => et(e, d.an)))}
      <div class="row"><button class="btn primary" id="vd-show">Highlight on the graph</button></div>`;
    $("#vd-show").onclick = () => {
      view.diff = { added: new Set(d.added.map(n => n.id)), changed: new Set(d.changed.map(n => n.id)), name: v.name };
      const bar = $("#diffbar"); bar.hidden = false;
      bar.innerHTML = `Compared with “${esc(v.name)}”: <span class="a">${d.added.length} new</span> <span class="c">${d.changed.length} edited</span> ${d.removed.length ? `· ${d.removed.length} removed (listed in Versions)` : ""}<button class="btn small" id="diff-clear">Clear</button>`;
      $("#diff-clear").onclick = () => { view.diff = null; bar.hidden = true; render(); };
      $("#m-versions").hidden = true; render();
    };
    box.scrollIntoView({ block: "nearest" });
  }
});

/* ================= Colour key editor ================= */
let catDraft = [], catMoves = {}, catAssign = null;
function openCats(assignRef) {
  catDraft = clone(doc.categories); catMoves = {}; catAssign = null; drawCats(); $("#m-cats").hidden = false;
  if (typeof assignRef === "string") { // "New category…" from a box: add a row, and give the box that category on Apply
    const c = { id: uid("c"), name: "New category", role: "none", desc: "", fill: "#c8e6c9", stroke: "#2e7d32", font: "#1a1a1a" };
    catDraft.push(c); catAssign = { ref: assignRef, cat: c.id }; drawCats();
    setTimeout(() => { const el = $(`#cat-name-${catDraft.length - 1}`); if (el) { el.focus(); el.select(); el.scrollIntoView({ block: "nearest" }); } }, 20);
  }
}
function hexToHsl(h) {
  const n = parseInt(h.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let H = 0, S = 0; const L = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; S = L > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    H = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H /= 6; }
  return [H, S, L];
}
function hslToHex(H, S, L) {
  const f = n => { const k = (n + H * 12) % 12, a = S * Math.min(L, 1 - L); const c = L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, "0"); };
  return "#" + f(0) + f(8) + f(4);
}
function lum(h) { const n = parseInt(h.slice(1), 16); const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
function shadeOf(c, step) { // a darker (step > 0) or lighter (step < 0) variant of a category
  const [H, S, L] = hexToHsl(c.fill); const nl = Math.max(.12, Math.min(.95, L - step * .12));
  const fill = hslToHex(H, Math.min(1, S * (step > 0 ? 1.05 : .95)), nl);
  const [h2, s2] = hexToHsl(c.stroke);
  return { fill, stroke: hslToHex(h2, s2, Math.max(.1, nl - .28)), font: lum(fill) > .32 ? "#1a1a1a" : "#ffffff" };
}
function drawCats() {
  const counts = {}; doc.nodes.forEach(n => (counts[n.cat] = (counts[n.cat] || 0) + 1));
  $("#cat-rows").innerHTML = catDraft.map((c, i) => {
    const used = counts[c.id] || 0, moving = catMoves[c.id] !== undefined;
    return `<div class="catcard${moving ? " deleting" : ""}" data-i="${i}">
    <div class="catrow">
      <span class="prev" style="background:${c.fill};border-color:${c.stroke};color:${c.font}">${esc(c.name || "Unnamed")}</span>
      <input type="text" id="cat-name-${i}" value="${esc(c.name)}" aria-label="Category name" placeholder="Name">
      <label>fill<input type="color" id="cat-fill-${i}" value="${c.fill}"></label>
      <label>outline<input type="color" id="cat-stroke-${i}" value="${c.stroke}"></label>
      <label>text<input type="color" id="cat-font-${i}" value="${c.font}"></label>
    </div>
    <div class="catrow2">
      <input type="text" id="cat-desc-${i}" value="${esc(c.desc || "")}" placeholder="What this colour means" aria-label="Meaning">
      <select id="cat-role-${i}" aria-label="Rule" title="${esc(ROLES[c.role || "none"].hint)}">${Object.entries(ROLES).map(([k, r]) => `<option value="${k}"${(c.role || "none") === k ? " selected" : ""}>${k === "none" ? "No rule" : "Acts as: " + r.name}</option>`).join("")}</select>
      <span class="catacts">
        <button class="btn small" data-cshade="${i}" data-step="-1" title="Add a lighter shade">+ lighter</button>
        <button class="btn small" data-cshade="${i}" data-step="1" title="Add a darker shade">+ darker</button>
        <button class="btn small icon" data-cup="${i}" ${i === 0 ? "disabled" : ""} title="Move up" aria-label="Move up">↑</button>
        <button class="btn small icon" data-cdel="${i}" title="Delete" aria-label="Delete category">×</button>
      </span>
    </div>
    <div class="catmeta">${used} box${used === 1 ? "" : "es"}${moving ? ` · will be deleted, its boxes move to
      <select data-cmove="${esc(c.id)}">${catDraft.filter(o => o.id !== c.id && catMoves[o.id] === undefined).map(o => `<option value="${esc(o.id)}"${catMoves[c.id] === o.id ? " selected" : ""}>${esc(o.name)}</option>`).join("")}</select>
      <button class="linkbtn" data-cundo="${esc(c.id)}">keep it</button>` : ""}</div>
  </div>`; }).join("");
}
$("#cat-rows").addEventListener("input", e => {
  const card = e.target.closest(".catcard"); if (!card || !e.target.id) return; const c = catDraft[+card.dataset.i];
  const k = e.target.id.split("-")[1]; c[k] = e.target.value;
  const pv = card.querySelector(".prev"); pv.style.background = c.fill; pv.style.borderColor = c.stroke; pv.style.color = c.font; pv.textContent = c.name || "Unnamed";
});
$("#cat-rows").addEventListener("change", e => {
  if (e.target.dataset.cmove) { catMoves[e.target.dataset.cmove] = e.target.value; return; }
  const card = e.target.closest(".catcard"); if (card && e.target.id.startsWith("cat-role")) catDraft[+card.dataset.i].role = e.target.value;
});
$("#cat-rows").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.cundo) { delete catMoves[b.dataset.cundo]; drawCats(); return; }
  if (b.dataset.cdel !== undefined) {
    const i = +b.dataset.cdel, c = catDraft[i];
    const used = doc.nodes.some(n => n.cat === c.id);
    if (!used) { catDraft.splice(i, 1); drawCats(); return; }
    const target = catDraft.find(o => o.id !== c.id && catMoves[o.id] === undefined);
    if (!target) return toast("Keep at least one category for its boxes to move to.");
    catMoves[c.id] = target.id; drawCats(); return;
  }
  if (b.dataset.cup !== undefined) { const i = +b.dataset.cup; [catDraft[i - 1], catDraft[i]] = [catDraft[i], catDraft[i - 1]]; drawCats(); return; }
  if (b.dataset.cshade !== undefined) {
    const i = +b.dataset.cshade, c = catDraft[i], step = +b.dataset.step;
    const base = c.name.replace(/ \((lighter|darker)( \d+)?\)$/, ""), dir = step > 0 ? "darker" : "lighter";
    let nm = `${base} (${dir})`, k = 2; while (catDraft.some(o => o.name === nm)) nm = `${base} (${dir} ${k++})`;
    catDraft.splice(i + 1, 0, { id: uid("c"), name: nm, role: c.role, desc: c.desc, ...shadeOf(c, step) });
    drawCats(); setTimeout(() => { const el = $(`#cat-name-${i + 1}`); if (el) { el.focus(); el.select(); } }, 20);
  }
});
$("#cat-add").onclick = () => { catDraft.push({ id: uid("c"), name: "New category", role: "none", desc: "", fill: "#c8e6c9", stroke: "#2e7d32", font: "#1a1a1a" }); drawCats();
  setTimeout(() => { const el = $(`#cat-name-${catDraft.length - 1}`); if (el) { el.focus(); el.select(); } }, 20); };
$("#cat-save").onclick = () => {
  const moves = { ...catMoves };
  const d = clone(catDraft).filter(c => moves[c.id] === undefined).map(c => ({ ...c, name: c.name.trim() || "Unnamed" }));
  if (!d.length) return toast("Keep at least one category.");
  $("#m-cats").hidden = true;
  commit(() => {
    doc.categories = d;
    doc.nodes.forEach(n => { let t = moves[n.cat], guard = 0; while (t !== undefined && moves[t] !== undefined && guard++ < 20) t = moves[t]; if (t !== undefined) n.cat = t; });
    Object.keys(moves).forEach(id => view.hiddenCats.delete(id));
    if (catAssign && d.some(c => c.id === catAssign.cat)) { const n = nodeById(catAssign.ref); if (n) n.cat = catAssign.cat; }
  });
  catAssign = null;
  toast("Colour key updated. Ctrl Z to undo.");
};

/* ================= Paste draw.io ================= */
$("#paste-go").onclick = async () => {
  try {
    const g = await parseDrawio($("#paste-text").value);
    $("#m-paste").hidden = true;
    commit(() => { doc.categories = g.categories; doc.nodes = g.nodes; doc.edges = g.edges; selRef = selCopy = selEdge = null; multi = []; view.folded.clear(); }, { fit: true });
    toast("Diagram replaced. Ctrl Z brings back the previous content.", 4500);
  } catch (err) { $("#paste-err").textContent = err.message; $("#paste-err").hidden = false; }
};

/* ================= Bibliography (.bib) ================= */
const LS_BIB = "uchuva-rca:bib";
let bib = { name: "", entries: [], byKey: new Map() };
function setBib(name, entries) {
  bib = { name, entries, byKey: new Map(entries.map(e => [e.key.toLowerCase(), e])) };
  const b = $("[data-act=bib]"); if (b) b.innerHTML = name ? `Bibliography: ${esc(name)} <small>${entries.length} refs · reload</small>` : `Load bibliography… <small>.bib, for @ citations</small>`;
}
try { const b = JSON.parse(lsGet(LS_BIB) || "null"); if (b && Array.isArray(b.entries)) setBib(b.name, b.entries); } catch (e) {}
function texClean(v) {
  return String(v || "")
    .replace(/\\(?:textit|textbf|emph|textsc|mathrm|textrm)\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\(['"`^~=.uvHckr])\s*\{?\\?([A-Za-z])\}?/g, (m, a, c) => (c + ({ "'": "́", "`": "̀", "^": "̂", '"': "̈", "~": "̃", "=": "̄", ".": "̇", u: "̆", v: "̌", H: "̋", c: "̧", k: "̨", r: "̊" }[a] || "")).normalize("NFC"))
    .replace(/\\(ss|o|O|l|L|ae|AE|oe|OE|aa|AA|i|j)\b\s*/g, (m, c) => ({ ss: "ss", o: "o", O: "O", l: "l", L: "L", ae: "ae", AE: "AE", oe: "oe", OE: "OE", aa: "a", AA: "A", i: "i", j: "j" }[c]))
    .replace(/\\([&%$#_{}])/g, "$1").replace(/~/g, " ").replace(/--/g, "–").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
}
function parseBib(text) {
  const out = []; let i = 0; const n = text.length;
  while (i < n) {
    const at = text.indexOf("@", i); if (at < 0) break;
    const m = /^@\s*([A-Za-z]+)\s*([{(])/.exec(text.slice(at, at + 60));
    if (!m) { i = at + 1; continue; }
    const type = m[1].toLowerCase(); const open = m[2], close = open === "{" ? "}" : ")";
    let j = at + m[0].length, depth = 1;
    const start = j;
    while (j < n && depth > 0) { const c = text[j]; if (c === "{" || (open === "(" && c === "(")) depth++; else if (c === "}" || (open === "(" && c === ")")) depth--; j++; }
    const body = text.slice(start, j - 1); i = j;
    if (["comment", "string", "preamble"].includes(type)) continue;
    const comma = body.indexOf(","); if (comma < 0) continue;
    const key = body.slice(0, comma).trim(); if (!key) continue;
    const fields = {}; let k = comma + 1; const B = body;
    while (k < B.length) {
      const fm = /^\s*([A-Za-z][\w-]*)\s*=\s*/.exec(B.slice(k)); if (!fm) break;
      const name = fm[1].toLowerCase(); k += fm[0].length;
      let val = "";
      if (B[k] === "{") { let d = 0, s0 = k; do { if (B[k] === "{") d++; else if (B[k] === "}") d--; k++; } while (k < B.length && d > 0); val = B.slice(s0 + 1, k - 1); }
      else if (B[k] === '"') { let s0 = ++k; while (k < B.length && !(B[k] === '"' && B[k - 1] !== "\\")) k++; val = B.slice(s0, k); k++; }
      else { const vm = /^[^,]*/.exec(B.slice(k)); val = vm[0]; k += vm[0].length; }
      fields[name] = val;
      const cm = /^\s*,?/.exec(B.slice(k)); k += cm[0].length;
    }
    const rawA = fields.author || fields.editor || ""; const parts = []; let d = 0, cur = "";
    for (let q = 0; q < rawA.length; q++) { const ch = rawA[q]; if (ch === "{") d++; if (ch === "}") d--;
      if (d === 0 && /^\s+and\s+/i.test(rawA.slice(q)) && /\s/.test(ch)) { parts.push(cur); cur = ""; q += /^\s+and\s+/i.exec(rawA.slice(q))[0].length - 1; continue; } cur += ch; }
    if (cur.trim()) parts.push(cur);
    const authors = parts.map(a => a.trim()).filter(Boolean).map(a => /^\{.*\}$/.test(a) ? { corp: texClean(a) } : texClean(a));
    const last = a => a.corp ? a.corp : (a.includes(",") ? a.split(",")[0] : a.split(" ").slice(-1)[0]).trim();
    const auth = authors.length === 0 ? "" : authors.length === 1 ? last(authors[0]) : authors.length === 2 ? `${last(authors[0])} & ${last(authors[1])}` : `${last(authors[0])} et al.`;
    const year = (texClean(fields.year || fields.date || "").match(/\d{4}/) || [""])[0];
    out.push({ key, type, author: auth, authorsAll: authors.map(last).join(" "), year, title: texClean(fields.title || fields.booktitle || ""),
      venue: texClean(fields.journal || fields.journaltitle || fields.booktitle || fields.publisher || fields.institution || fields.school || "") });
  }
  return out;
}
async function loadBib() {
  const handle = async (name, text) => {
    const entries = parseBib(text);
    if (!entries.length) return toast("No references found in that file.", 4500);
    setBib(name, entries); lsSet(LS_BIB, JSON.stringify({ name, entries }));
    toast(`Loaded ${entries.length} references from ${name}. Type @ in Sources to cite one.`, 4500);
    renderPanel();
  };
  if (FSA) {
    try { const [h] = await window.showOpenFilePicker({ types: [{ description: "BibTeX", accept: { "text/plain": [".bib"] } }] }); const f = await h.getFile(); await handle(f.name, await f.text()); }
    catch (e) { if (e.name !== "AbortError") toast(e.message, 4500); }
  } else {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".bib,.txt";
    inp.onchange = async () => { const f = inp.files[0]; if (f) await handle(f.name, await f.text()); }; inp.click();
  }
}
const bibLookup = s => { const m = /^@([^\s]+)$/.exec(String(s).trim()); return m ? { key: m[1], entry: bib.byKey.get(m[1].toLowerCase()) } : null; };
const bibLabel = e => [e.author, e.year && `(${e.year})`].filter(Boolean).join(" ") || e.type;
function sourceSearchText(s) { const r = bibLookup(s); return r && r.entry ? `${s} ${r.entry.author} ${r.entry.authorsAll} ${r.entry.year} ${r.entry.title}` : s; }
function showBibResolved(value) {
  const ul = $("#bibres"); if (!ul) return;
  const ta = $("#f-src"); let typing = null;
  if (ta && document.activeElement === ta) { const before = ta.value.slice(0, ta.selectionStart); const ln = before.split("\n").pop(); if (/^@\S*$/.test(ln.trim()) && ta.value.slice(ta.selectionStart).split("\n")[0].trim() === "") typing = ln.trim(); }
  const lines = value.split("\n").map(x => x.trim()).filter(Boolean);
  ul.innerHTML = lines.map(l => {
    const r = bibLookup(l);
    if (!r || (l === typing && !r.entry)) return "";
    if (!r.entry) return `<li class="miss"><code>@${esc(r.key)}</code> ${bib.entries.length ? "is not in " + esc(bib.name) : "· load a .bib to check it"}</li>`;
    return `<li><code>@${esc(r.entry.key)}</code> <b>${esc(bibLabel(r.entry))}</b> ${esc(r.entry.title)}${r.entry.venue ? ` <i>${esc(r.entry.venue)}</i>` : ""}</li>`;
  }).join("");
}
function attachBibComplete(ta) {
  const pop = $("#bibpop"); let items = [], active = 0, token = null;
  const close = () => { pop.hidden = true; items = []; token = null; };
  const query = () => {
    const caret = ta.selectionStart; const before = ta.value.slice(0, caret);
    const m = /(^|\s)@([^\s@]*)$/.exec(before);
    return m ? { start: caret - m[2].length - 1, end: caret, q: m[2].toLowerCase() } : null;
  };
  const draw = () => {
    token = query(); if (!token) return close();
    if (!bib.entries.length) {
      pop.innerHTML = `<div class="empty">No bibliography loaded. <button type="button" class="btn small" id="bib-load-inline">Load .bib…</button></div>`;
      pop.hidden = false; $("#bib-load-inline").onmousedown = e => { e.preventDefault(); loadBib(); }; items = []; return;
    }
    const q = token.q.normalize("NFD").replace(/[\u0300-\u036f]/g, ""), words = q.split(/[\s:_-]+/).filter(Boolean);
    const score = e => {
      const k = e.key.toLowerCase(), hay = `${k} ${e.authorsAll} ${e.year} ${e.title} ${e.venue}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (!words.every(w => hay.includes(w))) return -1;
      return (k.startsWith(q) ? 100 : 0) + (k.includes(q) ? 40 : 0) + (e.authorsAll.toLowerCase().includes(q) ? 20 : 0) + (+e.year || 0) / 10000;
    };
    items = bib.entries.map(e => [score(e), e]).filter(x => x[0] >= 0).sort((a, b) => b[0] - a[0]).slice(0, 8).map(x => x[1]);
    active = Math.min(active, Math.max(0, items.length - 1));
    pop.innerHTML = items.length ? items.map((e, i) => `<div class="opt${i === active ? " on" : ""}" role="option" data-i="${i}"><code>@${esc(e.key)}</code><span class="who">${esc(bibLabel(e))}</span><span class="ttl">${esc(e.title)}</span></div>`).join("")
      : `<div class="empty">No reference matches “${esc(q)}” in ${esc(bib.name)}.</div>`;
    pop.hidden = false;
  };
  const pick = i => {
    const e = items[i]; if (!e || !token) return;
    const v = ta.value; let ins = "@" + e.key; const after = v.slice(token.end);
    if (!after.startsWith("\n")) ins += "\n";
    ta.value = v.slice(0, token.start) + ins + after.replace(/^[^\s\n]*/, "");
    const c = token.start + ins.length; ta.setSelectionRange(c, c); close();
    ta.dispatchEvent(new Event("input", { bubbles: true })); ta.focus();
  };
  ta.addEventListener("input", () => { active = 0; draw(); });
  ta.addEventListener("click", draw);
  ta.addEventListener("keydown", e => {
    if (pop.hidden || !items.length) { if (e.key === "Escape" && !pop.hidden) { e.stopPropagation(); close(); } return; }
    if (e.key === "ArrowDown") { e.preventDefault(); active = (active + 1) % items.length; draw(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); active = (active - 1 + items.length) % items.length; draw(); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(active); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
  });
  ta.addEventListener("blur", () => setTimeout(close, 150));
  pop.addEventListener("mousedown", e => { const o = e.target.closest(".opt"); if (o) { e.preventDefault(); pick(+o.dataset.i); } });
}

/* ================= Menu actions & keyboard ================= */
const ACTIONS = {
  bib: loadBib, cats: () => openCats(),
  open: openFile, save: () => saveFile(false), saveas: () => saveFile(true), new: newEmpty,
  "paste-drawio": () => { $("#paste-err").hidden = true; $("#m-paste").hidden = false; $("#paste-text").focus(); },
  "exp-svg": () => { download(baseName() + ".svg", exportSVG().svg, "image/svg+xml"); toast("SVG exported. It shows what is on screen now."); },
  "exp-png": exportPNG, "exp-drawio": exportDrawio, "exp-json": () => download(fileName, docText(), "application/json"),
  "exp-graphml": exportGraphML, "exp-nodes": () => exportCSV("nodes"), "exp-edges": () => exportCSV("edges"),
  versions: openVersions, undo, redo, help: () => ($("#m-help").hidden = false),
  tidy: () => commit(() => tidyPositions(doc.nodes), { animate: true }),
  keep: () => {
    if (!lastRender || view.mode !== "untangle" || view.split) return;
    commit(() => doc.nodes.forEach(n => { const p = lastRender.pos.get(n.id); if (p) { n.x = Math.round(p.x); n.y = Math.round(p.y); } }));
    view.mode = "manual"; syncControls(); render(); toast("Positions copied into My layout. Ctrl Z to undo.");
  },
  "reset-view": () => { Object.assign(view, { effort: DEFAULT_VIEW.effort, place: DEFAULT_VIEW.place, levelSp: DEFAULT_VIEW.levelSp, nodeSp: DEFAULT_VIEW.nodeSp, route: DEFAULT_VIEW.route, keepOrder: false, split: false, repeat: true }); syncControls(); render({ animate: true, fit: true }); },
};
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (b && ACTIONS[b.dataset.act]) { $$("details.menu").forEach(d => d.open = false); ACTIONS[b.dataset.act](); return; }
  if (!e.target.closest("details.menu")) $$("details.menu").forEach(d => d.open = false);
  const c = e.target.closest("[data-close]"); if (c) c.closest(".overlay").hidden = true;
});
$$(".overlay").forEach(o => o.addEventListener("pointerdown", e => { if (e.target === o) o.hidden = true; }));
document.addEventListener("keydown", e => {
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  const typing = e.target.closest && e.target.closest("input, textarea, select, [contenteditable]");
  const modal = $$(".overlay").find(o => !o.hidden);
  if (e.key === "Escape" && modal) { modal.hidden = true; return; }
  if (mod && k === "s") { e.preventDefault(); saveFile(e.shiftKey); return; }
  if (mod && k === "o") { e.preventDefault(); openFile(); return; }
  if (modal) return;
  if (mod && k === "f") { e.preventDefault(); $("#q").focus(); $("#q").select(); return; }
  if (typing) return;
  if (mod && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === "y") { e.preventDefault(); redo(); return; }
  if (mod) return;
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelection(); }
  else if (e.key === "Tab" && selRef) { e.preventDefault(); addChild(selRef); }
  else if (e.key === "Enter" && selRef) { e.preventDefault(); inlineEdit(selCopy || selRef, false); }
  else if (k === "f" && selRef) toggleFold(selRef);
  else if (k === "r" && selEdge) reverseEdge(selEdge);
  else if (k === "l") setMode(view.mode === "manual" ? "untangle" : "manual");
  else if (e.key === "?") $("#m-help").hidden = false;
  else if (e.key === "Escape") clearSelection();
});
window.addEventListener("beforeunload", e => { if (dirty) { autosave(); e.preventDefault(); e.returnValue = ""; } });

/* ================= Boot ================= */
function initCy() {
  cy = cytoscape({ container: $("#cy"), elements: [], style: styleSheet(), minZoom: .08, maxZoom: 3,
    boxSelectionEnabled: false, autounselectify: true, selectionType: "single" });
  cy.on("tap", "node", e => { if (e.target.hasClass("badge")) return; selectNode(e.target.data("ref"), e.target.id(), e.originalEvent && (e.originalEvent.shiftKey || e.originalEvent.metaKey || e.originalEvent.ctrlKey)); });
  cy.on("tap", "edge", e => selectEdge(e.target.data("ref")));
  cy.on("tap", e => { if (e.target === cy) clearSelection(); });
  cy.on("dbltap", "node", e => { if (!e.target.hasClass("badge")) inlineEdit(e.target.id(), false); });
  cy.on("dbltap", e => { if (e.target === cy) addNodeAt(e.position.x, e.position.y, null); });
  cy.on("mouseover", "node", e => { if (e.target.hasClass("badge")) return; clearTimeout(hoverTimer); hoverCopy = e.target.id(); updateOverlays(); });
  cy.on("mouseout", "node", () => { clearTimeout(hoverTimer); hoverTimer = setTimeout(() => { hoverCopy = null; updateOverlays(); }, 450); });
  cy.on("viewport position", () => updateOverlays());
  let dragSnap = null;
  cy.on("grab", "node", () => { dragSnap = snap(); });
  cy.on("free", "node", e => {
    const ref = e.target.data("ref");
    if (view.mode === "untangle" && pins.has(ref)) {
      const p = e.target.position(); pins.set(ref, { x: p.x, y: p.y });
      const n = nodeById(ref), m = untangleToManual(p.x, p.y, ref);
      if (n) { n.x = Math.round(m.x); n.y = Math.round(m.y); touch(); }
      dragSnap = null; updateOverlays(); return;
    }
    if (view.mode !== "manual" || !dragSnap) return;
    const n = nodeById(e.target.data("ref")); const p = e.target.position();
    if (n && (Math.round(p.x) !== n.x || Math.round(p.y) !== n.y)) { pushUndo(dragSnap); n.x = Math.round(p.x); n.y = Math.round(p.y); touch(); render({ skipPanel: true }); }
    dragSnap = null;
  });
  const h = $("#handle");
  h.addEventListener("mouseenter", () => clearTimeout(hoverTimer));
  h.addEventListener("mouseleave", () => { hoverTimer = setTimeout(() => { hoverCopy = null; updateOverlays(); }, 450); });
  h.addEventListener("pointerdown", e => startDrag("connect", e, { copy: h.dataset.copy }));
  $("#grip-s").addEventListener("pointerdown", e => startDrag("rewire-source", e, { edge: $("#grip-s").dataset.edge }));
  $("#grip-t").addEventListener("pointerdown", e => startDrag("rewire-target", e, { edge: $("#grip-t").dataset.edge }));
  const restyle = () => cy.style(styleSheet());
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", restyle);
  new MutationObserver(restyle).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}

(async function boot() {
  try { await Promise.all([document.fonts.load(`${FONT_PX}px "IBM Plex Sans"`), document.fonts.load(`600 12px "IBM Plex Sans Condensed"`)]); } catch (e) {}
  initCy();
  let d = null, restored = false;
  const saved = lsGet(LS_DOC);
  if (saved) { try { d = normalizeDoc(JSON.parse(saved)); restored = true; } catch (e) { d = null; } }
  if (!d) d = builtinDoc();
  let fmeta = {}; try { fmeta = JSON.parse(lsGet(LS_FILE) || "{}"); } catch (e) {}
  doc = d; fileName = fmeta.fileName || "uchuva-rca.json"; dirty = restored ? !!fmeta.dirty : false;
  syncControls();
  await render({ fit: true, readable: true });
  if (doc.meta.migratedKey) { delete doc.meta.migratedKey; dirty = true; updateChrome(); autosave();
    toast("Colour key updated to your meanings: root problem, intermediate cause, root cause, unsure. Save to keep it in the file.", 6000); }
  else if (restored) toast("Picked up where you left off. Use File → Open to load a different RCA file.", 4200);
  window.__rca = { parseBib, setBib, get doc() { return doc; }, render, cy: () => cy, view, analyze, exportSVG, commit, nodeById, lastRender: () => lastRender };
})();
