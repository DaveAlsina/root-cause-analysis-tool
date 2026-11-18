/* ================= New function analysis: starts with the boundary ================= */
function openNew() {
  if (dirty && !confirm("You have unsaved changes. Start a new function analysis anyway?")) return;
  $("#new-main").innerHTML = Object.keys(LANG_NAMES).map(l => `<option value="${l}">${esc(langName(l))}</option>`).join("");
  $("#new-main").value = "en"; drawNewExtra();
  ["#new-title", "#new-variant", "#new-root", "#new-boundary"].forEach(s => ($(s).value = ""));
  $("#m-new").hidden = false; $("#new-title").focus();
}
function drawNewExtra() {
  const main = $("#new-main").value;
  $("#new-extra").innerHTML = Object.keys(LANG_NAMES).filter(l => l !== main).map(l => `<label class="chk"><input type="checkbox" value="${l}"> ${esc(langName(l))}</label>`).join("");
}
$("#new-main").onchange = drawNewExtra;
function flowTypesFor(langs) { // the default types, named in the main language
  return clone(DEFAULT_FLOW_TYPES).map(t => { const en = t.name, es = t.nameTr.es; t.nameTr = {};
    if (langs[0] === "es") { t.name = es; if (langs.includes("en")) t.nameTr.en = en; } else if (langs.includes("es")) t.nameTr.es = es; return t; });
}
$("#new-form").onsubmit = e => {
  e.preventDefault();
  const langs = [$("#new-main").value, ...$$("#new-extra input:checked").map(i => i.value)], es = langs[0] === "es";
  const d = emptyDoc(); d.languages = langs;
  d.title = $("#new-title").value.trim() || (es ? "Nuevo análisis funcional" : "New function analysis");
  d.tagGroups = groupsFor(langs); d.flowTypes = flowTypesFor(langs);
  const root = newFunction($("#new-root").value.trim() || (es ? "Función global" : "Overall function"));
  const V = newVariant($("#new-variant").value.trim() || (es ? "Variante A" : "Variant A"), root.id);
  V.boundary = $("#new-boundary").value.trim();
  d.functions = [root]; d.variants = [V]; d.activeVariant = V.id;
  d.system = defaultSystem(langs);
  d.versions = [mkVersion(d, "Started", "")];
  $("#m-new").hidden = true;
  setDoc(d, "function-analysis.json", null); view.lang = null; view.depth = "all";
  toast("Double-click inside the boundary to add the first subfunction, outside it for an external.", 5000);
};

