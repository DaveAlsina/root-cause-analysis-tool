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
    publishedDoc, encodeShare, decodeShare, setGrade, setDontKnow, setWho, setHolds, defaultScales, normScale, activeSession, interviewRows, rowsToCSV, setGrading, toggleDiscussed, gradeStep, makeMainLang, translatePass, normalizeDoc, loadText, get VIEWER() { return VIEWER; } };
})();
