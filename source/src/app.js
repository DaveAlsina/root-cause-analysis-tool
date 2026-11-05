/* Uchuva RCA Workbench — offline root-cause-analysis editor.
   Data lives in one JSON document (boxes, arrows, colour key, versions). */
/* global cytoscape, ELK */
"use strict";

/* ================= Constants ================= */
const APP_VERSION = "2.0";
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
const DEFAULT_VIEW = { lang: null, legendOpen: false, tagChips: true, mode: "manual", focusR: 0, trace: true, redundant: "show", effort: 3, place: 1,
  levelSp: 70, nodeSp: 14, route: "ORTHOGONAL", keepOrder: false, split: false, repeat: true };
const LS_DOC = "uchuva-rca:doc", LS_VIEW = "uchuva-rca:view", LS_FILE = "uchuva-rca:file";
const LANG_NAMES = { en: "English", es: "Español", nl: "Nederlands", de: "Deutsch", fr: "Français", pt: "Português", it: "Italiano" };
const DEFAULT_TAG_GROUPS = [
  { id: "product", name: "Product flow", nameTr: { es: "Flujo de producto" } },
  { id: "info", name: "Information flow", nameTr: { es: "Flujo de información" } },
];
// stages of a fresh-produce export chain, in chain order; offered as an example set in the tag editor
const STAGE_TEMPLATE = [
  { id: "t-culture",  group: "product", emoji: "🌱", name: "Culture care",      es: "Cuidado del cultivo",   desc: "Field and pre-harvest crop management" },
  { id: "t-harvest",  group: "product", emoji: "🧺", name: "Harvest",           es: "Cosecha",               desc: "" },
  { id: "t-drying",   group: "product", emoji: "🌬️", name: "Calyx drying",      es: "Secado del cáliz",      desc: "" },
  { id: "t-sorting",  group: "product", emoji: "🔍", name: "Sorting",           es: "Selección",             desc: "Grading and discarding fruit" },
  { id: "t-packing",  group: "product", emoji: "📦", name: "Packing",           es: "Empaque",               desc: "" },
  { id: "t-storage",  group: "product", emoji: "❄️", name: "Storage",           es: "Almacenamiento",        desc: "Cold rooms at farm, packhouse or exporter" },
  { id: "t-inland",   group: "product", emoji: "🚚", name: "Inland transport",  es: "Transporte terrestre",  desc: "Farm to packhouse, packhouse to port" },
  { id: "t-port",     group: "product", emoji: "🛃", name: "Port & inspection", es: "Puerto e inspección",   desc: "Port queues, phytosanitary and anti-narcotics checks" },
  { id: "t-sea",      group: "product", emoji: "🚢", name: "Sea freight",       es: "Transporte marítimo",   desc: "Reefer container, cold chain at sea" },
  { id: "t-monitor",  group: "info",    emoji: "📈", name: "Monitoring",        es: "Monitoreo",             desc: "Measuring conditions (°C, RH, rainfall) in the field and along the chain, and using the data for modelling and decisions" },
  { id: "t-comms",    group: "info",    emoji: "💬", name: "Communication",     es: "Comunicación",          desc: "Sharing information and relevant events along the chain, to build trust and improve the process" },
];
const EMOJI_PALETTE = "🌱🌿🌧️☀️🌡️💧🧺✂️🌬️🔍👁️📦🏷️❄️🧊🏭🚚🛃🚢✈️🏬🛒📈📊📡🧪🦠🍄💬📣🤝📋⚠️❓✅❌💰⏱️🔧👷🎓".match(/\p{Extended_Pictographic}\uFE0F?/gu);

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
  return { format: "uchuva-rca", schema: 2, app: APP_VERSION, title: "New root-cause analysis", titleTr: {}, languages: ["en"],
    categories: clone(DEFAULT_CATS), tagGroups: clone(DEFAULT_TAG_GROUPS), tags: [], scales: [], nodes: [], edges: [], versions: [], sessions: [], activeSession: null,
    meta: { created: nowISO(), modified: nowISO() } };
}
function newNode(text, cat, x, y) {
  return { id: uid("n"), text, textTr: {}, cat, tags: [], status: "unassessed", notes: "", sources: [], x: Math.round(x), y: Math.round(y) };
}
function coreOf(d) { return { title: d.title, titleTr: d.titleTr, languages: d.languages, categories: d.categories, tagGroups: d.tagGroups, tags: d.tags, scales: d.scales, nodes: d.nodes, edges: d.edges }; }
function stageTags(langs) { // the example stage set, named in the project's languages where the template has them
  const main = langs[0];
  const pick = t => main === "es" ? t.es : t.name;
  const tr = t => { const o = {}; langs.slice(1).forEach(l => { if (l === "es") o.es = t.es; if (l === "en") o.en = t.name; }); return o; };
  return STAGE_TEMPLATE.map(t => ({ id: t.id, group: t.group, emoji: t.emoji, name: pick(t), nameTr: tr(t), desc: t.desc }));
}
function groupsFor(langs) {
  const main = langs[0];
  return DEFAULT_TAG_GROUPS.map(g => ({ id: g.id, name: main === "es" ? g.nameTr.es : g.name,
    nameTr: Object.fromEntries(langs.slice(1).filter(l => l === "es" || l === "en").map(l => [l, l === "es" ? g.nameTr.es : g.name])) }));
}
function guessLang(texts) { // rough stop-word vote, only used for files saved before languages existed
  const s = " " + texts.join(" ").toLowerCase().replace(/[^\p{L}\s]/gu, " ") + " ";
  const count = ws => ws.reduce((a, w) => a + (s.split(" " + w + " ").length - 1), 0);
  const es = count(["la", "el", "de", "que", "los", "las", "se", "del", "por", "con", "una", "es", "está", "son"]);
  const en = count(["the", "is", "of", "and", "to", "are", "not", "with", "for", "by", "in", "it"]);
  return es > en * 1.2 ? "es" : "en";
}
const trObj = o => { const r = {}; if (o && typeof o === "object") Object.entries(o).forEach(([k, v]) => { if (typeof v === "string" && v.trim()) r[k] = v; }); return r; };
function mkVersion(d, name, note) { return { id: uid("v"), name, note: note || "", at: nowISO(), snapshot: clone(coreOf(d)) }; }

function normalizeDoc(d) {
  if (!d || typeof d !== "object" || !Array.isArray(d.nodes) || !Array.isArray(d.edges)) throw new Error("This JSON file is not an RCA file.");
  const out = emptyDoc();
  out.title = String(d.title ?? out.title); out.titleTr = trObj(d.titleTr);
  if (Array.isArray(d.languages) && d.languages.length) out.languages = [...new Set(d.languages.map(String))];
  else { out.languages = [guessLang(d.nodes.map(n => String(n.text || "")))]; out.meta._guessedLang = true; }
  out.categories = Array.isArray(d.categories) && d.categories.length ? d.categories.map(c => {
    const r = { id: String(c.id), name: String(c.name ?? c.id), nameTr: trObj(c.nameTr), role: ROLES[c.role] ? c.role : "none", desc: String(c.desc || ""),
      fill: c.fill || "#ffffff", stroke: c.stroke || "#000000", font: c.font || "#000000" };
    const def = DEFAULT_CATS.find(x => x.id === r.id);
    if (def && OLD_GUESSES[r.id] === r.name && !c.role) { r.name = def.name; r.role = def.role; r.desc = def.desc; out._migrated = true; }
    return r;
  }) : clone(DEFAULT_CATS);
  const catIds = new Set(out.categories.map(c => c.id));
  out.tagGroups = Array.isArray(d.tagGroups) && d.tagGroups.length ? d.tagGroups.map(g => ({ id: String(g.id), name: String(g.name ?? g.id), nameTr: trObj(g.nameTr) })) : groupsFor(out.languages);
  const gIds = new Set(out.tagGroups.map(g => g.id));
  out.tags = Array.isArray(d.tags) ? d.tags.filter(t => t && t.id).map(t => ({ id: String(t.id), emoji: String(t.emoji || "🏷️"), name: String(t.name ?? ""), nameTr: trObj(t.nameTr),
    group: gIds.has(t.group) ? t.group : out.tagGroups[0].id, desc: String(t.desc || "") })) : [];
  const tagIds = new Set(out.tags.map(t => t.id));
  if (d.bib && Array.isArray(d.bib)) out.bib = d.bib;
  if (d.viewDefaults && typeof d.viewDefaults === "object") out.viewDefaults = d.viewDefaults;
  const ids = new Set();
  let missingPos = false;
  out.nodes = d.nodes.map(n => {
    const id = String(n.id); ids.add(id);
    if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) missingPos = true;
    const r = { id, text: String(n.text ?? n.label ?? ""), textTr: trObj(n.textTr), cat: catIds.has(n.cat) ? n.cat : out.categories[0].id,
      tags: Array.isArray(n.tags) ? n.tags.map(String).filter(t => tagIds.has(t)) : [],
      status: STATUSES[n.status] ? n.status : "unassessed", notes: String(n.notes || ""),
      sources: Array.isArray(n.sources) ? n.sources.map(String) : [], x: Math.round(+n.x || 0), y: Math.round(+n.y || 0) };
    if (n.outline) r.outline = n.outline;
    if (n.origin && typeof n.origin === "object" && n.origin.session) r.origin = { session: String(n.origin.session), at: String(n.origin.at || "") };
    return r;
  });
  const seen = new Set();
  out.edges = d.edges.map(e => ({ id: String(e.id || uid("e")), source: String(e.source), target: String(e.target) }))
    .filter(e => ids.has(e.source) && ids.has(e.target) && e.source !== e.target && !seen.has(e.source + ">" + e.target) && seen.add(e.source + ">" + e.target));
  out.versions = Array.isArray(d.versions) ? d.versions.filter(v => v && v.snapshot) : [];
  out.scales = Array.isArray(d.scales) ? d.scales.filter(x => x && x.id).map(normScale) : [];
  out.sessions = Array.isArray(d.sessions) ? d.sessions.filter(x => x && x.id).map(normSession) : [];
  out.activeSession = out.sessions.some(x => x.id === d.activeSession) ? d.activeSession : null;
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

function boxSize(n, extra = "") { // big enough for the text in every language, so the layout holds when switching
  const all = txAll(n); if (!all.length) all.push(" ");
  return all.map(t => measureText(t + extra)).reduce((a, b) => ({ w: Math.max(a.w, b.w), h: Math.max(a.h, b.h) }));
}
/* Push overlapping boxes apart (mostly vertically, so columns stay intact) */
function tidyPositions(nodes, gap = 12) {
  const S = nodes.map(n => ({ n, ...boxSize(n) }));
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
const snap = () => JSON.stringify({ ...coreOf(doc), sessions: doc.sessions, activeSession: doc.activeSession });
function restoreCore(s) {
  const c = typeof s === "string" ? JSON.parse(s) : clone(s);
  doc.title = c.title; doc.titleTr = c.titleTr || (c.languages ? {} : doc.titleTr); doc.languages = c.languages || doc.languages;
  doc.categories = c.categories; doc.tagGroups = c.tagGroups || doc.tagGroups; doc.tags = c.tags || doc.tags;
  const tagIds = new Set(doc.tags.map(t => t.id));
  doc.nodes = c.nodes.map(n => ({ ...n, textTr: n.textTr || {}, tags: (n.tags || []).filter(t => tagIds.has(t)) })); doc.edges = c.edges;
  if (c.scales) doc.scales = c.scales;
  if (c.sessions) { doc.sessions = c.sessions; doc.activeSession = c.activeSession || null; }
}
function pushUndo(s) { undoStack.push(s); if (undoStack.length > 300) undoStack.shift(); redoStack.length = 0; }
function commit(fn, opts = {}) {
  if (VIEWER) return Promise.resolve();
  flushField(true);
  pushUndo(snap());
  fn();
  touch();
  return render(opts);
}
function touch() {
  doc.meta.modified = nowISO(); dirty = true; autosave(); updateChrome(); fileAutosave();
}
let fileTimer = null, fileSavedAt = null, fileNeedsGesture = false;
function fileAutosave() { // write into the file you opened, a moment after each change
  if (VIEWER || !fileHandle) return;
  clearTimeout(fileTimer);
  fileTimer = setTimeout(async () => {
    try {
      if (fileHandle.queryPermission && (await fileHandle.queryPermission({ mode: "readwrite" })) !== "granted") { fileNeedsGesture = true; updateChrome(); return; }
      const w = await fileHandle.createWritable(); await w.write(docText()); await w.close();
      dirty = false; fileNeedsGesture = false; fileSavedAt = new Date(); updateChrome(); autosave();
    } catch (e) { console.warn("Automatic save to file failed", e); }
  }, 1200);
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
  if (VIEWER) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    if (!lsSet(LS_DOC, JSON.stringify(doc))) console.warn("Autosave to browser storage failed");
    lsSet(LS_FILE, JSON.stringify({ fileName, dirty }));
  }, 300);
}
const nodeById = id => doc.nodes.find(n => n.id === id);
const catById = id => doc.categories.find(c => c.id === id) || { id, name: id, fill: "#ffffff", stroke: "#000000", font: "#000000" };

/* ================= Languages: main text in `field`, others in `fieldTr[lang]` ================= */
const langName = c => LANG_NAMES[c] || c.toUpperCase();
const mainLang = () => doc.languages[0];
const curLang = () => (doc.languages.includes(view.lang) ? view.lang : mainLang());
const neutralText = s => /^[\s?¿!.…\-–—]*$/.test(s || "");
function txRaw(o, f, lang) { return lang === mainLang() ? (o[f] || "") : ((o[f + "Tr"] || {})[lang] || ""); }
function tx(o, f = "text", lang = curLang()) {
  if (!o) return "";
  return txRaw(o, f, lang) || o[f] || Object.values(o[f + "Tr"] || {}).find(Boolean) || "";
}
const txAll = (o, f = "text") => [o[f] || "", ...Object.values(o[f + "Tr"] || {})].filter(Boolean);
function txMissing(o, f = "text", lang = curLang()) {
  if (txRaw(o, f, lang).trim()) return false;
  const all = txAll(o, f); return all.length > 0 && !all.every(neutralText);
}
function txSet(o, f, lang, v) {
  if (lang === mainLang()) o[f] = v;
  else { o[f + "Tr"] = o[f + "Tr"] || {}; if (v) o[f + "Tr"][lang] = v; else delete o[f + "Tr"][lang]; }
}
function everyTranslatable(d, fn) { // visit every visible text: title, categories, tag groups, tags, boxes
  fn(d, "title"); d.categories.forEach(c => fn(c, "name")); d.tagGroups.forEach(g => fn(g, "name"));
  d.tags.forEach(t => fn(t, "name")); d.nodes.forEach(n => fn(n, "text"));
}
const isQ = n => (n.text || txAll(n)[0] || "").trim() === "?";
const tagById = id => doc.tags.find(t => t.id === id);
const orderedTags = ids => doc.tags.filter(t => ids.includes(t.id)); // in the order of the tag list = chain order

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
let VIEWER = false; // read-only viewer for published diagrams
let GRADING = false; // interview grading: the diagram is locked, boxes get scores
const LS_VPREF = "uchuva-rca:viewer";
function saveViewerPref() { if (VIEWER) lsSet(LS_VPREF, JSON.stringify({ lang: view.lang, tagChips: view.tagChips })); }
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
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';
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

