/* ================= Document model ================= */
function emptyDoc() {
  return { format: "uchuva-rca", schema: 2, app: APP_VERSION, title: "New root-cause analysis", titleTr: {}, languages: ["en"],
    categories: clone(DEFAULT_CATS), tagGroups: clone(DEFAULT_TAG_GROUPS), tags: [], scales: [], nodes: [], edges: [], versions: [], sessions: [], activeSession: null,
    meta: { created: nowISO(), modified: nowISO() } };
}
function newNode(text, cat, x, y) {
  return { id: uid("n"), text, textTr: {}, cat, tags: [], status: "unassessed", notes: "", sources: [], x: Math.round(x), y: Math.round(y) };
}
function coreOf(d) { return { title: d.title, titleTr: d.titleTr, languages: d.languages, categories: d.categories, tagGroups: d.tagGroups, tags: d.tags, scales: d.scales, nodes: d.nodes, edges: d.edges }; }

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

/* ---- hooks for the shared core ---- */
function findEditable(ref) { return nodeById(ref); } // what a side-panel field edits
function tagHolders() { return doc.nodes; } // everything that can carry tags
function snap() { return JSON.stringify({ ...coreOf(doc), sessions: doc.sessions, activeSession: doc.activeSession }); }
function restoreCore(s) {
  const c = typeof s === "string" ? JSON.parse(s) : clone(s);
  doc.title = c.title; doc.titleTr = c.titleTr || (c.languages ? {} : doc.titleTr); doc.languages = c.languages || doc.languages;
  doc.categories = c.categories; doc.tagGroups = c.tagGroups || doc.tagGroups; doc.tags = c.tags || doc.tags;
  const tagIds = new Set(doc.tags.map(t => t.id));
  doc.nodes = c.nodes.map(n => ({ ...n, textTr: n.textTr || {}, tags: (n.tags || []).filter(t => tagIds.has(t)) })); doc.edges = c.edges;
  if (c.scales) doc.scales = c.scales;
  if (c.sessions) { doc.sessions = c.sessions; doc.activeSession = c.activeSession || null; }
}
const nodeById = id => doc.nodes.find(n => n.id === id);
const catById = id => doc.categories.find(c => c.id === id) || { id, name: id, fill: "#ffffff", stroke: "#000000", font: "#000000" };
function everyTranslatable(d, fn) { // visit every visible text: title, categories, tag groups, tags, boxes
  fn(d, "title"); d.categories.forEach(c => fn(c, "name")); d.tagGroups.forEach(g => fn(g, "name"));
  d.tags.forEach(t => fn(t, "name")); d.nodes.forEach(n => fn(n, "text"));
}
const isQ = n => (n.text || txAll(n)[0] || "").trim() === "?";
