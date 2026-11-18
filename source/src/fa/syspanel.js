/* ================= System map: side panel ================= */
const elSwatch = e => { const c = kindColors(e.kind); return `<span class="sw elsw${e.kind === "actor" ? " actor" : ""}" style="background:${c.fill};border-color:${c.stroke}"></span>`; };
const apNum = (el, id) => el.at.length > 1 ? `<span class="apnum" title="Appearance ${apNumber(el, id)} of ${el.at.length}">${roman(apNumber(el, id))}</span>` : "";
const elList = ids => `<ul class="list">${ids.map(id => { const r = apById(id); if (!r) return "";
  return `<li><button data-go="${esc(id)}">${elSwatch(r.el)}<span>${nmOf(r.el)}${r.el.at.length > 1 ? ` <span class="muted">· ${esc(levelName(r.ap.level))}</span>` : ""}</span>${apNum(r.el, id)}${tagPillsOf(r.ap) ? `<span class="tps">${tagPillsOf(r.ap)}</span>` : ""}</button></li>`; }).join("")}</ul>`;

function sysPanel(p) {
  if (multi.length > 1) {
    const ids = multi.filter(id => apById(id)), els = [...new Set(ids.map(id => apById(id).el))];
    p.innerHTML = `<div class="sec"><h2>${ids.length} selected</h2>${elList(ids)}
      <div class="row"><button class="btn" id="p-grp">Group them <kbd>G</kbd></button>${sysFocus ? `<button class="btn" id="p-mem">In / out of the boundary</button>` : ""}<button class="btn danger" id="p-del">Delete <kbd>Del</kbd></button></div>
      <div class="field"><span>Tag all of them</span><div class="tagpick" id="f-tags">${tagPicker(ids.map(id => apById(id).ap))}</div></div></div>
      ${els.length > 1 ? `<div class="sec mergebox"><h2>The same thing on several levels?</h2>
        <p class="muted">Merge them into one element. Each circle stays on its level, with its own tags, group and boundaries; the name, kind, needs, notes and sources become one, and what is missing in a language is filled from the others.</p>
        <p class="muted">Keep the name of</p><div class="mergepick">${els.map(e => `<button class="btn" data-merge="${esc(e.id)}">${elSwatch(e)} ${nmOf(e)} <span class="muted">· ${esc(e.at.map(x => levelName(x.level)).join(", "))}</span></button>`).join("")}</div></div>` : ""}`;
    $("#p-grp").onclick = groupSelection; $("#p-del").onclick = deleteSelection;
    $("#p-mem") && ($("#p-mem").onclick = () => toggleMembers(ids));
    $$("#f-tags [data-tag]").forEach(b => b.onclick = () => toggleTag(ids, b.dataset.tag));
    $$("[data-merge]").forEach(b => b.onclick = () => mergeElements(b.dataset.merge, ids));
    return;
  }
  if (selId && apById(selId)) return elementPanel(p, apById(selId));
  if (selId && grpById(selId)) return groupPanel(p, grpById(selId));
  sysOverview(p);
}