/* ================= Interface words seen by viewers (the editor stays in English) ================= */
const UI = {
  en: {
    manual: "My layout", manualV: "As drawn", untangle: "Untangle", allLevels: "All levels", levels: n => `${n} levels`, search: "Search text, notes, sources",
    searchV: "Search boxes or #tag", tags: "Tags", clear: "Clear", editTags: "Edit tags", colourKey: "Colour key", collapse: "Collapse", expand: "Expand", edit: "Edit",
    view: "View", crossings: "crossings", focus: "Focus radius", off: "off", steps: n => `${n} step${n > 1 ? "s" : ""} from the selected box`,
    trace: "Highlight the chain of the selected box", redundant: "Redundant arrows", show: "Show", dashed: "Dashed", hide: "Hide",
    untangleSet: "Untangle settings", effort: "Effort", placement: "Box placement", levelSp: "Level spacing", boxSp: "Box spacing", arrows: "Arrow style",
    rightAngled: "Right-angled", angled: "Angled", straight: "Straight", keepOrder: "Respect my vertical order", split: "Split shared causes into copies",
    repeat: "Repeat the full branch under every copy", reset: "Reset settings", switchUntangle: "Switch to <b>Untangle</b> to use these.",
    readOnly: "Read-only view", makeOwn: "Make your own RCA",
    howTo: "How to read this diagram",
    howToBody: "Each arrow points from an effect to the cause that explains it, so every step to the right answers “why?”. Click a box to light up its whole chain. Scroll or pinch to zoom, drag to move around. Use the tag row to highlight one stage of the chain, and Focus radius in the View panel to see only the boxes near the one you selected.",
    openQ: "Open questions", why: s => `Why does “${s}” happen?`, deepest: "Deepest causes", deepestNote: "Ranked by how many distinct chains connect them to the rejection.",
    category: "Category", status: "Status", sources: "Sources", notes: "Notes", explainedBy: "Why? Explained by", explains: "It explains",
    nothingYet: "Nothing yet. The chain ends here.", topLevel: "This is a top-level problem.", chain: "Chain from the top problem",
    copyLink: "Copy a link to this box", copied: "Link copied", byStage: "Boxes per tag", none: "None.", open: "Open question (?)",
    level: "Level", chains: "Chains to the top problem", below: "Causes below it", missingTr: "Not translated yet; shown in another language.",
    hypothesis: "Hypothesis", supported: "Supported by evidence", refuted: "Refuted",
    hideEmoji: "Hide emojis on boxes", showEmoji: "Show emojis on boxes", chipsTip: "Tags still highlight boxes when their emojis are hidden",
    interview: "Interview", pickBox: "Pick a box to grade it. Ungraded boxes in a branch marked as discussed count as not relevant.",
    keysHelp: names => `Keys: <kbd>0</kbd>–<kbd>9</kbd> ${esc(names[0] || "")}${names[1] ? ` · <kbd>Shift</kbd> + number ${esc(names[1])}` : ""}${names[2] ? ` · <kbd>Alt</kbd> + number ${esc(names[2])}` : ""} · <kbd>N</kbd>/<kbd>P</kbd> next/previous box · <kbd>B</kbd> branch discussed · <kbd>A</kbd> add a cause`,
    branches: "Branches", proposedBy: c => `Proposed in interview ${c}`, clearGrade: "Clear this grade", gatedNote: (s, m) => `Asked when ${s} is ${m} or more.`,
    gatedOut: "Not counted: the condition above is no longer met.", whyNote: "Why (optional)", whyPlaceholder: "What they said, in a few words",
    everythingBelow: n => `This branch was discussed (${n} box${n === 1 ? "" : "es"})`, coveredBy: s => `Discussed as part of “${s}”`,
    prev: "Previous", next: "Next", addCauseHere: "Add a cause here", noScales: "No scales yet.", gradedOf: (g, n) => `<b>${g}</b>/${n} graded`,
    discussedBranches: "Branches discussed", discussedHelp: "Tick the branches you walked through. Their ungraded boxes count as not relevant; the rest count as not discussed.",
    shadeBy: s => `Shade by ${s}`, endInterview: "End interview", clockTip: "Time since the interview clock started", clockReset: "Restart the clock from zero",
    clockWasReset: "Clock restarted.", outOfRange: (s, a, b) => `${s} goes from ${a} to ${b}.`, started: c => `Interview ${c} started. Every click is saved in this browser.`,
    details: "Details", close: "Close", allBranches: "All branches", shared: "shared", branch: "Branch", boxes: "boxes",
    upLevel: "Up one level", showAll: "Show everything", onlyBranch: "Show only this branch",
    export: "Export", tries: n => `${n} tr${n > 1 ? "ies" : "y"}`, place0: "Compact", place1: "Balanced", place2: "Straight arrows",
  },
  es: {
    manual: "Mi diseño", manualV: "Como se dibujó", untangle: "Desenredar", allLevels: "Todos los niveles", levels: n => `${n} niveles`, search: "Buscar",
    searchV: "Buscar cajas o #etiqueta", tags: "Etiquetas", clear: "Quitar", editTags: "Editar etiquetas", colourKey: "Colores", collapse: "Ocultar", expand: "Mostrar", edit: "Editar",
    view: "Vista", crossings: "cruces", focus: "Radio de enfoque", off: "apagado", steps: n => `${n} paso${n > 1 ? "s" : ""} desde la caja elegida`,
    trace: "Resaltar la cadena de la caja elegida", redundant: "Flechas redundantes", show: "Mostrar", dashed: "Punteadas", hide: "Ocultar",
    untangleSet: "Ajustes de Desenredar", effort: "Esfuerzo", placement: "Ubicación de cajas", levelSp: "Espacio entre niveles", boxSp: "Espacio entre cajas", arrows: "Estilo de flechas",
    rightAngled: "En ángulo recto", angled: "Inclinadas", straight: "Rectas", keepOrder: "Respetar el orden vertical original", split: "Separar causas compartidas en copias",
    repeat: "Repetir la rama completa bajo cada copia", reset: "Restablecer", switchUntangle: "Cambia a <b>Desenredar</b> para usarlos.",
    readOnly: "Vista de solo lectura", makeOwn: "Haz tu propio análisis",
    howTo: "Cómo leer este diagrama",
    howToBody: "Cada flecha va de un efecto a la causa que lo explica, así que cada paso hacia la derecha responde “¿por qué?”. Haz clic en una caja para resaltar toda su cadena. Usa la rueda o dos dedos para hacer zoom y arrastra para moverte. Usa la fila de etiquetas para resaltar una etapa de la cadena, y el Radio de enfoque en el panel Vista para ver solo las cajas cercanas a la elegida.",
    openQ: "Preguntas abiertas", why: s => `¿Por qué ocurre “${s}”?`, deepest: "Causas más profundas", deepestNote: "Ordenadas por cuántas cadenas distintas las conectan con el rechazo.",
    category: "Categoría", status: "Estado", sources: "Fuentes", notes: "Notas", explainedBy: "¿Por qué? Lo explica", explains: "Explica",
    nothingYet: "Nada aún. La cadena termina aquí.", topLevel: "Este es un problema de primer nivel.", chain: "Cadena desde el problema principal",
    copyLink: "Copiar un enlace a esta caja", copied: "Enlace copiado", byStage: "Cajas por etiqueta", none: "Ninguna.", open: "Pregunta abierta (?)",
    level: "Nivel", chains: "Cadenas hasta el problema principal", below: "Causas debajo", missingTr: "Aún sin traducir; se muestra en otro idioma.",
    hypothesis: "Hipótesis", supported: "Respaldada por evidencia", refuted: "Descartada",
    hideEmoji: "Ocultar emojis en las cajas", showEmoji: "Mostrar emojis en las cajas", chipsTip: "Las etiquetas siguen resaltando cajas aunque sus emojis estén ocultos",
    interview: "Entrevista", pickBox: "Elige una caja para calificarla. Las cajas sin calificar en una rama marcada como conversada cuentan como no relevantes.",
    keysHelp: names => `Teclas: <kbd>0</kbd>–<kbd>9</kbd> ${esc(names[0] || "")}${names[1] ? ` · <kbd>Shift</kbd> + número ${esc(names[1])}` : ""}${names[2] ? ` · <kbd>Alt</kbd> + número ${esc(names[2])}` : ""} · <kbd>N</kbd>/<kbd>P</kbd> caja siguiente/anterior · <kbd>B</kbd> rama conversada · <kbd>A</kbd> agregar una causa`,
    branches: "Ramas", proposedBy: c => `Propuesta en la entrevista ${c}`, clearGrade: "Borrar esta calificación", gatedNote: (s, m) => `Se pregunta cuando ${s} es ${m} o más.`,
    gatedOut: "No cuenta: la condición de arriba ya no se cumple.", whyNote: "Por qué (opcional)", whyPlaceholder: "Lo que dijo, en pocas palabras",
    everythingBelow: n => `Esta rama se conversó (${n} caja${n === 1 ? "" : "s"})`, coveredBy: s => `Conversada como parte de “${s}”`,
    prev: "Anterior", next: "Siguiente", addCauseHere: "Agregar una causa aquí", noScales: "Aún no hay escalas.", gradedOf: (g, n) => `<b>${g}</b>/${n} calificadas`,
    discussedBranches: "Ramas conversadas", discussedHelp: "Marca las ramas que recorriste. Sus cajas sin calificar cuentan como no relevantes; las demás, como no conversadas.",
    shadeBy: s => `Sombrear por ${s}`, endInterview: "Terminar entrevista", clockTip: "Tiempo desde que empezó el reloj de la entrevista", clockReset: "Reiniciar el reloj en cero",
    clockWasReset: "Reloj reiniciado.", outOfRange: (s, a, b) => `${s} va de ${a} a ${b}.`, started: c => `Entrevista ${c} iniciada. Cada clic se guarda en este navegador.`,
    details: "Detalles", close: "Cerrar", allBranches: "Todas las ramas", shared: "compartida", branch: "Rama", boxes: "cajas",
    upLevel: "Subir un nivel", showAll: "Mostrar todo", onlyBranch: "Mostrar solo esta rama",
    export: "Exportar", tries: n => `${n} intento${n > 1 ? "s" : ""}`, place0: "Compacta", place1: "Equilibrada", place2: "Flechas rectas",
  },
};
function t(k, ...a) { const L = VIEWER || GRADING ? curLang() : "en"; const v = (UI[L] && UI[L][k] !== undefined) ? UI[L][k] : UI.en[k]; return typeof v === "function" ? v(...a) : (v ?? k); }
function applyUI() {
  $$("[data-ui]").forEach(el => { el.innerHTML = t(el.dataset.ui); }); $("#q").placeholder = VIEWER ? t("searchV") : UI.en.search;
  if (VIEWER) $("#viewer-line").innerHTML = `<span>${esc(t("readOnly"))}</span> · <a href="${esc(pageBase())}?edit" target="_blank" rel="noopener">${esc(t("makeOwn"))} ↗</a>`;
  const lv = $("#depth"); [...lv.options].forEach(o => { if (o.value !== "all") o.textContent = t("levels", o.value); });
}

