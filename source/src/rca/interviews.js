/* ================= Interviews: scales, grading, interview files ================= */
function normScale(x) {
  let min = Number.isFinite(+x.min) ? Math.round(+x.min) : 0, max = Number.isFinite(+x.max) ? Math.round(+x.max) : 5;
  if (max <= min) max = min + 1;
  return { id: String(x.id), name: String(x.name ?? "Scale"), nameTr: trObj(x.nameTr), min, max,
    low: String(x.low || ""), lowTr: trObj(x.lowTr), high: String(x.high || ""), highTr: trObj(x.highTr),
    gate: x.gate && x.gate.scale ? { scale: String(x.gate.scale), min: Math.round(+x.gate.min || 0) } : null,
    anchors: anchorObj(x.anchors, min, max), anchorsTr: Object.fromEntries(Object.entries(x.anchorsTr && typeof x.anchorsTr === "object" ? x.anchorsTr : {}).map(([l, o]) => [l, anchorObj(o, min, max)]).filter(([, o]) => Object.keys(o).length)),
    kinds: Array.isArray(x.kinds) ? [...new Set(x.kinds.map(String).filter(k => KINDS[k]))] : [],
    who: Array.isArray(x.who) ? x.who.filter(w => w && String(w.name || "").trim()).map((w, i) => ({ id: String(w.id || "w" + (i + 1)), name: String(w.name).trim(), nameTr: trObj(w.nameTr) })) : [] };
}
function anchorObj(o, min, max) { // value -> what it means, only for values on the scale
  const r = {}; if (o && typeof o === "object") Object.entries(o).forEach(([k, v]) => { const n = +k; if (Number.isInteger(n) && n >= min && n <= max && typeof v === "string" && v.trim()) r[n] = v.trim(); });
  return r;
}
/* suggested absolute anchors for feasibility: cost, time and whether the means exist, for the actor picked in "who could act" */
const FEAS_ANCHORS = {
  en: { 1: "Not possible with any known means: it would need research, new rules, or a change in weather or market.",
    2: "Possible only with a large investment (new equipment or facility) or a change that takes more than a season.",
    3: "Possible with a moderate investment or a new procedure; needs training or coordination; within a season.",
    4: "Possible with the staff and equipment already there, by changing how things are done; a few weeks.",
    5: "Can start right away at almost no cost: a setting, an instruction, a checklist." },
  es: { 1: "No es posible con ningún medio conocido: haría falta investigación, nuevas normas o un cambio en el clima o el mercado.",
    2: "Posible solo con una inversión grande (equipos o instalaciones nuevas) o con un cambio que toma más de una temporada.",
    3: "Posible con una inversión moderada o un procedimiento nuevo; requiere capacitación o coordinación; dentro de una temporada.",
    4: "Posible con el personal y los equipos que ya hay, cambiando la forma de hacer las cosas; unas pocas semanas.",
    5: "Se puede empezar de inmediato y casi sin costo: un ajuste, una instrucción, una lista de chequeo." } };
