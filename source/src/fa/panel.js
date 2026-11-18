/* ================= Side panel ================= */
const fnSwatch = id => { const V = curVar(), lv = id === V.root ? 0 : depthOf(id, V); const s = lv == null ? { fill: "transparent", stroke: css("--muted") } : levelStyle(lv);
  const f = fnById(id); return `<span class="sw${f && f.kind === "aux" ? " aux" : ""}${lv === 0 ? " root" : ""}" style="background:${s.fill};border-color:${s.stroke}"></span>`; };
const extSwatch = () => `<span class="sw ext"></span>`;
const swatchOf = id => fnById(id) ? fnSwatch(id) : extSwatch();
function typeSwatch(type, unwanted) { // a short line in the flow's colour and pattern
  const t = typeById(type), c = unwanted ? UNWANTED_COLOR : t.color;
  return `<svg class="fsw" viewBox="0 0 30 10" aria-hidden="true"><line x1="1" y1="5" x2="22" y2="5" stroke="${c}" stroke-width="${Math.max(2, t.width)}"${dashAttr(t, Math.max(2, t.width))}/><path d="M21 1L29 5L21 9z" fill="${unwanted ? "none" : c}" stroke="${c}" stroke-width="1.3"/></svg>`;
}
const nmOf = o => !o ? "?" : (txMissing(o) && doc.languages.length > 1 ? `<i>${esc(tx(o))}</i>` : esc(tx(o)) || `<i class="muted">no text</i>`);
const tagPillsOf = o => orderedTags(o.tags || []).map(tg => `<span class="tpill" title="${esc(tx(tg, "name"))}">${tg.emoji}</span>`).join("");
const itemList = ids => `<ul class="list">${ids.map(id => { const o = nodeOf(id); return `<li><button data-go="${esc(id)}">${swatchOf(id)}<span>${nmOf(o)}</span>${o && tagPillsOf(o) ? `<span class="tps">${tagPillsOf(o)}</span>` : ""}</button></li>`; }).join("")}</ul>`;
function flowList(ls, side) {
  if (!ls.length) return `<p class="muted">None.</p>`;
  return `<ul class="list">${ls.map(l => { const other = side === "in" ? l.source : l.target;
    return `<li><button data-go="${esc(l.id)}">${typeSwatch(l.type, l.unwanted)}<span>${txAll(l).length ? `<b>${esc(tx(l))}</b> ` : ""}<span class="muted">${side === "in" ? "from" : "to"}</span> ${nmOf(nodeOf(other))}</span></button></li>`; }).join("")}</ul>`;
}
function textFields(o, field, label, rows = 2, big = false, ph = "") {
  const L = doc.languages, many = L.length > 1;
  return L.map((l, i) => `<label class="field"><span>${label}${many ? ` · <b>${l.toUpperCase()}</b>${i === 0 ? " (main)" : ""}${txMissing(o, field, l) ? ` <em class="mt">missing</em>` : ""}` : ""}</span>
    <textarea data-tf="${field}" data-lang="${l}" class="ftext${big && i === 0 ? " big" : ""}" rows="${i === 0 ? rows : Math.max(1, rows - 1)}" placeholder="${esc(many ? langName(l) + (ph ? " · " + ph : "") : ph)}">${esc(txRaw(o, field, l))}</textarea></label>`).join("");
}
function bindTextFields(ref, root = $("#panel")) {
  root.querySelectorAll("textarea[data-tf]").forEach(ta => {
    const f = ta.dataset.tf, l = ta.dataset.lang, multiline = f === "inside" || f === "outside";
    ta.addEventListener("input", e => fieldEdit(ref, m => { txSet(m, f, l, multiline ? e.target.value.trim() : cleanText(e.target.value)); }));
    ta.addEventListener("change", () => flushField());
  });
}
function notesAndSources(o) {
  return `<label class="field"><span>Notes · only for you</span><textarea id="f-notes" rows="3" placeholder="Reasoning, observations, what to check next">${esc(o.notes || "")}</textarea></label>
    ${o.sources ? `<div class="field bibfield"><label for="f-src">Sources, one per line · type <kbd>@</kbd> to cite from your .bib</label><textarea id="f-src" rows="3" placeholder="@pahl2007engineering or free text" autocomplete="off" spellcheck="false">${esc(o.sources.join("\n"))}</textarea><div class="bibpop" id="bibpop" role="listbox" hidden></div><ul class="bibres" id="bibres"></ul></div>` : ""}`;
}
function bindNotesAndSources(ref) {
  $("#f-notes").addEventListener("input", e => fieldEdit(ref, m => { m.notes = e.target.value; }));
  $("#f-notes").addEventListener("change", () => flushField());
  const src = $("#f-src"); if (!src) return;
  src.addEventListener("input", e => { fieldEdit(ref, m => { m.sources = e.target.value.split("\n").map(s => s.trim()).filter(Boolean); }); showBibResolved(e.target.value); });
  src.addEventListener("change", () => flushField());
  attachBibComplete(src); showBibResolved(src.value);
}
function tagPicker(items) { // grouped toggle chips; pressed = every given item has the tag
  if (!doc.tags.length) return `<span class="muted">No tags yet.</span>`;
  return doc.tagGroups.map(g => {
    const ts = doc.tags.filter(tg => tg.group === g.id); if (!ts.length) return "";
    return `<div class="tp-group"><span class="tp-g">${esc(tx(g, "name"))}</span>${ts.map(tg => {
      const on = items.every(o => (o.tags || []).includes(tg.id));
      return `<button type="button" class="tchip" data-tag="${esc(tg.id)}" aria-pressed="${on}" title="${esc(tg.desc || "")}">${tg.emoji} ${esc(tx(tg, "name"))}</button>`; }).join("")}</div>`;
  }).join("");
}
function toggleTag(ids, tagId) {
  const items = ids.map(tagHolderOf).filter(o => o && o.tags); if (!items.length) return;
  const allOn = items.every(o => o.tags.includes(tagId));
  commit(() => ids.forEach(id => { const o = tagHolderOf(id); if (!o || !o.tags) return;
    o.tags = o.tags.filter(x => x !== tagId); if (!allOn) o.tags.push(tagId); o.tags = doc.tags.filter(tg => o.tags.includes(tg.id)).map(tg => tg.id); }));
}

