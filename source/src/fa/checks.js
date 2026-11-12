/* ================= Method checks: the six steps, the verb test ================= */
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function firstWord(text) { const m = fold(text).match(/^[^\p{L}]*(\p{L}+)/u); return m ? m[1] : ""; }
/* every verb of a language, with the basis term it belongs to (null for the everyday row and the file's own verbs) */
const VERBS = {};
VERB_ROWS.forEach(r => Object.keys(r).forEach(l => {
  const ws = r[l].split(/\s+/).filter(Boolean), head = ws[0] === "*" ? null : ws[0];
  VERBS[l] = VERBS[l] || new Map();
  ws.filter(w => w !== "*").forEach(w => { const k = fold(w); if (!VERBS[l].has(k) || (VERBS[l].get(k).head === null && head)) VERBS[l].set(k, { word: w, head }); });
}));
function verbList(lang) { return [...new Set([...(VERBS[lang] ? VERBS[lang].keys() : []), ...(doc.verbs || []).map(fold)])]; }
function verbHead(w, lang) { const v = VERBS[lang] && VERBS[lang].get(fold(w)); return v ? v.head : null; }
function englishStems(w) { // keeps, keeping, dried, dries, stopped, removing → the base forms to look up
  const out = new Set([w]);
  const add = x => { if (x && x.length > 1) { out.add(x); out.add(x + "e"); if (/(.)\1$/.test(x)) out.add(x.slice(0, -1)); } };
  if (w.endsWith("ies") || w.endsWith("ied")) out.add(w.slice(0, -3) + "y");
  ["ing", "ed", "es", "s"].forEach(suf => { if (w.endsWith(suf)) add(w.slice(0, -suf.length)); });
  return [...out];
}
/* true when the text starts with a function verb; false when it probably names a solution or a thing */
function verbOK(o, lang = mainLang()) {
  const w = firstWord(txRaw(o, "text", lang)); if (!w) return true;
  if (!VERBS[lang] && !(doc.verbs || []).length) return true; // no verb list for this language
  const list = new Set(verbList(lang));
  return (lang === "en" ? englishStems(w) : [w]).some(x => list.has(x));
}
function verbSuggestions(prefix, lang) { // [{word, head}], basis terms first
  const p = fold(prefix).trim(); if (!p || /\s/.test(p)) return [];
  const own = (doc.verbs || []).map(w => ({ word: w, head: null }));
  const all = [...(VERBS[lang] ? VERBS[lang].values() : []), ...own].filter(v => fold(v.word).startsWith(p) && fold(v.word) !== p);
  const seen = new Set();
  return all.filter(v => !seen.has(fold(v.word)) && seen.add(fold(v.word)))
    .sort((a, b) => (a.head === a.word ? 0 : 1) - (b.head === b.word ? 0 : 1) || a.word.localeCompare(b.word)).slice(0, 8);
}

function flowSides(V = curVar()) { // which flows cross the boundary, and in which direction
  const ext = new Set(V.externals.map(x => x.id));
  return { inputs: V.flows.filter(l => ext.has(l.source) && !ext.has(l.target)), outputs: V.flows.filter(l => !ext.has(l.source) && ext.has(l.target)),
    outside: V.flows.filter(l => ext.has(l.source) && ext.has(l.target)), internal: V.flows.filter(l => !ext.has(l.source) && !ext.has(l.target)) };
}
const byType = ls => doc.flowTypes.map(t => [t, ls.filter(l => l.type === t.id).length]).filter(x => x[1]).map(([t, n]) => `${n} ${tx(t, "name").toLowerCase()}`).join(", ");