function elementPanel(p, { el: e, ap }) {
  const many = e.at.length > 1, aps = apsInOrder(e);
  const uses = actedOnBy(e.at.map(x => x.id));
  const inB = doc.system.boundaries;
  const freeLevels = doc.system.levels.filter(l => !e.at.some(x => x.level === l.id));
  const here = many ? `This circle · ${esc(levelName(ap.level))} <span class="apnum">${roman(apNumber(e, ap.id))}</span>` : "On the map";
  p.innerHTML = `<div class="sec">
      <p class="kicker">${esc(kindName(e.kind))} · ${many ? `on ${e.at.length} levels` : esc(levelName(ap.level))}${!many && ap.group ? ` · ${esc(tx(grpById(ap.group)) || "group")}` : ""}</p>
      ${textFields(e, "text", "Element", 2, true, "e.g. grower, fruit, rain, Botrytis conidia")}
      <div class="field"><span>Kind</span><div class="seg kindsel" role="group" aria-label="Kind">${Object.keys(KINDS).map(k =>
        `<button data-kind="${k}" aria-pressed="${e.kind === k}" title="${esc(KINDS[k].hint)}">${elSwatch({ kind: k })}${esc(kindName(k))}</button>`).join("")}</div></div>
      ${e.kind === "actor" ? `<label class="field"><span>Needs · what this actor needs from the system (RIO step C), one per line</span><textarea id="f-needs" rows="3" placeholder="e.g. fewer rejected shipments&#10;a stable price">${esc(e.needs)}</textarea></label>` : ""}
      ${notesAndSources(e)}
      ${many ? `<p class="muted">The name, kind${e.kind === "actor" ? ", needs" : ""}, notes and sources are shared by its ${e.at.length} circles.</p>` : ""}</div>
    <div class="sec aphere"><h2>${here}</h2>
      <p class="muted">Level: <b>${esc(levelName(ap.level))}</b>. Drag the circle into another ring to change it.</p>
      ${doc.system.groups.length ? `<label class="field"><span>Group</span><select id="f-group"><option value="">No group</option>${doc.system.groups.map(g => `<option value="${esc(g.id)}"${ap.group === g.id ? " selected" : ""}>${esc(tx(g) || "Group")}</option>`).join("")}</select></label>` : ""}
      ${inB.length ? `<div class="field"><span>Inside these boundaries${many ? " · here" : ""}</span><div class="bchecks">${inB.map(b => `<label class="chk"><input type="checkbox" data-inb="${esc(b.id)}"${b.members.includes(ap.id) ? " checked" : ""}> ${esc(tx(b, "name"))}</label>`).join("")}</div></div>` : ""}
      <div class="field"><span>Tags · the chain stage it belongs to${many ? " here" : ""} · <button type="button" class="linkbtn" data-act="tags">edit tags</button></span><div class="tagpick" id="f-tags">${tagPicker([ap])}</div></div>
      <div class="row"><button class="btn" id="p-grp">${ap.group ? "Ungroup" : "Group"}</button><button class="btn danger" id="p-del">${many ? "Remove from this level" : "Delete"} <kbd>Del</kbd></button></div></div>
    <div class="sec"><h2>${many ? `On ${e.at.length} levels` : "On other levels"}</h2>
      ${many ? `<ul class="list aplist">${aps.map(x => `<li class="${x.id === ap.id ? "on" : ""}"><button data-go="${esc(x.id)}"><span class="apnum">${roman(apNumber(e, x.id))}</span><span>${esc(levelName(x.level))}<span class="muted">${inB.filter(b => b.members.includes(x.id)).length ? ` · in ${inB.filter(b => b.members.includes(x.id)).map(b => esc(tx(b, "name"))).join(", ")}` : ""}</span></span>${tagPillsOf(x) ? `<span class="tps">${tagPillsOf(x)}</span>` : ""}</button></li>`).join("")}</ul>`
        : `<p class="muted">Present on another level too, such as water in the landscape and on the plant? Add it there: one element, a circle on each level.</p>`}
      ${freeLevels.length ? `<label class="field"><span>Also on</span><select id="f-addlv"><option value="">Add to another level…</option>${freeLevels.map(l => `<option value="${esc(l.id)}">${esc(tx(l, "name"))}</option>`).join("")}</select></label>` : ""}
      ${many ? `<div class="row"><button class="btn" id="p-split" title="When this circle is in fact something else">Split this circle off as its own element</button><button class="btn danger" id="p-delall">Delete on every level</button></div>` : ""}</div>
    <div class="sec"><h2>Functions acting on it · ${uses.length}</h2>${uses.length ? `<ul class="list">${uses.map(u =>
      `<li><button data-fngo="${esc(u.f.id)}" data-fnv="${esc(u.v ? u.v.id : "")}">${fnSwatchPlain(u.f)}<span>${nmOf(u.f)}${many ? ` <span class="muted">→ ${esc(levelName(apById(u.ap).ap.level))}</span>` : ""}${u.v ? ` <span class="muted">· ${esc(tx(u.v, "name"))}</span>` : ` <span class="muted">· in the catalogue only</span>`}</span></button></li>`).join("")}</ul>`
      : `<p class="muted">None yet. In Functions, pick it under <b>Acts on</b> for a function.</p>`}</div>`;
  bindTextFields(e.id); bindNotesAndSources(e.id);
  $$(".kindsel [data-kind]").forEach(b => b.onclick = () => commit(() => { elById(e.id).kind = b.dataset.kind; }));
  $("#f-needs") && ($("#f-needs").addEventListener("input", ev => fieldEdit(e.id, m => { m.needs = ev.target.value; })), $("#f-needs").addEventListener("change", () => flushField()));
  $("#f-group") && ($("#f-group").onchange = ev => commit(() => { apById(ap.id).ap.group = ev.target.value || null; pruneGroups(); }));
  $$("[data-inb]").forEach(c => c.onchange = () => commit(() => { const b = bndById(c.dataset.inb); b.members = b.members.filter(x => x !== ap.id); if (c.checked) b.members.push(ap.id); }));
  $$("#f-tags [data-tag]").forEach(b => b.onclick = () => toggleTag([ap.id], b.dataset.tag));
  $("#p-grp").onclick = () => ap.group ? commit(() => { apById(ap.id).ap.group = null; pruneGroups(); }) : groupSelection();
  $("#p-del").onclick = deleteSelection;
  $("#f-addlv") && ($("#f-addlv").onchange = ev => ev.target.value && addAppearance(ap.id, ev.target.value));
  $("#p-split") && ($("#p-split").onclick = () => splitAppearance(ap.id));
  $("#p-delall") && ($("#p-delall").onclick = () => { if (!confirm(`Delete “${tx(e)}” on all ${e.at.length} levels? Ctrl Z brings it back.`)) return; selId = null; multi = []; deleteElements([ap.id], true); });
}
const fnSwatchPlain = f => `<span class="sw${f.kind === "aux" ? " aux" : ""}" style="background:${levelStyle(1).fill};border-color:${levelStyle(1).stroke}"></span>`;