/* ================= Variants ================= */
function openVariants() { drawVariants(); $("#m-variants").hidden = false; }
function drawVariants() {
  const cur = curVar();
  $("#var-rows").innerHTML = doc.variants.map(v => {
    const S = flowSides(v);
    return `<div class="varrow${v.id === cur.id ? " cur" : ""}">
      <input type="text" data-vname="${esc(v.id)}" value="${esc(v.name)}" aria-label="Variant name">
      <span class="vmeta">${esc(tx(fnById(v.root)))} · ${Object.keys(v.placed).length} functions · ${v.flows.length} flows (${S.inputs.length} in, ${S.outputs.length} out)${tx(v, "boundary") ? `<br><i>${esc(tx(v, "boundary"))}</i>` : ""}</span>
      <span class="catacts">${v.id === cur.id ? `<span class="pill">open</span>` : `<button class="btn small" data-vopen="${esc(v.id)}">Open</button>`}
        <button class="btn small" data-vdup="${esc(v.id)}">Duplicate</button>
        <button class="btn small icon danger" data-vdel="${esc(v.id)}" title="Delete variant" aria-label="Delete variant"${doc.variants.length < 2 ? " disabled" : ""}>×</button></span></div>`;
  }).join("");
  $("#var-root").innerHTML = `<option value="__dup">A copy of “${esc(tx(cur, "name"))}”</option><option value="__same">Empty, same overall function (${esc(tx(fnById(cur.root)))})</option>` +
    doc.functions.filter(f => f.id !== cur.root && doc.variants.some(v => v.root === f.id)).map(f => `<option value="${esc(f.id)}">Empty, overall function “${esc(tx(f))}”</option>`).join("") +
    `<option value="__new">Empty, with a new overall function…</option>`;
  $("#var-newroot").hidden = true;
  $("#var-sysb").innerHTML = `<option value="">No system boundary</option>` + doc.system.boundaries.map(b => `<option value="${esc(b.id)}"${b.id === cur.systemBoundary ? " selected" : ""}>Inside “${esc(tx(b, "name"))}”</option>`).join("");
  $("#var-sysb").hidden = !doc.system.boundaries.length;
}
$("#var-root").onchange = e => { $("#var-newroot").hidden = e.target.value !== "__new"; if (e.target.value === "__new") $("#var-newroot").focus(); };
function duplicateVariant(v, name) {
  const c = clone(v); c.id = uid("v"); c.name = name; c.nameTr = {}; c.steps = {};
  const map = new Map(c.externals.map(x => [x.id, uid("x")]));
  c.externals.forEach(x => { x.id = map.get(x.id); });
  c.flows.forEach(l => { l.id = uid("l"); l.source = map.get(l.source) || l.source; l.target = map.get(l.target) || l.target; });
  return c;
}
$("#var-rows").addEventListener("change", e => {
  const id = e.target.dataset.vname; if (!id) return;
  const v = e.target.value.trim(); if (!v) return;
  commit(() => { varById(id).name = v; }).then(drawVariants);
});
$("#var-rows").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.vopen) { $("#m-variants").hidden = true; switchVariant(b.dataset.vopen); }
  if (b.dataset.vdup) { const v = varById(b.dataset.vdup), c = duplicateVariant(v, `${v.name} (copy)`);
    commit(() => { doc.variants.push(c); doc.activeVariant = c.id; selId = selFlow = null; multi = []; }, { fit: true }).then(drawVariants);
    toast("Duplicated. Change its boundary or structure; the functions are shared, so their notes stay in one place."); }
  if (b.dataset.vdel) { const v = varById(b.dataset.vdel);
    if (!confirm(`Delete the variant “${v.name}”? Its functions stay in the catalogue. Ctrl Z brings it back.`)) return;
    commit(() => { doc.variants = doc.variants.filter(x => x !== v); if (doc.activeVariant === v.id) doc.activeVariant = doc.variants[0].id; selId = selFlow = null; multi = []; }, { fit: true }).then(drawVariants); }
});
$("#var-form").onsubmit = e => {
  e.preventDefault();
  const name = $("#var-name").value.trim() || `Variant ${String.fromCharCode(65 + doc.variants.length)}`;
  const how = $("#var-root").value, cur = curVar();
  let nv;
  if (how === "__dup") nv = duplicateVariant(cur, name);
  else {
    let rootId = how === "__same" ? cur.root : how;
    let rootFn = null;
    if (how === "__new") { const t = $("#var-newroot").value.trim(); if (!t) return toast("Name the new overall function (verb + noun)."); rootFn = newFunction(t); rootId = rootFn.id; }
    nv = newVariant(name, rootId);
    nv.systemBoundary = $("#var-sysb").value || null;
    if (rootFn) nv._newRoot = rootFn;
  }
  const rootFn = nv._newRoot; delete nv._newRoot;
  $("#var-name").value = ""; $("#var-newroot").value = "";
  $("#m-variants").hidden = true;
  commit(() => { if (rootFn) doc.functions.push(rootFn); doc.variants.push(nv); doc.activeVariant = nv.id; selId = selFlow = null; multi = []; view.depth = "all"; }, { fit: true });
  toast(`Variant “${name}” created. Write its boundary in the side panel.`, 4500);
  openSide(true);
};