/* ================= Side panel ================= */
const swatch = n => { const c = catById(n.cat); return `<span class="sw" style="background:${c.fill};border-color:${c.stroke}"></span>`; };
const nm = n => isQ(n) ? `<i>${esc(t("open"))}</i>` : (txMissing(n) && doc.languages.length > 1 ? `<i>${esc(tx(n))}</i>` : esc(tx(n)));
const tagPills = n => orderedTags(n.tags || []).map(tg => `<span class="tpill" title="${esc(tx(tg, "name"))}">${tg.emoji}</span>`).join("");
const boxList = arr => `<ul class="list">${arr.map(c => `<li><button data-go="${esc(c.id)}">${swatch(c)}<span>${nm(c)}</span>${tagPills(c) ? `<span class="tps">${tagPills(c)}</span>` : ""}</button></li>`).join("")}</ul>`;
function missingSummary() { // per language: boxes and other visible texts still untranslated
  if (doc.languages.length < 2) return [];
  return doc.languages.map(l => {
    const boxes = doc.nodes.filter(n => txMissing(n, "text", l)).length;
    let other = 0; everyTranslatable(doc, (o, f) => { if (f !== "text" && txMissing(o, f, l)) other++; });
    return { l, boxes, other };
  });
}
function renderPanel() {
  if (VIEWER) return renderViewerPanel();
  if (GRADING) return renderGradePanel();
  const p = $("#panel");
  if (!lastRender) return;
  const { A } = lastRender;
  if (selEdge) {
    const e = doc.edges.find(x => x.id === selEdge); if (!e) { selEdge = null; return renderPanel(); }
    const s = nodeById(e.source), tg = nodeById(e.target);
    p.innerHTML = `<div class="sec"><h2>Arrow</h2>
      <div class="sel-edge"><button class="btn" data-go="${esc(s.id)}">${swatch(s)}${nm(s)}</button>
      <span class="arrow">is explained by ↓</span>
      <button class="btn" data-go="${esc(tg.id)}">${swatch(tg)}${nm(tg)}</button></div>
      <p class="muted">Drag either round end of the selected arrow onto another box to rewire it.</p>
      <div class="row"><button class="btn" id="p-rev">Reverse <kbd>R</kbd></button><button class="btn danger" id="p-del">Delete <kbd>Del</kbd></button></div></div>`;
    $("#p-rev").onclick = () => reverseEdge(selEdge); $("#p-del").onclick = deleteSelection;
    return;
  }
  if (multi.length > 1) {
    const sel = multi.map(id => nodeById(id)).filter(Boolean);
    p.innerHTML = `<div class="sec"><h2>${multi.length} boxes selected</h2>${boxList(sel)}
      ${doc.tags.length ? `<div class="field"><span>Tag all of them</span><div class="tagpick" id="multi-tags">${tagPicker(sel)}</div></div>` : ""}
      <div class="row"><button class="btn danger" id="p-del">Delete all <kbd>Del</kbd></button><button class="btn" id="p-clr">Clear selection</button></div></div>`;
    $("#p-del").onclick = deleteSelection; $("#p-clr").onclick = clearSelection;
    $$("#multi-tags [data-tag]").forEach(b => b.onclick = () => toggleTag(multi.slice(), b.dataset.tag));
    return;
  }
  const n = selRef && nodeById(selRef);
  if (!n) {
    const qs = doc.nodes.filter(isQ);
    const leaves = doc.nodes.filter(x => A.out.get(x.id).length === 0 && !isQ(x))
      .sort((a, b) => (A.paths.get(b.id) || 0) - (A.paths.get(a.id) || 0) || (A.depth.get(b.id) || 0) - (A.depth.get(a.id) || 0));
    const cyc = doc.nodes.filter(x => A.cyc.has(x.id));
    const miss = missingSummary().filter(m => m.boxes || m.other);
    p.innerHTML = `
      <div class="sec"><h2>Getting around</h2>
      <p class="muted">Click a box to edit it and light up its chain. Double-click empty space to add a box; drag the green dot on a box onto its cause to connect them. Press <kbd>?</kbd> for all shortcuts.</p></div>
      ${miss.length ? `<div class="sec"><h2>Missing translations</h2>${miss.map(m => `<div class="trline"><span><b>${m.l.toUpperCase()}</b> ${m.boxes} box${m.boxes === 1 ? "" : "es"}${m.other ? ` · ${m.other} other text${m.other === 1 ? "" : "s"}` : ""}</span>${m.boxes ? `<button class="btn small" data-trpass="${m.l}">Translate one by one</button>` : ""}${m.other ? `<button class="btn small" data-act="langs">Names and title…</button>` : ""}</div>`).join("")}
        <p class="muted">Untranslated boxes show their text in another language, in italics.</p></div>` : ""}
      ${cyc.length ? `<div class="warnbox"><b>Loop found.</b> ${cyc.length} boxes explain each other in a circle: ${cyc.map(x => esc(tx(x))).join(" → ")}</div>` : ""}
      ${(() => { const ck = keyChecks(A); if (!ck.length) return "";
        const open = ck.filter(c => c.kind === "open"), deeper = ck.filter(c => c.kind === "deeper");
        return `<div class="sec"><h2>Colour key checks · ${ck.length}</h2>
        <p class="muted">Boxes whose colour and arrows disagree. Either the chain continues, or the colour should change.</p>
        ${open.length ? `<details class="ck"><summary>${open.length} intermediate cause${open.length > 1 ? "s" : ""} with nothing below</summary>${boxList(open.map(c => nodeById(c.id)))}</details>` : ""}
        ${deeper.length ? `<details class="ck" open><summary>${deeper.length} root cause${deeper.length > 1 ? "s" : ""} with deeper causes</summary>${boxList(deeper.map(c => nodeById(c.id)))}</details>` : ""}</div>`; })()}
      <div class="sec"><h2>Open questions · ${qs.length}</h2>
      <ul class="list">${qs.map(x => { const par = A.inn.get(x.id).map(nodeById)[0]; return `<li><button data-go="${esc(x.id)}">${swatch(x)}<span>Why does “${esc(par ? tx(par) : "?")}” happen?</span></button></li>`; }).join("") || `<p class="muted">None.</p>`}</ul></div>
      <div class="sec"><h2>Deepest causes · ${leaves.length}</h2>
      <p class="muted">Ranked by how many distinct chains connect them to the rejection.</p>
      <ul class="list">${leaves.map(x => `<li><button data-go="${esc(x.id)}">${swatch(x)}<span>${nm(x)}</span>${tagPills(x) ? `<span class="tps">${tagPills(x)}</span>` : ""}<span class="cnt">${A.paths.get(x.id) ? "×" + A.paths.get(x.id) : "–"}</span></button></li>`).join("")}</ul></div>`;
    $$("[data-trpass]").forEach(b => b.onclick = () => translatePass(b.dataset.trpass));
    return;
  }
  const causes = A.out.get(n.id).map(nodeById), effects = A.inn.get(n.id).map(nodeById);
  const below = [...bfs([n.id], A.out, () => false)].filter(x => x !== n.id);
  const qBelow = below.filter(id => isQ(nodeById(id))).length;
  const chain = chainTo(n.id).map(nodeById);
  const copies = lastRender.U.copies.filter(c => c.ref === n.id).length;
  const L = doc.languages, many = L.length > 1;
  p.innerHTML = `
    <div class="sec">
      ${L.map((l, i) => `<label class="field"><span>Text${many ? ` · <b>${l.toUpperCase()}</b>${i === 0 ? " (main)" : ""}${txMissing(n, "text", l) ? ` <em class="mt">missing</em>` : ""}` : ""}</span><textarea data-lang="${l}" class="ftext${i === 0 ? " big" : ""}" rows="${i === 0 ? 3 : 2}" placeholder="${many ? esc(langName(l)) + " text" : ""}">${esc(txRaw(n, "text", l))}</textarea></label>`).join("")}
      <div class="field"><label for="f-cat">Category · <button type="button" class="linkbtn" id="p-cats">edit categories</button></label><select id="f-cat">${doc.categories.map(c => `<option value="${esc(c.id)}"${c.id === n.cat ? " selected" : ""}>${esc(tx(c, "name"))}</option>`).join("")}<option disabled>──────────</option><option value="__new">＋ New category…</option><option value="__manage">Edit, delete or recolour categories…</option></select>
        ${catById(n.cat).desc ? `<span class="catdesc">${esc(catById(n.cat).desc)}</span>` : ""}
        ${keyChecks(A).filter(c => c.id === n.id).map(c => `<span class="ckwarn">${esc(c.msg)}.</span>`).join("")}</div>
      <div class="field"><span>Tags · <button type="button" class="linkbtn" id="p-tags">edit tags</button></span><div class="tagpick" id="f-tags">${doc.tags.length ? tagPicker([n]) : `<span class="muted">No tags yet.</span>`}</div></div>
      <div class="field"><span>Status</span><div class="status-seg" role="group" aria-label="Status">${Object.entries(STATUSES).map(([k, s]) =>
        `<button data-status="${k}" aria-pressed="${n.status === k}"><i style="border-color:${s.color || "var(--muted)"};border-style:${s.style}"></i>${s.short}</button>`).join("")}</div></div>
      <label class="field"><span>Notes · only for you</span><textarea id="f-notes" rows="3" placeholder="Reasoning, observations, what to check next">${esc(n.notes)}</textarea></label>
      <div class="field bibfield"><label for="f-src">Sources, one per line · type <kbd>@</kbd> to cite from your .bib</label><textarea id="f-src" rows="3" placeholder="@williamson2007botrytis or free text" autocomplete="off" spellcheck="false">${esc(n.sources.join("\n"))}</textarea><div class="bibpop" id="bibpop" role="listbox" hidden></div><ul class="bibres" id="bibres"></ul></div>
      ${lastRender.D.sub(n.id).size > 1 && view.branch !== n.id ? `<div class="row"><button class="btn small" id="p-branch">Show only this branch (${lastRender.D.sub(n.id).size} boxes)</button></div>` : ""}
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
      ${causes.length ? boxList(causes) : `<p class="muted">Nothing yet. The chain ends here.</p>`}</div>
    <div class="sec"><h2>It explains · ${effects.length}</h2>
      ${effects.length ? boxList(effects) : `<p class="muted">This is a top-level problem.</p>`}</div>
    <div class="sec"><h2>Chain from the rejection</h2>
      <ol class="chain">${chain.map(c => `<li><button data-go="${esc(c.id)}">${nm(c)}</button></li>`).join("")}</ol></div>`;
  const ref = n.id;
  $$(".ftext").forEach(ta => {
    const l = ta.dataset.lang;
    ta.addEventListener("input", e => fieldEdit(ref, m => { txSet(m, "text", l, e.target.value.replace(/\s+/g, " ").trim()); }));
    ta.addEventListener("change", () => flushField());
  });
  $("#f-notes").addEventListener("input", e => fieldEdit(ref, m => { m.notes = e.target.value; }));
  $("#f-src").addEventListener("input", e => { fieldEdit(ref, m => { m.sources = e.target.value.split("\n").map(s => s.trim()).filter(Boolean); }); showBibResolved(e.target.value); });
  attachBibComplete($("#f-src")); showBibResolved($("#f-src").value);
  ["#f-notes", "#f-src"].forEach(s => $(s).addEventListener("change", () => flushField()));
  $("#f-cat").onchange = e => {
    const v = e.target.value;
    if (v === "__new" || v === "__manage") { e.target.value = nodeById(ref).cat; openCats(v === "__new" ? ref : null); return; }
    commit(() => { nodeById(ref).cat = v; });
  };
  $("#p-cats").onclick = openCats; $("#p-tags").onclick = () => openTags();
  $$("#f-tags [data-tag]").forEach(b => b.onclick = () => toggleTag([ref], b.dataset.tag));
  $$(".status-seg button").forEach(b => b.onclick = () => commit(() => { nodeById(ref).status = b.dataset.status; }));
  $("#p-add").onclick = () => addChild(ref);
  $("#p-branch") && ($("#p-branch").onclick = () => setBranch(ref));
  $("#p-fold") && ($("#p-fold").onclick = () => toggleFold(ref));
  $("#p-del").onclick = deleteSelection;
}
function tagPicker(nodes) { // grouped toggle chips; pressed = every given box has the tag
  return doc.tagGroups.map(g => {
    const ts = doc.tags.filter(tg => tg.group === g.id); if (!ts.length) return "";
    return `<div class="tp-group"><span class="tp-g">${esc(tx(g, "name"))}</span>${ts.map(tg => {
      const on = nodes.every(n => (n.tags || []).includes(tg.id));
      return `<button type="button" class="tchip" data-tag="${esc(tg.id)}" aria-pressed="${on}" title="${esc(tg.desc || "")}">${tg.emoji} ${esc(tx(tg, "name"))}</button>`; }).join("")}</div>`;
  }).join("");
}
function toggleTag(refs, tagId) {
  const nodes = refs.map(nodeById).filter(Boolean); if (!nodes.length) return;
  const allOn = nodes.every(n => (n.tags || []).includes(tagId));
  commit(() => refs.forEach(r => { const n = nodeById(r); if (!n) return;
    n.tags = (n.tags || []).filter(x => x !== tagId); if (!allOn) n.tags.push(tagId);
    n.tags = doc.tags.filter(tg => n.tags.includes(tg.id)).map(tg => tg.id); }));
}
function renderViewerPanel() {
  const p = $("#panel");
  if (!lastRender) return;
  const { A } = lastRender;
  const n = selRef && nodeById(selRef);
  if (!n) {
    const qs = doc.nodes.filter(isQ);
    const leaves = doc.nodes.filter(x => A.out.get(x.id).length === 0 && !isQ(x))
      .sort((a, b) => (A.paths.get(b.id) || 0) - (A.paths.get(a.id) || 0) || (A.depth.get(b.id) || 0) - (A.depth.get(a.id) || 0));
    p.innerHTML = `<div class="sec"><h2>${t("howTo")}</h2><p class="muted">${t("howToBody")}</p></div>
      <div class="sec"><h2>${t("openQ")} · ${qs.length}</h2>
      <ul class="list">${qs.map(x => { const par = A.inn.get(x.id).map(nodeById)[0]; return `<li><button data-go="${esc(x.id)}">${swatch(x)}<span>${esc(t("why", par ? tx(par) : "?"))}</span></button></li>`; }).join("") || `<p class="muted">${t("none")}</p>`}</ul></div>
      <div class="sec"><h2>${t("deepest")} · ${leaves.length}</h2><p class="muted">${t("deepestNote")}</p>
      <ul class="list">${leaves.map(x => `<li><button data-go="${esc(x.id)}">${swatch(x)}<span>${nm(x)}</span>${tagPills(x) ? `<span class="tps">${tagPills(x)}</span>` : ""}<span class="cnt">${A.paths.get(x.id) ? "×" + A.paths.get(x.id) : "–"}</span></button></li>`).join("")}</ul></div>`;
    return;
  }
  const causes = A.out.get(n.id).map(nodeById), effects = A.inn.get(n.id).map(nodeById);
  const c = catById(n.cat), st = STATUSES[n.status];
  const chain = chainTo(n.id).map(nodeById);
  const tagsHtml = orderedTags(n.tags || []).map(tg => `<span class="tchip static">${tg.emoji} ${esc(tx(tg, "name"))}</span>`).join("");
  const srcHtml = (n.sources || []).map(sx => { const r = bibLookup(sx);
    return `<li>${r && r.entry ? `<b>${esc(bibLabel(r.entry))}</b> ${esc(r.entry.title)}${r.entry.venue ? ` <i>${esc(r.entry.venue)}</i>` : ""}` : esc(sx)}</li>`; }).join("");
  p.innerHTML = `<div class="sec">
      <p class="sel-title">${isQ(n) ? esc(t("open")) : esc(tx(n))}</p>
      ${doc.languages.length > 1 && txMissing(n) ? `<p class="muted"><i>${t("missingTr")}</i></p>` : ""}
      <span class="chip"><span class="sw" style="background:${c.fill};border-color:${c.stroke}"></span>${esc(tx(c, "name"))}</span>
      ${c.desc && curLang() === mainLang() ? `<span class="catdesc">${esc(c.desc)}</span>` : ""}
      ${n.status !== "unassessed" ? `<span class="chip"><i class="stbox" style="border-color:${st.color};border-style:${st.style}"></i>${esc(t(n.status))}</span>` : ""}
      ${tagsHtml ? `<div class="tagpick">${tagsHtml}</div>` : ""}
      ${srcHtml ? `<div class="field"><span>${t("sources")}</span><ul class="srclist">${srcHtml}</ul></div>` : ""}
      ${n.notes ? `<div class="field"><span>${t("notes")}</span><p class="muted">${esc(n.notes)}</p></div>` : ""}
      <div class="row"><button class="btn small" id="v-link">${t("copyLink")}</button>${A && lastRender.D.sub(n.id).size > 1 && view.branch !== n.id ? `<button class="btn small" id="v-branch">${t("onlyBranch")} (${lastRender.D.sub(n.id).size})</button>` : ""}</div>
      <dl class="kv"><dt>${t("level")}</dt><dd>${A.depth.get(n.id) || "–"}</dd><dt>${t("chains")}</dt><dd>${A.paths.get(n.id) || "–"}</dd></dl>
    </div>
    <div class="sec"><h2>${t("explainedBy")} · ${causes.length}</h2>${causes.length ? boxList(causes) : `<p class="muted">${t("nothingYet")}</p>`}</div>
    <div class="sec"><h2>${t("explains")} · ${effects.length}</h2>${effects.length ? boxList(effects) : `<p class="muted">${t("topLevel")}</p>`}</div>
    <div class="sec"><h2>${t("chain")}</h2><ol class="chain">${chain.map(x => `<li><button data-go="${esc(x.id)}">${nm(x)}</button></li>`).join("")}</ol></div>`;
  $("#v-link").onclick = () => copyText(deepLink({ box: n.id }), t("copied"));
  $("#v-branch") && ($("#v-branch").onclick = () => setBranch(n.id));
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
  selRef = ref; selCopy = ref; selEdge = null; multi = [ref]; openSide(true);
  const after = () => { const n = copiesOf(ref)[0]; if (n) cy.animate({ center: { eles: n }, zoom: Math.max(cy.zoom(), .9) }, { duration: 280 }); };
  if (changed || view.focusR > 0) { $("#depth").value = "all"; return render().then(after); }
  applySelection(); renderPanel(); updateOverlays(); after(); return Promise.resolve();
}

/* ================= Chrome: header, stats, legend, controls ================= */
function updateChrome(full) {
  const title = tx(doc, "title") || "Untitled RCA";
  $("#doc-title").textContent = title;
  document.title = (dirty && !VIEWER ? "● " : "") + title + (VIEWER ? "" : " · RCA Workbench");
  const ls = $("#langseg"); ls.hidden = doc.languages.length < 2;
  ls.innerHTML = doc.languages.map(l => `<button data-lang="${esc(l)}" aria-pressed="${l === curLang()}" title="${esc(langName(l))}${!VIEWER && l === mainLang() ? " (main)" : ""}">${esc(l.toUpperCase())}</button>`).join("");
  $("#file-name").textContent = fileName + (fileHandle ? "" : "");
  $("#dirty").hidden = !dirty;
  $("#dirty").textContent = fileNeedsGesture && dirty ? "● not yet in the file: press Ctrl S once to allow automatic saving" : "● unsaved changes";
  $("#saved-at").hidden = !(fileHandle && !dirty && fileSavedAt);
  if (fileSavedAt) $("#saved-at").textContent = "✓ saved to file " + fileSavedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
    `<span><b>${Object.keys(STATUSES).filter(k => k !== "unassessed").map(k => doc.nodes.filter(n => n.status === k).length).join(" / ")}</b> hypothesis / supported / refuted</span>` +
    missingSummary().filter(m => m.boxes).map(m => `<span class="warnstat"><b>${m.boxes}</b> missing ${m.l.toUpperCase()}</span>`).join("");
  $("#xnum").textContent = crossings; $("#xnum").dataset.unit = t("crossings");
  $("#xline").innerHTML = VIEWER ? "" : view.mode === "untangle"
    ? `<b>${crossings}</b> crossings untangled vs <b>${manualCrossings}</b> in my layout${lastTries > 1 ? ` · best of ${lastTries} tries` : ""}.`
    : `<b>${crossings}</b> arrow crossings in my layout. Switch to <b>Untangle</b> to reduce them.`;
  $("#o-red").textContent = V.redundant.size ? `${V.redundant.size} found` : "none found";
}
function renderLegend() {
  const counts = {}; doc.nodes.forEach(n => (counts[n.cat] = (counts[n.cat] || 0) + 1));
  const open = view.legendOpen === true;
  $("#legend").innerHTML = `<div class="h"><span>${t("colourKey")}</span><span>${VIEWER ? "" : `<button id="edit-cats">${t("edit")}</button> · `}<button id="fold-legend">${open ? t("collapse") : t("expand")}</button></span></div>` + (!open ? "" :
    doc.categories.map(c => `<button class="cat" title="${esc((c.desc && curLang() === mainLang() ? c.desc + "\n" : ""))}" data-cat="${esc(c.id)}" aria-pressed="${!view.hiddenCats.has(c.id)}"><span class="sw" style="background:${c.fill};border-color:${c.stroke}"></span>${esc(tx(c, "name"))}<span class="n">${counts[c.id] || 0}</span></button>`).join("") +
    (doc.nodes.some(n => n.status !== "unassessed") || !VIEWER ? `<hr>` + Object.entries(STATUSES).filter(([k]) => k !== "unassessed").map(([k, s]) => `<span class="st"><i style="border-color:${s.color};border-style:${s.style}"></i>${esc(t(k))}</span>`).join("") : ""));
  $("#edit-cats") && ($("#edit-cats").onclick = openCats);
  $("#fold-legend").onclick = () => { view.legendOpen = !open; saveView(); renderLegend(); };
}
$("#legend").addEventListener("click", e => {
  const b = e.target.closest("[data-cat]"); if (!b) return;
  const k = b.dataset.cat; view.hiddenCats.has(k) ? view.hiddenCats.delete(k) : view.hiddenCats.add(k); render({ animate: true });
});
function renderBranchUI() {
  const { D } = lastRender; const sel = $("#branch");
  const label = (id, ind) => { const n = nodeById(id); return `<option value="${esc(id)}">${ind}${esc(short(isQ(n) ? "?" : tx(n), ind ? 42 : 46))} · ${D.sub(id).size}${D.shared(id) ? " · " + esc(t("shared")) : ""}</option>`; };
  const listed = new Set();
  const opts = [`<option value="">${esc(t("allBranches"))}</option>`];
  D.top.forEach(id => { // big branches also list their own sub-branches
    opts.push(label(id, "")); listed.add(id);
    if (D.sub(id).size > 15) (D.kids.get(id) || []).filter(k => D.sub(k).size >= 3).sort((a, b) => D.sub(b).size - D.sub(a).size)
      .forEach(k => { opts.push(label(k, "\u00a0\u00a0↳ ")); listed.add(k); });
  });
  if (view.branch && !listed.has(view.branch)) { const n = nodeById(view.branch); opts.push(`<option value="${esc(view.branch)}">↳ ${esc(short(tx(n)))} · ${D.sub(view.branch).size}</option>`); }
  sel.innerHTML = opts.join(""); sel.value = view.branch || ""; sel.hidden = D.top.length < 2 && !view.branch;
  const bar = $("#branchbar");
  if (!view.branch) { bar.hidden = true; return; }
  const n = nodeById(view.branch), up = D.idom.get(view.branch);
  const canUp = up && up !== D.R && !D.trunk.includes(up) && up !== D.end;
  bar.hidden = false;
  bar.innerHTML = `<span>${esc(t("branch"))}: <b>${esc(short(tx(n), 60))}</b> · ${D.sub(view.branch).size} ${esc(t("boxes"))}</span>` +
    (canUp ? `<button class="btn small" id="br-up">${esc(t("upLevel"))}</button>` : "") + `<button class="btn small" id="br-all">${esc(t("showAll"))}</button>`;
  $("#br-up") && ($("#br-up").onclick = () => setBranch(up));
  $("#br-all").onclick = () => setBranch(null);
}
function setBranch(id) { view.branch = id || null; render({ fit: true, animate: true }); }
$("#branch").onchange = e => setBranch(e.target.value);