function renderPanel() {
  const p = $("#panel");
  if (!doc || !lastRender) return;
  if (view.mode === "system") return sysPanel(p);
  if (view.mode === "goals") return goalsPanel(p);
  const V = curVar();
  if (selFlow && flowById(selFlow)) return flowPanel(p, flowById(selFlow));
  if (multi.length > 1) {
    const items = multi.map(id => nodeOf(id)).filter(Boolean);
    p.innerHTML = `<div class="sec"><h2>${multi.length} selected</h2>${itemList(multi)}
      <div class="field"><span>Tag all of them</span><div class="tagpick" id="f-tags">${tagPicker(items.filter(o => o.tags))}</div></div>
      <div class="row"><button class="btn danger" id="p-del">Remove all <kbd>Del</kbd></button><button class="btn" id="p-clr">Clear selection</button></div></div>`;
    $("#p-del").onclick = deleteSelection; $("#p-clr").onclick = clearSelection;
    $$("#f-tags [data-tag]").forEach(b => b.onclick = () => toggleTag(multi.filter(id => fnById(id)), b.dataset.tag));
    return;
  }
  if (selId && fnById(selId) && inVariant(selId)) return fnPanel(p, fnById(selId));
  if (selId && extById(selId)) return extPanel(p, extById(selId));
  overviewPanel(p, V);
}

function overviewPanel(p, V) {
  const steps = methodSteps(V);
  const unplaced = doc.functions.filter(f => !inVariant(f.id));
  const miss = missingSummary().filter(m => m.boxes || m.other);
  const ico = { done: "✓", todo: "○", warn: "!" };
  p.innerHTML = `
    <div class="sec"><h2>Variant</h2>
      ${textFields(V, "name", "Name", 1)}
      <label class="field"><span>What makes this variant different · only for you</span><textarea id="f-vnote" rows="2" placeholder="e.g. boundary moved to the packhouse door">${esc(V.note)}</textarea></label></div>
    <div class="sec"><h2>System boundary</h2>
      ${doc.system.boundaries.length ? `<label class="field"><span>Boundary from the system map</span><select id="f-sysb"><option value="">None</option>${doc.system.boundaries.map(b => `<option value="${esc(b.id)}"${V.systemBoundary === b.id ? " selected" : ""}>${esc(tx(b, "name"))} · ${b.members.length} inside</option>`).join("")}</select></label>`
        : `<p class="muted">Draw boundaries in the <button type="button" class="linkbtn" data-tomode="system">System</button> mode to pick one here and check this variant against it.</p>`}
      <p class="muted">The dashed box is the overall function: <button type="button" class="linkbtn" data-go="${esc(V.root)}">${nmOf(fnById(V.root))}</button>. Click it to rename it.</p>
      ${textFields(V, "boundary", "Where it starts and ends", 2, false, "e.g. farm gate → importer's distribution centre")}
      ${textFields(V, "inside", "Inside the system", 2, false, "what the design may change")}
      ${textFields(V, "outside", "Outside the system", 2, false, "what it must take as given")}</div>
    ${systemSection(V)}
    ${goalsSection(V)}
    <div class="sec"><h2>Method · ${steps.filter(s => s.status === "done").length}/${steps.length}</h2>
      <ol class="steps">${steps.map((s, i) => `<li class="step ${s.status}">
        <div class="st-head"><span class="st-ico" aria-hidden="true">${ico[s.status]}</span><b>${i + 1}. ${esc(s.name)}</b>
          <label class="st-tick" title="Mark this step as done yourself"><input type="checkbox" data-tick="${s.id}"${s.ticked ? " checked" : ""}> done</label></div>
        <p class="st-detail">${esc(s.detail)}</p>
        ${s.issues.length ? `<details class="ck"${s.status === "warn" ? " open" : ""}><summary>${s.issues.length} to look at</summary><ul class="list">${s.issues.slice(0, 30).map(x =>
          `<li><button data-go="${esc(x.id || x.flow)}">${x.flow ? typeSwatch(flowById(x.flow).type, flowById(x.flow).unwanted) : swatchOf(x.id)}<span>${esc(x.label)}${x.why ? ` <span class="muted">· ${esc(x.why)}</span>` : ""}</span></button>${s.id === "wording" && x.id ? `<button class="btn small" data-verbok="${esc(x.id)}" title="Accept this first word as a function verb from now on">accept verb</button>` : ""}</li>`).join("")}</ul></details>` : ""}
        <details class="st-help"><summary>How</summary><p class="muted">${esc(s.help)}</p></details></li>`).join("")}</ol></div>
    ${unplaced.length ? `<div class="sec"><h2>Catalogue · not in this variant · ${unplaced.length}</h2>
      <p class="muted">Functions from other variants, with their notes and sources. Place one here to reuse it.</p>
      <ul class="list">${unplaced.map(f => `<li class="catline"><span class="cl-name">${fnSwatch(f.id)}<span>${nmOf(f)}</span></span><span class="cl-acts"><button class="btn small" data-place="${esc(f.id)}">Place here</button>${usedIn(f.id).length ? "" : `<button class="btn small icon danger" data-uncat="${esc(f.id)}" title="Delete from the catalogue" aria-label="Delete from the catalogue">×</button>`}</span></li>`).join("")}</ul></div>` : ""}
    ${miss.length ? `<div class="sec"><h2>Missing translations</h2>${miss.map(m => `<div class="trline"><span><b>${m.l.toUpperCase()}</b> ${m.boxes} item${m.boxes === 1 ? "" : "s"}${m.other ? ` · ${m.other} other text${m.other === 1 ? "" : "s"}` : ""}</span>${m.boxes ? `<button class="btn small" data-trpass="${m.l}">Translate one by one</button>` : ""}</div>`).join("")}
      <p class="muted">Untranslated items show their text in another language, in italics. The pass walks through this variant.</p></div>` : ""}
    <div class="sec"><h2>Getting around</h2>
      <p class="muted">Double-click inside the boundary to add a function, outside it to add an external. Drag the green dot from one box onto another to draw a flow. <kbd>Tab</kbd> adds a subfunction to the selected box. Press <kbd>?</kbd> for everything.</p></div>`;
  bindTextFields(V.id);
  $("#f-vnote").addEventListener("input", e => fieldEdit(V.id, m => { m.note = e.target.value; }));
  $("#f-vnote").addEventListener("change", () => flushField());
  bindSystemSection(V);
  $$("[data-tick]").forEach(c => c.onchange = () => commit(() => { if (c.checked) V.steps[c.dataset.tick] = true; else delete V.steps[c.dataset.tick]; }));
  $$("[data-place]").forEach(b => b.onclick = () => placeFunction(b.dataset.place));
  $$("[data-uncat]").forEach(b => b.onclick = () => removeFromCatalogue(b.dataset.uncat));
  $$("[data-trpass]").forEach(b => b.onclick = () => translatePass(b.dataset.trpass));
  $$("[data-verbok]").forEach(b => b.onclick = () => { const w = firstWord(txRaw(fnById(b.dataset.verbok), "text", mainLang()));
    if (w) commit(() => { doc.verbs = [...new Set([...(doc.verbs || []), w])]; }).then(() => toast(`“${w}” now counts as a function verb in this file.`)); });
}