function groupPanel(p, g) {
  const mem = allAps().filter(x => x.ap.group === g.id).map(x => x.ap.id);
  p.innerHTML = `<div class="sec"><p class="kicker">Group · a sub-system</p>
      ${textFields(g, "text", "Name", 1, true, "e.g. asexual reproduction")}
      <label class="field"><span>Notes · only for you</span><textarea id="f-notes" rows="2">${esc(g.notes)}</textarea></label>
      <div class="row">${sysFocus ? `<button class="btn" id="p-mem">All in / out of the boundary</button>` : ""}<button class="btn" id="p-ungrp">Ungroup</button></div></div>
    <div class="sec"><h2>Elements · ${mem.length}</h2>${elList(mem)}</div>`;
  bindTextFields(g.id);
  $("#f-notes").addEventListener("input", ev => fieldEdit(g.id, m => { m.notes = ev.target.value; }));
  $("#p-ungrp").onclick = () => { selId = null; multi = []; ungroup(g.id); };
  $("#p-mem") && ($("#p-mem").onclick = () => toggleMembers(mem));
}

function sysOverview(p) {
  const S = doc.system;
  const usedBy = b => doc.variants.filter(v => v.systemBoundary === b.id);
  const chainTags = doc.tags.filter(t => t.group === S.chain.group);
  const A = allAps(), out = A.filter(x => !x.ap.level), same = sameNameSets();
  p.innerHTML = `
    <div class="sec"><h2>Boundaries</h2>
      <p class="muted">Click a boundary to see it on the map; the rest fades. Each function-analysis variant can work inside one of them.</p>
      ${S.boundaries.length ? `<ul class="blist">${S.boundaries.map(b => `<li class="${b.id === sysFocus ? "on" : ""}">
        <button class="bname" data-focus="${esc(b.id)}"><span class="bdash"></span><span><b>${esc(tx(b, "name"))}</b><span class="muted"> · ${insideCount(b).replace(/ inside$/, "")}${usedBy(b).length ? ` · used by ${usedBy(b).map(v => esc(tx(v, "name"))).join(", ")}` : ""}${treeOfBoundary(b.id) ? ` · goals tree of ${treeOfBoundary(b.id).nodes.length}` : ""}</span></span></button>
        <span class="bacts"><button class="btn small" data-bedit="${esc(b.id)}">Edit members</button><button class="btn small" data-bdup="${esc(b.id)}" title="Duplicate">Copy</button><button class="btn small icon danger" data-bdel="${esc(b.id)}" aria-label="Delete boundary" title="Delete boundary">×</button></span></li>`).join("")}</ul>` : `<p class="muted">None yet.</p>`}
      <div class="row"><button class="btn" id="b-new">New boundary</button>${multi.length > 1 ? `<button class="btn" id="b-newsel">From the ${multi.length} selected</button>` : ""}</div>
      ${sysFocus ? `<div class="bfocus">${textFields(bndById(sysFocus), "name", "Name of the boundary in focus", 1)}
        <label class="field"><span>Why this boundary · only for you</span><textarea id="f-bnote" rows="2" placeholder="e.g. what the exporter can change">${esc(bndById(sysFocus).note)}</textarea></label></div>` : ""}
    </div>
    ${same.length ? `<div class="sec"><h2>Same name, separate elements · ${same.length}</h2>
      <p class="muted">These share a name in some language. If each is one thing on several levels, merge it: one element with a circle on each level.</p>
      <ul class="list samelist">${same.map(set => { const es = set.map(elById); return `<li class="wbtn"><button data-same="${esc(set.join(" "))}">${elSwatch(es[0])}<span>${es.map(e => `${nmOf(e)} <span class="muted">· ${esc(e.at.map(x => levelName(x.level)).join(", "))}</span>`).join("<br>")}</span></button>
        <span class="bacts"><button class="btn small" data-same="${esc(set.join(" "))}">Review</button><button class="btn small" data-apart="${esc([...set].sort().join("|"))}" title="They only share a name: stop suggesting this">Keep apart</button></span></li>`; }).join("")}</ul></div>` : ""}
    <div class="sec"><h2>Chain of stages</h2>
      <label class="chk"><input type="checkbox" id="ch-on"${S.chain.on ? " checked" : ""}> Draw the stages as a chain under the rings</label>
      <p class="muted">Rings show scale; the chain shows where along the process an element acts. An element's stage is its tag.</p>
      <label class="field"><span>Stages from the tag group</span><select id="ch-group">${doc.tagGroups.map(g => `<option value="${esc(g.id)}"${g.id === S.chain.group ? " selected" : ""}>${esc(tx(g, "name"))}</option>`).join("")}</select></label>
      ${chainTags.length ? `<ol class="chainlist">${chainTags.map((t, i) => `<li><span>${t.emoji} ${esc(tx(t, "name"))} <span class="muted">· ${A.filter(x => x.ap.tags.includes(t.id)).length}</span></span>
        <span><button class="btn small icon" data-tup="${esc(t.id)}" aria-label="Earlier" title="Earlier in the chain"${i === 0 ? " disabled" : ""}>↑</button><button class="btn small icon" data-tdown="${esc(t.id)}" aria-label="Later" title="Later in the chain"${i === chainTags.length - 1 ? " disabled" : ""}>↓</button></span></li>`).join("")}</ol>`
        : `<p class="muted">This group has no tags. <button type="button" class="linkbtn" data-act="tags">Add tags</button> (the tag editor offers the stages of a fresh-produce export chain), or link the RCA file to bring its tags.</p>`}
    </div>
    <div class="sec"><h2>Levels · ${S.levels.length}</h2>
      <ul class="list">${S.levels.map((l, i) => `<li class="lvline"><span class="sw" style="background:${l.fill};border-color:${l.stroke}"></span><span>${esc(tx(l, "name"))} <span class="muted">· ${A.filter(x => x.ap.level === l.id).length}</span></span></li>`).join("")}
        ${out.length ? `<li class="lvline"><span class="sw" style="background:transparent"></span><span>Outside every level <span class="muted">· ${out.length}</span></span></li>` : ""}</ul>
      <div class="row"><button class="btn" data-act="levels">Edit levels</button></div></div>
    <div class="sec"><h2>Getting around</h2>
      <p class="muted">Double-click to add an element where you click; its ring sets its level. An element present on several levels gets a circle on each (<b>Also on</b> in its panel), numbered I, II… from the outermost. Shift-click to select several and press <kbd>G</kbd> to group them. Click a boundary above to focus on it, then <b>Edit members</b> and click elements, groups or level names to include or exclude them.</p></div>`;
  $$("[data-focus]").forEach(b => b.onclick = () => focusBoundary(b.dataset.focus === sysFocus ? null : b.dataset.focus));
  $$("[data-bedit]").forEach(b => b.onclick = () => focusBoundary(b.dataset.bedit, true));
  $$("[data-bdup]").forEach(b => b.onclick = () => { const s = bndById(b.dataset.bdup); const c = { ...clone(s), id: uid("b"), name: s.name + " (copy)", nameTr: {} }; commit(() => doc.system.boundaries.push(c)).then(() => focusBoundary(c.id)); });
  $$("[data-bdel]").forEach(b => b.onclick = () => { const s = bndById(b.dataset.bdel), vs = usedBy(s);
    const gt = treeOfBoundary(s.id), orphan = gt && !treeOfBoundary(null);
    if (!confirm(`Delete the boundary “${s.name}”?${vs.length ? ` ${vs.length} variant${vs.length > 1 ? "s use" : " uses"} it and will have none.` : ""}${gt ? ` Its goals tree ${orphan ? "becomes the tree with no boundary" : "is deleted (its goals stay in the catalogue)"}.` : ""} Ctrl Z brings it back.`)) return;
    commit(() => { doc.system.boundaries = doc.system.boundaries.filter(x => x !== s); doc.variants.forEach(v => { if (v.systemBoundary === s.id) v.systemBoundary = null; }); if (sysFocus === s.id) sysFocus = null;
      const t = treeOfBoundary(s.id); if (t) { if (orphan) t.boundary = null; else { doc.goals.trees = doc.goals.trees.filter(x => x !== t); if (doc.goals.active === t.id) doc.goals.active = (doc.goals.trees[0] || {}).id || null; } } }); });
  $("#b-new").onclick = () => newBoundary([]);
  $("#b-newsel") && ($("#b-newsel").onclick = () => newBoundary(multi.filter(id => apById(id))));
  $$("[data-same]").forEach(b => b.onclick = () => { const ids = b.dataset.same.split(" ").map(id => elById(id).at[0].id); selId = ids[ids.length - 1]; multi = ids; selFlow = null; applySelection(); renderPanel();
    cy.animate({ fit: { eles: cy.collection(ids.map(id => cy.getElementById(id))), padding: 120 } }, { duration: 260 }); });
  $$("[data-apart]").forEach(b => b.onclick = () => commit(() => { doc.system.apart = [...new Set([...(doc.system.apart || []), b.dataset.apart])]; }));
  if (sysFocus) { bindTextFields(sysFocus); $("#f-bnote").addEventListener("input", ev => fieldEdit(sysFocus, m => { m.note = ev.target.value; })); }
  $("#ch-on").onchange = ev => commit(() => { doc.system.chain.on = ev.target.checked; }, { fit: true });
  $("#ch-group").onchange = ev => commit(() => { doc.system.chain.group = ev.target.value; });
  const moveTag = (id, dir) => commit(() => { // swap with the neighbour of the same group, so the tag editor shows the same order
    const T = doc.tags, i = T.findIndex(t => t.id === id), g = T[i].group;
    let j = i + dir; while (j >= 0 && j < T.length && T[j].group !== g) j += dir;
    if (j < 0 || j >= T.length) return; [T[i], T[j]] = [T[j], T[i]];
  });
  $$("[data-tup]").forEach(b => b.onclick = () => moveTag(b.dataset.tup, -1));
  $$("[data-tdown]").forEach(b => b.onclick = () => moveTag(b.dataset.tdown, 1));
}
$("#panel").addEventListener("click", e => {
  const b = e.target.closest("[data-fngo]"); if (!b) return;
  setMode("functions"); if (b.dataset.fnv && b.dataset.fnv !== doc.activeVariant) switchVariant(b.dataset.fnv, b.dataset.fngo); else setTimeout(() => goTo(b.dataset.fngo), 50);
});