function renderTagbar() {
  const bar = $("#tagbar");
  if (!doc.tags.length) { bar.hidden = VIEWER; bar.innerHTML = VIEWER ? "" : `<span class="tb-label">Tags</span><span class="muted">None yet. Tag boxes by stage of the chain, then click a tag here to highlight them.</span><button class="btn small" data-act="tags">Add tags…</button>`; return; }
  bar.hidden = false;
  const count = id => doc.nodes.filter(n => (n.tags || []).includes(id)).length;
  bar.innerHTML = `<span class="tb-label">${t("tags")}</span><div class="tb-scroll">` + doc.tagGroups.map(g => {
    const ts = doc.tags.filter(tg => tg.group === g.id); if (!ts.length) return "";
    return `<span class="tb-group">${esc(tx(g, "name"))}</span>` + ts.map(tg => `<button class="tchip" data-tf="${esc(tg.id)}" aria-pressed="${view.tagFilter.has(tg.id)}" title="${esc(tg.desc || "")}">${tg.emoji} ${esc(tx(tg, "name"))} <span class="n">${count(tg.id)}</span></button>`).join("");
  }).join("") + `</div>` + (view.tagFilter.size ? `<button class="btn small" id="tf-clear">${t("clear")}</button>` : "") +
    `<button class="btn small" id="tb-chips" title="${esc(t("chipsTip"))}">${view.tagChips !== false ? t("hideEmoji") : t("showEmoji")}</button>` +
    (VIEWER ? "" : `<button class="btn small" data-act="tags">${t("editTags")}</button>`);
  $("#tf-clear") && ($("#tf-clear").onclick = () => { view.tagFilter.clear(); renderTagbar(); applyTagFilter(); });
  $("#tb-chips").onclick = () => { view.tagChips = view.tagChips === false; saveView(); saveViewerPref(); render(); };
}
$("#tagbar").addEventListener("click", e => {
  const b = e.target.closest("[data-tf]"); if (!b) return;
  const id = b.dataset.tf; view.tagFilter.has(id) ? view.tagFilter.delete(id) : view.tagFilter.add(id);
  renderTagbar(); applyTagFilter();
});
$("#langseg").addEventListener("click", e => {
  const b = e.target.closest("[data-lang]"); if (!b) return;
  view.lang = b.dataset.lang; saveView(); saveViewerPref(); applyUI(); syncControls(); render();
});
const PLACE = ["Compact", "Balanced", "Straight arrows"];
function syncControls() {
  $("#mode-manual").setAttribute("aria-pressed", view.mode === "manual");
  $("#mode-untangle").setAttribute("aria-pressed", view.mode === "untangle");
  $("#v-focus").value = view.focusR; $("#o-focus").textContent = view.focusR ? t("steps", view.focusR) : t("off");
  $("#v-trace").checked = view.trace;
  $$("[data-red]").forEach(b => b.setAttribute("aria-pressed", b.dataset.red === view.redundant));
  const un = view.mode === "untangle";
  $("#untangle-set").disabled = !un; $("#untangle-note").hidden = un; $("#manual-only").hidden = un;
  $("#v-effort").value = view.effort; $("#o-effort").textContent = `${view.effort} · ${t("tries", [1, 1, 3, 6, 10][view.effort - 1])}`;
  $("#v-place").value = view.place; $("#o-place").textContent = t("place" + view.place);
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
$("#doc-title").ondblclick = () => { if (VIEWER) return; const l = curLang(); const v = prompt(`Name of this RCA (${langName(l)})`, txRaw(doc, "title", l)); if (v && v.trim() && v.trim() !== txRaw(doc, "title", l)) commit(() => txSet(doc, "title", l, v.trim())); };

/* ================= Search ================= */
let matches = [], matchIdx = -1;
function doSearch(jump) {
  const t = $("#q").value.trim().toLowerCase();
  cy.nodes().removeClass("match"); matches = [];
  if (!t) { $("#qcount").textContent = ""; return; }
  let refs;
  if (t.startsWith("#")) { // #tag: boxes carrying a tag whose name (any language) or emoji matches
    const q = t.slice(1);
    const tagIds = new Set(doc.tags.filter(tg => !q || txAll(tg, "name").some(x => x.toLowerCase().includes(q)) || tg.emoji.includes(q)).map(tg => tg.id));
    refs = new Set(doc.nodes.filter(n => (n.tags || []).some(x => tagIds.has(x))).map(n => n.id));
  } else refs = new Set(doc.nodes.filter(n => (txAll(n).join(" ") + " " + (VIEWER ? "" : n.notes) + " " + n.sources.map(sourceSearchText).join(" ")).toLowerCase().includes(t)).map(n => n.id));
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
  view.branch = null; if (GRADING) { GRADING = false; document.body.classList.remove("grading"); $("#work-edit").setAttribute("aria-pressed", true); $("#work-grade").setAttribute("aria-pressed", false); }
  doc = d; fileName = name; fileHandle = handle || null; dirty = false;
  undoStack.length = 0; redoStack.length = 0; selRef = selCopy = selEdge = null; multi = [];
  view.folded.clear(); view.hiddenCats.clear(); view.tagFilter.clear(); view.diff = null; $("#diffbar").hidden = true; $("#depth").value = "all";
  autosave(); render({ fit: true, readable: true });
}
async function loadText(text, name, handle) {
  const t = text.trim();
  if (t.startsWith("{")) {
    let d; try { d = JSON.parse(t); } catch (e) { throw new Error("This file is not valid JSON."); }
    const nd = normalizeDoc(d); const mig = nd.meta.migratedKey; delete nd.meta.migratedKey;
    const guessed = nd.meta._guessedLang; delete nd.meta._guessedLang;
    setDoc(nd, name, handle);
    if (guessed) { dirty = true; updateChrome(); toast(`Opened ${name}. It looks like ${langName(nd.languages[0])}; change that or add languages in File → Languages.`, 6500); }
    else if (mig) { dirty = true; updateChrome(); toast(`Opened ${name}. Its colour key was updated to your meanings; save to keep it.`, 5500); }
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
    try { const w = await fileHandle.createWritable(); await w.write(docText()); await w.close(); dirty = false; fileNeedsGesture = false; fileSavedAt = new Date(); updateChrome(); autosave(); toast(`Saved to ${fileHandle.name}. Later changes are saved to it automatically.`); return; }
    catch (e) { if (e.name === "AbortError") return; toast("Could not write to the file. Choose where to save it."); }
  }
  if (FSA && window.showSaveFilePicker) {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: fileName, types: [{ description: "RCA file", accept: { "application/json": [".json"] } }] });
      const w = await h.createWritable(); await w.write(docText()); await w.close();
      fileHandle = h; fileName = h.name; dirty = false; fileNeedsGesture = false; fileSavedAt = new Date(); updateChrome(); autosave(); toast(`Saved to ${h.name}. Later changes are saved to it automatically.`); return;
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
    `<title>${esc(tx(doc, "title"))}</title>`, `<rect width="100%" height="100%" fill="#ffffff"/>`];
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
    if (n.hasClass("tagchip")) {
      out.push(`<rect x="${(p.x - d.w / 2 + ox).toFixed(1)}" y="${(p.y - 10.5 + oy).toFixed(1)}" width="${d.w}" height="21" rx="10" fill="#ffffff" stroke="${edgeC}" stroke-width="1"/>`);
      out.push(`<text x="${(p.x + ox).toFixed(1)}" y="${(p.y + oy).toFixed(1)}" font-size="13" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" text-anchor="middle" dominant-baseline="central">${esc(d.label)}</text>`);
      return;
    }
    if (n.hasClass("badge")) {
      out.push(`<rect x="${(p.x - d.w / 2 + ox).toFixed(1)}" y="${(p.y - 9.5 + oy).toFixed(1)}" width="${d.w}" height="19" rx="9" fill="${ink}" stroke="#ffffff" stroke-width="2"/>`);
      out.push(`<text x="${(p.x + ox).toFixed(1)}" y="${(p.y + oy).toFixed(1)}" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${esc(d.label)}</text>`);
      return;
    }
    const dash = d.bs === "dashed" ? ` stroke-dasharray="7 4"` : d.bs === "dotted" ? ` stroke-dasharray="2 3"` : n.hasClass("ref") ? ` stroke-dasharray="5 3"` : "";
    const op = n.hasClass("refuted") ? ` opacity="0.5"` : n.hasClass("ref") ? ` opacity="0.8"` : "";
    out.push(`<g${op}><rect x="${(p.x - d.w / 2 + ox).toFixed(1)}" y="${(p.y - d.h / 2 + oy).toFixed(1)}" width="${d.w}" height="${d.h}" rx="7" fill="${d.fill}" stroke="${d.stroke}" stroke-width="${d.bw}"${dash}/>`);
    const lines = measureText(d.label).lines; const y0 = p.y - (lines.length - 1) * LINE / 2;
    const fw = (n.hasClass("q") ? ` font-weight="700" font-size="15"` : ` font-size="${FONT_PX}"`) + (d.fs === "italic" ? ` font-style="italic"` : "");
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
    const c = catById(n.cat), m = boxSize(n), st = STATUSES[n.status];
    const stroke = st.color || n.outline || c.stroke;
    const style = `rounded=1;whiteSpace=wrap;html=1;fontSize=13;fillColor=${c.fill};strokeColor=${stroke};fontColor=${c.font};` +
      (st.style === "dashed" ? "dashed=1;" : st.style === "dotted" ? "dashed=1;dashPattern=1 2;" : "") + (st.width > 2 ? "strokeWidth=2;" : "");
    const tip = [n.notes, n.sources.length ? "Sources: " + n.sources.join("; ") : ""].filter(Boolean).join("\n");
    const tg = orderedTags(n.tags || []).map(x => x.emoji + " " + tx(x, "name")).join("; ");
    cells.push(`<UserObject label="${xmlEsc(tx(n))}"${tip ? ` tooltip="${xmlEsc(tip)}"` : ""}${tg ? ` tags="${xmlEsc(tg)}"` : ""} status="${n.status}" id="${idOf.get(n.id)}"><mxCell style="${style}" vertex="1" parent="1"><mxGeometry x="${Math.round(n.x - m.w / 2)}" y="${Math.round(n.y - m.h / 2)}" width="${m.w}" height="${m.h}" as="geometry"/></mxCell></UserObject>`);
  });
  doc.edges.forEach((e, i) => cells.push(`<mxCell id="a${i}" style="rounded=0;html=1;endArrow=classic;" edge="1" parent="1" source="${idOf.get(e.source)}" target="${idOf.get(e.target)}"><mxGeometry relative="1" as="geometry"/></mxCell>`));
  const xml = `<mxfile host="uchuva-rca"><diagram name="${xmlEsc(tx(doc, "title"))}" id="rca"><mxGraphModel><root>\n${cells.join("\n")}\n</root></mxGraphModel></diagram></mxfile>\n`;
  const sfx = doc.languages.length > 1 ? "-" + curLang() : "";
  download(baseName() + sfx + ".drawio", xml, "application/xml"); toast(`draw.io file exported in ${langName(curLang())}, with the positions from My layout.`);
}
function exportGraphML() {
  const L = doc.languages;
  const keys = [...L.map(l => ["text_" + l, "node"]), ["tags", "node"], ["category", "node"], ["status", "node"], ["notes", "node"], ["sources", "node"], ["x", "node", "double"], ["y", "node", "double"]];
  const out = [`<?xml version="1.0" encoding="UTF-8"?>`, `<graphml xmlns="http://graphml.graphdrawing.org/xmlns">`,
    ...keys.map(([k, f, t]) => `  <key id="${k}" for="${f}" attr.name="${k}" attr.type="${t || "string"}"/>`),
    `  <graph id="rca" edgedefault="directed">`];
  doc.nodes.forEach(n => out.push(`    <node id="${xmlEsc(n.id)}">${L.map(l => `<data key="text_${l}">${xmlEsc(txRaw(n, "text", l))}</data>`).join("")}<data key="tags">${xmlEsc(orderedTags(n.tags || []).map(x => x.name).join(" | "))}</data><data key="category">${xmlEsc(catById(n.cat).name)}</data><data key="status">${n.status}</data><data key="notes">${xmlEsc(n.notes)}</data><data key="sources">${xmlEsc(n.sources.join(" | "))}</data><data key="x">${n.x}</data><data key="y">${n.y}</data></node>`));
  doc.edges.forEach(e => out.push(`    <edge id="${xmlEsc(e.id)}" source="${xmlEsc(e.source)}" target="${xmlEsc(e.target)}"/>`));
  out.push(`  </graph>`, `</graphml>`, "");
  download(baseName() + ".graphml", out.join("\n"), "application/xml");
}
const csvCell = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function exportCSV(which) {
  const A = analyze();
  let rows;
  const L = doc.languages;
  if (which === "nodes") rows = [["id", ...L.map(l => "text_" + l), "category", "tags", "status", "level", "chains_to_rejection", "notes", "sources"],
    ...doc.nodes.map(n => [n.id, ...L.map(l => txRaw(n, "text", l)), tx(catById(n.cat), "name"), orderedTags(n.tags || []).map(x => tx(x, "name")).join(" | "), n.status, A.depth.get(n.id) || "", A.paths.get(n.id) || "", n.notes, n.sources.join(" | ")])];
  else rows = [["source_id", "source_text", "target_id", "target_text"],
    ...doc.edges.map(e => [e.source, tx(nodeById(e.source)), e.target, tx(nodeById(e.target))])];
  download(`${baseName()}-${which === "nodes" ? "boxes" : "arrows"}.csv`, "﻿" + rows.map(r => r.map(csvCell).join(",")).join("\r\n") + "\r\n", "text/csv");
}