function fnPanel(p, f) {
  const V = curVar(), isRoot = f.id === V.root, lv = isRoot ? 0 : depthOf(f.id, V);
  const kids = childrenOf(f.id, V), ins = V.flows.filter(l => l.target === f.id), outs = V.flows.filter(l => l.source === f.id);
  const verbBad = !verbOK(f);
  const parentOpts = [V.root, ...Object.keys(V.placed).filter(id => id !== f.id && !isAncestor(f.id, id, V))]
    .map(id => `<option value="${esc(id)}"${parentOf(f.id, V) === id ? " selected" : ""}>${"  ".repeat(id === V.root ? 0 : depthOf(id, V))}${esc(tx(fnById(id)) || "(no text)")}${id === V.root ? " (overall)" : ""}</option>`).join("");
  const vs = usedIn(f.id);
  const rcaBoxes = doc.rca ? doc.rca.boxes : [];
  const rcaChip = id => { const b = rcaBoxes.find(x => x.id === id); return `<span class="rcachip"><span>${esc(b ? tx(b) : id)}</span><button type="button" data-unrca="${esc(id)}" aria-label="Remove link">×</button></span>`; };
  p.innerHTML = `
    <div class="sec">
      ${isRoot ? `<p class="kicker">Overall function · the system boundary</p>` : `<p class="kicker">Level ${lv} function${f.kind === "aux" ? " · auxiliary" : ""}</p>`}
      ${textFields(f, "text", "Function", 3, true, VERB_HINT)}
      ${verbBad ? `<p class="ckwarn">“${esc(firstWord(txRaw(f, "text", mainLang())))}” is not in the functional-basis verb list. If this names a solution (“apply…”, “use…”) or a thing, rewrite it as what must happen. <button type="button" class="linkbtn" id="p-verbok">It is a function verb</button></p>` : ""}
      <label class="chk keychk"><input type="checkbox" id="f-key"${f.key ? " checked" : ""}> <span><b>★ Key function</b> · critical to the design goals (RIO step F) <kbd>K</kbd> ${relPill(f, V)}</span></label>
      ${servesField(f, V)}
      <div class="field"><span>Kind</span><div class="seg kindseg" role="group" aria-label="Kind">
        <button data-kind="main" aria-pressed="${f.kind !== "aux"}"><i class="kb main"></i>Main</button><button data-kind="aux" aria-pressed="${f.kind === "aux"}"><i class="kb aux"></i>Auxiliary</button></div></div>
      ${isRoot ? "" : `<label class="field"><span>Part of · its parent, which sets its level</span><select id="f-parent">${parentOpts}</select></label>`}
      ${actsOnField(f, V)}
      <div class="field"><span>Tags · <button type="button" class="linkbtn" data-act="tags">edit tags</button></span><div class="tagpick" id="f-tags">${tagPicker([f])}</div></div>
      <div class="field"><span>Root causes it addresses${doc.rca ? ` · from ${esc(doc.rca.file || "the linked RCA")}` : ""}</span>
        ${doc.rca ? `<div class="rcalinks">${(f.rcaLinks || []).map(rcaChip).join("")}</div>
          <input id="f-rca" list="rca-list" placeholder="Type to find an RCA box…" autocomplete="off"><datalist id="rca-list">${rcaBoxes.filter(b => !(f.rcaLinks || []).includes(b.id)).map(b => `<option value="${esc(tx(b))}"></option>`).join("")}</datalist>`
          : `<p class="muted">Link your RCA file (File → Link an RCA file) to say which causes this function addresses.</p>`}</div>
      ${notesAndSources(f)}
      ${isRoot ? "" : widthNote(f.id)}
      <div class="row"><button class="btn" id="p-sub">Add subfunction <kbd>Tab</kbd></button>${isRoot ? "" : `<button class="btn" id="p-sib">Add next to it</button><button class="btn danger" id="p-del">Remove <kbd>Del</kbd></button>`}</div>
      <dl class="kv"><dt>Level</dt><dd>${lv}</dd><dt>Subfunctions</dt><dd>${descendantsOf(f.id, V).length}</dd>
        <dt>Used in</dt><dd>${vs.map(v => v.id === V.id ? `<b>${esc(tx(v, "name"))}</b>` : `<button class="linkbtn" data-variant="${esc(v.id)}">${esc(tx(v, "name"))}</button>`).join(", ")}</dd></dl>
    </div>
    ${kids.length ? `<div class="sec"><h2>Subfunctions · ${kids.length}</h2>${itemList(kids)}</div>` : ""}
    <div class="sec"><h2>Flows in · ${ins.length}</h2>${flowList(ins, "in")}</div>
    <div class="sec"><h2>Flows out · ${outs.length}</h2>${flowList(outs, "out")}</div>`;
  bindTextFields(f.id); bindNotesAndSources(f.id);
  $$(".kindseg [data-kind]").forEach(b => b.onclick = () => commit(() => { fnById(f.id).kind = b.dataset.kind; }));
  $("#f-key").onchange = e => commit(() => { fnById(f.id).key = e.target.checked; });
  bindActsOn(f); bindServes(f);
  $("#f-parent") && ($("#f-parent").onchange = e => setParent(f.id, e.target.value));
  $$("#f-tags [data-tag]").forEach(b => b.onclick = () => toggleTag([f.id], b.dataset.tag));
  $("#p-sub").onclick = () => addSubfunction(f.id);
  $("#p-sib") && ($("#p-sib").onclick = () => addSibling(f.id));
  $("#p-del") && ($("#p-del").onclick = deleteSelection); bindWidthNote(f.id);
  $("#p-verbok") && ($("#p-verbok").onclick = () => { const w = firstWord(txRaw(f, "text", mainLang())); commit(() => { doc.verbs = [...new Set([...(doc.verbs || []), w])]; }); });
  $$("[data-variant]").forEach(b => b.onclick = () => switchVariant(b.dataset.variant, f.id));
  $$("[data-unrca]").forEach(b => b.onclick = () => commit(() => { const m = fnById(f.id); m.rcaLinks = m.rcaLinks.filter(x => x !== b.dataset.unrca); }));
  const ri = $("#f-rca");
  if (ri) ri.addEventListener("change", () => {
    const b = rcaBoxes.find(x => tx(x) === ri.value.trim() || txAll(x).includes(ri.value.trim()));
    if (!b) return toast("No RCA box with that text. Pick one from the list.");
    commit(() => { const m = fnById(f.id); m.rcaLinks = [...new Set([...(m.rcaLinks || []), b.id])]; });
  });
}

