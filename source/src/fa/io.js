/* ================= Files: loading a function analysis ================= */
function setDoc(d, name, handle) {
  doc = d; fileName = name; fileHandle = handle || null; dirty = false;
  sysFocus = null; sysEditing = false; movedNote = null;
  undoStack.length = 0; redoStack.length = 0; selId = selFlow = null; multi = [];
  view.tagFilter.clear(); view.hiddenTypes.clear(); view.diff = null; $("#diffbar").hidden = true;
  autosave(); render({ fit: true });
}
async function loadText(text, name, handle) {
  let d; try { d = JSON.parse(text.trim()); } catch (e) { throw new Error("This file is not valid JSON."); }
  setDoc(normalizeDoc(d), name, handle);
  toast(`Opened ${name}`);
}
function sampleDoc() { // a small worked example, so a first visit has something to look at
  const d = emptyDoc(); d.title = "Example: deliver sound fruit";
  const F = t => { const f = newFunction(t); d.functions.push(f); return f; };
  const root = F("Deliver sound fruit"), a = F("Assess fruit"), s = F("Segregate infected fruit"), m = F("Remove free water"), c = F("Keep fruit cold"), r = F("Record condition"); r.kind = "aux";
  const V = newVariant("Variant A", root.id); V.boundary = "Farm gate → importer's distribution centre";
  [[a, 0, 0], [s, 230, 0], [m, 460, 0], [c, 690, 0], [r, 460, 140]].forEach(([f, x, y]) => { V.placed[f.id] = { x, y, parent: null }; });
  const g = newExternal("Grower", -300, 0), i = newExternal("Importer", 1000, 0), w = newExternal("Environment", 340, -200);
  V.externals = [g, i, w];
  const fl = (s1, t1, type, text, unwanted) => { const l = newFlow(s1.id, t1.id, type); l.text = text; l.unwanted = !!unwanted; V.flows.push(l); };
  fl(g, a, "material", "harvested fruit"); fl(w, a, "material", "inoculum", true); fl(a, s, "signal", "infection estimate"); fl(a, s, "material", "fruit");
  fl(s, m, "material", "fruit"); fl(m, c, "material", "dry fruit"); fl(c, i, "material", "sound fruit"); fl(w, c, "energy", "cooling");
  fl(c, r, "signal", "temperature"); fl(r, i, "signal", "condition record"); fl(s, w, "material", "rejects", true);
  // the system map behind it: levels for scale, the chain of stages from the tags, one boundary used by the variant
  d.tags = stageTags(["en"]); d.tagGroups = groupsFor(["en"]);
  const S = d.system; S.levels = [["Landscape", 0], ["Farm", 1], ["Crop", 2], ["Fruit", 3]].map(([n, i]) => ({ id: uid("lv"), name: n, nameTr: {}, ...LEVEL_COLORS[i] }));
  const at = (lv, deg, t, tags = []) => ({ level: S.levels[lv].id, a: deg * Math.PI / 180, t, tags });
  const E = (text, kind, lv, deg, t, tags = [], needs = "") => { const e = newElement(text, kind, at(lv, deg, t, tags)); e.needs = needs; S.elements.push(e); return e; };
  const P = e => e.at[0].id; // its first (here, only) circle
  const weather = E("Weather", "factor", 0, -118, .55), nb = E("Neighbouring farms", "actor", 0, -88, .5), exporter = E("Exporter", "actor", 0, -50, .5, ["t-inland"]),
    importer = E("Importer", "actor", 0, -12, .5, ["t-sea"], "Sound fruit on arrival\nQuality records it can trust");
  const grower = E("Grower", "actor", 1, -130, .5, ["t-culture"], "Fewer rejected shipments\nA predictable price"), pickers = E("Pickers", "actor", 1, -100, .5, ["t-harvest"]),
    pack = E("Packhouse", "object", 1, -68, .5, ["t-sorting", "t-packing"]), cold = E("Cold room", "object", 1, -38, .5, ["t-storage"]), water = E("Irrigation water", "object", 1, -162, .5, ["t-culture"]);
  const plants = E("Plants", "organism", 2, -128, .5, ["t-culture"]), hum = E("Humidity", "factor", 2, -90, .5, ["t-culture"]), fung = E("Fungicides", "object", 2, -52, .5, ["t-culture"]);
  const fruit = E("Fruit", "object", 3, -128, .62), calyx = E("Calyx", "object", 3, -70, .66, ["t-drying"]), conidia = E("Conidia", "organism", 3, -14, .6), myc = E("Mycelium", "organism", 3, 26, .55);
  hum.notes = "In the canopy before harvest; round the fruit in the box after it"; hum.at.push(newAppearance(at(3, 150, .55, ["t-drying"]))); // one element on two levels
  const humFruit = hum.at[1].id;
  const botrytis = { id: uid("g"), text: "Botrytis", textTr: {}, notes: "" }; S.groups = [botrytis]; conidia.at[0].group = myc.at[0].group = botrytis.id;
  const b1 = { id: uid("b"), name: "Farm gate to importer", nameTr: {}, note: "What the packhouse and exporter can change", members: [...[pickers, pack, cold, exporter, fruit, calyx, conidia, myc].map(P), humFruit] };
  const b2 = { id: uid("b"), name: "Crop and fruit", nameTr: {}, note: "Pre-harvest: what the grower can change", members: [grower, water, plants, hum, fung, fruit, calyx, conidia, myc].map(P) };
  S.boundaries = [b1, b2]; S.chain = { on: true, group: "product" };
  V.systemBoundary = b1.id; g.ref = grower.id; i.ref = importer.id; w.ref = weather.id;
  a.actsOn = [P(fruit)]; s.actsOn = [P(fruit)]; m.actsOn = [P(calyx)]; c.actsOn = [P(fruit)]; r.actsOn = [P(cold)]; m.key = c.key = true;
  V.flows.find(l => l.text === "inoculum").element = conidia.id;
  // the goals inside that boundary, scored by the analyst and one exporter
  const Gs = d.goals; Gs.root = { text: "Improve export revenues of uchuva while reducing Botrytis cinerea incidence", textTr: {} };
  const you = Gs.stakeholders[0], exp = { id: uid("sh"), name: "Exporter A", note: "Interview, packhouse manager" }; Gs.stakeholders.push(exp);
  const T = newGoalTree(b1.id); Gs.trees = [T]; Gs.active = T.id;
  const GL = (text, parent, mine, theirs, measure = "") => { const g = newGoal(text); g.measure = measure; Gs.catalogue.push(g);
    T.nodes.push({ goal: g.id, parent: parent ? parent.id : null, out: false, scores: { [you.id]: mine, [exp.id]: theirs } }); return g; };
  const q = GL("Higher quality of fruit", null, 5, 5), rip = GL("Good assessment of ripeness", q, 3, 4, "% of lots graded to the right colour class"),
    inf = GL("Low infection rate", q, 5, 5, "% of fruit with Botrytis on arrival"), shelf = GL("Longer shelf life", q, 4, 5);
  const decay = GL("Less decay after arrival", shelf, 5, 4, "% decayed fruit at day 21 after arrival"), green = GL("Calyx stays green and dry", shelf, 3, 2, "% of calyces dry and green at arrival"),
    firm = GL("Fruit stays firm", shelf, 2, 3, "Firmness at arrival, N");
  firm.notes = "Not served by any function yet: the goals checks list it";
  const und = GL("Better understanding of the problem", null, 3, 2), cov = GL("Wider coverage of measurements", und, 4, 3);
  const rh = GL("Humidity known along the chain", cov, 5, 3, "% of shipments with RH logged"), temp = GL("Temperature known along the chain", cov, 4, 5, "% of shipments with temperature logged");
  a.serves = [rip.id]; s.serves = [inf.id]; m.serves = [decay.id, green.id]; c.serves = [decay.id]; r.serves = [rh.id, temp.id];
  d.variants = [V]; d.activeVariant = V.id; d.versions = [mkVersion(d, "Example", "")];
  return d;
}

