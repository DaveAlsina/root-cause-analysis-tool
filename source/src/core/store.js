/* ================= Document state, undo, autosave ================= */
/* The app supplies: snap(), restoreCore(s), coreOf(d), render(opts), renderPanel(), updateChrome(full),
   pruneSelection(), findEditable(ref). */
let doc = null;
let fileHandle = null, fileName = "uchuva-rca.json", dirty = false;
const undoStack = [], redoStack = [];
let VIEWER = false; // read-only viewer for published diagrams

function mkVersion(d, name, note) { return { id: uid("v"), name, note: note || "", at: nowISO(), snapshot: clone(coreOf(d)) }; }

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

/* panel text fields: commit after a pause in typing, keeping focus */
let fieldTimer = null, fieldPending = null;
function fieldEdit(ref, apply) { fieldPending = { ref, apply }; clearTimeout(fieldTimer); fieldTimer = setTimeout(() => flushField(), 700); }
function flushField(inCommit) {
  clearTimeout(fieldTimer);
  if (!fieldPending) return;
  const { ref, apply } = fieldPending; fieldPending = null;
  const n = findEditable(ref); if (!n) return;
  const tmp = clone(n); apply(tmp);
  if (JSON.stringify(tmp) === JSON.stringify(n)) return;
  pushUndo(snap()); apply(n); touch();
  if (!inCommit) render({ skipPanel: true });
}
