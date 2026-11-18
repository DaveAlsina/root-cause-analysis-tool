/* ================= Files: open and save ================= */
/* The app supplies: loadText(text, name, handle), and FILE_* names in its config. */
const FSA = "showOpenFilePicker" in window;

async function openFile() {
  if (dirty && !confirm("You have unsaved changes. Open another file anyway? (They stay recoverable only until the new file is edited.)")) return;
  if (FSA) {
    try {
      const [h] = await window.showOpenFilePicker({ types: [FILE_OPEN_TYPE] });
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
      const h = await window.showSaveFilePicker({ suggestedName: fileName, types: [{ description: FILE_DESC, accept: { "application/json": [".json"] } }] });
      const w = await h.createWritable(); await w.write(docText()); await w.close();
      fileHandle = h; fileName = h.name; dirty = false; fileNeedsGesture = false; fileSavedAt = new Date(); updateChrome(); autosave(); toast(`Saved to ${h.name}. Later changes are saved to it automatically.`); return;
    } catch (e) { if (e.name === "AbortError") return; }
  }
  download(fileName, docText(), "application/json");
  dirty = false; updateChrome(); autosave();
  toast(`Downloaded ${fileName}. Replace your old copy with it.`, 4500);
}