function extPanel(p, x) {
  const V = curVar(), ins = V.flows.filter(l => l.target === x.id), outs = V.flows.filter(l => l.source === x.id);
  p.innerHTML = `<div class="sec"><p class="kicker">External · outside the boundary</p>
      ${x.ref ? `<p class="muted">Linked to the element <button type="button" class="linkbtn" data-go="${esc(x.ref)}">${nmOf(elById(x.ref))}</button> of the system map: its name is the element's name.</p>` : ""}
      ${textFields(x, "text", "Who or what", 2, true, "e.g. grower, importer, weather")}
      ${doc.system.elements.length ? `<label class="field"><span>Element of the system map</span><select id="f-xref"><option value="">Not linked</option>${elementOptions(x.ref, curVar(), "outside")}</select></label>` : ""}
      ${notesAndSources(findEditable(x.id))}
      ${widthNote(x.id)}
      <div class="row"><button class="btn danger" id="p-del">Delete <kbd>Del</kbd></button></div></div>
    <div class="sec"><h2>Into the system · ${outs.length}</h2>${flowList(outs, "out")}</div>
    <div class="sec"><h2>Out of the system · ${ins.length}</h2>${flowList(ins, "in")}</div>`;
  bindTextFields(x.id); bindNotesAndSources(x.id);
  $("#f-xref") && ($("#f-xref").onchange = e => commit(() => { const m = extById(x.id); if (e.target.value) m.ref = e.target.value; else delete m.ref; }));
  $("#p-del").onclick = deleteSelection; bindWidthNote(x.id);
}

const widthOf = id => { const V = curVar(), x = extById(id, V); return x ? x.bw : V.placed[id] && V.placed[id].bw; };
const widthNote = id => widthOf(id) ? `<p class="muted">Width set by hand: ${widthOf(id)} px · <button type="button" class="linkbtn" id="p-w0">automatic width</button></p>`
  : `<p class="muted">Drag the small square on the box's bottom-right corner to make it narrower or wider; its text wraps to fit.</p>`;
const bindWidthNote = id => { $("#p-w0") && ($("#p-w0").onclick = () => setBoxWidth(id, null)); };
function flowPanel(p, l) {
  const V = curVar(), S = flowSides(V);
  const where = S.inputs.includes(l) ? "Input: crosses the boundary inwards" : S.outputs.includes(l) ? "Output: crosses the boundary outwards" : S.outside.includes(l) ? "Outside the system on both ends" : "Inside the system";
  p.innerHTML = `<div class="sec"><p class="kicker">Flow · ${esc(where)}</p>
      <div class="sel-edge"><button class="btn" data-go="${esc(l.source)}">${swatchOf(l.source)}${nmOf(nodeOf(l.source))}</button>
      <span class="arrow">${typeSwatch(l.type, l.unwanted)} flows to</span>
      <button class="btn" data-go="${esc(l.target)}">${swatchOf(l.target)}${nmOf(nodeOf(l.target))}</button></div>
      ${textFields(l, "text", "What flows", 1, true, "e.g. fruit, cold air, temperature reading")}
      <div class="field"><span>Type · <button type="button" class="linkbtn" data-act="flowtypes">edit types</button></span><div class="typeseg" role="group" aria-label="Flow type">${doc.flowTypes.map(t =>
        `<button data-type="${esc(t.id)}" aria-pressed="${l.type === t.id}" title="${esc(t.desc || "")}">${typeSwatch(t.id, false)}${esc(tx(t, "name"))}</button>`).join("")}</div></div>
      ${doc.system.elements.length ? `<label class="field"><span>Element that flows · used as its label when it has none</span><select id="f-fel"><option value="">None</option>${elementOptions(l.element, curVar(), "any")}</select></label>` : ""}
      <label class="chk"><input type="checkbox" id="f-unwanted"${l.unwanted ? " checked" : ""}> Unwanted flow (inoculum, waste, losses): drawn red with a hollow head</label>
      <div class="field"><span>Tags · <button type="button" class="linkbtn" data-act="tags">edit tags</button></span><div class="tagpick" id="f-tags">${tagPicker([l])}</div></div>
      ${notesAndSources(l)}
      <div class="field"><span>Shape${l.geo ? ` · <button type="button" class="linkbtn" id="p-shape0">back to automatic</button>` : ""}</span>
        <div class="seg shapeseg" role="group" aria-label="Shape">${FLOW_SHAPES.map(([k, n]) => `<button data-shape="${k}" aria-pressed="${((l.geo && l.geo.shape) || "auto") === k}">${n}</button>`).join("")}</div>
        <p class="muted">On the canvas: drag the middle dot to bend it, its label to move the label, and a round end along its box to move where it attaches (onto another box: rewire). Shift+Enter in the label starts a new line.</p></div>
      <div class="row"><button class="btn" id="p-rev">Reverse <kbd>R</kbd></button><button class="btn danger" id="p-del">Delete <kbd>Del</kbd></button></div></div>`;
  bindTextFields(l.id); bindNotesAndSources(l.id);
  $$(".typeseg [data-type]").forEach(b => b.onclick = () => { view.flowType = b.dataset.type; saveView(); commit(() => { flowById(l.id).type = b.dataset.type; }); });
  $("#f-unwanted").onchange = e => commit(() => { flowById(l.id).unwanted = e.target.checked; });
  $("#f-fel") && ($("#f-fel").onchange = e => commit(() => { flowById(l.id).element = e.target.value || null; }));
  $$("#f-tags [data-tag]").forEach(b => b.onclick = () => toggleTag([l.id], b.dataset.tag));
  $("#p-rev").onclick = () => reverseFlow(l.id); $("#p-del").onclick = deleteSelection;
  $$(".shapeseg [data-shape]").forEach(b => b.onclick = () => setFlowShape(l.id, b.dataset.shape));
  $("#p-shape0") && ($("#p-shape0").onclick = () => resetFlowShape(l.id));
}
$("#panel").addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (b && !e.target.closest("[data-verbok]")) goTo(b.dataset.go); });