/* ================= Exports ================= */
function baseName() { return fileName.replace(/\.json$/i, ""); }
const variantSlug = () => slug(tx(curVar(), "name") || "variant").toLowerCase();
const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
function exportSVG() {
  const ink = "#1b2420";
  const vis = cy.elements().filter(e => e.visible());
  const bb = vis.boundingBox({ includeLabels: true });
  const pad = 24, W = Math.ceil(bb.w + pad * 2), H = Math.ceil(bb.h + pad * 2), ox = pad - bb.x1, oy = pad - bb.y1;
  const P = p => `${(p.x + ox).toFixed(1)},${(p.y + oy).toFixed(1)}`;
  const X = v => (v + ox).toFixed(1), Y = v => (v + oy).toFixed(1);
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="IBM Plex Sans, Helvetica, Arial, sans-serif">`,
    `<title>${esc(tx(doc, "title"))} · ${esc(tx(curVar(), "name"))}</title>`, `<rect width="100%" height="100%" fill="#ffffff"/>`];
  const dashOf = (bs, w) => bs === "dashed" ? ` stroke-dasharray="${(w * 3.5).toFixed(1)} ${(w * 2.2).toFixed(1)}"` : bs === "dotted" ? ` stroke-dasharray="0.1 ${(w * 2.2).toFixed(1)}" stroke-linecap="round"` : "";
  const textLines = (lines, x, y, size, color, weight) => lines.forEach((l, i) => out.push(`<text x="${X(x)}" y="${Y(y + i * (size + 4))}" font-size="${size}"${weight ? ` font-weight="${weight}"` : ""} fill="${color}" text-anchor="middle" dominant-baseline="central">${esc(l)}</text>`));
  const box = (n, fill, op) => { const d = n.data(), b = n.boundingBox({ includeLabels: false, includeOverlays: false });
    const dbl = d.bs === "double";
    out.push(`<rect x="${X(b.x1)}" y="${Y(b.y1)}" width="${b.w.toFixed(1)}" height="${b.h.toFixed(1)}" rx="${n.hasClass("ext") ? 18 : 7}" fill="${fill}"${op ? ` fill-opacity="${op}"` : ""} stroke="${d.stroke}" stroke-width="${dbl ? 1.3 : d.bw}"${dashOf(d.bs, d.bw)}/>`);
    if (dbl) out.push(`<rect x="${X(b.x1 + 3.5)}" y="${Y(b.y1 + 3.5)}" width="${(b.w - 7).toFixed(1)}" height="${(b.h - 7).toFixed(1)}" rx="5" fill="none" stroke="${d.stroke}" stroke-width="1.3"/>`);
    return b; };
  // containers first, outermost first, so boxes and flows sit on top
  cy.nodes().filter(n => n.visible() && n.isParent()).sort((a, b) => a.ancestors().length - b.ancestors().length).forEach(n => {
    const b = box(n, n.data("fill"), n.hasClass("root") ? 0.55 : 0.14);
    textLines(n.data("label").split("\n"), (b.x1 + b.x2) / 2, b.y1 - 12 - (n.data("label").split("\n").length - 1) * 17, n.hasClass("root") ? 15 : 13, ink, 600);
  });
  const labelLines = text => { // as the canvas wraps a flow label: at the author's line breaks, then at 130 px
    mctx.font = `11px ${FONT_STACK}`; const out = [];
    String(text).split("\n").forEach(par => { let cur = ""; par.trim().split(/\s+/).forEach(w => { const t = cur ? cur + " " + w : w; if (mctx.measureText(t).width <= 130 || !cur) cur = t; else { out.push(cur); cur = w; } }); if (cur) out.push(cur); });
    return out; };
  cy.edges().filter(e => e.visible()).forEach(e => {
    const d = e.data(); const s = e.sourceEndpoint(), t = e.targetEndpoint(); if (![s, t].every(p => p && Number.isFinite(p.x))) return;
    const seg = e.segmentPoints && e.segmentPoints(), cp = !seg && e.controlPoints && e.controlPoints(); // angled and elbow flows have corners; curves a control point
    let path, from;
    if (seg && seg.length) { path = `M${P(s)} ${seg.map(q => `L${P(q)}`).join(" ")} L${P(t)}`; from = seg[seg.length - 1]; }
    else if (cp && cp.length) { path = `M${P(s)} Q${P(cp[0])} ${P(t)}`; from = cp[0]; }
    else { path = `M${P(s)} L${P(t)}`; from = s; }
    const L = Math.hypot(t.x - from.x, t.y - from.y) || 1, ux = (t.x - from.x) / L, uy = (t.y - from.y) / L, al = 10, aw = 5;
    const base = { x: t.x - ux * al, y: t.y - uy * al };
    const dash = d.dp ? ` stroke-dasharray="${d.dp.map(v => +v.toFixed(2)).join(" ")}" stroke-linecap="round"` : "";
    out.push(`<path d="${path}" fill="none" stroke="${d.c}" stroke-width="${d.w}" stroke-linejoin="round"${dash}/>`);
    out.push(`<polygon points="${P(t)} ${P({ x: base.x - uy * aw, y: base.y + ux * aw })} ${P({ x: base.x + uy * aw, y: base.y - ux * aw })}" fill="${d.af === "hollow" ? "#ffffff" : d.c}" stroke="${d.c}" stroke-width="1.2"/>`);
    if (d.label) { // where the canvas shows it, moved by hand or spread apart
      const lb = e.boundingBox({ includeEdges: false, includeNodes: false, includeLabels: true }), lines = labelLines(d.label);
      const cx = (lb.x1 + lb.x2) / 2, cyy = (lb.y1 + lb.y2) / 2, lh = 13, h = lines.length * lh + 4;
      mctx.font = `11px ${FONT_STACK}`; const w = Math.max(...lines.map(l => mctx.measureText(l).width)) + 6;
      out.push(`<rect x="${X(cx - w / 2)}" y="${Y(cyy - h / 2)}" width="${w.toFixed(1)}" height="${h}" rx="3" fill="#ffffff" fill-opacity="0.9"/>`);
      lines.forEach((l, i) => out.push(`<text x="${X(cx)}" y="${Y(cyy + (i - (lines.length - 1) / 2) * lh)}" font-size="11" fill="${ink}" text-anchor="middle" dominant-baseline="central">${esc(l)}</text>`)); }
  });
  cy.nodes().filter(n => n.visible() && !n.isParent()).forEach(n => {
    const d = n.data(), p = n.position();
    if (n.hasClass("relb")) {
      out.push(`<rect x="${X(p.x - d.w / 2)}" y="${Y(p.y - 10.5)}" width="${d.w}" height="21" rx="10" fill="#E2F3EA" stroke="#3E9A78" stroke-width="1"/><text x="${X(p.x)}" y="${Y(p.y)}" font-size="10.5" font-weight="600" fill="${ink}" text-anchor="middle" dominant-baseline="central">${esc(d.label)}</text>`);
      return;
    }
    if (n.hasClass("badge")) {
      out.push(`<rect x="${X(p.x - d.w / 2)}" y="${Y(p.y - 10.5)}" width="${d.w}" height="21" rx="10" fill="#ffffff" stroke="#5f6e68" stroke-width="1"/>`);
      out.push(`<text x="${X(p.x)}" y="${Y(p.y)}" font-size="13" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" text-anchor="middle" dominant-baseline="central">${esc(d.label)}</text>`);
      return;
    }
    box(n, d.fill);
    const lines = d.label.split("\n"); const size = n.hasClass("root") ? 15 : FONT_PX, lh = n.hasClass("root") ? 19 : LINE;
    const y0 = p.y - (lines.length - 1) * lh / 2;
    lines.forEach((l, i) => out.push(`<text x="${X(p.x)}" y="${Y(y0 + i * lh)}" font-size="${size}"${n.hasClass("root") ? ` font-weight="600"` : ""}${d.fs === "italic" ? ` font-style="italic"` : ""} fill="${d.font}" text-anchor="middle" dominant-baseline="central">${esc(l)}</text>`));
  });
  out.push(`</svg>`);
  return { svg: out.join("\n"), W, H };
}
function exportPNG() {
  const { svg, W, H } = view.mode === "system" ? exportSystemSVG() : view.mode === "goals" ? exportGoalsSVG() : exportSVG(); const img = new Image(); const s = 2;
  img.onload = () => {
    const c = document.createElement("canvas"); c.width = W * s; c.height = H * s;
    const g = c.getContext("2d"); g.scale(s, s); g.drawImage(img, 0, 0);
    c.toBlob(b => { download(`${baseName()}-${view.mode === "system" ? "system" : view.mode === "goals" ? "goals-" + slug(treeName(curTree()) || "tree").toLowerCase() : variantSlug()}.png`, b); toast("PNG exported."); }, "image/png");
  };
  img.onerror = () => toast("PNG export failed in this browser. Use SVG instead.");
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
const relCell = (f, T, R) => { if (!T) return ""; const r = fnRelevance(f, T, R).rel; return r == null ? "" : +r.toFixed(4); };
const csvCell = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const toCSV = rows => "﻿" + rows.map(r => r.map(csvCell).join(",")).join("\n") + "\n";
function exportCSV(which) {
  const L = doc.languages, V = curVar(), S = flowSides(V);
  const tagNames = o => orderedTags(o.tags || []).map(t => tx(t, "name")).join(" | ");
  const rcaText = id => { const b = doc.rca && doc.rca.boxes.find(x => x.id === id); return b ? tx(b) : id; };
  let rows, name;
  if (which === "functions") { // the whole catalogue, with where each function sits in the open variant
    name = `${baseName()}-functions.csv`;
    const GT = treeForVariant(V), GR = GT ? goalResults(GT) : null;
    rows = [["id", ...L.map(l => "text_" + l), "kind", "level_in_open_variant", "parent_in_open_variant", "variants", "key", `${GOAL_METHODS[doc.goals.method].short}_in_open_variant`, "serves_goals", "acts_on", "tags", "rca_causes", "verb_ok", "notes", "sources"],
      ...doc.functions.map(f => [f.id, ...L.map(l => txRaw(f, "text", l)), f.kind === "aux" ? "auxiliary" : "main", inVariant(f.id) ? depthOf(f.id, V) : "",
        inVariant(f.id) && f.id !== V.root ? tx(fnById(parentOf(f.id, V))) : "", usedIn(f.id).map(v => tx(v, "name")).join(" | "), f.key ? "yes" : "no", relCell(f, GT, GR), (f.serves || []).map(goalLabel).join(" | "), (f.actsOn || []).map(id => apLabel(id, true)).join(" | "), tagNames(f),
        (f.rcaLinks || []).map(rcaText).join(" | "), verbOK(f) ? "yes" : "no", f.notes, f.sources.join(" | ")])];
  } else if (which === "flows") {
    name = `${baseName()}-${variantSlug()}-flows.csv`;
    rows = [["id", "from", "to", "type", ...L.map(l => "text_" + l), "unwanted", "crosses_boundary", "tags", "notes", "sources"],
      ...V.flows.map(l => [l.id, tx(nodeOf(l.source)), tx(nodeOf(l.target)), tx(typeById(l.type), "name"), ...L.map(x => txRaw(l, "text", x)), l.unwanted ? "yes" : "no",
        S.inputs.includes(l) ? "in" : S.outputs.includes(l) ? "out" : S.outside.includes(l) ? "outside" : "no", tagNames(l), l.notes, l.sources.join(" | ")])];
  } else { // morphological chart starter: one row per leaf function, columns to fill with means; most relevant first when there are goals
    name = `${baseName()}-${variantSlug()}-morphological-chart.csv`;
    const GT = treeForVariant(V), GR = GT ? goalResults(GT) : null, rel = id => GT ? fnRelevance(fnById(id), GT, GR).rel : null;
    const leaves = Object.keys(V.placed).filter(id => !childrenOf(id, V).length)
      .sort((a, b) => (rel(b) ?? -1) - (rel(a) ?? -1) || (fnById(b).key - fnById(a).key) || V.placed[a].x - V.placed[b].x || V.placed[a].y - V.placed[b].y);
    rows = [["function", "key", ...(GT ? [GOAL_METHODS[doc.goals.method].short, "serves_goals"] : []), "level", "kind", "parent", "means_1", "means_2", "means_3", "means_4", "means_5"],
      ...leaves.map(id => { const f = fnById(id); return [tx(f), f.key ? "★" : "", ...(GT ? [relCell(f, GT, GR), fnRelevance(f, GT, GR).goals.map(goalLabel).join(" | ")] : []),
        depthOf(id, V), f.kind === "aux" ? "auxiliary" : "main", tx(fnById(parentOf(id, V))), "", "", "", "", ""]; })];
  }
  download(name, toCSV(rows), "text/csv"); toast(`${name} exported.`);
}

/* ================= Versions: what a function-analysis snapshot holds ================= */
function diffCores(a, b) { // a = old snapshot, b = new
  const an = new Map(a.functions.map(f => [f.id, f])), bn = new Map(b.functions.map(f => [f.id, f]));
  const added = b.functions.filter(f => !an.has(f.id)), removed = a.functions.filter(f => !bn.has(f.id));
  const key = f => JSON.stringify([f.text, f.textTr, f.kind, f.key, f.actsOn, f.serves, f.notes, f.sources, f.tags, f.rcaLinks]);
  const changed = b.functions.filter(f => an.has(f.id) && key(an.get(f.id)) !== key(f));
  const flows = s => new Map(s.variants.flatMap(v => v.flows.map(l => [l.id, { ...l, variant: v.name }])));
  const af = flows(a), bf = flows(b);
  const places = s => new Map(s.variants.map(v => [v.id, JSON.stringify(v.placed)]));
  const ap = places(a), bp = places(b);
  const ae = new Set(((a.system || {}).elements || []).map(e => e.id)), be = new Set(((b.system || {}).elements || []).map(e => e.id));
  return { added, removed, changed, an, bn, elAdded: [...be].filter(id => !ae.has(id)).length, elRemoved: [...ae].filter(id => !be.has(id)).length, flowsAdded: [...bf.values()].filter(l => !af.has(l.id)), flowsRemoved: [...af.values()].filter(l => !bf.has(l.id)),
    variantsAdded: b.variants.filter(v => !ap.has(v.id)), variantsRemoved: a.variants.filter(v => !bp.has(v.id)),
    restructured: b.variants.filter(v => ap.has(v.id) && ap.get(v.id) !== bp.get(v.id)) };
}
const chgLine = d => `<span class="chg"><span class="p">+${d.added.length}</span> / <span class="m">−${d.removed.length}</span> functions · <span class="c">${d.changed.length} edited</span> · flows <span class="p">+${d.flowsAdded.length}</span> / <span class="m">−${d.flowsRemoved.length}</span>${d.variantsAdded.length || d.variantsRemoved.length ? ` · variants <span class="p">+${d.variantsAdded.length}</span> / <span class="m">−${d.variantsRemoved.length}</span>` : ""}</span>${d.elAdded || d.elRemoved ? ` · elements <span class="p">+${d.elAdded}</span> / <span class="m">−${d.elRemoved}</span>` : ""}`;
function versionSize(s) { return `${((s.system || {}).elements || []).length} elements, ${((s.goals || {}).catalogue || []).length} goals, ${s.functions.length} functions, ${s.variants.length} variant${s.variants.length === 1 ? "" : "s"}`; }
function versionCompare(v, d, box) {
  const li = arr => arr.length ? `<ul>${arr.slice(0, 40).map(x => `<li>${esc(x)}</li>`).join("")}${arr.length > 40 ? `<li>…and ${arr.length - 40} more</li>` : ""}</ul>` : `<p class="muted">None.</p>`;
  const fn = (m, id) => tx(m.get(id) || {}) || "an external";
  const fl = (l, m) => `${l.variant}: ${fn(m, l.source)} → ${fn(m, l.target)}${l.text ? ` (${l.text})` : ""}`;
  box.innerHTML = `<h4>Now compared with “${esc(v.name)}”</h4>${chgLine(d)}
    <b>New functions</b>${li(d.added.map(f => tx(f)))}<b>Edited functions</b>${li(d.changed.map(f => { const o = d.an.get(f.id); return o.text !== f.text ? `${o.text} ⟶ ${f.text}` : tx(f); }))}
    <b>Removed functions</b>${li(d.removed.map(f => tx(f)))}<b>Variants restructured</b>${li(d.restructured.map(x => x.name))}
    <b>New flows</b>${li(d.flowsAdded.map(l => fl(l, d.bn)))}<b>Removed flows</b>${li(d.flowsRemoved.map(l => fl(l, d.an)))}
    <div class="row"><button class="btn primary" id="vd-show">Highlight on the diagram</button></div>`;
  $("#vd-show").onclick = () => {
    view.diff = { added: new Set(d.added.map(f => f.id)), changed: new Set(d.changed.map(f => f.id)), name: v.name };
    const bar = $("#diffbar"); bar.hidden = false;
    bar.innerHTML = `Compared with “${esc(v.name)}”: <span class="a">${d.added.length} new</span> <span class="c">${d.changed.length} edited</span> ${d.removed.length ? `· ${d.removed.length} removed (listed in Versions)` : ""}<button class="btn small" id="diff-clear">Clear</button>`;
    $("#diff-clear").onclick = () => { view.diff = null; bar.hidden = true; applyDiff(); };
    $("#m-versions").hidden = true; applyDiff();
  };
}