/* ================= Levels dialog ================= */
let lvDraft = [];
function openLevels() { lvDraft = clone(doc.system.levels); drawLevels(); $("#m-levels").hidden = false; }
function drawLevels() {
  const L = doc.languages, count = id => allAps().filter(x => x.ap.level === id).length;
  $("#lv-rows").innerHTML = lvDraft.map((l, i) => `<div class="lvrow">
    <span class="lvn">${i + 1}</span>
    <input type="text" data-k="name" data-i="${i}" value="${esc(l.name)}" placeholder="Name" aria-label="Name">
    ${L.slice(1).map(x => `<label class="trin"><b>${esc(x.toUpperCase())}</b><input type="text" data-k="tr" data-l="${esc(x)}" data-i="${i}" value="${esc((l.nameTr || {})[x] || "")}"></label>`).join("")}
    <input type="color" data-k="fill" data-i="${i}" value="${esc(l.fill)}" aria-label="Fill" title="Fill">
    <input type="color" data-k="stroke" data-i="${i}" value="${esc(l.stroke)}" aria-label="Outline" title="Outline">
    <span class="tcount" title="Circles in this level">${count(l.id)}</span>
    <button class="btn small icon" data-lvup="${i}" aria-label="Move outwards" title="Move outwards"${i === 0 ? " disabled" : ""}>↑</button>
    <button class="btn small icon" data-lvdown="${i}" aria-label="Move inwards" title="Move inwards"${i === lvDraft.length - 1 ? " disabled" : ""}>↓</button>
    <button class="btn small icon" data-lvdel="${i}" aria-label="Delete level" title="Delete level"${lvDraft.length < 2 ? " disabled" : ""}>×</button></div>`).join("");
}
$("#lv-rows").addEventListener("input", e => {
  const el = e.target, i = +el.dataset.i, k = el.dataset.k; if (!k) return;
  if (k === "tr") { lvDraft[i].nameTr = lvDraft[i].nameTr || {}; lvDraft[i].nameTr[el.dataset.l] = el.value.trim(); } else lvDraft[i][k] = el.value;
});
$("#lv-rows").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.lvup) { const i = +b.dataset.lvup; [lvDraft[i - 1], lvDraft[i]] = [lvDraft[i], lvDraft[i - 1]]; }
  if (b.dataset.lvdown) { const i = +b.dataset.lvdown; [lvDraft[i + 1], lvDraft[i]] = [lvDraft[i], lvDraft[i + 1]]; }
  if (b.dataset.lvdel) { lvDraft.splice(+b.dataset.lvdel, 1); }
  drawLevels();
});
$("#lv-add").onclick = () => { const c = LEVEL_COLORS[lvDraft.length % LEVEL_COLORS.length]; lvDraft.push({ id: uid("lv"), name: "New level", nameTr: {}, ...c }); drawLevels(); };
$("#lv-save").onclick = () => {
  const keep = new Set(lvDraft.map(l => l.id)), oldOrder = doc.system.levels.map(l => l.id);
  $("#m-levels").hidden = true;
  commit(() => {
    // elements of a deleted level move to the nearest level that stays, keeping their place in the ring
    allAps().forEach(({ ap: e }) => {
      if (!e.level || keep.has(e.level)) return;
      const i = oldOrder.indexOf(e.level); const near = [...oldOrder.slice(i + 1), ...oldOrder.slice(0, i).reverse()].find(id => keep.has(id));
      e.level = near || null; if (!near) { e.x = 0; e.y = 0; }
    });
    doc.system.levels = lvDraft.map(l => ({ ...l, name: l.name.trim() || "Level", nameTr: trObj(l.nameTr) }));
  }, { fit: true });
  toast("Levels updated. Elements keep their level and their place in its ring; Ctrl Z to undo.");
};