/* ================= Chrome: header, stats, legend, controls ================= */
function updateChrome() {
  const title = tx(doc, "title") || "Untitled function analysis";
  $("#doc-title").textContent = title;
  document.title = (dirty ? "● " : "") + title + (view.mode === "system" ? " · System" : view.mode === "goals" ? " · Goals" : " · Functions");
  $$("#modeseg [data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === view.mode)));
  $("#hint").innerHTML = view.mode === "system" ? `Double-click: new element · drag into another ring: change its level · <kbd>?</kbd> help`
    : view.mode === "goals" ? `Double-click: new family · <kbd>Tab</kbd> subgoal · <kbd>1</kbd>–<kbd>5</kbd> score · drag onto a goal: move under it · <kbd>?</kbd> help`
    : `Double-click: new box · drag <span class="dot"></span> onto a box: flow · <kbd>?</kbd> help`;
  const ls = $("#langseg"); ls.hidden = doc.languages.length < 2;
  ls.innerHTML = doc.languages.map(l => `<button data-lang="${esc(l)}" aria-pressed="${l === curLang()}" title="${esc(langName(l))}${l === mainLang() ? " (main)" : ""}">${esc(l.toUpperCase())}</button>`).join("");
  $("#file-name").textContent = fileName;
  $("#dirty").hidden = !dirty;
  $("#dirty").textContent = fileNeedsGesture && dirty ? "● not yet in the file: press Ctrl S once to allow automatic saving" : "● unsaved changes";
  $("#saved-at").hidden = !(fileHandle && !dirty && fileSavedAt);
  if (fileSavedAt) $("#saved-at").textContent = "✓ saved to file " + fileSavedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  $("#b-undo").disabled = !undoStack.length; $("#b-redo").disabled = !redoStack.length;
  $("#ver-count").textContent = doc.versions.length || "";
  const V = curVar();
  $("#variant").innerHTML = doc.variants.map(v => `<option value="${esc(v.id)}"${v.id === V.id ? " selected" : ""}>${esc(tx(v, "name") || "Variant")}</option>`).join("") + `<option disabled>──────────</option><option value="__manage">Manage variants…</option>`;
  if (view.mode === "goals") { const T = curTree(), Gs = doc.goals;
    const nl = T ? goalLeaves(T).length : 0, sc = T ? T.nodes.filter(n => goalScore(T, n.goal)).length : 0;
    $("#stats").innerHTML = T ? `<span><b>${T.nodes.length}</b> goal${T.nodes.length === 1 ? "" : "s"} · <b>${nl}</b> lea${nl === 1 ? "f" : "ves"}</span><span><b>${sc}</b>/${T.nodes.length} scored</span><span><b>${Gs.stakeholders.length}</b> stakeholder${Gs.stakeholders.length === 1 ? "" : "s"}</span><span>${esc(GOAL_METHODS[Gs.method].name.toLowerCase())} ${esc(GOAL_METHODS[Gs.method].short)} · ${esc(GOAL_AGGREGATES[Gs.aggregate].name.toLowerCase())}</span><span><b>${Gs.trees.length}</b> tree${Gs.trees.length === 1 ? "" : "s"} of ${doc.system.boundaries.length} boundar${doc.system.boundaries.length === 1 ? "y" : "ies"}</span>`
      : `<span>No goals tree yet</span>`;
    return; }
  if (view.mode === "system") { const Sy = doc.system;
    $("#stats").innerHTML = `<span><b>${Sy.elements.length}</b> element${Sy.elements.length === 1 ? "" : "s"} on <b>${Sy.levels.length}</b> level${Sy.levels.length === 1 ? "" : "s"}${Sy.elements.some(e => e.at.length > 1) ? ` · <b>${Sy.elements.filter(e => e.at.length > 1).length}</b> on several` : ""}</span><span><b>${Sy.groups.length}</b> group${Sy.groups.length === 1 ? "" : "s"}</span><span><b>${Sy.boundaries.length}</b> boundar${Sy.boundaries.length === 1 ? "y" : "ies"}</span>` +
      `<span><b>${Sy.elements.filter(e => e.kind === "actor").length}</b> actors</span>` + (Sy.chain.on ? `<span>chain of <b>${doc.tags.filter(t => t.group === Sy.chain.group).length}</b> stages</span>` : "");
    return; }
  const S = flowSides(V), n = Object.keys(V.placed).length;
  $("#stats").innerHTML = `<span><b>${n}</b> function${n === 1 ? "" : "s"} over <b>${maxDepth(V)}</b> level${maxDepth(V) === 1 ? "" : "s"}</span><span><b>${V.externals.length}</b> external${V.externals.length === 1 ? "" : "s"}</span>` +
    `<span><b>${S.inputs.length}</b> in · <b>${S.outputs.length}</b> out · <b>${S.internal.length}</b> inside</span><span><b>${doc.functions.length}</b> in the catalogue · <b>${doc.variants.length}</b> variant${doc.variants.length === 1 ? "" : "s"}</span>` +
    (doc.rca ? `<span>RCA <b>${esc(doc.rca.file || "linked")}</b></span>` : "");
}
function renderLegend() {
  const lg = $("#legend"), V = curVar();
  if (view.legendOpen === false) { lg.innerHTML = `<div class="h"><span>Key</span><button data-lg="open">Show</button></div>`; return; }
  if (view.mode === "goals") {
    lg.innerHTML = `<div class="h"><span>Goals</span><button data-lg="close">Hide</button></div>` +
      `<span class="st"><span class="sw gsw groot"></span><span>Main goal</span></span><span class="st"><span class="sw gsw"></span><span>Goal</span></span><span class="st"><span class="sw gsw gout"></span><span>Out of scope here</span></span><hr>` +
      `<span class="st"><span class="lgchip gscore">4 · 2–5</span><span>Score, spread</span></span><span class="st"><span class="lgchip grel">${doc.goals.method === "normalised" ? "26.0 %" : "0.80"}</span><span>${esc(GOAL_METHODS[doc.goals.method].name)} ${esc(GOAL_METHODS[doc.goals.method].short)}</span></span>` +
      `<span class="st"><span class="sw gsw shade"></span><span>Shade: next to the most relevant</span></span>`;
    return;
  }
  if (view.mode === "system") {
    lg.innerHTML = `<div class="h"><span>Elements</span><button data-lg="close">Hide</button></div>` +
      Object.keys(KINDS).map(k => `<span class="st" title="${esc(KINDS[k].hint)}">${elSwatch({ kind: k })}<span>${esc(kindName(k))}</span><span class="n">${doc.system.elements.filter(e => e.kind === k).length}</span></span>`).join("") +
      `<hr><span class="st"><span class="sw grpsw"></span><span>Group</span></span><span class="st"><span class="sw bndsw"></span><span>Boundary in focus</span></span>`;
    return;
  }
  const counts = t => V.flows.filter(l => l.type === t).length;
  const md = Math.max(1, maxDepth(V));
  lg.innerHTML = `<div class="h"><span>Flows</span><button data-lg="close">Hide</button></div>` +
    doc.flowTypes.map(t => `<button class="cat" data-ft="${esc(t.id)}" aria-pressed="${!view.hiddenTypes.has(t.id)}" title="Click to hide or show">${typeSwatch(t.id, false)}<span>${esc(tx(t, "name"))}</span><span class="n">${counts(t.id)}</span></button>`).join("") +
    `<span class="st">${typeSwatch(doc.flowTypes[0].id, true)}<span>Unwanted</span></span><hr>` +
    `<div class="h"><span>Boxes</span></div>` +
    Array.from({ length: Math.min(md, doc.levels.length - 1) + 1 }, (_, i) => `<span class="st"><span class="sw${i === 0 ? " root" : ""}" style="background:${levelStyle(i).fill};border-color:${levelStyle(i).stroke}"></span><span>${i === 0 ? "Overall (boundary)" : "Level " + i}</span></span>`).join("") +
    `<span class="st"><span class="sw aux"></span><span>Auxiliary</span></span><span class="st"><span class="sw ext"></span><span>External</span></span>`;
}
$("#legend").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.lg) { view.legendOpen = b.dataset.lg === "open"; saveView(); return renderLegend(); }
  if (b.dataset.ft) { const id = b.dataset.ft; view.hiddenTypes.has(id) ? view.hiddenTypes.delete(id) : view.hiddenTypes.add(id); render({ skipPanel: true }); }
});
function renderTagbar() {
  const bar = $("#tagbar");
  if (view.mode === "goals") { bar.hidden = true; return; }
  if (!doc.tags.length) { bar.hidden = false; bar.innerHTML = `<span class="tb-label">Tags</span><span class="muted">None yet. Tag functions and flows by stage of the chain (or import the RCA's tags), then click a tag here to highlight them.</span><button class="btn small" data-act="tags">Add tags</button>`; return; }
  bar.hidden = false;
  const count = id => tagHolders().filter(o => (o.tags || []).includes(id)).length;
  bar.innerHTML = `<span class="tb-label">Tags</span><div class="tb-scroll">` + doc.tagGroups.map(g => {
    const ts = doc.tags.filter(tg => tg.group === g.id); if (!ts.length) return "";
    return `<span class="tb-group">${esc(tx(g, "name"))}</span>` + ts.map(tg => `<button class="tchip" data-tf="${esc(tg.id)}" aria-pressed="${view.tagFilter.has(tg.id)}" title="${esc(tg.desc || "")}">${tg.emoji} ${esc(tx(tg, "name"))} <span class="n">${count(tg.id)}</span></button>`).join("");
  }).join("") + `</div>` + (view.tagFilter.size ? `<button class="btn small" id="tf-clear">Clear</button>` : "") +
    `<button class="btn small" id="tb-chips">${view.tagChips !== false ? "Hide emojis on boxes" : "Show emojis on boxes"}</button><button class="btn small" data-act="tags">Edit tags</button>`;
  $("#tf-clear") && ($("#tf-clear").onclick = () => { view.tagFilter.clear(); renderTagbar(); applyTagFilter(); });
  $("#tb-chips").onclick = () => { view.tagChips = view.tagChips === false; saveView(); render({ skipPanel: true }); };
}
$("#tagbar").addEventListener("click", e => {
  const b = e.target.closest("[data-tf]"); if (!b) return;
  const id = b.dataset.tf; view.tagFilter.has(id) ? view.tagFilter.delete(id) : view.tagFilter.add(id);
  renderTagbar(); applyTagFilter();
});
$("#langseg").addEventListener("click", e => { const b = e.target.closest("[data-lang]"); if (!b) return; view.lang = b.dataset.lang; saveView(); render(); });
function syncControls() {
  const V = curVar(), md = maxDepth(V);
  const opts = [["all", "All levels"], ["0", "Black box"], ...Array.from({ length: Math.max(0, md - 1) }, (_, i) => [String(i + 1), `Down to level ${i + 1}`])];
  if (view.depth !== "all" && +view.depth >= md) view.depth = "all";
  $("#depth").innerHTML = opts.map(([v, n]) => `<option value="${v}"${String(view.depth) === v ? " selected" : ""}>${n}</option>`).join("");
  $("#flowtype").innerHTML = doc.flowTypes.map(t => `<option value="${esc(t.id)}"${t.id === view.flowType ? " selected" : ""}>New flows: ${esc(tx(t, "name"))}</option>`).join("");
  if (!doc.flowTypes.some(t => t.id === view.flowType)) view.flowType = doc.flowTypes[0].id;
  $("#v-labels").checked = view.labels !== false; $("#v-rel").checked = view.relBadges !== false;
  if (view.scorer !== "all" && !shById(view.scorer)) view.scorer = "all";
  const T = curTree(), Gs = doc.goals, missing = [...doc.system.boundaries.filter(b => !treeOfBoundary(b.id)), ...(treeOfBoundary(null) ? [] : [null])];
  $("#goaltree").innerHTML = (Gs.trees.length ? Gs.trees.map(t => `<option value="${esc(t.id)}"${T && t.id === T.id ? " selected" : ""}>Goals · ${esc(treeName(t))}</option>`).join("") : `<option value="" selected>No goals tree yet</option>`) +
    (missing.length ? `<option disabled>──────────</option>` + missing.map(b => `<option value="__start:${b ? esc(b.id) : ""}">＋ Start for ${b ? `“${esc(tx(b, "name"))}”` : "no boundary"}</option>`).join("") : "");
  $("#scorer").innerHTML = (Gs.stakeholders.length > 1 ? `<option value="all"${view.scorer === "all" ? " selected" : ""}>Combined · ${esc(GOAL_AGGREGATES[Gs.aggregate].name.toLowerCase())}</option>` : "") +
    Gs.stakeholders.map(s => `<option value="${esc(s.id)}"${view.scorer === s.id || (Gs.stakeholders.length === 1) ? " selected" : ""}>Scores of ${esc(s.name)}</option>`).join("") + `<option disabled>──────────</option><option value="__add">Add a stakeholder…</option>`;
}
$("#depth").onchange = e => { view.depth = e.target.value; saveView(); render({ fit: true }); };
$("#flowtype").onchange = e => { view.flowType = e.target.value; saveView(); };
$("#v-labels").onchange = e => { view.labels = e.target.checked; saveView(); render({ skipPanel: true }); };
$("#v-rel").onchange = e => { view.relBadges = e.target.checked; saveView(); render({ skipPanel: true }); };
$("#goaltree").onchange = e => { const v = e.target.value; if (v.startsWith("__start:")) return startTree(v.slice(8) || null); switchTree(v); };
$("#scorer").onchange = e => { const v = e.target.value;
  if (v === "__add") { const n = prompt("Name of the stakeholder, e.g. Exporter B"); if (n && n.trim()) addStakeholder(n.trim()); else syncControls(); return; }
  view.scorer = v; saveView(); render(); };