/* ================= Versions ================= */
function diffCores(a, b) { // a = old snapshot, b = new
  const an = new Map(a.nodes.map(n => [n.id, n])), bn = new Map(b.nodes.map(n => [n.id, n]));
  const added = b.nodes.filter(n => !an.has(n.id)), removed = a.nodes.filter(n => !bn.has(n.id));
  const trs = n => JSON.stringify(n.textTr || {}), tgs = n => (n.tags || []).join(",");
  const changed = b.nodes.filter(n => { const o = an.get(n.id); return o && (o.text !== n.text || trs(o) !== trs(n) || tgs(o) !== tgs(n) || o.cat !== n.cat || o.status !== n.status || o.notes !== n.notes || (o.sources || []).join("\n") !== (n.sources || []).join("\n")); });
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
    const et = (e, m) => `${tx(m.get(e.source) || {}) || e.source} → ${tx(m.get(e.target) || {}) || e.target}`;
    box.innerHTML = `<h4>Now compared with “${esc(v.name)}”</h4>${chgLine(d)}
      <b>New boxes</b>${li(d.added.map(n => tx(n)))}<b>Edited boxes</b>${li(d.changed.map(n => { const o = d.an.get(n.id); return o.text !== n.text ? `${o.text} ⟶ ${n.text}` : tx(n); }))}
      <b>Removed boxes</b>${li(d.removed.map(n => tx(n)))}<b>New arrows</b>${li(d.edgesAdded.map(e => et(e, d.bn)))}<b>Removed arrows</b>${li(d.edgesRemoved.map(e => et(e, d.an)))}
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
    const c = { id: uid("c"), name: "New category", nameTr: {}, role: "none", desc: "", fill: "#c8e6c9", stroke: "#2e7d32", font: "#1a1a1a" };
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
    ${doc.languages.length > 1 ? `<div class="catrow3">${doc.languages.slice(1).map(l => `<label class="trin"><b>${esc(l.toUpperCase())}</b><input type="text" data-trl="${esc(l)}" value="${esc((c.nameTr || {})[l] || "")}" placeholder="${esc(langName(l))} name"></label>`).join("")}</div>` : ""}
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
  const card = e.target.closest(".catcard"); if (!card) return;
  if (e.target.dataset.trl) { const c = catDraft[+card.dataset.i]; c.nameTr = c.nameTr || {}; c.nameTr[e.target.dataset.trl] = e.target.value.trim(); return; }
  if (!e.target.id) return; const c = catDraft[+card.dataset.i];
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
    catDraft.splice(i + 1, 0, { id: uid("c"), name: nm, nameTr: {}, role: c.role, desc: c.desc, ...shadeOf(c, step) });
    drawCats(); setTimeout(() => { const el = $(`#cat-name-${i + 1}`); if (el) { el.focus(); el.select(); } }, 20);
  }
});
$("#cat-add").onclick = () => { catDraft.push({ id: uid("c"), name: "New category", nameTr: {}, role: "none", desc: "", fill: "#c8e6c9", stroke: "#2e7d32", font: "#1a1a1a" }); drawCats();
  setTimeout(() => { const el = $(`#cat-name-${catDraft.length - 1}`); if (el) { el.focus(); el.select(); } }, 20); };
$("#cat-save").onclick = () => {
  const moves = { ...catMoves };
  const d = clone(catDraft).filter(c => moves[c.id] === undefined).map(c => ({ ...c, name: c.name.trim() || "Unnamed", nameTr: trObj(c.nameTr) }));
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

/* ================= Tag editor ================= */
let tagDraft = null;
function openTags() {
  if (VIEWER) return;
  tagDraft = { groups: clone(doc.tagGroups), tags: clone(doc.tags) };
  drawTags(); $("#m-tags").hidden = false;
}
function drawTags() {
  const L = doc.languages, counts = {}; doc.nodes.forEach(n => (n.tags || []).forEach(x => (counts[x] = (counts[x] || 0) + 1)));
  const trInputs = (o, kind, i) => L.slice(1).map(l => `<label class="trin"><b>${esc(l.toUpperCase())}</b><input type="text" data-k="${kind}" data-i="${i}" data-trl="${esc(l)}" value="${esc((o.nameTr || {})[l] || "")}" placeholder="${esc(langName(l))}"></label>`).join("");
  $("#tag-rows").innerHTML = (tagDraft.tags.length ? "" : `<div class="tagempty"><p class="muted">No tags yet. Start from the stages of a fresh-produce export chain (culture care → harvest → calyx drying → sorting → packing → storage → transport → port → sea freight, plus monitoring and communication), or add your own.</p><button class="btn" id="tag-template">Add the example stage set</button></div>`) +
    tagDraft.groups.map((g, gi) => `<div class="tgroup">
      <div class="tg-head"><input type="text" class="tg-name" data-k="g" data-i="${gi}" value="${esc(g.name)}" placeholder="Group name" aria-label="Group name">${trInputs(g, "g", gi)}</div>
      ${tagDraft.tags.map((tg, i) => tg.group !== g.id ? "" : `<div class="trow">
        <span class="emo"><input type="text" class="emoji-in" data-k="emoji" data-i="${i}" value="${esc(tg.emoji)}" aria-label="Emoji"><button type="button" class="btn small icon" data-epal="${i}" title="Pick an emoji" aria-label="Pick an emoji">▾</button></span>
        <input type="text" data-k="name" data-i="${i}" value="${esc(tg.name)}" placeholder="Name" aria-label="Tag name">
        ${trInputs(tg, "t", i)}
        <input type="text" class="tdesc" data-k="desc" data-i="${i}" value="${esc(tg.desc || "")}" placeholder="What it covers (only for you)" aria-label="Description">
        <select data-k="group" data-i="${i}" aria-label="Group">${tagDraft.groups.map(o => `<option value="${esc(o.id)}"${o.id === tg.group ? " selected" : ""}>${esc(o.name)}</option>`).join("")}</select>
        <span class="tcount">${counts[tg.id] || 0}</span>
        <span class="catacts"><button class="btn small icon" data-tup="${i}" title="Move earlier in the chain" aria-label="Move up">↑</button><button class="btn small icon" data-tdown="${i}" title="Move later in the chain" aria-label="Move down">↓</button><button class="btn small icon" data-tdel="${i}" title="Delete tag" aria-label="Delete tag">×</button></span>
      </div>`).join("")}
      <button class="btn small" data-tadd="${esc(g.id)}">＋ Add a tag to ${esc(g.name || "this group")}</button></div>`).join("");
  $("#tag-template") && ($("#tag-template").onclick = () => {
    const tpl = stageTags(doc.languages); const have = new Set(tagDraft.tags.map(x => x.id));
    tagDraft.groups.forEach(g => { if (!g.name) { const d = groupsFor(doc.languages).find(x => x.id === g.id); if (d) Object.assign(g, d); } });
    tpl.forEach(x => { if (!have.has(x.id)) tagDraft.tags.push(x); }); drawTags();
  });
}
$("#tag-rows").addEventListener("input", e => {
  const el = e.target, k = el.dataset.k, i = +el.dataset.i; if (!k) return;
  if (k === "g") { const g = tagDraft.groups[i]; if (el.dataset.trl) { g.nameTr = g.nameTr || {}; g.nameTr[el.dataset.trl] = el.value.trim(); } else g.name = el.value; return; }
  const tg = tagDraft.tags[i];
  if (el.dataset.trl) { tg.nameTr = tg.nameTr || {}; tg.nameTr[el.dataset.trl] = el.value.trim(); }
  else if (k !== "group") tg[k] = el.value;
});
$("#tag-rows").addEventListener("change", e => { const el = e.target; if (el.dataset.k === "group") { tagDraft.tags[+el.dataset.i].group = el.value; drawTags(); } });
$("#tag-rows").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const T = tagDraft.tags;
  if (b.dataset.tadd) { T.push({ id: uid("t"), emoji: "🏷️", name: "", nameTr: {}, group: b.dataset.tadd, desc: "" }); drawTags(); setTimeout(() => { const el = $(`#tag-rows input[data-k="name"][data-i="${T.length - 1}"]`); el && el.focus(); }, 20); }
  if (b.dataset.tdel !== undefined) { const i = +b.dataset.tdel, used = doc.nodes.filter(n => (n.tags || []).includes(T[i].id)).length;
    if (!used || confirm(`Remove “${T[i].name}” from ${used} box${used > 1 ? "es" : ""} and delete it?`)) { T.splice(i, 1); drawTags(); } }
  const move = (i, dir) => { // swap with the neighbour in the same group
    const g = T[i].group; let j = i + dir; while (j >= 0 && j < T.length && T[j].group !== g) j += dir;
    if (j >= 0 && j < T.length) { [T[i], T[j]] = [T[j], T[i]]; drawTags(); } };
  if (b.dataset.tup !== undefined) move(+b.dataset.tup, -1);
  if (b.dataset.tdown !== undefined) move(+b.dataset.tdown, 1);
  if (b.dataset.epal !== undefined) openEmojiPalette(b, +b.dataset.epal);
});
function openEmojiPalette(anchor, i) {
  const pop = $("#emoji-pop"); const r = anchor.getBoundingClientRect(), box = $("#m-tags .modal").getBoundingClientRect();
  pop.innerHTML = EMOJI_PALETTE.map(em => `<button type="button" data-em="${em}">${em}</button>`).join("") + `<p class="muted">Or type any emoji in the box (Windows: Win + . · Mac: Ctrl + Cmd + Space).</p>`;
  pop.style.left = Math.max(8, r.left - box.left - 8) + "px"; pop.style.top = (r.bottom - box.top + $("#m-tags .modal").scrollTop + 4) + "px";
  pop.hidden = false; pop.dataset.i = i;
}
$("#emoji-pop").addEventListener("click", e => {
  const b = e.target.closest("[data-em]"); if (!b) return;
  const pop = $("#emoji-pop"); tagDraft.tags[+pop.dataset.i].emoji = b.dataset.em; pop.hidden = true; drawTags();
});
document.addEventListener("pointerdown", e => { const pop = $("#emoji-pop"); if (!pop.hidden && !e.target.closest("#emoji-pop") && !e.target.closest("[data-epal]")) pop.hidden = true; });
$("#tag-save").onclick = () => {
  const groups = tagDraft.groups.map(g => ({ ...g, name: g.name.trim() || "Group", nameTr: trObj(g.nameTr) }));
  const tags = tagDraft.tags.filter(tg => tg.name.trim() || tg.emoji.trim()).map(tg => ({ ...tg, name: tg.name.trim() || tg.emoji, emoji: tg.emoji.trim() || "🏷️", nameTr: trObj(tg.nameTr) }));
  const ids = new Set(tags.map(tg => tg.id));
  $("#m-tags").hidden = true;
  commit(() => {
    doc.tagGroups = groups; doc.tags = tags;
    doc.nodes.forEach(n => { n.tags = tags.filter(tg => (n.tags || []).includes(tg.id)).map(tg => tg.id); });
    [...view.tagFilter].forEach(x => { if (!ids.has(x)) view.tagFilter.delete(x); });
  });
  toast("Tags updated. Ctrl Z to undo.");
};

/* ================= Languages ================= */
function openLangs() {
  if (VIEWER) return;
  const L = doc.languages, miss = missingSummary();
  const free = Object.keys(LANG_NAMES).filter(l => !L.includes(l));
  $("#lang-body").innerHTML = `
    <div class="langlist">${L.map((l, i) => `<div class="langrow">
      <span class="lcode">${esc(l.toUpperCase())}</span><span class="lname">${esc(langName(l))}${i === 0 ? ` <span class="pill">main</span>` : ""}</span>
      ${i === 0 ? `${(m => m && (m.boxes || m.other) ? `<span class="lmiss">${m.boxes} box${m.boxes === 1 ? "" : "es"} and ${m.other} other text${m.other === 1 ? "" : "s"} missing</span>${m.boxes ? `<button class="btn small" data-trpass="${esc(l)}">Translate one by one</button>` : ""}` : "")(miss.find(m => m.l === l))}<label class="relabel">The main text is written in <select id="lang-relabel">${[l, ...Object.keys(LANG_NAMES).filter(x => !L.includes(x))].map(x => `<option value="${esc(x)}"${x === l ? " selected" : ""}>${esc(langName(x))}</option>`).join("")}</select></label>`
        : `<span class="lmiss">${(m => m && (m.boxes || m.other) ? `${m.boxes} box${m.boxes === 1 ? "" : "es"} and ${m.other} other text${m.other === 1 ? "" : "s"} missing` : "")(miss.find(m => m.l === l))}</span>
           <span class="row">${(miss.find(m => m.l === l) || {}).boxes ? `<button class="btn small" data-trpass="${esc(l)}">Translate one by one</button>` : ""}<button class="btn small" data-lmain="${esc(l)}">Make main</button><button class="btn small danger" data-ldel="${esc(l)}">Remove</button></span>`}
    </div>`).join("")}</div>
    <div class="row"><select id="lang-add-sel" aria-label="Language to add">${free.map(l => `<option value="${l}">${esc(langName(l))}</option>`).join("")}<option value="__other">Other (type a code)…</option></select><button class="btn" id="lang-add">Add language</button></div>
    <h4>Title</h4>
    <div class="titlerows">${L.map(l => `<label class="trin wide"><b>${esc(l.toUpperCase())}</b><input type="text" data-title="${esc(l)}" value="${esc(txRaw(doc, "title", l))}" placeholder="${esc(langName(l))} title"></label>`).join("")}</div>
    <p class="muted">Box texts are asked for in each language as you type them: Enter moves on to the next language. Category and tag names have one field per language in their editors. Notes stay in one language; they are only for you.</p>`;
  $("#m-langs").hidden = false;
}
$("#lang-body").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "lang-add") {
    let l = $("#lang-add-sel").value;
    if (l === "__other") { l = (prompt("Two-letter language code, for example pt or zh") || "").trim().toLowerCase(); if (!/^[a-z]{2,3}(-[a-z0-9]+)?$/.test(l)) return l && toast("That is not a language code."); }
    if (doc.languages.includes(l)) return;
    commit(() => { doc.languages.push(l); }).then(openLangs);
    toast(`${langName(l)} added. New boxes now ask for it; use Translate one by one for the existing ones.`, 5000);
  }
  if (b.dataset.lmain) makeMainLang(b.dataset.lmain).then(openLangs);
  if (b.dataset.ldel) { const l = b.dataset.ldel;
    if (!confirm(`Remove ${langName(l)} and all its translations? Ctrl Z brings them back.`)) return;
    commit(() => { everyTranslatable(doc, (o, f) => { if (o[f + "Tr"]) delete o[f + "Tr"][l]; }); doc.languages = doc.languages.filter(x => x !== l); }).then(openLangs);
    if (view.lang === l) view.lang = null; }
  if (b.dataset.trpass) translatePass(b.dataset.trpass);
});
$("#lang-body").addEventListener("change", e => {
  if (e.target.id === "lang-relabel") { const l = e.target.value; commit(() => { doc.languages[0] = l; }).then(openLangs); toast(`The main text is now marked as ${langName(l)}.`); }
  if (e.target.dataset.title) { const l = e.target.dataset.title, v = e.target.value.trim(); commit(() => txSet(doc, "title", l, v)); }
});
function makeMainLang(l) { // the chosen language becomes the main field everywhere; the old main moves into the translations
  const old = mainLang(); if (l === old) return Promise.resolve();
  const r = commit(() => {
    everyTranslatable(doc, (o, f) => {
      const tr = o[f + "Tr"] = o[f + "Tr"] || {}; const nv = tr[l] || "", ov = o[f] || "";
      if (!nv && ov && neutralText(ov)) return; // "?" boxes read the same in every language
      delete tr[l]; if (ov) tr[old] = ov; o[f] = nv;
    });
    doc.languages = [l, ...doc.languages.filter(x => x !== l)];
  });
  toast(`${langName(l)} is now the main language.`); return r;
}

