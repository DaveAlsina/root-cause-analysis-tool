/* ================= Document model =================
   functions: the shared catalogue. A function's text, kind (main or auxiliary), notes, sources, tags and RCA links
              are the same in every variant.
   variants:  each one is a function structure: an overall function (root, level 0) drawn as the system boundary,
              the functions placed inside it with their parent (so their level), positions, externals outside the
              boundary, and flows between any of them. */

function emptyDoc() {
  return { format: "function-analysis", schema: 3, app: APP_VERSION, title: "New function analysis", titleTr: {}, languages: ["en"],
    levels: clone(DEFAULT_LEVELS), flowTypes: clone(DEFAULT_FLOW_TYPES), tagGroups: clone(DEFAULT_TAG_GROUPS), tags: [], verbs: [],
    rca: null, system: defaultSystem(), goals: defaultGoals(), functions: [], variants: [], activeVariant: null, versions: [], meta: { created: nowISO(), modified: nowISO() } };
}
const newFunction = (text, kind = "main") => ({ id: uid("f"), text: text || "", textTr: {}, kind, key: false, actsOn: [], serves: [], notes: "", sources: [], tags: [], rcaLinks: [] });
const newExternal = (text, x, y) => ({ id: uid("x"), text: text || "", textTr: {}, notes: "", x: Math.round(x), y: Math.round(y) });
const newFlow = (source, target, type) => ({ id: uid("l"), source, target, type, text: "", textTr: {}, element: null, unwanted: false, notes: "", sources: [], tags: [] });
function newVariant(name, rootId) {
  return { id: uid("v"), name, nameTr: {}, note: "", root: rootId, boundary: "", boundaryTr: {}, inside: "", insideTr: {}, outside: "", outsideTr: {},
    systemBoundary: null, placed: {}, externals: [], flows: [], steps: {} };
}
function coreOf(d) {
  return { title: d.title, titleTr: d.titleTr, languages: d.languages, levels: d.levels, flowTypes: d.flowTypes, tagGroups: d.tagGroups, tags: d.tags,
    verbs: d.verbs, rca: d.rca, system: d.system, goals: d.goals, functions: d.functions, variants: d.variants, activeVariant: d.activeVariant };
}