$("#variant").onchange = e => { const v = e.target.value; if (v === "__manage") { e.target.value = doc.activeVariant; return openVariants(); } switchVariant(v); };
function switchVariant(id, focus) {
  if (!varById(id) || id === doc.activeVariant) return;
  flushField(true);
  doc.activeVariant = id; selId = selFlow = null; multi = []; view.diff = null; $("#diffbar").hidden = true;
  touch(); render({ fit: true }).then(() => { if (focus && inVariant(focus)) goTo(focus); });
  toast(`Variant “${tx(varById(id), "name")}”`);
}
$("#zin").onclick = () => cy.animate({ zoom: { level: cy.zoom() * 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } } }, { duration: 150 });
$("#zout").onclick = () => cy.animate({ zoom: { level: cy.zoom() / 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } } }, { duration: 150 });
$("#zfit").onclick = () => fitView(true);
$("#doc-title").ondblclick = () => { const l = curLang(); const v = prompt(`Name of this function analysis (${langName(l)})`, txRaw(doc, "title", l)); if (v != null && v.trim()) commit(() => txSet(doc, "title", l, v.trim())); };

/* ================= Search ================= */
let matches = [], matchIdx = -1;
function doSearch(jump) {
  if (!cy) return;
  const q = $("#q").value.trim().toLowerCase();
  cy.elements().removeClass("match"); matches = [];
  if (!q) { $("#qcount").textContent = ""; return; }
  const V = curVar();
  const hay = o => [...txAll(o), ...(o.measure != null ? txAll(o, "measure") : []), o.notes || "", ...(o.sources || []).map(sourceSearchText)].join(" ").toLowerCase();
  const tagHit = o => q.startsWith("#") && orderedTags(o.tags || []).some(t => txAll(t, "name").some(n => n.toLowerCase().includes(q.slice(1))));
  const hit = o => o && (q.startsWith("#") ? tagHit(o) : hay(o).includes(q));
  const sysObj = id => { const r = apById(id); return r ? { ...r.el, tags: r.ap.tags } : findEditable(id); }; // the element's texts with this appearance's tags
  (view.mode === "system" ? [...allAps().map(x => x.ap.id), ...doc.system.groups.map(g => g.id)] : view.mode === "goals" ? [GOAL_ROOT, ...(curTree() ? curTree().nodes.map(n => n.goal) : [])] : [V.root, ...Object.keys(V.placed), ...V.externals.map(x => x.id), ...V.flows.map(l => l.id)])
    .forEach(id => { const o = view.mode === "system" ? sysObj(id) : findEditable(id); if (hit(o) || (o && o.needs && !q.startsWith("#") && o.needs.toLowerCase().includes(q))) matches.push(id); });
  matches.forEach(id => cy.getElementById(id).addClass("match"));
  $("#qcount").textContent = matches.length ? `${matchIdx >= 0 ? matchIdx + 1 + "/" : ""}${matches.length}` : "0";
  if (jump && matches.length) { matchIdx = (matchIdx + 1) % matches.length; goTo(matches[matchIdx]); $("#qcount").textContent = `${matchIdx + 1}/${matches.length}`; }
}
$("#q").addEventListener("input", () => { matchIdx = -1; doSearch(false); });
$("#q").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); doSearch(true); } if (e.key === "Escape") { $("#q").value = ""; doSearch(false); $("#q").blur(); } });

