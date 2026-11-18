/* ================= Tag editor ================= */
let tagDraft = null;
function openTags() {
  if (VIEWER) return;
  tagDraft = { groups: clone(doc.tagGroups), tags: clone(doc.tags) };
  drawTags(); $("#m-tags").hidden = false;
}
function drawTags() {
  const L = doc.languages, counts = {}; tagHolders().forEach(n => (n.tags || []).forEach(x => (counts[x] = (counts[x] || 0) + 1)));
  const trInputs = (o, kind, i) => L.slice(1).map(l => `<label class="trin"><b>${esc(l.toUpperCase())}</b><input type="text" data-k="${kind}" data-i="${i}" data-trl="${esc(l)}" value="${esc((o.nameTr || {})[l] || "")}" placeholder="${esc(langName(l))}"></label>`).join("");
  $("#tag-rows").innerHTML = (tagDraft.tags.length ? "" : `<div class="tagempty"><p class="muted">No tags yet. Start from the stages of a fresh-produce export chain (culture care → harvest → calyx drying → sorting → packing → storage → transport → port → sea freight, plus monitoring and communication), or add your own.</p><button class="btn" id="tag-template">Add the example stage set</button></div>`) +
    tagDraft.groups.map((g, gi) => `<div class="tgroup">
      <div class="tg-head"><input type="text" class="tg-name" data-k="g" data-i="${gi}" value="${esc(g.name)}" placeholder="Group name" aria-label="Group name">${trInputs(g, "g", gi)}</div>
      ${tagDraft.tags.map((tg, i) => tg.group !== g.id ? "" : `<div class="trow">
        <span class="emo"><input type="text" class="emoji-in" data-k="emoji" data-i="${i}" value="${esc(tg.emoji)}" aria-label="Emoji"><button type="button" class="btn small icon" data-epal="${i}" title="Pick an emoji" aria-label="Pick an emoji">▾</button></span>
        <input type="text" data-k="name" data-i="${i}" value="${esc(tg.name)}" placeholder="Name" aria-label="Tag name">
        ${trInputs(tg, "t", i)}
        <input type="text" class="tdesc" data-k="desc" data-i="${i}" value="${esc(tg.desc || "")}" placeholder="What it covers (only for you)" aria-label="Description">
        <select data-k="group" data-i="${i}" aria-label="Group">${tagDraft.groups.map(o => `<option value="${esc(o.id)}"${o.id === tg.group ? " selected" : ""}>${esc(o.name)}</option>`).join("")}</select>
        <span class="tcount">${counts[tg.id] || 0}</span>
        <span class="catacts"><button class="btn small icon" data-tup="${i}" title="Move earlier in the chain" aria-label="Move up">↑</button><button class="btn small icon" data-tdown="${i}" title="Move later in the chain" aria-label="Move down">↓</button><button class="btn small icon" data-tdel="${i}" title="Delete tag" aria-label="Delete tag">×</button></span>
      </div>`).join("")}
      <button class="btn small" data-tadd="${esc(g.id)}">＋ Add a tag to ${esc(g.name || "this group")}</button></div>`).join("");
  $("#tag-template") && ($("#tag-template").onclick = () => {
    const tpl = stageTags(doc.languages); const have = new Set(tagDraft.tags.map(x => x.id));
    tagDraft.groups.forEach(g => { if (!g.name) { const d = groupsFor(doc.languages).find(x => x.id === g.id); if (d) Object.assign(g, d); } });
    tpl.forEach(x => { if (!have.has(x.id)) tagDraft.tags.push(x); }); drawTags();
  });
}
$("#tag-rows").addEventListener("input", e => {
  const el = e.target, k = el.dataset.k, i = +el.dataset.i; if (!k) return;
  if (k === "g") { const g = tagDraft.groups[i]; if (el.dataset.trl) { g.nameTr = g.nameTr || {}; g.nameTr[el.dataset.trl] = el.value.trim(); } else g.name = el.value; return; }
  const tg = tagDraft.tags[i];
  if (el.dataset.trl) { tg.nameTr = tg.nameTr || {}; tg.nameTr[el.dataset.trl] = el.value.trim(); }
  else if (k !== "group") tg[k] = el.value;
});
$("#tag-rows").addEventListener("change", e => { const el = e.target; if (el.dataset.k === "group") { tagDraft.tags[+el.dataset.i].group = el.value; drawTags(); } });
$("#tag-rows").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const T = tagDraft.tags;
  if (b.dataset.tadd) { T.push({ id: uid("t"), emoji: "🏷️", name: "", nameTr: {}, group: b.dataset.tadd, desc: "" }); drawTags(); setTimeout(() => { const el = $(`#tag-rows input[data-k="name"][data-i="${T.length - 1}"]`); el && el.focus(); }, 20); }
  if (b.dataset.tdel !== undefined) { const i = +b.dataset.tdel, used = tagHolders().filter(n => (n.tags || []).includes(T[i].id)).length;
    if (!used || confirm(`Remove “${T[i].name}” from ${used} ${used > 1 ? TAG_HOLDER[1] : TAG_HOLDER[0]} and delete it?`)) { T.splice(i, 1); drawTags(); } }
  const move = (i, dir) => { // swap with the neighbour in the same group
    const g = T[i].group; let j = i + dir; while (j >= 0 && j < T.length && T[j].group !== g) j += dir;
    if (j >= 0 && j < T.length) { [T[i], T[j]] = [T[j], T[i]]; drawTags(); } };
  if (b.dataset.tup !== undefined) move(+b.dataset.tup, -1);
  if (b.dataset.tdown !== undefined) move(+b.dataset.tdown, 1);
  if (b.dataset.epal !== undefined) openEmojiPalette(b, +b.dataset.epal);
});
function openEmojiPalette(anchor, i) {
  const pop = $("#emoji-pop"); const r = anchor.getBoundingClientRect(), box = $("#m-tags .modal").getBoundingClientRect();
  pop.innerHTML = EMOJI_PALETTE.map(em => `<button type="button" data-em="${em}">${em}</button>`).join("") + `<p class="muted">Or type any emoji in the box (Windows: Win + . · Mac: Ctrl + Cmd + Space).</p>`;
  pop.style.left = Math.max(8, r.left - box.left - 8) + "px"; pop.style.top = (r.bottom - box.top + $("#m-tags .modal").scrollTop + 4) + "px";
  pop.hidden = false; pop.dataset.i = i;
}
$("#emoji-pop").addEventListener("click", e => {
  const b = e.target.closest("[data-em]"); if (!b) return;
  const pop = $("#emoji-pop"); tagDraft.tags[+pop.dataset.i].emoji = b.dataset.em; pop.hidden = true; drawTags();
});
document.addEventListener("pointerdown", e => { const pop = $("#emoji-pop"); if (!pop.hidden && !e.target.closest("#emoji-pop") && !e.target.closest("[data-epal]")) pop.hidden = true; });
$("#tag-save").onclick = () => {
  const groups = tagDraft.groups.map(g => ({ ...g, name: g.name.trim() || "Group", nameTr: trObj(g.nameTr) }));
  const tags = tagDraft.tags.filter(tg => tg.name.trim() || tg.emoji.trim()).map(tg => ({ ...tg, name: tg.name.trim() || tg.emoji, emoji: tg.emoji.trim() || "🏷️", nameTr: trObj(tg.nameTr) }));
  const ids = new Set(tags.map(tg => tg.id));
  $("#m-tags").hidden = true;
  commit(() => {
    doc.tagGroups = groups; doc.tags = tags;
    tagHolders().forEach(n => { n.tags = tags.filter(tg => (n.tags || []).includes(tg.id)).map(tg => tg.id); });
    if (view.tagFilter) [...view.tagFilter].forEach(x => { if (!ids.has(x)) view.tagFilter.delete(x); });
  });
  toast("Tags updated. Ctrl Z to undo.");
};
