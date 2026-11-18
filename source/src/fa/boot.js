/* ================= Three modes in one file: the system map, the goals and the function analysis ================= */
const NAV_OF = { system: "system", goals: "goals", functions: "fa" };
function setMode(m) {
  m = NAV_OF[m] ? m : "functions";
  try { if (location.hash !== "#" + m) history.replaceState(null, "", "#" + m); } catch (e) {}
  drawModeNav(NAV_OF[m]);
  if (view.mode === m) return Promise.resolve();
  flushField(true);
  view.mode = m; saveView();
  selId = selFlow = null; multi = []; hoverId = null; sysEditing = false;
  $("#inline").hidden = true; $("#verbs").hidden = true;
  return render({ fit: true });
}
window.addEventListener("hashchange", () => { if (/^#(system|goals|functions)$/.test(location.hash)) setMode(location.hash.slice(1)); });
$("#modeseg").addEventListener("click", e => { const b = e.target.closest("[data-mode]"); if (b) setMode(b.dataset.mode); });

/* ================= Menu actions & keyboard ================= */
const ACTIONS = {
  open: openFile, save: () => saveFile(false), saveas: () => saveFile(true), new: openNew,
  example: () => { if (dirty && !confirm("You have unsaved changes. Open the example anyway?")) return; setDoc(sampleDoc(), "example-function-analysis.json", null); },
  bib: loadBib, tags: () => openTags(), langs: openLangs, versions: openVersions, variants: openVariants, flowtypes: openFlowTypes, "link-rca": linkRCA,
  "unlink-rca": () => { if (doc.rca && confirm("Forget the linked RCA? Functions keep the ids of the causes they point to.")) commit(() => { doc.rca = null; }); },
  "exp-svg": () => { if (view.mode === "goals") { download(`${baseName()}-goals-${slug(treeName(curTree()) || "tree").toLowerCase()}.svg`, exportGoalsSVG().svg, "image/svg+xml"); return toast("SVG exported: the goals tree on screen, with scores and relevance."); }
    if (view.mode === "system") { download(`${baseName()}-system.svg`, exportSystemSVG().svg, "image/svg+xml"); return toast("SVG exported: the system map as it is on screen, with the boundary in focus."); }
    download(`${baseName()}-${variantSlug()}.svg`, exportSVG().svg, "image/svg+xml"); toast("SVG exported. It shows the open variant as it is on screen."); },
  "exp-elements": exportElementsCSV, "exp-goals": exportGoalsCSV, levels: openLevels, "sys-group": groupSelection,
  "exp-png": exportPNG, "exp-json": () => download(fileName, docText(), "application/json"),
  "exp-functions": () => exportCSV("functions"), "exp-flows": () => exportCSV("flows"), "exp-morph": () => exportCSV("morph"),
  arrange: autoArrange, undo, redo, help: () => ($("#m-help").hidden = false),
};
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
  const V = curVar();
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelection(); }
  else if (e.key === "Tab" && selId && fnById(selId) && view.mode === "functions") { e.preventDefault(); addSubfunction(selId); }
  else if (e.key === "Enter" && (selId || selFlow) && view.mode !== "goals") { e.preventDefault(); inlineEdit(selFlow || selId, false, selFlow ? { flow: true } : {}); }
  else if (view.mode === "goals") {
    const g = selId && (selId === GOAL_ROOT || inTree(selId));
    if (e.key === "Tab" && g) { e.preventDefault(); addGoal(selId); }
    else if (e.key === "Enter" && g) { e.preventDefault(); inlineEdit(selId, false); }
    else if (/^[0-5]$/.test(k) && g && selId !== GOAL_ROOT) scoreSelected(+k || null);
    else if (e.key === "Escape") clearSelection(); else if (e.key === "?") $("#m-help").hidden = false;
  }
  else if (view.mode === "system") { if (k === "g") groupSelection(); else if (e.key === "Escape") { if (sysEditing) { sysEditing = false; applyFocus(); } else clearSelection(); } else if (e.key === "?") $("#m-help").hidden = false; }
  else if (k === "r" && selFlow) reverseFlow(selFlow);
  else if (k === "k" && selId && fnById(selId)) commit(() => { const f = fnById(selId); f.key = !f.key; });
  else if (k === "a" && selId && fnById(selId) && selId !== V.root) commit(() => { const f = fnById(selId); f.kind = f.kind === "aux" ? "main" : "aux"; });
  else if (/^[0-9]$/.test(k)) { const md = maxDepth(V); view.depth = k === "0" ? "0" : +k >= md ? "all" : k; saveView(); render({ fit: true }); }
  else if (e.key === "?") $("#m-help").hidden = false;
  else if (e.key === "Escape") clearSelection();
});
window.addEventListener("beforeunload", e => { if (dirty) { autosave(); e.preventDefault(); e.returnValue = ""; } });