const FEAS_WHO = [["Exporter directly", "La exportadora directamente"], ["Through the grower", "A través del productor"], ["Another actor", "Otro actor"], ["No one", "Nadie"]];
const SCALE_KINDS = { relevance: ["exogenous", "actionable", "barrier", "infogap"], feasibility: ["actionable", "barrier", "infogap"] };
function suggestFeasibility(s, langs) { // fills anchors, who could act and kinds of a feasibility scale (1–5), in the file's languages
  const main = langs[0], other = langs.slice(1);
  s.anchors = { ...(FEAS_ANCHORS[main] || FEAS_ANCHORS.en) };
  s.anchorsTr = Object.fromEntries(other.filter(l => FEAS_ANCHORS[l]).map(l => [l, { ...FEAS_ANCHORS[l] }]));
  s.who = FEAS_WHO.map(([en, es], i) => { const w = { id: "w" + (i + 1), name: main === "es" ? es : en, nameTr: {} };
    other.forEach(l => { if (l === "es") w.nameTr.es = es; if (l === "en") w.nameTr.en = en; }); return w; });
  s.kinds = SCALE_KINDS.feasibility.slice();
  return s;
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
  const rel = mk("relevance", "Relevance", "Relevancia", 0, 5, "Not relevant", "No es relevante", "Critical", "Crítico", null);
  rel.anchors = {}; rel.anchorsTr = {}; rel.who = []; rel.kinds = SCALE_KINDS.relevance.slice();
  const feas = suggestFeasibility(mk("feasibility", "Feasibility", "Factibilidad", 1, 5, "Very hard to act on", "Muy difícil de abordar", "Easy to act on", "Fácil de abordar", { scale: "relevance", min: 3 }), langs);
  return [rel, feas];
}
const activeSession = () => (doc.activeSession && doc.sessions.find(x => x.id === doc.activeSession)) || null;
const scaleById = id => doc.scales.find(x => x.id === id);
const scaleRange = sc => Array.from({ length: sc.max - sc.min + 1 }, (_, i) => sc.min + i);
function gradeOf(sess, nodeId, scaleId) { const g = sess.grades[nodeId] && sess.grades[nodeId][scaleId]; return g && typeof g.v === "number" ? g.v : null; }
const dkOf = (sess, nodeId, scaleId) => { const g = sess.grades[nodeId] && sess.grades[nodeId][scaleId]; return g && g.dk ? g.dk : null; };
const whoOf = (sess, nodeId, scaleId) => { const g = sess.grades[nodeId] && sess.grades[nodeId][scaleId]; return g && g.who ? g.who : null; };
const holdsOf = (sess, nodeId) => { const g = sess.grades[nodeId] && sess.grades[nodeId]._holds; return g ? g.v : null; };
const DK = { unknown: { en: "I don't know", es: "No sé" }, notmine: { en: "Not my part of the chain", es: "No es mi parte de la cadena" } };
const HOLDS = { yes: { en: "Yes", es: "Sí" }, no: { en: "No", es: "No" }, dk: { en: "Don't know", es: "No sé" } };
const word = (o, l = curLang()) => (o && (o[l] || o.en)) || "";
function scaleApplies(sc, n) { // the kind of a box decides which scales are asked; boxes without a kind get every scale
  if (!n || !n.kind) return true;
  return sc.kinds && sc.kinds.length ? sc.kinds.includes(n.kind) : !UNGRADED_KINDS.includes(n.kind);
}
const asksHolds = n => !!(n && UNGRADED_KINDS.includes(n.kind) && !doc.scales.some(sc => scaleApplies(sc, n)));
function anchorText(sc, v, l = curLang()) {
  if (!sc || v == null) return "";
  return (l === mainLang() ? (sc.anchors || {})[v] : ((sc.anchorsTr || {})[l] || {})[v]) || (sc.anchors || {})[v] || Object.values(sc.anchorsTr || {}).map(o => o[v]).find(Boolean) || "";
}
const hasAnchors = sc => Object.keys(sc.anchors || {}).length > 0 || Object.values(sc.anchorsTr || {}).some(o => Object.keys(o).length);
const whoName = (sc, id) => { const w = (sc.who || []).find(x => x.id === id); return w ? tx(w, "name") : ""; };
function gateOpen(sess, nodeId, sc) { if (!sc.gate) return true; const v = gradeOf(sess, nodeId, sc.gate.scale); return v != null && v >= sc.gate.min; }
function isDiscussed(sess, D, id) { return sess.discussed.includes(id) || (D.idom.has(id) && D.ancestors(id).some(a => sess.discussed.includes(a))); }
const isGraded = (sess, id) => !!(sess.grades[id] && Object.keys(sess.grades[id]).length);
const fmtClock = sec => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, ss = sec % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(ss).padStart(2, "0"); };
function gradeChipLabel(n) {
  const sess = activeSession(); if (!sess) return null;
  const parts = doc.scales.map(sc => { const v = gradeOf(sess, n.id, sc.id), dk = dkOf(sess, n.id, sc.id); if (v == null && !dk) return null;
    return (tx(sc, "name")[0] || "?").toUpperCase() + (v != null ? v : dk === "notmine" ? "–" : "?") + (gateOpen(sess, n.id, sc) || v == null ? "" : "*"); }).filter(Boolean);
  const h = holdsOf(sess, n.id); if (h) parts.unshift(h === "yes" ? "✓" : h === "no" ? "✗" : "?");
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
function setGrade(nodeId, scaleId, v) { // a number, or null to clear the whole grade (value, don't know and who)
  gradeCommit(sess => {
    const g = sess.grades[nodeId] = sess.grades[nodeId] || {};
    if (v == null) delete g[scaleId]; else { const o = g[scaleId] || {}; delete o.dk; g[scaleId] = { ...o, v, at: nowISO() }; }
    if (!Object.keys(g).length) delete sess.grades[nodeId];
  });
}
function setDontKnow(nodeId, scaleId, reason) { // "unknown" or "notmine"; replaces the value
  gradeCommit(sess => {
    const g = sess.grades[nodeId] = sess.grades[nodeId] || {}, o = g[scaleId] || {};
    delete o.v; g[scaleId] = { ...o, dk: DK[reason] ? reason : "unknown", at: nowISO() };
  });
}
function setWho(nodeId, scaleId, who) {
  gradeCommit(sess => {
    const g = sess.grades[nodeId] = sess.grades[nodeId] || {}, o = g[scaleId] || {};
    if (who) o.who = who; else delete o.who;
    if (o.v == null && !o.dk && !o.who) delete g[scaleId]; else g[scaleId] = { ...o, at: o.at || nowISO() };
    if (!Object.keys(g).length) delete sess.grades[nodeId];
  });
}
function setHolds(nodeId, v) {
  gradeCommit(sess => {
    const g = sess.grades[nodeId] = sess.grades[nodeId] || {};
    if (v) g._holds = { v, at: nowISO() }; else delete g._holds;
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
    if (!scaleApplies(sc, nodeById(selRef))) { toast(t("notAskedKind", kindName(nodeById(selRef).kind), [tx(sc, "name")])); return true; }
    if (!gateOpen(sess, selRef, sc)) { toast(t("gatedNote", tx(scaleById(sc.gate.scale), "name"), sc.gate.min)); return true; }
    setGrade(selRef, sc.id, v);
    const an = anchorText(sc, v); if (an) toast(`${tx(sc, "name")} ${v} · ${an}`, 4500);
    return true;
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
  if (!GRADING || !sess) { bar.hidden = true; renderAnchorPin(); return; }
  const { D } = lastRender, branches = D.top;
  const graded = doc.nodes.filter(n => isGraded(sess, n.id)).length, gradable = doc.nodes.filter(n => !isQ(n)).length;
  const disc = branches.filter(b => isDiscussed(sess, D, b)).length;
  bar.hidden = false;
  bar.innerHTML = `<span class="gb-live" aria-hidden="true">●</span><b>${esc(sess.code)}</b>${sess.role ? `<span class="muted">${esc(sess.role)}</span>` : ""}
    <span class="gb-clock" id="gb-clock" title="${esc(t("clockTip"))}">${fmtClock((Date.now() - Date.parse(sess.t0)) / 1000)}</span><button class="btn small icon" id="gb-reset" title="${esc(t("clockReset"))}" aria-label="${esc(t("clockReset"))}">↺</button>
    <span class="gb-sep"></span><span>${t("gradedOf", graded, gradable)}</span>
    <button class="btn small" id="gb-disc">${t("discussedBranches")} ${disc}/${branches.length} ▾</button>
    ${doc.scales[0] ? `<label class="chk"><input type="checkbox" id="gb-shade"${view.shade ? " checked" : ""}> ${esc(t("shadeBy", tx(doc.scales[0], "name")))}</label>` : ""}
    ${doc.scales.some(hasAnchors) ? `<label class="chk"><input type="checkbox" id="gb-pin"${view.pinAnchors ? " checked" : ""}> ${esc(t("pinAnchors"))}</label>` : ""}
    <button class="btn small primary" id="gb-end">${t("endInterview")}</button>`;
  $("#gb-reset").onclick = () => gradeCommit(x => { x.t0 = nowISO(); }) || toast(t("clockWasReset"));
  $("#gb-disc").onclick = e => { e.stopPropagation(); toggleDiscPop(); };
  $("#gb-shade") && ($("#gb-shade").onchange = e => { view.shade = e.target.checked; saveView(); applyGradeVisuals(); });
  $("#gb-pin") && ($("#gb-pin").onchange = e => { view.pinAnchors = e.target.checked; saveView(); renderAnchorPin(); });
  renderAnchorPin();
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
      ${n.kind ? `<p class="muted small kindline"><b>${esc(kindName(n.kind))}</b> · ${esc(curLang() === "es" ? KINDS[n.kind].hintEs : KINDS[n.kind].hint)}</p>` : ""}
      ${asksHolds(n) ? holdsBlock(sess, n) : ""}
      ${doc.scales.length ? doc.scales.filter(sc => scaleApplies(sc, n)).map(sc => scaleBlock(sess, n, sc)).join("") : `<p class="muted">${esc(t("noScales"))}</p>`}
      ${(() => { const skip = doc.scales.filter(sc => !scaleApplies(sc, n)); return skip.length && !asksHolds(n) ? `<p class="muted small">${esc(t("notAskedKind", kindName(n.kind), skip.map(sc => tx(sc, "name"))))}</p>` : ""; })()}
      <label class="field"><span>${esc(t("whyNote"))}</span><textarea id="g-note" rows="3" placeholder="${esc(t("whyPlaceholder"))}">${esc(sess.notes[n.id] || "")}</textarea></label>
      <label class="chk"><input type="checkbox" id="g-disc"${disc ? " checked" : ""}${coverBy ? " disabled" : ""}> ${esc(coverBy ? t("coveredBy", short(tx(nodeById(coverBy)), 40)) : t("everythingBelow", D.sub(n.id).size))}</label>
      <div class="row"><button class="btn small" id="g-prev">← ${esc(t("prev"))}</button><button class="btn small" id="g-next">${esc(t("next"))} →</button><button class="btn small" id="g-add">＋ ${esc(t("addCauseHere"))}</button></div>
      <p class="muted keys">${t("keysHelp", doc.scales.map(sc => tx(sc, "name")))}</p>
    </div>`;
  const ref = n.id;
  p.querySelectorAll(".scale[data-scale]").forEach(box => {
    const sc = scaleById(box.dataset.scale), line = box.querySelector(".anchor");
    const show = v => { if (!line) return; const cur = gradeOf(activeSession(), ref, sc.id), dk = dkOf(activeSession(), ref, sc.id);
      line.innerHTML = anchorLine(sc, v != null ? v : cur, v == null && dk); };
    box.querySelectorAll("[data-sv]").forEach(b => { b.onclick = () => setGrade(ref, sc.id, +b.dataset.sv);
      b.onmouseenter = b.onfocus = () => show(+b.dataset.sv); b.onmouseleave = b.onblur = () => show(null); });
    box.querySelector("[data-sclear]").onclick = () => setGrade(ref, sc.id, null);
    const q = box.querySelector("[data-sdk]"); if (q) q.onclick = () => box.querySelector(".dkpick").hidden = !box.querySelector(".dkpick").hidden;
    box.querySelectorAll("[data-dk]").forEach(b => b.onclick = () => setDontKnow(ref, sc.id, b.dataset.dk));
    box.querySelectorAll("[data-who]").forEach(b => b.onclick = () => setWho(ref, sc.id, whoOf(activeSession(), ref, sc.id) === b.dataset.who ? null : b.dataset.who));
    const all = box.querySelector("[data-allanc]"); if (all) all.onclick = () => { const l = box.querySelector(".anclist"); l.hidden = !l.hidden; all.textContent = t(l.hidden ? "seeAnchors" : "hideAnchors"); };
  });
  p.querySelectorAll("[data-holds]").forEach(b => b.onclick = () => setHolds(ref, holdsOf(activeSession(), ref) === b.dataset.holds ? null : b.dataset.holds));
  let noteTimer = null;
  $("#g-note").addEventListener("input", e => { clearTimeout(noteTimer); const v = e.target.value; noteTimer = setTimeout(() => {
    const s2 = activeSession(); if (!s2) return; if (v.trim()) s2.notes[ref] = v; else delete s2.notes[ref]; touch(); }, 400); });
  $("#g-disc").onchange = () => toggleDiscussed(ref);
  $("#g-prev").onclick = () => gradeStep(-1); $("#g-next").onclick = () => gradeStep(1); $("#g-add").onclick = quickAdd;
}

function anchorLine(sc, v, dk) {
  if (dk) return `<b>?</b> ${esc(word(DK[dk]))}`;
  if (v == null) return `<span class="muted">${esc(t("hoverAnchor"))}</span>`;
  const a = anchorText(sc, v); return a ? `<b>${v}</b> ${esc(a)}` : `<span class="muted">${v}</span>`;
}
function scaleBlock(sess, n, sc) { // one scale in the grading panel: who could act, the values, don't know, the anchor of the value
  const cur = gradeOf(sess, n.id, sc.id), dk = dkOf(sess, n.id, sc.id), who = whoOf(sess, n.id, sc.id);
  const open = gateOpen(sess, n.id, sc), gs = sc.gate && scaleById(sc.gate.scale), anc = hasAnchors(sc);
  return `<div class="scale" data-scale="${esc(sc.id)}"><div class="sc-head"><b>${esc(tx(sc, "name"))}</b><span class="sc-ends">${sc.min} ${esc(tx(sc, "low"))} · ${sc.max} ${esc(tx(sc, "high"))}</span></div>
    ${sc.who.length ? `<div class="sc-who"><span class="muted small">${esc(t("whoAct"))}</span><div class="seg small wrap">${sc.who.map(w => `<button type="button" data-who="${esc(w.id)}" aria-pressed="${who === w.id}"${open ? "" : " disabled"}>${esc(tx(w, "name"))}</button>`).join("")}</div></div>` : ""}
    <div class="sc-btns">${scaleRange(sc).map(v => `<button type="button" data-sv="${v}" aria-pressed="${cur === v}"${open ? "" : " disabled"}${anc ? ` title="${esc(anchorText(sc, v))}"` : ""}>${v}</button>`).join("")}<button type="button" class="sc-dk" data-sdk aria-pressed="${!!dk}" title="${esc(t("dkTip"))}" aria-label="${esc(t("dkTip"))}"${open ? "" : " disabled"}>?</button><button type="button" class="sc-clear" data-sclear title="${esc(t("clearGrade"))}" aria-label="${esc(t("clearGrade"))}"${cur == null && !dk && !who ? " disabled" : ""}>×</button></div>
    <div class="dkpick seg small" ${dk ? "" : "hidden"}>${Object.keys(DK).map(k => `<button type="button" data-dk="${k}" aria-pressed="${dk === k}">${esc(word(DK[k]))}</button>`).join("")}</div>
    ${anc ? `<p class="anchor">${anchorLine(sc, cur, dk)}</p><button type="button" class="linkbtn small" data-allanc>${esc(t("seeAnchors"))}</button>
      <ol class="anclist" hidden>${scaleRange(sc).filter(v => anchorText(sc, v)).map(v => `<li value="${v}">${esc(anchorText(sc, v))}</li>`).join("")}</ol>` : ""}
    ${!open && gs ? `<p class="muted small">${esc(t("gatedNote", tx(gs, "name"), sc.gate.min))}</p>` : ""}
    ${(cur != null || dk) && !open ? `<p class="ckwarn small">${esc(t("gatedOut"))}</p>` : ""}</div>`;
}
function holdsBlock(sess, n) {
  const h = holdsOf(sess, n.id);
  return `<div class="scale holds"><div class="sc-head"><b>${esc(t("holdsQ"))}</b></div>
    <div class="seg small">${Object.keys(HOLDS).map(k => `<button type="button" data-holds="${k}" aria-pressed="${h === k}">${esc(word(HOLDS[k]))}</button>`).join("")}</div></div>`;
}
function renderAnchorPin() { // the anchors of every scale, pinned on the canvas so a screen-shared interviewee can read them
  const box = $("#anchorpin"); if (!box) return;
  const scs = GRADING && view.pinAnchors && activeSession() ? doc.scales.filter(hasAnchors) : [];
  box.hidden = !scs.length; if (!scs.length) { box.innerHTML = ""; return; }
  box.innerHTML = scs.map(sc => `<div><b>${esc(tx(sc, "name"))}</b>${sc.who.length ? `<p class="muted small">${esc(t("whoFirst"))}</p>` : ""}<ol>${scaleRange(sc).filter(v => anchorText(sc, v)).map(v => `<li value="${v}">${esc(anchorText(sc, v))}</li>`).join("")}</ol></div>`).join("");
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
    <div class="srow kinds"><span class="lab">For boxes of kind</span>${Object.entries(KINDS).map(([k, x]) => `<label class="chk"><input type="checkbox" data-i="${i}" data-f="kind" value="${k}"${(sc.kinds || []).includes(k) ? " checked" : ""}> ${esc(x.name)}</label>`).join("")}
      <span class="muted small">None ticked: every kind except mechanisms and constraints. Boxes without a kind always get it.</span></div>
    <details class="srow-d"${Object.keys(sc.anchors || {}).length ? "" : ""}><summary>What each value means (anchors) · ${Object.keys(sc.anchors || {}).length} of ${sc.max - sc.min + 1}</summary>
      ${Array.from({ length: Math.max(0, sc.max - sc.min + 1) }, (_, k) => sc.min + k).map(v => `<div class="srow"><span class="lab">${v}</span><input type="text" data-i="${i}" data-f="anchor" data-v="${v}" value="${esc((sc.anchors || {})[v] || "")}" placeholder="What ${v} means">${L.slice(1).map(l => `<label class="trin"><b>${esc(l.toUpperCase())}</b><input type="text" data-i="${i}" data-f="anchor" data-v="${v}" data-trl="${esc(l)}" value="${esc(((sc.anchorsTr || {})[l] || {})[v] || "")}"></label>`).join("")}</div>`).join("")}
    </details>
    <details class="srow-d"><summary>Ask first who could act on it · ${(sc.who || []).length ? (sc.who || []).length + " options" : "not asked"}</summary>
      <div class="srow"><textarea data-i="${i}" data-f="who" rows="4" placeholder="One option per line, e.g. Exporter directly">${esc((sc.who || []).map(w => w.name).join("\n"))}</textarea>${L.slice(1).map(l => `<label class="trin"><b>${esc(l.toUpperCase())}</b><textarea data-i="${i}" data-f="who" data-trl="${esc(l)}" rows="4">${esc((sc.who || []).map(w => (w.nameTr || {})[l] || "").join("\n"))}</textarea></label>`).join("")}</div>
    </details>
    ${sc.max - sc.min === 4 ? `<div class="srow"><button type="button" class="btn small" data-ssug="${i}">Use the suggested feasibility setup</button><span class="muted small">Anchors on cost, time and whether the means exist, who could act, and actionable, barrier and information-gap boxes only.</span></div>` : ""}
  </div>`).join("");
}
$("#scale-rows").addEventListener("input", e => {
  const el = e.target, i = +el.dataset.i, f = el.dataset.f; if (!f) return; const sc = scaleDraft[i];
  if (f === "anchor") { const v = el.dataset.v, l = el.dataset.trl;
    if (l) { sc.anchorsTr = sc.anchorsTr || {}; sc.anchorsTr[l] = sc.anchorsTr[l] || {}; sc.anchorsTr[l][v] = el.value.trim(); } else { sc.anchors = sc.anchors || {}; sc.anchors[v] = el.value.trim(); }
    return; }
  if (f === "who") { const lines = el.value.split("\n").map(x => x.trim()), l = el.dataset.trl; sc.who = sc.who || [];
    if (l) lines.forEach((x, k) => { if (sc.who[k]) { sc.who[k].nameTr = sc.who[k].nameTr || {}; if (x) sc.who[k].nameTr[l] = x; else delete sc.who[k].nameTr[l]; } });
    else { const old = sc.who; sc.who = lines.filter(Boolean).map((x, k) => ({ id: "w" + (k + 1), name: x, nameTr: (old[k] || {}).nameTr || {} })); }
    return; }
  if (f === "kind") return;
  if (el.dataset.trl) { sc[f + "Tr"] = sc[f + "Tr"] || {}; sc[f + "Tr"][el.dataset.trl] = el.value.trim(); return; }
  if (f === "min" || f === "max") { sc[f] = Math.round(+el.value); const card = el.closest(".scard"); card.querySelector(".lab-" + f).textContent = `${sc[f]} means`; return; }
  if (f === "gmin") { if (sc.gate) sc.gate.min = Math.round(+el.value); return; }
  if (f !== "gate") sc[f] = el.value;
});
$("#scale-rows").addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.f === "kind") { const sc = scaleDraft[+el.dataset.i]; sc.kinds = [...el.closest(".kinds").querySelectorAll("input:checked")].map(x => x.value); return; }
  if (el.dataset.f === "gate") { const sc = scaleDraft[+el.dataset.i]; const o = scaleDraft.find(x => x.id === el.value);
    sc.gate = el.value ? { scale: el.value, min: sc.gate ? sc.gate.min : Math.ceil((o.min + o.max) / 2) } : null; drawScales(); }
});
$("#scale-rows").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.sdel !== undefined) { const i = +b.dataset.sdel, id = scaleDraft[i].id; scaleDraft.splice(i, 1); scaleDraft.forEach(x => { if (x.gate && x.gate.scale === id) x.gate = null; }); drawScales(); }
  if (b.dataset.ssug !== undefined) { const sc = scaleDraft[+b.dataset.ssug]; const keep = { min: sc.min, max: sc.max };
    if (Object.keys(sc.anchors || {}).length && !confirm("Replace this scale's anchors and who-could-act options with the suggested ones?")) return;
    suggestFeasibility(sc, doc.languages); if (keep.min !== 1) { const sh = keep.min - 1; const mv = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [+k + sh, v]));
      sc.anchors = mv(sc.anchors); Object.keys(sc.anchorsTr).forEach(l => sc.anchorsTr[l] = mv(sc.anchorsTr[l])); }
    drawScales(); return; }
  if (b.dataset.sup !== undefined) { const i = +b.dataset.sup; [scaleDraft[i - 1], scaleDraft[i]] = [scaleDraft[i], scaleDraft[i - 1]]; drawScales(); }
});
$("#scale-add").onclick = () => { scaleDraft.push({ id: uid("s"), name: "", nameTr: {}, min: 1, max: 5, low: "", lowTr: {}, high: "", highTr: {}, gate: null, anchors: {}, anchorsTr: {}, kinds: [], who: [] }); drawScales(); };
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
        Object.assign(r, { category: catById(n.cat).name, kind: n.kind ? KINDS[n.kind].name : "", causes_combine: n.logic ? LOGIC[n.logic].name : "", tags: orderedTags(n.tags || []).map(x => x.name).join(" | "),
          branch: br ? (nodeById(br) || {}).text || "" : "(trunk)", level: A.depth.get(n.id) || "",
          in_diagram_at_start: shown ? "yes" : "no", added_in_interview: added ? "yes" : "no", branch_discussed: disc ? "yes" : "no" });
        const h = sess.grades[n.id] && sess.grades[n.id]._holds;
        r.holds = h ? HOLDS[h.v].en.toLowerCase() : asksHolds(n) ? "" : "not asked";
        d.scales.forEach(sc => {
          const g = sess.grades[n.id] && sess.grades[n.id][sc.id], open = gateOpen(sess, n.id, sc), asked = scaleApplies(sc, n);
          const has = g && (typeof g.v === "number" || g.dk);
          r[sc.id] = g && typeof g.v === "number" ? g.v : "";
          r[sc.id + "_state"] = !asked ? `not asked (${KINDS[n.kind].name.toLowerCase()})` : has ? (g.dk ? (g.dk === "notmine" ? "not my part of the chain" : "don't know") : open ? "graded" : "gated out")
            : (!shown && !added) ? "not in diagram" : !disc ? "not discussed" : (sc.gate && !open) ? "gated out" : "not graded (branch discussed)";
          r[sc.id + "_who"] = g && g.who ? (sc.who.find(w => w.id === g.who) || { name: g.who }).name : "";
          r[sc.id + "_minute"] = g && g.at ? fmtClock((Date.parse(g.at) - Date.parse(sess.t0)) / 1000) : "";
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
  const cols = ["interview", "role", "date", "interview_language", "box_id", ...langs.map(l => "text_" + l), "category", "kind", "causes_combine", "tags", "branch", "level",
    "in_diagram_at_start", "added_in_interview", "branch_discussed", "holds", ...scales.flatMap(sc => [sc.id, sc.id + "_state", ...(sc.who && sc.who.length ? [sc.id + "_who"] : []), sc.id + "_minute"]), "note", "interview_memo"];
  const head = cols.map(c => { const sc = scales.find(x => x.id === c || x.id + "_state" === c || x.id + "_who" === c || x.id + "_minute" === c);
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