/* ================= New RCA ================= */
function openNew() {
  if (dirty && !confirm("You have unsaved changes. Start a new RCA anyway?")) return;
  $("#new-main").innerHTML = Object.keys(LANG_NAMES).map(l => `<option value="${l}">${esc(langName(l))}</option>`).join("");
  $("#new-main").value = "en"; drawNewExtra(); $("#new-title").value = ""; $("#m-new").hidden = false; $("#new-title").focus();
}
function drawNewExtra() {
  const main = $("#new-main").value;
  $("#new-extra").innerHTML = Object.keys(LANG_NAMES).filter(l => l !== main).map(l => `<label class="chk"><input type="checkbox" value="${l}"> ${esc(langName(l))}</label>`).join("");
}
$("#new-main").onchange = drawNewExtra;
$("#new-form").onsubmit = e => {
  e.preventDefault();
  const langs = [$("#new-main").value, ...$$("#new-extra input:checked").map(i => i.value)];
  const d = emptyDoc(); d.languages = langs; d.title = $("#new-title").value.trim() || (langs[0] === "es" ? "Nuevo análisis de causa raíz" : "New root-cause analysis");
  d.tagGroups = groupsFor(langs); d.tags = [];
  const cats = clone(DEFAULT_CATS);
  const ES = { problem: "Problema raíz", cause: "Causa intermedia", fact: "Causa raíz", plant: "Incierto", question: "Pregunta abierta" };
  cats.forEach(c => { c.nameTr = {}; if (langs[0] === "es") { const en = c.name; c.name = ES[c.id]; if (langs.includes("en")) c.nameTr.en = en; } else if (langs.includes("es")) c.nameTr.es = ES[c.id]; });
  d.categories = cats;
  const root = newNode(langs[0] === "es" ? "Problema observado" : "Problem observed", "problem", 0, 0); d.nodes = [root];
  d.versions = [mkVersion(d, "Started", "")];
  $("#m-new").hidden = true;
  setDoc(d, "new-rca.json", null); view.lang = null;
  setTimeout(() => { selRef = root.id; selCopy = root.id; multi = [root.id]; applySelection(); renderPanel(); inlineEdit(root.id, false); }, 400);
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

/* ================= Publishing: public copy, share links, deep links ================= */
const LS_BASE = "uchuva-rca:site";
function bytesToB64url(bytes) { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function b64urlToBytes(str) { str = str.replace(/-/g, "+").replace(/_/g, "/"); while (str.length % 4) str += "="; return Uint8Array.from(atob(str), c => c.charCodeAt(0)); }
async function deflateRawText(text) { const cs = new CompressionStream("deflate-raw"); return new Uint8Array(await new Response(new Blob([new TextEncoder().encode(text)]).stream().pipeThrough(cs)).arrayBuffer()); }
function compactForLink(d) { // shorter ids and no arrow ids: the link carries less, the diagram is the same
  const map = new Map(d.nodes.map((n, i) => [n.id, i.toString(36)]));
  const c = clone(d);
  c.nodes.forEach(n => { n.id = map.get(n.id); });
  c.edges = c.edges.map(e => [map.get(e.source), map.get(e.target)]);
  c.edgeList = 1; delete c.meta;
  return c;
}
async function encodeShare(obj) { return "1" + bytesToB64url(await deflateRawText(JSON.stringify(compactForLink(obj)))); }
async function decodeShare(str) {
  if (str[0] !== "1") throw new Error("This link was made by a newer version of the tool.");
  const d = JSON.parse(await inflateRaw(b64urlToBytes(str.slice(1))));
  if (d.edgeList) { d.edges = d.edges.map(([s, t], i) => ({ id: "e" + i, source: s, target: t })); delete d.edgeList; }
  return d;
}
function publishedDoc(o) { // a copy for the public: strips what is only for the researcher, drops empty fields
  const d = { format: "uchuva-rca", schema: 2, app: APP_VERSION, ...clone(coreOf(doc)) };
  d.nodes = d.nodes.map(n => {
    const r = { ...n }; delete r.origin;
    if (!o.notes || !r.notes) delete r.notes;
    if (!o.sources || !(r.sources || []).length) delete r.sources;
    if (!o.status || r.status === "unassessed") delete r.status;
    if (!Object.keys(r.textTr || {}).length) delete r.textTr;
    if (!(r.tags || []).length) delete r.tags;
    return r;
  });
  d.categories = d.categories.map(c => { const r = { ...c }; if (!o.notes) r.desc = ""; return r; });
  d.tags = d.tags.map(tg => ({ ...tg, desc: o.notes ? tg.desc : "" }));
  d.versions = o.versions ? clone(doc.versions) : [];
  if (o.sources && bib.entries.length) {
    const keys = new Set(); doc.nodes.forEach(n => (n.sources || []).forEach(x => { const r = bibLookup(x); if (r && r.entry) keys.add(r.entry.key); }));
    if (keys.size) d.bib = bib.entries.filter(e => keys.has(e.key)).map(({ key, author, year, title, venue }) => ({ key, author, year, title, venue }));
  }
  d.viewDefaults = { lang: o.lang, mode: o.mode };
  d.meta = { published: nowISO() };
  return d;
}
const pageBase = () => location.href.split(/[?#]/)[0];
function siteBase() { const v = ($("#pub-base") && $("#pub-base").value.trim()) || lsGet(LS_BASE) || ""; return v || (location.protocol.startsWith("http") ? pageBase() : ""); }
function deepLink(extra = {}) {
  const q = new URLSearchParams();
  const src = new URLSearchParams(location.search).get("src"); if (src) q.set("src", src);
  if (doc.languages.length > 1) q.set("lang", curLang());
  if (view.mode === "untangle") q.set("mode", "untangle");
  if (view.split) q.set("split", "1");
  if (view.branch) q.set("branch", view.branch);
  if (view.focusR) q.set("radius", view.focusR);
  if (view.tagFilter.size) q.set("tags", [...view.tagFilter].join(","));
  Object.entries(extra).forEach(([k, v]) => q.set(k, v));
  const hash = location.hash.startsWith("#d=") ? location.hash : "";
  return pageBase() + "?" + q.toString() + hash;
}
function copyText(text, msg) {
  const done = () => toast(msg || "Copied");
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => prompt("Copy this:", text));
  else prompt("Copy this:", text);
}
function pubOpts() {
  return { notes: $("#pub-notes").checked, sources: $("#pub-sources").checked, status: $("#pub-status").checked, versions: $("#pub-versions").checked,
    lang: $("#pub-lang").value, mode: $("#pub-mode").value };
}
function openPublish() {
  if (VIEWER) return;
  $("#pub-lang").innerHTML = doc.languages.map(l => `<option value="${esc(l)}"${l === curLang() ? " selected" : ""}>${esc(langName(l))}</option>`).join("");
  $("#pub-mode").value = view.mode;
  $("#pub-base").value = lsGet(LS_BASE) || (location.protocol.startsWith("http") ? pageBase() : "");
  $("#m-publish").hidden = false; updatePublishInfo();
}
let pubTimer = null;
async function updatePublishInfo() {
  const d = publishedDoc(pubOpts()); const json = JSON.stringify(d); const link = await encodeShare(d);
  const base = siteBase(), url = (base || pageBase()) + "#d=" + link;
  const miss = missingSummary().filter(m => m.boxes || m.other);
  $("#pub-info").innerHTML = `Public file: <b>${(json.length / 1024).toFixed(1)} KB</b> · share link: <b>${url.length.toLocaleString()}</b> characters` +
    (url.length > 30000 ? `<br><span class="ckwarn">Long links get cut by some chat and email apps. Prefer publishing the file on GitHub Pages.</span>` : "") +
    (!base ? `<br><span class="ckwarn">No viewer address yet: the link would only open on this computer.</span>` : "") +
    (miss.length ? `<br><span class="ckwarn">Missing translations: ${miss.map(m => `${m.l.toUpperCase()} ${m.boxes + m.other}`).join(", ")}. Viewers see those texts in another language, in italics.</span>` : "");
  return { d, url, link };
}
["pub-notes", "pub-sources", "pub-status", "pub-versions", "pub-lang", "pub-mode"].forEach(id => $("#" + id).addEventListener("change", () => updatePublishInfo()));
$("#pub-base").addEventListener("input", () => { clearTimeout(pubTimer); pubTimer = setTimeout(() => { lsSet(LS_BASE, $("#pub-base").value.trim()); updatePublishInfo(); }, 300); });
$("#pub-download").onclick = async () => { const { d } = await updatePublishInfo(); download("rca.json", JSON.stringify(d) + "\n", "application/json"); toast("rca.json downloaded. Put it in the docs folder of your repository and push."); };
$("#pub-copy").onclick = async () => { const { url } = await updatePublishInfo(); copyText(url, "Share link copied. Anyone who opens it sees this diagram, read-only."); };
$("#pub-preview").onclick = async () => { const { link } = await updatePublishInfo(); window.open(pageBase() + "#d=" + link, "_blank"); };
async function openFromUrl() {
  const u = (prompt("Address of an RCA file (.json), a raw GitHub or Gist link, or a share link") || "").trim(); if (!u) return;
  if (dirty && !confirm("You have unsaved changes. Open the linked RCA anyway?")) return;
  try {
    const h = u.indexOf("#d=");
    if (h >= 0) { const d = await decodeShare(u.slice(h + 3)); await loadText(JSON.stringify(d), "shared-rca.json", null); dirty = true; updateChrome(); return; }
    const r = await fetch(u); if (!r.ok) throw new Error(`The server answered ${r.status}.`);
    await loadText(await r.text(), decodeURIComponent(u.split("/").pop().split("?")[0]) || "linked-rca.json", null); dirty = true; updateChrome();
  } catch (e) { toast("Could not open that link: " + (e.message || e), 6000); }
}

/* ================= Viewer mode ================= */
async function viewerSource() {
  const q = new URLSearchParams(location.search);
  const hash = location.hash.startsWith("#d=") ? location.hash.slice(3) : "";
  const meta = document.querySelector('meta[name="rca-publish"]');
  if (q.has("edit")) return { edit: true, hash };
  if (hash) return { data: await decodeShare(hash) };
  if (q.get("src")) { const r = await fetch(q.get("src")); if (!r.ok) throw new Error(`Could not load ${q.get("src")} (${r.status})`); return { data: await r.json() }; }
  if (meta && meta.content) { const r = await fetch(meta.content, { cache: "no-cache" }); if (!r.ok) throw new Error(`Could not load ${meta.content} (${r.status})`); return { data: await r.json() }; }
  return null;
}
function enterViewer(d) {
  VIEWER = true; document.body.classList.add("viewer");
  doc = normalizeDoc(d); delete doc.meta._guessedLang; dirty = false;
  if (doc.bib) setBib("", doc.bib);
  const q = new URLSearchParams(location.search), vd = doc.viewDefaults || {};
  Object.assign(view, DEFAULT_VIEW);
  let pref = {}; try { pref = JSON.parse(lsGet(LS_VPREF) || "{}"); } catch (e) {}
  const lang = [q.get("lang"), pref.lang, vd.lang].find(l => l && doc.languages.includes(l)); view.lang = lang || null;
  if (pref.tagChips === false) view.tagChips = false;
  view.mode = (q.get("mode") || vd.mode) === "untangle" ? "untangle" : "manual";
  view.split = q.get("split") === "1";
  if (q.get("branch") && nodeById(q.get("branch"))) view.branch = q.get("branch");
  const box = q.get("box"); if (box && nodeById(box)) { selRef = box; selCopy = box; multi = [box]; }
  const r = +q.get("radius"); if (r > 0 && selRef) view.focusR = Math.min(6, r);
  (q.get("tags") || "").split(",").filter(x => tagById(x)).forEach(x => view.tagFilter.add(x));

  applyUI();
}

/* ================= Interviews: scales, grading, interview files ================= */
function normScale(x) {
  let min = Number.isFinite(+x.min) ? Math.round(+x.min) : 0, max = Number.isFinite(+x.max) ? Math.round(+x.max) : 5;
  if (max <= min) max = min + 1;
  return { id: String(x.id), name: String(x.name ?? "Scale"), nameTr: trObj(x.nameTr), min, max,
    low: String(x.low || ""), lowTr: trObj(x.lowTr), high: String(x.high || ""), highTr: trObj(x.highTr),
    gate: x.gate && x.gate.scale ? { scale: String(x.gate.scale), min: Math.round(+x.gate.min || 0) } : null };
}
function normSession(x) {
  const obj = o => (o && typeof o === "object" ? o : {});
  return { id: String(x.id), code: String(x.code || "Interview"), role: String(x.role || ""), lang: String(x.lang || ""),
    startedAt: String(x.startedAt || nowISO()), t0: String(x.t0 || x.startedAt || nowISO()), endedAt: x.endedAt ? String(x.endedAt) : null,
    nodesAtStart: Array.isArray(x.nodesAtStart) ? x.nodesAtStart.map(String) : [], discussed: Array.isArray(x.discussed) ? x.discussed.map(String) : [],
    grades: obj(x.grades), notes: obj(x.notes), memo: String(x.memo || "") };
}
function defaultScales(langs) {
  const main = langs[0];
  const mk = (id, en, es, min, max, lo, loEs, hi, hiEs, gate) => {
    const s = { id, name: main === "es" ? es : en, nameTr: {}, min, max, low: main === "es" ? loEs : lo, lowTr: {}, high: main === "es" ? hiEs : hi, highTr: {}, gate };
    langs.slice(1).forEach(l => { if (l === "es") { s.nameTr.es = es; s.lowTr.es = loEs; s.highTr.es = hiEs; } if (l === "en") { s.nameTr.en = en; s.lowTr.en = lo; s.highTr.en = hi; } });
    return s;
  };
  return [mk("relevance", "Relevance", "Relevancia", 0, 5, "Not relevant", "No es relevante", "Critical", "Crítico", null),
    mk("feasibility", "Feasibility", "Factibilidad", 1, 5, "Very hard to act on", "Muy difícil de abordar", "Easy to act on", "Fácil de abordar", { scale: "relevance", min: 3 })];
}
const activeSession = () => (doc.activeSession && doc.sessions.find(x => x.id === doc.activeSession)) || null;
const scaleById = id => doc.scales.find(x => x.id === id);
const scaleRange = sc => Array.from({ length: sc.max - sc.min + 1 }, (_, i) => sc.min + i);
function gradeOf(sess, nodeId, scaleId) { const g = sess.grades[nodeId]; return g && g[scaleId] ? g[scaleId].v : null; }
function gateOpen(sess, nodeId, sc) { if (!sc.gate) return true; const v = gradeOf(sess, nodeId, sc.gate.scale); return v != null && v >= sc.gate.min; }
function isDiscussed(sess, D, id) { return sess.discussed.includes(id) || (D.idom.has(id) && D.ancestors(id).some(a => sess.discussed.includes(a))); }
const isGraded = (sess, id) => !!(sess.grades[id] && Object.keys(sess.grades[id]).length);
const fmtClock = sec => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, ss = sec % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(ss).padStart(2, "0"); };
function gradeChipLabel(n) {
  const sess = activeSession(); if (!sess) return null;
  const parts = doc.scales.map(sc => { const v = gradeOf(sess, n.id, sc.id); if (v == null) return null;
    return (tx(sc, "name")[0] || "?").toUpperCase() + v + (gateOpen(sess, n.id, sc) ? "" : "*"); }).filter(Boolean);
  if (!parts.length) return null;
  const label = parts.join(" ");
  return { label, w: label.length * 7 + 14 };
}
function applyGradeVisuals() {
  const sess = activeSession(), sc = doc.scales[0];
  cy.batch(() => cy.nodes().forEach(el => {
    if (el.hasClass("badge")) return;
    const v = GRADING && view.shade && sess && sc ? gradeOf(sess, el.data("ref"), sc.id) : null;
    if (v == null) { if (el.hasClass("shade")) { el.removeClass("shade"); el.removeStyle("underlay-opacity"); } return; }
    el.addClass("shade"); el.style("underlay-opacity", .1 + .6 * (v - sc.min) / (sc.max - sc.min));
  }));
}
function refreshGrades() { // grades change no positions: redraw chips, shading, panel and bar only
  cy.batch(() => {
    cy.nodes(".gradechip").remove();
    if (GRADING) cy.nodes().forEach(el => {
      if (el.hasClass("badge")) return;
      const g = gradeChipLabel(nodeById(el.data("ref")) || {}); if (!g) return; const p = el.position();
      cy.add({ group: "nodes", data: { id: "g:" + el.id(), owner: el.id(), label: g.label, w: g.w, h: 19 }, classes: "badge gradechip",
        position: { x: p.x + el.data("w") / 2 - g.w / 2 + 6, y: p.y + el.data("h") / 2 + 2 } });
    });
  });
  applyGradeVisuals(); applySelection(); applyTagFilter(); renderPanel(); renderGradebar(); updateChrome(true);
}
function gradeCommit(fn) { if (!activeSession()) return; pushUndo(snap()); fn(activeSession()); touch(); refreshGrades(); }
function setGrade(nodeId, scaleId, v) {
  gradeCommit(sess => {
    const g = sess.grades[nodeId] = sess.grades[nodeId] || {};
    if (v == null) delete g[scaleId]; else g[scaleId] = { v, at: nowISO() };
    if (!Object.keys(g).length) delete sess.grades[nodeId];
  });
}
function toggleDiscussed(id) {
  gradeCommit(sess => { sess.discussed = sess.discussed.includes(id) ? sess.discussed.filter(x => x !== id) : [...sess.discussed, id]; });
}
function gradeOrder() { // depth-first through the visible tree, top to bottom, skipping "?" boxes
  if (!lastRender) return [];
  const { A, V } = lastRender, yOf = new Map(doc.nodes.map(n => [n.id, n.y])), seen = new Set(), out = [];
  const visit = id => { if (seen.has(id) || !V.vis.has(id)) return; seen.add(id); const n = nodeById(id); if (n && !isQ(n)) out.push(id);
    A.out.get(id).slice().sort((a, b) => yOf.get(a) - yOf.get(b)).forEach(visit); };
  A.roots.slice().sort((a, b) => yOf.get(a) - yOf.get(b)).forEach(visit);
  [...V.vis].forEach(visit);
  return out;
}
function gradeStep(dir) {
  const order = gradeOrder(); if (!order.length) return;
  const i = order.indexOf(selRef);
  const next = order[i < 0 ? 0 : (i + dir + order.length) % order.length];
  goTo(next);
}
function gradeKey(e) {
  if (e.ctrlKey || e.metaKey) return false;
  const m = /^(Digit|Numpad)(\d)$/.exec(e.code);
  if (m && selRef) {
    const sc = doc.scales[e.altKey ? 2 : e.shiftKey ? 1 : 0]; if (!sc) return false;
    e.preventDefault();
    const v = +m[2], sess = activeSession();
    if (v < sc.min || v > sc.max) { toast(t("outOfRange", tx(sc, "name"), sc.min, sc.max)); return true; }
    if (!gateOpen(sess, selRef, sc)) { toast(t("gatedNote", tx(scaleById(sc.gate.scale), "name"), sc.gate.min)); return true; }
    setGrade(selRef, sc.id, v); return true;
  }
  const k = e.key.toLowerCase();
  if (k === "n" || e.key === "ArrowDown") { e.preventDefault(); gradeStep(1); return true; }
  if (k === "p" || e.key === "ArrowUp") { e.preventDefault(); gradeStep(-1); return true; }
  if (k === "b" && selRef) { e.preventDefault(); toggleDiscussed(selRef); return true; }
  if (k === "a" && selRef) { e.preventDefault(); quickAdd(); return true; }
  return false;
}
function quickAdd() {
  const sess = activeSession(); if (!sess || !selRef) return;
  addChild(selRef, { session: sess.code, at: nowISO() });
}
function setGrading(on) {
  GRADING = on; document.body.classList.toggle("grading", on);
  $("#work-edit").setAttribute("aria-pressed", !on); $("#work-grade").setAttribute("aria-pressed", on);
  if (on) { const sess = activeSession(); if (sess && sess.lang && doc.languages.includes(sess.lang)) view.lang = sess.lang; openSide(true); }
  applyUI(); syncControls(); render();
}
function renderGradebar() {
  const bar = $("#gradebar"), sess = activeSession();
  if (!GRADING || !sess) { bar.hidden = true; return; }
  const { D } = lastRender, branches = D.top;
  const graded = doc.nodes.filter(n => isGraded(sess, n.id)).length, gradable = doc.nodes.filter(n => !isQ(n)).length;
  const disc = branches.filter(b => isDiscussed(sess, D, b)).length;
  bar.hidden = false;
  bar.innerHTML = `<span class="gb-live" aria-hidden="true">●</span><b>${esc(sess.code)}</b>${sess.role ? `<span class="muted">${esc(sess.role)}</span>` : ""}
    <span class="gb-clock" id="gb-clock" title="${esc(t("clockTip"))}">${fmtClock((Date.now() - Date.parse(sess.t0)) / 1000)}</span><button class="btn small icon" id="gb-reset" title="${esc(t("clockReset"))}" aria-label="${esc(t("clockReset"))}">↺</button>
    <span class="gb-sep"></span><span>${t("gradedOf", graded, gradable)}</span>
    <button class="btn small" id="gb-disc">${t("discussedBranches")} ${disc}/${branches.length} ▾</button>
    ${doc.scales[0] ? `<label class="chk"><input type="checkbox" id="gb-shade"${view.shade ? " checked" : ""}> ${esc(t("shadeBy", tx(doc.scales[0], "name")))}</label>` : ""}
    <button class="btn small primary" id="gb-end">${t("endInterview")}</button>`;
  $("#gb-reset").onclick = () => gradeCommit(x => { x.t0 = nowISO(); }) || toast(t("clockWasReset"));
  $("#gb-disc").onclick = e => { e.stopPropagation(); toggleDiscPop(); };
  $("#gb-shade") && ($("#gb-shade").onchange = e => { view.shade = e.target.checked; saveView(); applyGradeVisuals(); });
  $("#gb-end").onclick = openEndInterview;
}
setInterval(() => { const el = $("#gb-clock"), sess = GRADING && activeSession(); if (el && sess) el.textContent = fmtClock((Date.now() - Date.parse(sess.t0)) / 1000); }, 1000);
function branchList(D) { // top branches, plus sub-branches of big ones (same list as the branch picker)
  const out = [];
  D.top.forEach(id => { out.push([id, 0]); if (D.sub(id).size > 15) (D.kids.get(id) || []).filter(k => D.sub(k).size >= 3).sort((a, b) => D.sub(b).size - D.sub(a).size).forEach(k => out.push([k, 1])); });
  return out;
}
function toggleDiscPop() {
  const pop = $("#disc-pop");
  if (!pop.hidden) { pop.hidden = true; return; }
  drawDiscPop(); pop.hidden = false;
}
function drawDiscPop() {
  const pop = $("#disc-pop"), sess = activeSession(); if (!sess) return;
  const { D } = lastRender;
  pop.innerHTML = `<p class="muted">${esc(t("discussedHelp"))}</p>` + branchList(D).map(([id, ind]) => {
    const n = nodeById(id), sub = [...D.sub(id)], g = sub.filter(x => isGraded(sess, x)).length;
    const own = sess.discussed.includes(id), cov = !own && isDiscussed(sess, D, id);
    return `<label class="chk${ind ? " sub" : ""}"><input type="checkbox" data-disc="${esc(id)}"${own || cov ? " checked" : ""}${cov ? " disabled" : ""}> <span>${esc(short(tx(n), 52))} <span class="muted">${g}/${sub.length}</span></span></label>`;
  }).join("");
  pop.querySelectorAll("[data-disc]").forEach(cb => cb.onchange = () => { toggleDiscussed(cb.dataset.disc); drawDiscPop(); });
}
document.addEventListener("pointerdown", e => { const pop = $("#disc-pop"); if (!pop.hidden && !e.target.closest("#disc-pop") && !e.target.closest("#gb-disc")) pop.hidden = true; });

function renderGradePanel() {
  const p = $("#panel"), sess = activeSession(); if (!sess || !lastRender) return;
  const { D } = lastRender;
  const n = selRef && nodeById(selRef);
  if (!n) {
    const top = D.top;
    p.innerHTML = `<div class="sec"><h2>${esc(t("interview"))} ${esc(sess.code)}${sess.role ? " · " + esc(sess.role) : ""}</h2>
      <p class="muted">${esc(t("pickBox"))}</p>
      <p class="muted keys">${t("keysHelp", doc.scales.map(sc => tx(sc, "name")))}</p></div>
      <div class="sec"><h2>${esc(t("branches"))}</h2><ul class="list">${top.map(id => { const sub = [...D.sub(id)], g = sub.filter(x => isGraded(sess, x)).length;
        return `<li><button data-go="${esc(id)}">${swatch(nodeById(id))}<span>${esc(tx(nodeById(id)))}</span><span class="cnt">${isDiscussed(sess, D, id) ? "✓ " : ""}${g}/${sub.length}</span></button></li>`; }).join("")}</ul></div>`;
    return;
  }
  const disc = isDiscussed(sess, D, n.id), own = sess.discussed.includes(n.id);
  const coverBy = !own && disc ? D.ancestors(n.id).find(a => sess.discussed.includes(a)) : null;
  p.innerHTML = `<div class="sec">
      <p class="sel-title">${isQ(n) ? esc(t("open")) : esc(tx(n))}</p>
      ${n.origin ? `<span class="chip">${esc(t("proposedBy", n.origin.session))}</span>` : ""}
      ${doc.scales.length ? doc.scales.map(sc => {
        const cur = gradeOf(sess, n.id, sc.id), open = gateOpen(sess, n.id, sc), gs = sc.gate && scaleById(sc.gate.scale);
        return `<div class="scale" data-scale="${esc(sc.id)}"><div class="sc-head"><b>${esc(tx(sc, "name"))}</b><span class="sc-ends">${sc.min} ${esc(tx(sc, "low"))} · ${sc.max} ${esc(tx(sc, "high"))}</span></div>
          <div class="sc-btns">${scaleRange(sc).map(v => `<button type="button" data-sv="${v}" aria-pressed="${cur === v}"${open ? "" : " disabled"}>${v}</button>`).join("")}<button type="button" class="sc-clear" data-sclear title="${esc(t("clearGrade"))}" aria-label="${esc(t("clearGrade"))}"${cur == null ? " disabled" : ""}>×</button></div>
          ${!open && gs ? `<p class="muted small">${esc(t("gatedNote", tx(gs, "name"), sc.gate.min))}</p>` : ""}
          ${cur != null && !open ? `<p class="ckwarn small">${esc(t("gatedOut"))}</p>` : ""}</div>`; }).join("") : `<p class="muted">${esc(t("noScales"))}</p>`}
      <label class="field"><span>${esc(t("whyNote"))}</span><textarea id="g-note" rows="3" placeholder="${esc(t("whyPlaceholder"))}">${esc(sess.notes[n.id] || "")}</textarea></label>
      <label class="chk"><input type="checkbox" id="g-disc"${disc ? " checked" : ""}${coverBy ? " disabled" : ""}> ${esc(coverBy ? t("coveredBy", short(tx(nodeById(coverBy)), 40)) : t("everythingBelow", D.sub(n.id).size))}</label>
      <div class="row"><button class="btn small" id="g-prev">← ${esc(t("prev"))}</button><button class="btn small" id="g-next">${esc(t("next"))} →</button><button class="btn small" id="g-add">＋ ${esc(t("addCauseHere"))}</button></div>
      <p class="muted keys">${t("keysHelp", doc.scales.map(sc => tx(sc, "name")))}</p>
    </div>`;
  const ref = n.id;
  p.querySelectorAll(".scale").forEach(box => {
    const sc = scaleById(box.dataset.scale);
    box.querySelectorAll("[data-sv]").forEach(b => b.onclick = () => setGrade(ref, sc.id, +b.dataset.sv));
    box.querySelector("[data-sclear]").onclick = () => setGrade(ref, sc.id, null);
  });
  let noteTimer = null;
  $("#g-note").addEventListener("input", e => { clearTimeout(noteTimer); const v = e.target.value; noteTimer = setTimeout(() => {
    const s2 = activeSession(); if (!s2) return; if (v.trim()) s2.notes[ref] = v; else delete s2.notes[ref]; touch(); }, 400); });
  $("#g-disc").onchange = () => toggleDiscussed(ref);
  $("#g-prev").onclick = () => gradeStep(-1); $("#g-next").onclick = () => gradeStep(1); $("#g-add").onclick = quickAdd;
}

/* starting, resuming and ending an interview */
function openStartInterview() {
  if (VIEWER) return;
  $("#is-lang").innerHTML = doc.languages.map(l => `<option value="${esc(l)}"${l === curLang() ? " selected" : ""}>${esc(langName(l))}</option>`).join("");
  drawStartScales();
  const prev = doc.sessions.slice().reverse();
  $("#istart-resume").innerHTML = prev.length ? `<div class="field"><span>Continue an interview stored in this file</span><div class="row">${prev.map(x =>
    `<button type="button" class="btn small" data-resume="${esc(x.id)}">${esc(x.code)}${x.role ? " · " + esc(x.role) : ""} · ${Object.keys(x.grades).length} graded${x.endedAt ? " · ended" : ""}</button>`).join("")}</div></div>` : "";
  $("#istart-resume").querySelectorAll("[data-resume]").forEach(b => b.onclick = () => { $("#m-istart").hidden = true; doc.activeSession = b.dataset.resume; touch(); setGrading(true); });
  $("#is-code").value = ""; $("#m-istart").hidden = false; $("#is-code").focus();
}
function drawStartScales() {
  const sc = doc.scales.length ? doc.scales : defaultScales(doc.languages);
  $("#is-scales").innerHTML = (doc.scales.length ? "" : `<p class="muted">No scales yet. These will be created:</p>`) + `<ul class="sclist">${sc.map(x =>
    `<li><b>${esc(x.name)}</b> ${x.min}–${x.max} <span class="muted">(${x.min} ${esc(x.low)} · ${x.max} ${esc(x.high)})${x.gate ? ` · asked when ${esc((sc.find(o => o.id === x.gate.scale) || {}).name || "?")} ≥ ${x.gate.min}` : ""}</span></li>`).join("")}</ul>`;
}
$("#istart-form").onsubmit = e => {
  e.preventDefault();
  const code = $("#is-code").value.trim(); if (!code) return;
  const sess = normSession({ id: uid("i"), code, role: $("#is-role").value.trim(), lang: $("#is-lang").value, startedAt: nowISO(), t0: nowISO(),
    nodesAtStart: doc.nodes.map(n => n.id) });
  const keepVersion = $("#is-version").checked;
  $("#m-istart").hidden = true;
  commit(() => {
    if (!doc.scales.length) doc.scales = defaultScales(doc.languages);
    if (keepVersion) doc.versions.push(mkVersion(doc, `Before interview ${code}`, "Saved automatically when the interview started"));
    doc.sessions.push(sess); doc.activeSession = sess.id;
  }).then(() => { setGrading(true); toast(t("started", code), 4000); });
};
function openEndInterview() {
  const sess = activeSession(); if (!sess) return;
  const graded = Object.keys(sess.grades).filter(id => nodeById(id)).length, added = doc.nodes.filter(n => n.origin && n.origin.session === sess.code).length;
  const mins = Math.round((Date.now() - Date.parse(sess.startedAt)) / 60000);
  $("#iend-sum").textContent = `${sess.code}: ${graded} box${graded === 1 ? "" : "es"} graded, ${sess.discussed.length} branch${sess.discussed.length === 1 ? "" : "es"} marked as discussed, ${added} cause${added === 1 ? "" : "s"} added, ${mins} min since it started.`;
  $("#iend-memo").value = sess.memo || ""; $("#iend-after").hidden = true; $("#iend-save").disabled = false;
  $("#m-iend").hidden = false; $("#iend-memo").focus();
}
const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "interview";
function interviewFileName(sess) { return `${baseName()}-${slug(sess.code)}-${sess.startedAt.slice(0, 10)}.json`; }
$("#iend-save").onclick = async () => {
  const sess = activeSession(); if (!sess) return;
  gradeCommit(x => { x.memo = $("#iend-memo").value.trim(); x.endedAt = nowISO(); });
  const out = clone(doc); out.sessions = [clone(activeSession())]; out.activeSession = null; out.app = APP_VERSION;
  const text = JSON.stringify(out, null, 2) + "\n", name = interviewFileName(sess);
  let saved = false;
  if (FSA && window.showSaveFilePicker) {
    try { const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: "Interview file", accept: { "application/json": [".json"] } }] });
      const w = await h.createWritable(); await w.write(text); await w.close(); saved = h.name; }
    catch (e) { if (e.name === "AbortError") return; }
  }
  if (!saved) { download(name, text, "application/json"); saved = name; }
  try { const bk = JSON.parse(lsGet("uchuva-rca:interview-backups") || "[]"); bk.push({ savedAt: nowISO(), file: saved, session: clone(activeSession()) }); lsSet("uchuva-rca:interview-backups", JSON.stringify(bk.slice(-30))); } catch (e) {}
  $("#iend-file").textContent = saved; $("#iend-after").hidden = false; $("#iend-save").disabled = true;
};
$("#iend-finish").onclick = () => {
  const sess = activeSession(); if (!sess) return;
  $("#m-iend").hidden = true;
  commit(() => { doc.sessions = doc.sessions.filter(x => x.id !== sess.id); doc.activeSession = null; });
  setGrading(false);
  toast(`Interview ${sess.code} is in its own file. Its grades left this working file; boxes added during it stay, marked as proposed by ${sess.code}.`, 7000);
};