/* ================= Boot ================= */
function initCy() {
  cy = cytoscape({ container: $("#cy"), elements: [], style: styleSheet(), minZoom: .08, maxZoom: 3,
    boxSelectionEnabled: false, autounselectify: true, selectionType: "single" });
  const additive = e => e.originalEvent && (e.originalEvent.shiftKey || e.originalEvent.metaKey || e.originalEvent.ctrlKey);
  cy.on("tap", "node", e => {
    const n = e.target; if (n.hasClass("badge")) return;
    if (view.mode === "system") {
      if (n.hasClass("stage")) { const t = n.data("tag"); view.tagFilter.has(t) ? view.tagFilter.delete(t) : view.tagFilter.add(t); renderTagbar(); applyTagFilter(); return; }
      if (sysFocus && sysEditing) { // clicks change who is inside the boundary
        if (n.hasClass("elem")) return toggleMembers([n.id()]);
        if (n.hasClass("grp")) return toggleMembers(n.children(".elem").map(c => c.id()));
        if (n.hasClass("ringlabel")) { const lv = n.id().slice(4); return toggleMembers(allAps().filter(x => x.ap.level === lv).map(x => x.ap.id)); }
      }
      if (n.hasClass("ringlabel")) return;
    }
    selectItem(n.id(), additive(e));
  });
  cy.on("tap", "edge", e => selectFlow(e.target.id()));
  cy.on("tap", e => { if (e.target === cy) clearSelection(); });
  cy.on("dbltap", "node", e => {
    const n = e.target; if (n.hasClass("badge")) return;
    if (view.mode === "system") { if (n.hasClass("ringlabel")) return openLevels(); if (n.hasClass("elem") || n.hasClass("grp")) inlineEdit(n.id(), false); return; }
    if (view.mode === "goals") return inlineEdit(n.id(), false);
    const bb = n.boundingBox({ includeLabels: false });
    if (n.isParent() && e.position.y > bb.y1 + 4) return addFunctionAt(e.position.x, e.position.y, n.id()); // inside an open box: a new subfunction there
    // an empty boundary: double-click adds the first function (in the black-box view it renames the overall function)
    if (n.hasClass("root") && !n.isParent() && view.depth !== "0") return addFunctionAt(e.position.x, e.position.y, n.id());
    inlineEdit(n.id(), false);
  });
  cy.on("dbltap", "edge", e => inlineEdit(e.target.id(), false, { flow: true }));
  cy.on("dbltap", e => { if (e.target !== cy) return; if (view.mode === "system") addElementAt(e.position.x, e.position.y); else if (view.mode === "goals") addGoal(GOAL_ROOT); else addExternalAt(e.position.x, e.position.y); });
  cy.on("mouseover", "node", e => { if (e.target.hasClass("badge") || view.mode !== "functions") return; clearTimeout(hoverTimer); hoverId = e.target.id(); updateOverlays(); });
  cy.on("mouseout", "node", () => { clearTimeout(hoverTimer); hoverTimer = setTimeout(() => { hoverId = null; updateOverlays(); }, 450); });
  cy.on("viewport position", () => updateOverlays());
  cy.on("viewport", () => { if (view.mode === "system" && sysFocus) syncContour(); });
  let dragSnap = null, dragStart = null;
  cy.on("grab", "node", () => { dragSnap = snap(); dragStart = new Map(cy.nodes().map(n => [n.id(), { ...n.position() }])); });
  cy.on("free", "node", e => {
    if (!dragSnap) return;
    if (view.mode === "goals") { // dropped onto another goal: it moves under that one; anywhere else it springs back
      const n = e.target, p = n.position(), id = n.id(); dragSnap = null; dragStart = null;
      const T = curTree(), on = cy.nodes(".goal, .groot").filter(m => m.id() !== id && !goalPath(T, m.id()).includes(id) && (() => { const b = m.boundingBox({ includeLabels: false }); return p.x >= b.x1 && p.x <= b.x2 && p.y >= b.y1 && p.y <= b.y2; })());
      if (on.nonempty()) return setGoalParent(id, on[0].id());
      return render({ skipPanel: true });
    }
    let moved = false;
    cy.nodes().forEach(n => { if (n.isParent() || n.hasClass("badge")) return; const a = dragStart.get(n.id()), b = n.position();
      if (!a || (Math.abs(a.x - b.x) < .5 && Math.abs(a.y - b.y) < .5)) return; moved = true; moveItem(n.id(), b.x - a.x, b.y - a.y, b); });
    if (moved) { pushUndo(dragSnap); touch(); render({ skipPanel: true }); }
    dragSnap = null; dragStart = null;
  });
  const h = $("#handle");
  h.addEventListener("mouseenter", () => clearTimeout(hoverTimer));
  h.addEventListener("mouseleave", () => { hoverTimer = setTimeout(() => { hoverId = null; updateOverlays(); }, 450); });
  h.addEventListener("pointerdown", e => startDrag("connect", e, { id: h.dataset.id }));
  $("#grip-s").addEventListener("pointerdown", e => startDrag("rewire-source", e, { edge: $("#grip-s").dataset.edge }));
  $("#grip-t").addEventListener("pointerdown", e => startDrag("rewire-target", e, { edge: $("#grip-t").dataset.edge }));
  $("#grip-m").addEventListener("pointerdown", e => startShapeDrag("bend", e));
  $("#grip-l").addEventListener("pointerdown", e => startShapeDrag("label", e));
  $("#grip-w").addEventListener("pointerdown", e => { if (e.detail < 2) startWidthDrag(e); });
  $("#grip-w").addEventListener("dblclick", () => selId && setBoxWidth(selId, null));
  let ro = null;
  new ResizeObserver(() => { cancelAnimationFrame(ro); ro = requestAnimationFrame(() => { cy.resize(); updateOverlays(); }); }).observe($("#cy"));
  $("#side-close").onclick = () => openSide(false);
  $("#side-open").onclick = () => openSide(true);
  const restyle = () => { cy.style(styleSheet()); render({ skipPanel: true }); };
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", restyle);
  new MutationObserver(restyle).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}