/* ================= Flow types ================= */
let ftDraft = [];
function openFlowTypes() { ftDraft = clone(doc.flowTypes); drawFlowTypes(); $("#m-flows").hidden = false; }
function drawFlowTypes() {
  const L = doc.languages, used = id => doc.variants.reduce((a, v) => a + v.flows.filter(l => l.type === id).length, 0);
  $("#ft-rows").innerHTML = ftDraft.map((t, i) => `<div class="ftrow">
    <span class="ftprev"><svg viewBox="0 0 60 12" aria-hidden="true"><line x1="2" y1="6" x2="50" y2="6" stroke="${esc(t.color)}" stroke-width="${t.width}"${dashAttr(t)}/><path d="M49 2L58 6L49 10z" fill="${esc(t.color)}"/></svg></span>
    <input type="text" data-k="name" data-i="${i}" value="${esc(t.name)}" placeholder="Name" aria-label="Name">
    ${L.slice(1).map(l => `<label class="trin"><b>${esc(l.toUpperCase())}</b><input type="text" data-k="tr" data-l="${esc(l)}" data-i="${i}" value="${esc((t.nameTr || {})[l] || "")}"></label>`).join("")}
    <input type="color" data-k="color" data-i="${i}" value="${esc(t.color)}" aria-label="Colour">
    <select data-k="style" data-i="${i}" aria-label="Line">${Object.entries(FLOW_STYLES).map(([k, n]) => `<option value="${k}"${t.style === k ? " selected" : ""}>${n}</option>`).join("")}</select>
    <label class="ftnum">width<input type="number" data-k="width" data-i="${i}" value="${t.width}" min="1" max="6" step=".2" aria-label="Line width"></label>
    <label class="ftnum"${t.style === "solid" ? " hidden" : ""}>spacing<input type="number" data-k="gap" data-i="${i}" value="${Number.isFinite(+t.gap) ? t.gap : FLOW_GAP}" min="1" max="24" step="1" aria-label="Space between dashes or dots, px" title="Space between dashes or dots, px"></label>
    <input type="text" class="tdesc" data-k="desc" data-i="${i}" value="${esc(t.desc || "")}" placeholder="What it covers" aria-label="Description">
    <span class="tcount" title="Flows of this type">${used(t.id)}</span>
    <button class="btn small icon" data-ftdel="${i}" title="Delete type" aria-label="Delete type"${ftDraft.length < 2 ? " disabled" : ""}>×</button></div>`).join("");
}
$("#ft-rows").addEventListener("input", e => {
  const el = e.target, i = +el.dataset.i, k = el.dataset.k; if (!k) return;
  const t = ftDraft[i];
  if (k === "tr") { t.nameTr = t.nameTr || {}; t.nameTr[el.dataset.l] = el.value.trim(); }
  else t[k] = k === "width" ? Math.max(1, Math.min(6, +el.value || 2)) : k === "gap" ? Math.max(1, Math.min(24, +el.value || FLOW_GAP)) : el.value;
  if (k === "color" || k === "style" || k === "width" || k === "gap") drawFlowTypes();
});
$("#ft-rows").addEventListener("click", e => {
  const b = e.target.closest("[data-ftdel]"); if (!b) return;
  const i = +b.dataset.ftdel, t = ftDraft[i], n = doc.variants.reduce((a, v) => a + v.flows.filter(l => l.type === t.id).length, 0);
  if (n && !confirm(`${n} flow${n > 1 ? "s use" : " uses"} “${t.name}”. Delete the type and make ${n > 1 ? "them" : "it"} “${ftDraft[i === 0 ? 1 : 0].name}”?`)) return;
  ftDraft.splice(i, 1); drawFlowTypes();
});
$("#ft-add").onclick = () => { ftDraft.push({ id: uid("ft"), name: "New flow type", nameTr: {}, color: "#2E7D6B", style: "solid", width: 2, desc: "" }); drawFlowTypes(); };
$("#ft-save").onclick = () => {
  const types = ftDraft.map(t => ({ ...t, name: t.name.trim() || "Flow", nameTr: trObj(t.nameTr) })); const ids = new Set(types.map(t => t.id));
  $("#m-flows").hidden = true;
  commit(() => { doc.flowTypes = types; doc.variants.forEach(v => v.flows.forEach(l => { if (!ids.has(l.type)) l.type = types[0].id; })); [...view.hiddenTypes].forEach(x => !ids.has(x) && view.hiddenTypes.delete(x)); });
  toast("Flow types updated. Ctrl Z to undo.");
};

/* ================= Link an RCA file ================= */
function applyRCALink(name, text, askTags = true) {
  let d; try { d = JSON.parse(text); } catch (e) { return toast("That file is not valid JSON.", 4500); }
  if (!d || d.format !== "uchuva-rca" || !Array.isArray(d.nodes)) return toast("That is not an RCA file from the RCA workbench.", 5000);
  const rca = { file: name, title: String(d.title || ""), titleTr: trObj(d.titleTr), linkedAt: nowISO(),
    boxes: d.nodes.map(n => ({ id: String(n.id), text: String(n.text || ""), textTr: trObj(n.textTr), tags: Array.isArray(n.tags) ? n.tags.map(String) : [] })) };
  const newTags = (d.tags || []).filter(t => t && t.id && !doc.tags.some(x => x.id === t.id));
  const importTags = newTags.length && (askTags === true ? confirm(`Linked “${rca.title || name}” (${rca.boxes.length} boxes).\n\nAlso bring in its ${newTags.length} tag${newTags.length > 1 ? "s" : ""} (${newTags.slice(0, 6).map(t => t.emoji + " " + t.name).join(", ")}${newTags.length > 6 ? "…" : ""}), so functions and causes share the same stages?`) : askTags === "yes");
  commit(() => {
    doc.rca = rca;
    if (importTags) {
      (d.tagGroups || []).forEach(g => { if (g && g.id && !doc.tagGroups.some(x => x.id === g.id)) doc.tagGroups.push({ id: String(g.id), name: String(g.name || g.id), nameTr: trObj(g.nameTr) }); });
      const gIds = new Set(doc.tagGroups.map(g => g.id));
      newTags.forEach(t => doc.tags.push({ id: String(t.id), emoji: String(t.emoji || "🏷️"), name: String(t.name || ""), nameTr: trObj(t.nameTr), group: gIds.has(t.group) ? t.group : doc.tagGroups[0].id, desc: String(t.desc || "") }));
    }
  });
  toast(`RCA linked${importTags ? " and its tags added" : ""}. Pick causes on a function under “Root causes it addresses”.`, 5500);
}
async function linkRCA() {
  const take = async (name, text) => applyRCALink(name, text);
  if (FSA) {
    try { const [h] = await window.showOpenFilePicker({ types: [{ description: "RCA file", accept: { "application/json": [".json"] } }] }); const f = await h.getFile(); await take(f.name, await f.text()); }
    catch (e) { if (e.name !== "AbortError") toast(e.message, 4500); }
  } else {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json";
    inp.onchange = async () => { const f = inp.files[0]; if (f) await take(f.name, await f.text()); }; inp.click();
  }
}