function methodSteps(V = curVar()) {
  const S = flowSides(V), ids = Object.keys(V.placed), root = fnById(V.root);
  const leaves = ids.filter(id => !childrenOf(id, V).length);
  const fnIssue = (id, why) => ({ id, label: tx(fnById(id)) || "(no text)", why });
  const steps = {};
  const sb = V.systemBoundary && bndById(V.systemBoundary);
  steps.boundary = { status: (txAll(V, "boundary").length || sb) && txAll(root).length ? "done" : "todo",
    detail: [sb ? `System map: ${tx(sb, "name")} (${insideCount(sb)})` : "", txAll(V, "boundary").length ? tx(V, "boundary") : ""].filter(Boolean).join(" · ") || "Pick a boundary from the system map, or write where the system starts and ends.",
    issues: txAll(root).length ? [] : [{ id: V.root, label: "The overall function has no name" }] };
  steps.blackbox = { status: S.inputs.length && S.outputs.length ? (S.outside.length ? "warn" : "done") : "todo",
    detail: `${S.inputs.length} input${S.inputs.length === 1 ? "" : "s"}${S.inputs.length ? ` (${byType(S.inputs)})` : ""} · ${S.outputs.length} output${S.outputs.length === 1 ? "" : "s"}${S.outputs.length ? ` (${byType(S.outputs)})` : ""}`,
    issues: S.outside.map(l => ({ flow: l.id, label: flowLabel(l), why: "never enters the system: both ends are outside" })) };
  const noIn = leaves.filter(id => !V.flows.some(l => l.target === id)), noOut = leaves.filter(id => !V.flows.some(l => l.source === id));
  const dIssues = [...noIn.map(id => fnIssue(id, "no flow comes in")), ...noOut.map(id => fnIssue(id, "no flow goes out"))];
  steps.decompose = { status: ids.length < 2 ? "todo" : dIssues.length ? "warn" : "done",
    detail: `${ids.length} subfunction${ids.length === 1 ? "" : "s"} over ${maxDepth(V)} level${maxDepth(V) === 1 ? "" : "s"} · ${S.internal.length} internal flow${S.internal.length === 1 ? "" : "s"}`, issues: dIssues };
  const wIssues = [V.root, ...ids].filter(id => fnById(id) && !verbOK(fnById(id))).map(id => fnIssue(id, `“${firstWord(txRaw(fnById(id), "text", mainLang()))}” is not a function verb`));
  steps.wording = { status: wIssues.length ? "warn" : ids.length ? "done" : "todo",
    detail: wIssues.length ? `${wIssues.length} box${wIssues.length === 1 ? "" : "es"} may name a solution or a thing` : "Every box starts with a function verb.", issues: wIssues };
  const aux = ids.filter(id => fnById(id).kind === "aux");
  steps.auxiliary = { status: aux.length ? "done" : "todo", detail: `${aux.length} auxiliary function${aux.length === 1 ? "" : "s"}`, issues: [] };
  steps.variants = { status: doc.variants.length > 1 ? "done" : "todo", detail: `${doc.variants.length} variant${doc.variants.length === 1 ? "" : "s"} in this file`, issues: [] };
  return STEPS.map(s => { const r = steps[s.id]; const ticked = !!V.steps[s.id];
    return { ...s, ...r, ticked, status: ticked && r.status !== "done" ? "done" : r.status }; });
}
function flowLabel(l, V = curVar()) {
  const end = id => tx(nodeOf(id) || {}) || "?";
  return `${end(l.source)} → ${end(l.target)}${txAll(l).length ? ` (${tx(l)})` : ""}`;
}

/* ================= Checks against the system map =================
   With a boundary from the system map, three gaps show up:
   unaddressed   appearances inside the boundary that no function of this variant acts on
   outside       functions of this variant acting on appearances outside the boundary
   extInside     externals whose element is inside the boundary on every level it appears
   candidates    elements outside the boundary on some level, not yet an external */
function systemChecks(V = curVar()) {
  const b = V.systemBoundary && bndById(V.systemBoundary); if (!b) return null;
  const inside = new Set(b.members), fns = [V.root, ...Object.keys(V.placed)].map(fnById).filter(Boolean);
  const acted = new Set(fns.flatMap(f => f.actsOn || []));
  return { b, inside,
    unaddressed: allAps().filter(x => inside.has(x.ap.id) && !acted.has(x.ap.id)).map(x => x.ap.id),
    outside: fns.flatMap(f => (f.actsOn || []).filter(id => !inside.has(id) && apById(id)).map(id => ({ fn: f.id, el: id }))),
    extInside: V.externals.filter(x => x.ref && elById(x.ref) && elById(x.ref).at.every(p => inside.has(p.id))).map(x => x.id),
    candidates: doc.system.elements.filter(e => e.at.some(p => !inside.has(p.id)) && !V.externals.some(x => x.ref === e.id)).map(e => e.id) };
}
/* what changes when a variant moves to another boundary */
let movedNote = null;
function boundaryMove(V, from, to) {
  const a = new Set(from ? (bndById(from) || { members: [] }).members : []), b = new Set(to ? (bndById(to) || { members: [] }).members : []);
  return { v: V.id, from, to, entered: [...b].filter(id => !a.has(id)), left: [...a].filter(id => !b.has(id)) };
}