function normalizeDoc(d) {
  if (d && d.format === "uchuva-rca") throw new Error("This is a root-cause analysis file. Open it in the RCA workbench, or link it here with File → Link an RCA file.");
  if (!d || typeof d !== "object" || !Array.isArray(d.functions) || !Array.isArray(d.variants)) throw new Error("This JSON file is not a function analysis file.");
  const out = emptyDoc();
  out.title = String(d.title ?? out.title); out.titleTr = trObj(d.titleTr);
  if (Array.isArray(d.languages) && d.languages.length) out.languages = [...new Set(d.languages.map(String))];
  if (Array.isArray(d.levels) && d.levels.length) out.levels = d.levels.map((l, i) => ({ ...(DEFAULT_LEVELS[i] || DEFAULT_LEVELS[DEFAULT_LEVELS.length - 1]), ...l }));
  if (Array.isArray(d.flowTypes) && d.flowTypes.length) out.flowTypes = d.flowTypes.filter(t => t && t.id).map(t => ({ id: String(t.id), name: String(t.name ?? t.id), nameTr: trObj(t.nameTr),
    color: t.color || "#5F6E68", style: FLOW_STYLES[t.style] ? t.style : "solid", width: Number.isFinite(+t.width) ? +t.width : 2, desc: String(t.desc || ""),
    ...(Number.isFinite(+t.gap) && t.gap !== "" && t.gap != null ? { gap: Math.max(1, Math.min(24, +t.gap)) } : {}) }));
  const typeIds = new Set(out.flowTypes.map(t => t.id));
  out.tagGroups = Array.isArray(d.tagGroups) && d.tagGroups.length ? d.tagGroups.map(g => ({ id: String(g.id), name: String(g.name ?? g.id), nameTr: trObj(g.nameTr) })) : groupsFor(out.languages);
  const gIds = new Set(out.tagGroups.map(g => g.id));
  out.tags = Array.isArray(d.tags) ? d.tags.filter(t => t && t.id).map(t => ({ id: String(t.id), emoji: String(t.emoji || "🏷️"), name: String(t.name ?? ""), nameTr: trObj(t.nameTr),
    group: gIds.has(t.group) ? t.group : out.tagGroups[0].id, desc: String(t.desc || "") })) : [];
  const tagIds = new Set(out.tags.map(t => t.id));
  const tagsOf = o => Array.isArray(o.tags) ? o.tags.map(String).filter(t => tagIds.has(t)) : [];
  const srcOf = o => Array.isArray(o.sources) ? o.sources.map(String) : [];
  out.verbs = Array.isArray(d.verbs) ? d.verbs.map(v => String(v).toLowerCase()).filter(Boolean) : [];
  if (d.rca && typeof d.rca === "object" && Array.isArray(d.rca.boxes)) out.rca = d.rca;
  const remap = new Map(); // files from before appearances: element id → its one appearance
  out.system = normalizeSystem(d.system, out, remap);
  const elIds = new Set(out.system.elements.map(e => e.id)), bIds = new Set(out.system.boundaries.map(b => b.id));
  const apIds = new Set(out.system.elements.flatMap(e => e.at.map(p => p.id)));
  out.goals = normalizeGoals(d.goals, out);
  const goalIds = new Set(out.goals.catalogue.map(g => g.id));
  out.functions = d.functions.filter(f => f && f.id).map(f => ({ id: String(f.id), text: String(f.text ?? ""), textTr: trObj(f.textTr), kind: f.kind === "aux" ? "aux" : "main", key: !!f.key,
    actsOn: Array.isArray(f.actsOn) ? [...new Set(f.actsOn.map(id => remap.get(String(id)) || String(id)).filter(id => apIds.has(id)))] : [],
    serves: Array.isArray(f.serves) ? [...new Set(f.serves.map(String).filter(id => goalIds.has(id)))] : [],
    notes: String(f.notes || ""), sources: srcOf(f), tags: tagsOf(f), rcaLinks: Array.isArray(f.rcaLinks) ? f.rcaLinks.map(String) : [] }));
  const fIds = new Set(out.functions.map(f => f.id));
  out.variants = d.variants.filter(v => v && v.id && fIds.has(v.root)).map(v => {
    const r = newVariant(String(v.name ?? "Variant"), v.root); r.id = String(v.id); r.nameTr = trObj(v.nameTr); r.note = String(v.note || "");
    ["boundary", "inside", "outside"].forEach(k => { r[k] = String(v[k] || ""); r[k + "Tr"] = trObj(v[k + "Tr"]); });
    Object.entries(v.placed || {}).forEach(([id, p]) => { if (fIds.has(id) && id !== r.root && p) r.placed[id] = { x: Math.round(+p.x || 0), y: Math.round(+p.y || 0), parent: p.parent && fIds.has(p.parent) && p.parent !== id ? String(p.parent) : null, ...bwOf(p) }; });
    Object.values(r.placed).forEach(p => { if (p.parent && !r.placed[p.parent]) p.parent = null; });
    r.systemBoundary = bIds.has(v.systemBoundary) ? v.systemBoundary : null;
    r.externals = (Array.isArray(v.externals) ? v.externals : []).filter(x => x && x.id).map(x => ({ id: String(x.id), text: String(x.text ?? ""), textTr: trObj(x.textTr), notes: String(x.notes || ""), x: Math.round(+x.x || 0), y: Math.round(+x.y || 0), ...(elIds.has(x.ref) ? { ref: String(x.ref) } : {}), ...bwOf(x) }));
    const ends = new Set([r.root, ...Object.keys(r.placed), ...r.externals.map(x => x.id)]);
    r.flows = (Array.isArray(v.flows) ? v.flows : []).filter(l => l && ends.has(l.source) && ends.has(l.target) && l.source !== l.target)
      .map(l => ({ id: String(l.id || uid("l")), source: String(l.source), target: String(l.target), type: typeIds.has(l.type) ? l.type : out.flowTypes[0].id,
        text: String(l.text || ""), textTr: trObj(l.textTr), element: elIds.has(l.element) ? String(l.element) : null, unwanted: !!l.unwanted, notes: String(l.notes || ""), sources: srcOf(l), tags: tagsOf(l), ...(geoOf(l.geo) ? { geo: geoOf(l.geo) } : {}) }));
    r.steps = v.steps && typeof v.steps === "object" ? { ...v.steps } : {};
    breakParentLoops(r);
    return r;
  });
  if (!out.variants.length) throw new Error("This file has no variant with an overall function.");
  out.activeVariant = out.variants.some(v => v.id === d.activeVariant) ? d.activeVariant : out.variants[0].id;
  out.versions = Array.isArray(d.versions) ? d.versions.filter(v => v && v.snapshot).map(v => (migrateCore(v.snapshot), v)) : [];
  out.meta = Object.assign(out.meta, d.meta || {});
  return out;
}
function breakParentLoops(V) { // a function cannot be inside itself, however far down
  Object.keys(V.placed).forEach(id => { const seen = new Set([id]); let p = V.placed[id].parent;
    while (p) { if (seen.has(p)) { V.placed[id].parent = null; break; } seen.add(p); p = V.placed[p] && V.placed[p].parent; } });
}

