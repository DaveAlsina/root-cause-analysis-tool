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