/* scale editor */
let scaleDraft = [];
function openScales() {
  scaleDraft = clone(doc.scales.length ? doc.scales : defaultScales(doc.languages));
  drawScales(); $("#m-scales").hidden = false;
}
function drawScales() {
  const L = doc.languages;
  const trs = (o, f, i, ph) => L.slice(1).map(l => `<label class="trin"><b>${esc(l.toUpperCase())}</b><input type="text" data-i="${i}" data-f="${f}" data-trl="${esc(l)}" value="${esc((o[f + "Tr"] || {})[l] || "")}" placeholder="${esc(ph)}"></label>`).join("");
  $("#scale-rows").innerHTML = scaleDraft.map((sc, i) => `<div class="scard" data-i="${i}">
    <div class="srow"><input type="text" class="sname" data-i="${i}" data-f="name" value="${esc(sc.name)}" placeholder="Scale name" aria-label="Scale name">${trs(sc, "name", i, "Name")}
      <label class="num">from <input type="number" data-i="${i}" data-f="min" value="${sc.min}" step="1"></label><label class="num">to <input type="number" data-i="${i}" data-f="max" value="${sc.max}" step="1"></label>
      <span class="catacts"><button class="btn small icon" data-sup="${i}" ${i ? "" : "disabled"} title="Move up" aria-label="Move up">↑</button><button class="btn small icon" data-sdel="${i}" title="Delete scale" aria-label="Delete scale">×</button></span></div>
    <div class="srow"><span class="lab lab-min">${sc.min} means</span><input type="text" data-i="${i}" data-f="low" value="${esc(sc.low)}" placeholder="e.g. Not relevant">${trs(sc, "low", i, "Meaning of the lowest value")}</div>
    <div class="srow"><span class="lab lab-max">${sc.max} means</span><input type="text" data-i="${i}" data-f="high" value="${esc(sc.high)}" placeholder="e.g. Critical">${trs(sc, "high", i, "Meaning of the highest value")}</div>
    <div class="srow"><span class="lab">Ask it</span><select data-i="${i}" data-f="gate"><option value="">always</option>${scaleDraft.filter(o => o.id !== sc.id).map(o => `<option value="${esc(o.id)}"${sc.gate && sc.gate.scale === o.id ? " selected" : ""}>only when ${esc(o.name)} is at least</option>`).join("")}</select>
      ${sc.gate ? `<input type="number" class="gmin" data-i="${i}" data-f="gmin" value="${sc.gate.min}" step="1" aria-label="Threshold">` : ""}</div>
  </div>`).join("");
}
$("#scale-rows").addEventListener("input", e => {
  const el = e.target, i = +el.dataset.i, f = el.dataset.f; if (!f) return; const sc = scaleDraft[i];
  if (el.dataset.trl) { sc[f + "Tr"] = sc[f + "Tr"] || {}; sc[f + "Tr"][el.dataset.trl] = el.value.trim(); return; }
  if (f === "min" || f === "max") { sc[f] = Math.round(+el.value); const card = el.closest(".scard"); card.querySelector(".lab-" + f).textContent = `${sc[f]} means`; return; }
  if (f === "gmin") { if (sc.gate) sc.gate.min = Math.round(+el.value); return; }
  if (f !== "gate") sc[f] = el.value;
});
$("#scale-rows").addEventListener("change", e => {
  const el = e.target; if (el.dataset.f === "gate") { const sc = scaleDraft[+el.dataset.i]; const o = scaleDraft.find(x => x.id === el.value);
    sc.gate = el.value ? { scale: el.value, min: sc.gate ? sc.gate.min : Math.ceil((o.min + o.max) / 2) } : null; drawScales(); }
});
$("#scale-rows").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.sdel !== undefined) { const i = +b.dataset.sdel, id = scaleDraft[i].id; scaleDraft.splice(i, 1); scaleDraft.forEach(x => { if (x.gate && x.gate.scale === id) x.gate = null; }); drawScales(); }
  if (b.dataset.sup !== undefined) { const i = +b.dataset.sup; [scaleDraft[i - 1], scaleDraft[i]] = [scaleDraft[i], scaleDraft[i - 1]]; drawScales(); }
});
$("#scale-add").onclick = () => { scaleDraft.push({ id: uid("s"), name: "", nameTr: {}, min: 1, max: 5, low: "", lowTr: {}, high: "", highTr: {}, gate: null }); drawScales(); };
$("#scale-save").onclick = () => {
  for (const sc of scaleDraft) {
    if (!sc.name.trim()) return toast("Every scale needs a name.");
    if (!Number.isInteger(sc.min) || !Number.isInteger(sc.max) || sc.max <= sc.min) return toast(`${sc.name}: “to” must be a whole number above “from”.`);
    if (sc.max - sc.min > 10) return toast(`${sc.name}: keep it to 11 values at most, so the buttons stay usable.`);
  }
  const d = scaleDraft.map(normScale);
  $("#m-scales").hidden = true;
  commit(() => { doc.scales = d; }).then(() => { if (!$("#m-istart").hidden) drawStartScales(); refreshGrades(); });
  toast("Scales updated. Ctrl Z to undo.");
};