/* ---- lookups ---- */
const fnById = id => doc.functions.find(f => f.id === id);
const curVar = () => doc.variants.find(v => v.id === doc.activeVariant) || doc.variants[0];
const varById = id => doc.variants.find(v => v.id === id);
const extById = (id, V = curVar()) => V.externals.find(x => x.id === id);
const flowById = (id, V = curVar()) => V.flows.find(l => l.id === id);
const typeById = id => doc.flowTypes.find(t => t.id === id) || doc.flowTypes[0];
const levelStyle = lv => doc.levels[Math.min(lv, doc.levels.length - 1)];
const isFunction = id => doc.functions.some(f => f.id === id);
const nodeOf = id => fnById(id) || extById(id); // anything drawn as a box in the current variant
function usedIn(fid) { return doc.variants.filter(v => v.root === fid || v.placed[fid]); }

/* ---- structure of one variant ---- */
const inVariant = (id, V = curVar()) => id === V.root || !!V.placed[id] || V.externals.some(x => x.id === id);
const parentOf = (id, V = curVar()) => (id === V.root || !V.placed[id]) ? null : (V.placed[id].parent || V.root);
function depthOf(id, V = curVar()) {
  if (id === V.root) return 0;
  if (!V.placed[id]) return null;
  let d = 1, p = V.placed[id].parent; const seen = new Set([id]);
  while (p && V.placed[p] && !seen.has(p)) { seen.add(p); d++; p = V.placed[p].parent; }
  return d;
}
const childrenOf = (id, V = curVar()) => Object.keys(V.placed).filter(c => parentOf(c, V) === id);
function descendantsOf(id, V = curVar()) {
  const out = []; const q = [id];
  while (q.length) { const u = q.shift(); childrenOf(u, V).forEach(c => { out.push(c); q.push(c); }); }
  return out;
}
const isAncestor = (a, b, V = curVar()) => { let p = parentOf(b, V); while (p) { if (p === a) return true; p = parentOf(p, V); } return false; };
const maxDepth = (V = curVar()) => Math.max(0, ...Object.keys(V.placed).map(id => depthOf(id, V)));

/* ---- hooks for the shared core ---- */
function snap() { return JSON.stringify(coreOf(doc)); }
function restoreCore(s) {
  const c = typeof s === "string" ? JSON.parse(s) : clone(s);
  Object.assign(doc, { title: c.title, titleTr: c.titleTr || {}, languages: c.languages || doc.languages, levels: c.levels || doc.levels, flowTypes: c.flowTypes || doc.flowTypes,
    tagGroups: c.tagGroups || doc.tagGroups, tags: c.tags || doc.tags, verbs: c.verbs || [], rca: c.rca || null, system: c.system || defaultSystem(c.languages || doc.languages), goals: c.goals || defaultGoals(), functions: c.functions, variants: c.variants,
    activeVariant: c.variants.some(v => v.id === c.activeVariant) ? c.activeVariant : c.variants[0].id });
}
function findEditable(ref) { // what a side-panel field edits: a function, external, flow or variant
  const V = curVar();
  const x = extById(ref, V); if (x && x.ref && elById(x.ref)) return elById(x.ref); // a linked external is the element itself
  // an appearance edits its element: the name, kind, needs, notes and sources are the same on every level
  if (ref === GOAL_ROOT) return doc.goals.root;
  return fnById(ref) || x || flowById(ref, V) || varById(ref) || elOf(ref) || grpById(ref) || bndById(ref) || goalById(ref) || goalTreeById(ref) || shById(ref) || doc.flowTypes.find(t => t.id === ref) || null;
}
function tagHolders() { return [...doc.functions, ...doc.variants.flatMap(v => v.flows), ...allAps().map(x => x.ap)]; }
function everyTranslatable(d, fn) { // every text a reader sees, in every variant
  fn(d, "title"); d.tagGroups.forEach(g => fn(g, "name")); d.tags.forEach(t => fn(t, "name")); d.flowTypes.forEach(t => fn(t, "name"));
  d.functions.forEach(f => fn(f, "text"));
  fn(d.goals.root, "text"); d.goals.catalogue.forEach(g => { fn(g, "text"); fn(g, "measure"); });
  d.system.levels.forEach(l => fn(l, "name")); d.system.groups.forEach(g => fn(g, "text")); d.system.boundaries.forEach(b => fn(b, "name")); d.system.elements.forEach(e => fn(e, "text"));
  d.variants.forEach(v => { fn(v, "name"); ["boundary", "inside", "outside"].forEach(k => fn(v, k)); v.externals.forEach(x => fn(x, "text")); v.flows.forEach(l => fn(l, "text")); });
}
function boxItems(d = doc) { // the texts walked through by a translation pass: functions, externals, flow labels
  return [...d.functions.map(o => [o, "text"]), ...(txAll(d.goals.root).length ? [[d.goals.root, "text"]] : []), ...d.goals.catalogue.map(o => [o, "text"]), ...d.system.elements.map(o => [o, "text"]), ...d.system.groups.map(o => [o, "text"]), ...d.variants.flatMap(v => [...v.externals.map(o => [o, "text"]), ...v.flows.filter(l => txAll(l).length).map(o => [o, "text"])])];
}
function missingSummary() { // per language: boxes and other visible texts still untranslated
  if (doc.languages.length < 2) return [];
  return doc.languages.map(l => {
    const items = new Set(boxItems().map(([o]) => o));
    const boxes = [...items].filter(o => txMissing(o, "text", l)).length;
    let other = 0; everyTranslatable(doc, (o, f) => { if (!(f === "text" && items.has(o)) && txMissing(o, f, l)) other++; });
    return { l, boxes, other };
  });
}