/* ================= System map: exports ================= */
function exportSystemSVG() {
  const ink = "#1b2420", muted = "#5f6e68";
  const vis = cy.elements().filter(e => e.visible());
  const bb = vis.boundingBox({ includeLabels: true });
  const pad = 30, W = Math.ceil(bb.w + pad * 2), H = Math.ceil(bb.h + pad * 2 + 30), ox = pad - bb.x1, oy = pad - bb.y1;
  const X = v => (v + ox).toFixed(1), Y = v => (v + oy).toFixed(1);
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="IBM Plex Sans, Helvetica, Arial, sans-serif">`,
    `<title>${esc(tx(doc, "title"))} · system</title>`, `<rect width="100%" height="100%" fill="#ffffff"/>`];
  const S = doc.system;
  ringGeom().forEach((g, i) => { const l = S.levels[i];
    out.push(`<ellipse cx="${X(g.cx)}" cy="${Y(g.cy)}" rx="${g.rx}" ry="${g.ry}" fill="${l.fill}" stroke="${l.stroke}" stroke-width="1.2"/>`);
    out.push(`<text x="${X(g.cx)}" y="${Y(g.cy - g.ry + 17)}" font-size="13" font-weight="600" fill="${ink}" text-anchor="middle" dominant-baseline="central">${esc(tx(l, "name"))}</text>`); });
  cy.nodes(".grp").forEach(n => { const b = n.boundingBox({ includeLabels: false });
    out.push(`<rect x="${X(b.x1)}" y="${Y(b.y1)}" width="${b.w.toFixed(1)}" height="${b.h.toFixed(1)}" rx="${Math.min(60, b.w / 2, b.h / 2).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="1.4" stroke-dasharray="0.1 4" stroke-linecap="round"${n.hasClass("faded") ? ` opacity="0.25"` : ""}/>`);
    out.push(`<text x="${X((b.x1 + b.x2) / 2)}" y="${Y(b.y1 + 20)}" font-size="12" fill="${ink}" text-anchor="middle" dominant-baseline="central"${n.hasClass("faded") ? ` opacity="0.25"` : ""}>${esc(n.data("label"))}</text>`); });
  if (sysFocus && sysContour.path) {
    out.push(`<path d="${sysContour.path}" transform="translate(${ox.toFixed(1)},${oy.toFixed(1)})" fill="#0E6B4E" fill-opacity="0.05" stroke="#0E6B4E" stroke-width="2" stroke-dasharray="9 6"/>`);
    if (sysContour.label) out.push(`<text x="${X(sysContour.label.x)}" y="${Y(sysContour.label.y)}" font-size="13" font-weight="600" fill="#0E6B4E" text-anchor="middle">${esc(sysContour.label.text)}</text>`);
  }
  cy.nodes(".elem").forEach(n => { const d = n.data(), p = n.position(), r = n.width() / 2, op = n.hasClass("faded") ? ` opacity="0.25"` : "";
    const [fill, stroke] = KIND_COLORS[(elOf(n.id()) || {}).kind] || KIND_COLORS.object;
    out.push(`<g${op}><circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${r.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${d.bw}"/>`);
    const lines = d.label.split("\n"), lh = LINE - 1, y0 = p.y - (lines.length - 1) * lh / 2;
    lines.forEach((l, i) => out.push(`<text x="${X(p.x)}" y="${Y(y0 + i * lh)}" font-size="${FONT_PX - 1}"${d.fs === "italic" ? ` font-style="italic"` : ""} fill="${ink}" text-anchor="middle" dominant-baseline="central">${esc(l)}</text>`));
    out.push(`</g>`); });
  cy.nodes(".apb").forEach(n => { const d = n.data(), p = n.position(), op = n.hasClass("faded") ? ` opacity="0.25"` : "";
    out.push(`<g${op}><rect x="${X(p.x - d.w / 2)}" y="${Y(p.y - 9)}" width="${d.w}" height="18" rx="9" fill="#FFF4D6" stroke="#C5A43A" stroke-width="1"/><text x="${X(p.x)}" y="${Y(p.y)}" font-size="10" font-weight="600" fill="${ink}" text-anchor="middle" dominant-baseline="central">${esc(d.label)}</text></g>`); });
  cy.nodes(".badge").not(".apb").forEach(n => { const d = n.data(), p = n.position();
    out.push(`<rect x="${X(p.x - d.w / 2)}" y="${Y(p.y - 10.5)}" width="${d.w}" height="21" rx="10" fill="#ffffff" stroke="${muted}" stroke-width="1"${n.hasClass("faded") ? ` opacity="0.25"` : ""}/>`);
    out.push(`<text x="${X(p.x)}" y="${Y(p.y)}" font-size="13" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" text-anchor="middle" dominant-baseline="central">${esc(d.label)}</text>`); });
  cy.edges(".chainedge").forEach(e => { const s = e.sourceEndpoint(), t = e.targetEndpoint();
    out.push(`<line x1="${X(s.x)}" y1="${Y(s.y)}" x2="${X(t.x - 6)}" y2="${Y(t.y)}" stroke="${muted}" stroke-width="1.6"/><polygon points="${X(t.x)},${Y(t.y)} ${X(t.x - 8)},${Y(t.y - 4.5)} ${X(t.x - 8)},${Y(t.y + 4.5)}" fill="${muted}"/>`); });
  cy.nodes(".chainlbl").forEach(n => { const p = n.position(); out.push(`<text x="${X(p.x)}" y="${Y(p.y)}" font-size="11" font-weight="600" letter-spacing="0.06em" fill="${muted}" text-anchor="middle" dominant-baseline="central">${esc(n.data("label").toUpperCase())}</text>`); });
  cy.nodes(".stage").forEach(n => { const d = n.data(), p = n.position();
    out.push(`<rect x="${X(p.x - d.w / 2)}" y="${Y(p.y - 15)}" width="${d.w}" height="30" rx="14" fill="#ffffff" stroke="${muted}" stroke-width="1"/>`);
    out.push(`<text x="${X(p.x)}" y="${Y(p.y)}" font-size="12" font-weight="500" fill="${ink}" text-anchor="middle" dominant-baseline="central">${esc(d.label)}</text>`); });
  // key to the kinds of element
  let kx = pad; const ky = H - 18;
  Object.keys(KINDS).forEach(k => { const [f, s] = KIND_COLORS[k]; out.push(`<circle cx="${kx + 7}" cy="${ky}" r="7" fill="${f}" stroke="${s}" stroke-width="${k === "actor" ? 2.2 : 1.3}"/><text x="${kx + 20}" y="${ky}" font-size="11" fill="${muted}" dominant-baseline="central">${esc(kindName(k))}</text>`); kx += 32 + kindName(k).length * 6.5; });
  out.push(`</svg>`);
  return { svg: out.join("\n"), W, H };
}
function exportElementsCSV() { // one row per circle: an element on two levels gives two rows with the same id
  const L = doc.languages, S = doc.system;
  const rows = [["id", "appearance", ...L.map(l => "text_" + l), "kind", "level", "group", ...S.boundaries.map(b => "in_" + slug(b.name).toLowerCase()), "tags", "needs", "acted_on_by", "notes", "sources"],
    ...S.elements.flatMap(e => apsInOrder(e).map(ap => [e.id, e.at.length > 1 ? `${roman(apNumber(e, ap.id))} of ${e.at.length}` : "", ...L.map(l => txRaw(e, "text", l)), kindName(e.kind), levelName(ap.level), ap.group ? tx(grpById(ap.group)) : "",
      ...S.boundaries.map(b => b.members.includes(ap.id) ? "yes" : "no"), orderedTags(ap.tags).map(t => tx(t, "name")).join(" | "), e.needs.replace(/\n+/g, " | "),
      [...new Set(actedOnBy(ap.id).map(u => tx(u.f)))].join(" | "), e.notes, e.sources.join(" | ")]))];
  const name = `${baseName()}-system-elements.csv`; download(name, toCSV(rows), "text/csv"); toast(`${name} exported.`);
}