(async function boot() {
  try { await Promise.all([document.fonts.load(`${FONT_PX}px "IBM Plex Sans"`), document.fonts.load(`600 12px "IBM Plex Sans Condensed"`)]); } catch (e) {}
  initCy();
  let d = null, restored = false;
  const saved = lsGet(LS_DOC);
  if (saved) { try { d = normalizeDoc(JSON.parse(saved)); restored = true; } catch (e) { d = null; } }
  let fmeta = {}; try { fmeta = JSON.parse(lsGet(LS_FILE) || "{}"); } catch (e) {}
  document.body.classList.toggle("sys", view.mode === "system"); document.body.classList.toggle("goals", view.mode === "goals"); drawModeNav(NAV_OF[view.mode] || "fa");
  doc = d || sampleDoc(); fileName = restored ? fmeta.fileName || "function-analysis.json" : "example-function-analysis.json"; dirty = restored ? !!fmeta.dirty : false;
  await render({ fit: true });
  if (restored) toast("Picked up where you left off. Use File → Open to load a different file.", 4200);
  else { openNew(); toast("Behind this dialog is a small worked example. Cancel to explore it, or create your own.", 6000); }
  window.__fa = { get doc() { return doc; }, render, cy: () => cy, view, commit, curVar, fnById, flowById, extById, methodSteps, verbOK, normalizeDoc, loadText, setDoc, sampleDoc,
    exportSVG, computeView, depthOf, addFunctionAt, addExternalAt, addFlow, addSubfunction, setParent, deleteSelection, selectItem, selectFlow, switchVariant,
    duplicateVariant, autoArrange, setFlowShape, resetFlowShape, setFlowEnd, setBoxWidth, startShapeDrag, geoStyle, anchorOn, dashPattern, spreadParallelLabels, applyRCALink, exportCSV, verbSuggestions, setMode, get mode() { return view.mode; }, elById, apById, elOf, allAps, apLabel, addAppearance, splitAppearance, mergeElements, sameNameSets, deleteElements, placeAt, elPos, ringGeom, addElementAt, focusBoundary, toggleMembers,
    systemChecks, exportSystemSVG, goalResults, goalScore, goalSensitivity, goalLeaves, leafRanks, fnRelevance, goalChecks, combine, curTree, treeForVariant, addGoal, setScore, setGoalParent, removeGoals, startTree, switchTree, addStakeholder, exportGoalsSVG, exportGoalsCSV, goalById, GOAL_ROOT, get scorer() { return view.scorer; }, set scorer(v) { view.scorer = v; }, exportElementsCSV, groupSelection, newBoundary, boundaryContour, get sysFocus() { return sysFocus; }, get sysEditing() { return sysEditing; }, makeMainLang, translatePass, parseBib, setBib, inlineEdit, get selId() { return selId; }, get selFlow() { return selFlow; } };
})();