/* layout the author set by hand, per variant: a box's width (bw) and a flow's shape (geo, see canvas.js) */
const BOX_W = [70, 640];
const bwOf = p => Number.isFinite(+p.bw) && +p.bw > 0 ? { bw: Math.round(Math.max(BOX_W[0], Math.min(BOX_W[1], +p.bw))) } : {};
const FLOW_SHAPE_IDS = ["auto", "straight", "curved", "angled", "elbow"];
function geoOf(g) {
  if (!g || typeof g !== "object") return null;
  const num = v => Number.isFinite(+v) ? +v : 0, lim = (v, a, b) => Math.max(a, Math.min(b, v));
  const end = p => Array.isArray(p) && p.length === 2 ? [lim(Math.round(num(p[0]) * 100) / 100, -.5, .5), lim(Math.round(num(p[1]) * 100) / 100, -.5, .5)] : null;
  const r = { shape: FLOW_SHAPE_IDS.includes(g.shape) ? g.shape : "auto",
    bend: g.bend && typeof g.bend === "object" ? { w: lim(Math.round(num(g.bend.w) * 1000) / 1000, -1, 2), d: Math.round(num(g.bend.d)) } : null,
    s: end(g.s), t: end(g.t), lab: Array.isArray(g.lab) && g.lab.length === 2 ? [Math.round(num(g.lab[0])), Math.round(num(g.lab[1]))] : null };
  if ((r.shape === "curved" || r.shape === "angled") && !r.bend) r.shape = "auto";
  if (r.shape === "auto" || r.shape === "straight") r.bend = null;
  const out = {}; Object.entries(r).forEach(([k, v]) => { if (v != null && !(k === "shape" && v === "auto")) out[k] = v; });
  return Object.keys(out).length ? out : null;
}

function boxSize(o, extra = "", pre = "", boxW = null) { // big enough for the text in every language, so the layout holds when switching
  const all = txAll(o); if (!all.length) all.push(" ");
  return all.map(t => measureText(pre + t + extra, boxW)).reduce((a, b) => ({ w: Math.max(a.w, b.w), h: Math.max(a.h, b.h) }));
}

/* ================= View state ================= */
const view = Object.assign({}, DEFAULT_VIEW, { tagFilter: new Set(), hiddenTypes: new Set(), diff: null, scorer: "all" });
try { Object.assign(view, JSON.parse(lsGet(LS_VIEW) || "{}")); } catch (e) {}
view.tagFilter = new Set(); view.hiddenTypes = new Set(); view.diff = null;
if (/^#(system|goals|functions)$/.test(location.hash)) view.mode = location.hash.slice(1); // a link can open a mode
function saveView() { const { tagFilter, hiddenTypes, diff, ...rest } = view; lsSet(LS_VIEW, JSON.stringify(rest)); }
let selId = null, selFlow = null, multi = [];
let lastRender = null;