/* ================= Functions ⇄ system map ================= */
function elementOptions(sel, V, prefer) { // elements as <option>s, for externals and flows; outside the boundary first for externals
  const b = V && V.systemBoundary && bndById(V.systemBoundary), inside = new Set(b ? b.members : []);
  const isIn = e => e.at.every(p => inside.has(p.id)), some = e => e.at.some(p => inside.has(p.id));
  const opt = e => `<option value="${esc(e.id)}"${e.id === sel ? " selected" : ""}>${esc(tx(e) || "(no text)")} · ${esc(e.at.map(p => levelName(p.level)).join(", "))}${b ? (isIn(e) ? " · inside" : some(e) ? " · partly inside" : " · outside") : ""}</option>`;
  const E = doc.system.elements;
  if (!b || prefer === "any") return E.map(opt).join("");
  const out = E.filter(e => !isIn(e)), inn = E.filter(isIn);
  return (prefer === "outside" ? [["Outside the boundary", out], ["Inside the boundary", inn]] : [["Inside the boundary", inn], ["Outside the boundary", out]])
    .filter(x => x[1].length).map(([lab, es]) => `<optgroup label="${lab}">${es.map(opt).join("")}</optgroup>`).join("");
}
function appearanceOptions(V, skip = []) { // every appearance, "Water · Plant", for "acts on"; inside the boundary first
  const b = V && V.systemBoundary && bndById(V.systemBoundary), inside = new Set(b ? b.members : []), no = new Set(skip);
  const A = allAps().filter(x => !no.has(x.ap.id));
  const opt = x => `<option value="${esc(x.ap.id)}">${esc(apLabel(x.ap.id, true))}${x.el.at.length > 1 ? ` (${roman(apNumber(x.el, x.ap.id))})` : ""}</option>`;
  if (!b) return A.map(opt).join("");
  return [["Inside the boundary", A.filter(x => inside.has(x.ap.id))], ["Outside the boundary", A.filter(x => !inside.has(x.ap.id))]]
    .filter(x => x[1].length).map(([lab, xs]) => `<optgroup label="${lab}">${xs.map(opt).join("")}</optgroup>`).join("");
}
function actsOnField(f, V) {
  if (!doc.system.elements.length) return `<div class="field"><span>Acts on</span><p class="muted">Add elements in the <button type="button" class="linkbtn" data-tomode="system">System</button> mode to say what this function acts on.</p></div>`;
  const b = V.systemBoundary && bndById(V.systemBoundary), inside = new Set(b ? b.members : []);
  return `<div class="field"><span>Acts on · elements of the system map, on a level${b ? ` (boundary ${esc(tx(b, "name"))})` : ""}</span>
    <div class="rcalinks">${(f.actsOn || []).map(id => { const out = b && !inside.has(id);
      return `<span class="rcachip${out ? " warnchip" : ""}" title="${out ? "Outside this variant's boundary" : ""}">${out ? "⚠ " : ""}<button type="button" class="linkbtn" data-go="${esc(id)}">${esc(apLabel(id))}</button><button type="button" data-unact="${esc(id)}" aria-label="Remove">×</button></span>`; }).join("")}</div>
    <select id="f-acts"><option value="">Add an element…</option>${appearanceOptions(V, f.actsOn || [])}</select></div>`;
}
function bindActsOn(f) {
  $$("[data-unact]").forEach(b => b.onclick = () => commit(() => { const m = fnById(f.id); m.actsOn = m.actsOn.filter(x => x !== b.dataset.unact); }));
  $("#f-acts") && ($("#f-acts").onchange = e => { const v = e.target.value; if (v) commit(() => { const m = fnById(f.id); m.actsOn = [...new Set([...(m.actsOn || []), v])]; }); });
}
function systemSection(V) {
  const c = systemChecks(V); if (!c) return "";
  const moved = movedNote && movedNote.v === V.id ? movedNote : null;
  const elLine = (id, extra = "") => { // an appearance (with its level), or an element (with the levels where it is outside)
    const r = apById(id), e = r ? r.el : elById(id); if (!e) return "";
    const where = r ? levelName(r.ap.level) : e.at.filter(p => !c.inside.has(p.id)).map(p => levelName(p.level)).join(", ");
    return `<li${extra ? ' class="wbtn"' : ""}><button data-go="${esc(id)}">${elSwatch(e)}<span>${nmOf(e)} <span class="muted">· ${esc(where)}</span></span></button>${extra}</li>`; };
  const n = c.unaddressed.length + c.outside.length + c.extInside.length;
  return `<div class="sec"><h2>Against the system map · ${n ? `${n} to look at` : "no gaps"}</h2>
    ${moved ? `<div class="movednote"><b>Boundary changed</b> from ${moved.from ? `“${esc(tx(bndById(moved.from) || { name: "?" }, "name"))}”` : "none"} to ${moved.to ? `“${esc(tx(bndById(moved.to) || { name: "?" }, "name"))}”` : "none"}.
      ${moved.entered.length ? `<p>Now inside (${moved.entered.length}):</p><ul class="list">${moved.entered.filter(apById).map(id => elLine(id)).join("")}</ul>` : ""}
      ${moved.left.length ? `<p>Now outside (${moved.left.length}):</p><ul class="list">${moved.left.filter(apById).map(id => elLine(id)).join("")}</ul>` : ""}
      ${!moved.entered.length && !moved.left.length ? "<p>The same elements are inside.</p>" : ""}<button class="btn small" id="mv-ok">Got it</button></div>` : ""}
    <details class="ck"${c.unaddressed.length ? " open" : ""}><summary>Inside the boundary, but no function acts on it · ${c.unaddressed.length}</summary>
      ${c.unaddressed.length ? `<ul class="list">${c.unaddressed.map(id => elLine(id, `<button class="btn small" data-fnfor="${esc(id)}" title="Add a function acting on it">+ function</button>`)).join("")}</ul>` : `<p class="muted">Every element inside is acted on.</p>`}</details>
    <details class="ck"${c.outside.length ? " open" : ""}><summary>Functions acting on something outside the boundary · ${c.outside.length}</summary>
      ${c.outside.length ? `<ul class="list">${c.outside.map(o => `<li><button data-go="${esc(o.fn)}">${fnSwatch(o.fn)}<span>${nmOf(fnById(o.fn))} <span class="muted">→ ${esc(apLabel(o.el, true))}</span></span></button></li>`).join("")}</ul>` : `<p class="muted">None.</p>`}</details>
    <details class="ck"${c.extInside.length ? " open" : ""}><summary>Externals that are inside the boundary · ${c.extInside.length}</summary>
      ${c.extInside.length ? itemList(c.extInside) : `<p class="muted">None.</p>`}</details>
    <details class="ck"><summary>Add externals from the system map · ${c.candidates.length} outside</summary>
      ${c.candidates.length ? `<ul class="list">${c.candidates.map(id => elLine(id, `<button class="btn small" data-addext="${esc(id)}">+ external</button>`)).join("")}</ul>` : `<p class="muted">Every element outside is already an external.</p>`}</details></div>`;
}
function bindSystemSection(V) {
  $("#f-sysb") && ($("#f-sysb").onchange = e => { const to = e.target.value || null, from = V.systemBoundary;
    movedNote = from ? boundaryMove(V, from, to) : null; // what moved, shown until dismissed
    commit(() => { curVar().systemBoundary = to; }); });
  $("#mv-ok") && ($("#mv-ok").onclick = () => { movedNote = null; renderPanel(); });
  $$("[data-fnfor]").forEach(b => b.onclick = () => { const c = centreOf(V.root, V); addFunctionAt(c.x, c.y + 40, V.root, null, { actsOn: [b.dataset.fnfor] }); });
  $$("[data-addext]").forEach(b => b.onclick = () => {
    const root = cy.getElementById(V.root), bb = root.nonempty() ? root.boundingBox({ includeLabels: false }) : { x1: -300, y1: 0, y2: 200 };
    const left = V.externals.filter(x => x.x < bb.x1).length;
    const x = newExternal("", bb.x1 - 170, bb.y1 + 30 + left * 60); x.ref = b.dataset.addext;
    commit(() => { curVar().externals.push(x); });
  });
}
$("#panel").addEventListener("click", e => { const b = e.target.closest("[data-tomode]"); if (b) setMode(b.dataset.tomode); });
