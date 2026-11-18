/* ================= Versions ================= */
/* The app supplies: diffCores(a, b), chgLine(d), versionSize(snapshot), versionCompare(version, diff, box). */

function openVersions() {
  flushField(true);
  const list = $("#ver-list"); const vs = doc.versions.slice().reverse();
  list.innerHTML = vs.length ? vs.map(v => {
    const i = doc.versions.indexOf(v); const prev = doc.versions[i - 1];
    const d = prev ? diffCores(prev.snapshot, v.snapshot) : null;
    return `<div class="ver"><span class="nm">${esc(v.name)}</span>
      <span class="meta">${fmtDate(v.at)} · ${versionSize(v.snapshot)} ${d ? "· " + chgLine(d) : ""}</span>
      ${v.note ? `<span class="nt">${esc(v.note)}</span>` : ""}
      <span class="acts"><button class="btn small" data-vcmp="${v.id}">Compare with now</button><button class="btn small" data-vres="${v.id}">Restore</button><button class="btn small icon" data-vdel="${v.id}" title="Delete this version" aria-label="Delete version">×</button></span></div>`;
  }).join("") : `<p class="muted" style="padding:12px">No versions yet.</p>`;
  $("#ver-diff").hidden = true;
  $("#m-versions").hidden = false; $("#ver-name").focus();
}
$("#ver-form").onsubmit = e => {
  e.preventDefault();
  const name = $("#ver-name").value.trim(); if (!name) return;
  doc.versions.push(mkVersion(doc, name, $("#ver-note").value.trim()));
  $("#ver-name").value = ""; $("#ver-note").value = "";
  touch(); openVersions(); toast(`Version “${name}” saved in the file. Press Ctrl S to write it to disk.`, 4500);
};
$("#ver-list").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.vdel) {
    const v = doc.versions.find(x => x.id === b.dataset.vdel);
    if (v && confirm(`Delete the version “${v.name}”? This cannot be undone.`)) { doc.versions = doc.versions.filter(x => x !== v); touch(); openVersions(); }
  }
  if (b.dataset.vres) {
    const v = doc.versions.find(x => x.id === b.dataset.vres); if (!v) return;
    commit(() => { restoreCore(JSON.stringify(v.snapshot)); pruneSelection(); }, { animate: true });
    $("#m-versions").hidden = true; toast(`Restored “${v.name}”. Ctrl Z brings back what you had.`, 4500);
  }
  if (b.dataset.vcmp) {
    const v = doc.versions.find(x => x.id === b.dataset.vcmp); if (!v) return;
    const d = diffCores(v.snapshot, coreOf(doc));
    const box = $("#ver-diff"); box.hidden = false;
    versionCompare(v, d, box);
    box.scrollIntoView({ block: "nearest" });
  }
});