/* exports: one row per interview and box */
function interviewRows(d) {
  const keep = doc; doc = d;
  try {
    const A = analyze(d), D = dominatorTree(A), rows = [];
    d.sessions.forEach(sess => {
      d.nodes.forEach(n => {
        if (isQ(n)) return;
        const shown = sess.nodesAtStart.includes(n.id), added = !!(n.origin && n.origin.session === sess.code);
        const graded = isGraded(sess, n.id), disc = graded || isDiscussed(sess, D, n.id), br = branchOf(D, n.id);
        const r = { interview: sess.code, role: sess.role, date: sess.startedAt.slice(0, 10), interview_language: sess.lang, box_id: n.id };
        d.languages.forEach(l => (r["text_" + l] = txRaw(n, "text", l)));
        Object.assign(r, { category: catById(n.cat).name, tags: orderedTags(n.tags || []).map(x => x.name).join(" | "),
          branch: br ? (nodeById(br) || {}).text || "" : "(trunk)", level: A.depth.get(n.id) || "",
          in_diagram_at_start: shown ? "yes" : "no", added_in_interview: added ? "yes" : "no", branch_discussed: disc ? "yes" : "no" });
        d.scales.forEach(sc => {
          const g = sess.grades[n.id] && sess.grades[n.id][sc.id], open = gateOpen(sess, n.id, sc);
          r[sc.id] = g ? g.v : "";
          r[sc.id + "_state"] = g ? (open ? "graded" : "gated out") : (!shown && !added) ? "not in diagram" : !disc ? "not discussed" : (sc.gate && !open) ? "gated out" : "not graded (branch discussed)";
          r[sc.id + "_minute"] = g ? fmtClock((Date.parse(g.at) - Date.parse(sess.t0)) / 1000) : "";
        });
        r.note = sess.notes[n.id] || "";
        r.interview_memo = sess.memo || "";
        rows.push(r);
      });
    });
    return { rows, scales: d.scales, langs: d.languages };
  } finally { doc = keep; }
}
function rowsToCSV(parts) {
  const langs = [...new Set(parts.flatMap(p => p.langs))];
  const scales = []; parts.forEach(p => p.scales.forEach(sc => { if (!scales.some(x => x.id === sc.id)) scales.push(sc); }));
  const cols = ["interview", "role", "date", "interview_language", "box_id", ...langs.map(l => "text_" + l), "category", "tags", "branch", "level",
    "in_diagram_at_start", "added_in_interview", "branch_discussed", ...scales.flatMap(sc => [sc.id, sc.id + "_state", sc.id + "_minute"]), "note", "interview_memo"];
  const head = cols.map(c => { const sc = scales.find(x => x.id === c || x.id + "_state" === c || x.id + "_minute" === c);
    return sc ? c.replace(sc.id, slug(sc.name).toLowerCase() || sc.id) : c; });
  const lines = [head, ...parts.flatMap(p => p.rows).map(r => cols.map(c => r[c] ?? ""))];
  return "﻿" + lines.map(r => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
function exportInterviewsCSV() {
  if (!doc.sessions.length) return toast("This file has no interviews. Start one with Grade, or open an interview file.", 5000);
  download(`${baseName()}-grades.csv`, rowsToCSV([interviewRows(doc)]), "text/csv");
  toast("Grades exported: one row per interview and box.");
}
function combineInterviewFiles() {
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json"; inp.multiple = true;
  inp.onchange = async () => {
    const parts = []; let n = 0, skipped = 0;
    for (const f of inp.files) {
      try { const d = normalizeDoc(JSON.parse(await f.text())); if (!d.sessions.length) { skipped++; continue; } parts.push(interviewRows(d)); n += d.sessions.length; }
      catch (e) { skipped++; }
    }
    if (!parts.length) return toast("None of those files holds an interview.", 5000);
    download(`interviews-combined-${nowISO().slice(0, 10)}.csv`, rowsToCSV(parts), "text/csv");
    toast(`Combined ${n} interview${n === 1 ? "" : "s"} from ${parts.length} file${parts.length === 1 ? "" : "s"}${skipped ? `; ${skipped} file${skipped === 1 ? "" : "s"} skipped` : ""}.`, 6000);
  };
  inp.click();
}

/* ================= Menu actions & keyboard ================= */
const ACTIONS = {
  bib: loadBib, cats: () => openCats(),
  open: openFile, save: () => saveFile(false), saveas: () => saveFile(true), new: openNew,
  tags: () => openTags(), langs: openLangs, publish: openPublish, "open-url": openFromUrl,
  scales: openScales, "exp-grades": exportInterviewsCSV, "combine-interviews": combineInterviewFiles,
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
  if (VIEWER) {
    if (e.key === "Escape" && modal) { modal.hidden = true; return; }
    if (mod && k === "f") { e.preventDefault(); $("#q").focus(); return; }
    if (typing || mod || modal) return;
    if (k === "l") setMode(view.mode === "manual" ? "untangle" : "manual");
    else if (k === "f" && selRef) toggleFold(selRef);
    else if (e.key === "?") $("#m-help").hidden = false;
    else if (e.key === "Escape") clearSelection();
    return;
  }
  if (mod && k === "s") { e.preventDefault(); saveFile(e.shiftKey); return; }
  if (mod && k === "o") { e.preventDefault(); openFile(); return; }
  if (GRADING && !modal && !typing && gradeKey(e)) return;
  if (modal) return;
  if (mod && k === "f") { e.preventDefault(); $("#q").focus(); $("#q").select(); return; }
  if (typing) return;
  if (mod && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === "y") { e.preventDefault(); redo(); return; }
  if (mod) return;
  if (GRADING) { if (k === "l") setMode(view.mode === "manual" ? "untangle" : "manual"); else if (e.key === "?") $("#m-help").hidden = false; else if (e.key === "Escape") clearSelection(); return; }
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelection(); }
  else if (e.key === "Tab" && selRef) { e.preventDefault(); addChild(selRef); }
  else if (e.key === "Enter" && selRef) { e.preventDefault(); inlineEdit(selCopy || selRef, false); }
  else if (k === "f" && selRef) toggleFold(selRef);
  else if (k === "r" && selEdge) reverseEdge(selEdge);
  else if (k === "l") setMode(view.mode === "manual" ? "untangle" : "manual");
  else if (e.key === "?") $("#m-help").hidden = false;
  else if (e.key === "Escape") clearSelection();
});
window.addEventListener("beforeunload", e => { if (dirty && !VIEWER) { autosave(); e.preventDefault(); e.returnValue = ""; } });

/* ================= Boot ================= */
function initCy() {
  cy = cytoscape({ container: $("#cy"), elements: [], style: styleSheet(), minZoom: .08, maxZoom: 3,
    boxSelectionEnabled: false, autounselectify: true, selectionType: "single" });
  cy.on("tap", "node", e => { if (e.target.hasClass("badge")) return; selectNode(e.target.data("ref"), e.target.id(), e.originalEvent && (e.originalEvent.shiftKey || e.originalEvent.metaKey || e.originalEvent.ctrlKey)); });
  cy.on("tap", "edge", e => selectEdge(e.target.data("ref")));
  cy.on("tap", e => { if (e.target === cy) clearSelection(); });
  cy.on("dbltap", "node", e => { if (!e.target.hasClass("badge") && !GRADING) inlineEdit(e.target.id(), false); });
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
  let ro = null;
  new ResizeObserver(() => { cancelAnimationFrame(ro); ro = requestAnimationFrame(() => { cy.resize(); updateOverlays(); }); }).observe($("#cy"));
  $("#work-edit").onclick = () => { if (GRADING) setGrading(false); };
  $("#work-grade").onclick = () => { if (GRADING) return; if (activeSession()) setGrading(true); else openStartInterview(); };
  $("#side-close").onclick = () => openSide(false);
  $("#side-open").onclick = () => openSide(true);
  const restyle = () => cy.style(styleSheet());
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", restyle);
  new MutationObserver(restyle).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}

(async function boot() {
  try { await Promise.all([document.fonts.load(`${FONT_PX}px "IBM Plex Sans"`), document.fonts.load(`600 12px "IBM Plex Sans Condensed"`)]); } catch (e) {}
  initCy();
  let src = null;
  try { src = await viewerSource(); } catch (e) { src = { error: e.message || String(e) }; }
  if (src && src.data) {
    enterViewer(src.data);
    syncControls();
    await render({ fit: true });
    if (selRef) goTo(selRef);
  } else {
    let d = null, restored = false;
    const saved = lsGet(LS_DOC);
    if (saved) { try { d = normalizeDoc(JSON.parse(saved)); restored = true; } catch (e) { d = null; } }
    const hosted = location.protocol.startsWith("http");
    if (!d) { d = emptyDoc(); d.nodes = [newNode("Problem observed", "problem", 0, 0)]; }
    let fmeta = {}; try { fmeta = JSON.parse(lsGet(LS_FILE) || "{}"); } catch (e) {}
    doc = d; fileName = fmeta.fileName || "uchuva-rca.json"; dirty = restored ? !!fmeta.dirty : false;
    applyUI(); syncControls();
    await render({ fit: true, readable: true });
    if (src && src.edit && src.hash) { // a share link opened in the editor: take it in as a new, unsaved file
      try {
        if (!dirty || confirm("Open the shared RCA from the link? Your current unsaved changes stay recoverable with File → Open only if you saved them.")) {
          await loadText(JSON.stringify(await decodeShare(src.hash)), "shared-rca.json", null); dirty = true; updateChrome();
          history.replaceState(null, "", pageBase() + "?edit");
        }
      } catch (e) { toast("Could not read the shared link: " + e.message, 6000); }
    } else if (src && src.error) toast(src.error, 7000);
    else if (doc.meta._guessedLang) {
      delete doc.meta._guessedLang;
      toast(`This file is now marked as written in ${langName(mainLang())}. Change that or add languages in File → Languages.`, 6500);
    } else if (doc.meta.migratedKey) { delete doc.meta.migratedKey; dirty = true; updateChrome(); autosave();
      toast("Colour key updated to your meanings: root problem, intermediate cause, root cause, unsure. Save to keep it in the file.", 6000); }
    else if (restored && activeSession()) { setGrading(true); toast(`Interview ${activeSession().code} is still running; grading resumed where you left it.`, 6000); }
    else if (restored) toast("Picked up where you left off. Use File → Open to load a different RCA file.", 4200);
    else openNew();
  }
  window.__rca = { parseBib, setBib, get doc() { return doc; }, render, cy: () => cy, view, analyze, exportSVG, commit, nodeById, lastRender: () => lastRender,
    publishedDoc, encodeShare, decodeShare, setGrade, activeSession, interviewRows, rowsToCSV, setGrading, toggleDiscussed, gradeStep, makeMainLang, translatePass, normalizeDoc, loadText, get VIEWER() { return VIEWER; } };
})();
