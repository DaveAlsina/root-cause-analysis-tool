/* ================= Languages ================= */
function openLangs() {
  if (VIEWER) return;
  const L = doc.languages, miss = missingSummary();
  const free = Object.keys(LANG_NAMES).filter(l => !L.includes(l));
  $("#lang-body").innerHTML = `
    <div class="langlist">${L.map((l, i) => `<div class="langrow">
      <span class="lcode">${esc(l.toUpperCase())}</span><span class="lname">${esc(langName(l))}${i === 0 ? ` <span class="pill">main</span>` : ""}</span>
      ${i === 0 ? `${(m => m && (m.boxes || m.other) ? `<span class="lmiss">${m.boxes} box${m.boxes === 1 ? "" : "es"} and ${m.other} other text${m.other === 1 ? "" : "s"} missing</span>${m.boxes ? `<button class="btn small" data-trpass="${esc(l)}">Translate one by one</button>` : ""}` : "")(miss.find(m => m.l === l))}<label class="relabel">The main text is written in <select id="lang-relabel">${[l, ...Object.keys(LANG_NAMES).filter(x => !L.includes(x))].map(x => `<option value="${esc(x)}"${x === l ? " selected" : ""}>${esc(langName(x))}</option>`).join("")}</select></label>`
        : `<span class="lmiss">${(m => m && (m.boxes || m.other) ? `${m.boxes} box${m.boxes === 1 ? "" : "es"} and ${m.other} other text${m.other === 1 ? "" : "s"} missing` : "")(miss.find(m => m.l === l))}</span>
           <span class="row">${(miss.find(m => m.l === l) || {}).boxes ? `<button class="btn small" data-trpass="${esc(l)}">Translate one by one</button>` : ""}<button class="btn small" data-lmain="${esc(l)}">Make main</button><button class="btn small danger" data-ldel="${esc(l)}">Remove</button></span>`}
    </div>`).join("")}</div>
    <div class="row"><select id="lang-add-sel" aria-label="Language to add">${free.map(l => `<option value="${l}">${esc(langName(l))}</option>`).join("")}<option value="__other">Other (type a code)…</option></select><button class="btn" id="lang-add">Add language</button></div>
    <h4>Title</h4>
    <div class="titlerows">${L.map(l => `<label class="trin wide"><b>${esc(l.toUpperCase())}</b><input type="text" data-title="${esc(l)}" value="${esc(txRaw(doc, "title", l))}" placeholder="${esc(langName(l))} title"></label>`).join("")}</div>
    <p class="muted">Box texts are asked for in each language as you type them: Enter moves on to the next language. Category and tag names have one field per language in their editors. Notes stay in one language; they are only for you.</p>`;
  $("#m-langs").hidden = false;
}
$("#lang-body").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "lang-add") {
    let l = $("#lang-add-sel").value;
    if (l === "__other") { l = (prompt("Two-letter language code, for example pt or zh") || "").trim().toLowerCase(); if (!/^[a-z]{2,3}(-[a-z0-9]+)?$/.test(l)) return l && toast("That is not a language code."); }
    if (doc.languages.includes(l)) return;
    commit(() => { doc.languages.push(l); }).then(openLangs);
    toast(`${langName(l)} added. New boxes now ask for it; use Translate one by one for the existing ones.`, 5000);
  }
  if (b.dataset.lmain) makeMainLang(b.dataset.lmain).then(openLangs);
  if (b.dataset.ldel) { const l = b.dataset.ldel;
    if (!confirm(`Remove ${langName(l)} and all its translations? Ctrl Z brings them back.`)) return;
    commit(() => { everyTranslatable(doc, (o, f) => { if (o[f + "Tr"]) delete o[f + "Tr"][l]; }); doc.languages = doc.languages.filter(x => x !== l); }).then(openLangs);
    if (view.lang === l) view.lang = null; }
  if (b.dataset.trpass) translatePass(b.dataset.trpass);
});
$("#lang-body").addEventListener("change", e => {
  if (e.target.id === "lang-relabel") { const l = e.target.value; commit(() => { doc.languages[0] = l; }).then(openLangs); toast(`The main text is now marked as ${langName(l)}.`); }
  if (e.target.dataset.title) { const l = e.target.dataset.title, v = e.target.value.trim(); commit(() => txSet(doc, "title", l, v)); }
});
function makeMainLang(l) { // the chosen language becomes the main field everywhere; the old main moves into the translations
  const old = mainLang(); if (l === old) return Promise.resolve();
  const r = commit(() => {
    everyTranslatable(doc, (o, f) => {
      const tr = o[f + "Tr"] = o[f + "Tr"] || {}; const nv = tr[l] || "", ov = o[f] || "";
      if (!nv && ov && neutralText(ov)) return; // "?" boxes read the same in every language
      delete tr[l]; if (ov) tr[old] = ov; o[f] = nv;
    });
    doc.languages = [l, ...doc.languages.filter(x => x !== l)];
  });
  toast(`${langName(l)} is now the main language.`); return r;
}
