/* ================= Bibliography (.bib) ================= */
const LS_BIB = "uchuva-rca:bib";
let bib = { name: "", entries: [], byKey: new Map() };
function setBib(name, entries) {
  bib = { name, entries, byKey: new Map(entries.map(e => [e.key.toLowerCase(), e])) };
  const b = $("[data-act=bib]"); if (b) b.innerHTML = name ? `Bibliography: ${esc(name)} <small>${entries.length} refs · reload</small>` : `Load bibliography… <small>.bib, for @ citations</small>`;
}
try { const b = JSON.parse(lsGet(LS_BIB) || "null"); if (b && Array.isArray(b.entries)) setBib(b.name, b.entries); } catch (e) {}
function texClean(v) {
  return String(v || "")
    .replace(/\\(?:textit|textbf|emph|textsc|mathrm|textrm)\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\(['"`^~=.uvHckr])\s*\{?\\?([A-Za-z])\}?/g, (m, a, c) => (c + ({ "'": "́", "`": "̀", "^": "̂", '"': "̈", "~": "̃", "=": "̄", ".": "̇", u: "̆", v: "̌", H: "̋", c: "̧", k: "̨", r: "̊" }[a] || "")).normalize("NFC"))
    .replace(/\\(ss|o|O|l|L|ae|AE|oe|OE|aa|AA|i|j)\b\s*/g, (m, c) => ({ ss: "ss", o: "o", O: "O", l: "l", L: "L", ae: "ae", AE: "AE", oe: "oe", OE: "OE", aa: "a", AA: "A", i: "i", j: "j" }[c]))
    .replace(/\\([&%$#_{}])/g, "$1").replace(/~/g, " ").replace(/--/g, "–").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
}
function parseBib(text) {
  const out = []; let i = 0; const n = text.length;
  while (i < n) {
    const at = text.indexOf("@", i); if (at < 0) break;
    const m = /^@\s*([A-Za-z]+)\s*([{(])/.exec(text.slice(at, at + 60));
    if (!m) { i = at + 1; continue; }
    const type = m[1].toLowerCase(); const open = m[2], close = open === "{" ? "}" : ")";
    let j = at + m[0].length, depth = 1;
    const start = j;
    while (j < n && depth > 0) { const c = text[j]; if (c === "{" || (open === "(" && c === "(")) depth++; else if (c === "}" || (open === "(" && c === ")")) depth--; j++; }
    const body = text.slice(start, j - 1); i = j;
    if (["comment", "string", "preamble"].includes(type)) continue;
    const comma = body.indexOf(","); if (comma < 0) continue;
    const key = body.slice(0, comma).trim(); if (!key) continue;
    const fields = {}; let k = comma + 1; const B = body;
    while (k < B.length) {
      const fm = /^\s*([A-Za-z][\w-]*)\s*=\s*/.exec(B.slice(k)); if (!fm) break;
      const name = fm[1].toLowerCase(); k += fm[0].length;
      let val = "";
      if (B[k] === "{") { let d = 0, s0 = k; do { if (B[k] === "{") d++; else if (B[k] === "}") d--; k++; } while (k < B.length && d > 0); val = B.slice(s0 + 1, k - 1); }
      else if (B[k] === '"') { let s0 = ++k; while (k < B.length && !(B[k] === '"' && B[k - 1] !== "\\")) k++; val = B.slice(s0, k); k++; }
      else { const vm = /^[^,]*/.exec(B.slice(k)); val = vm[0]; k += vm[0].length; }
      fields[name] = val;
      const cm = /^\s*,?/.exec(B.slice(k)); k += cm[0].length;
    }
    const rawA = fields.author || fields.editor || ""; const parts = []; let d = 0, cur = "";
    for (let q = 0; q < rawA.length; q++) { const ch = rawA[q]; if (ch === "{") d++; if (ch === "}") d--;
      if (d === 0 && /^\s+and\s+/i.test(rawA.slice(q)) && /\s/.test(ch)) { parts.push(cur); cur = ""; q += /^\s+and\s+/i.exec(rawA.slice(q))[0].length - 1; continue; } cur += ch; }
    if (cur.trim()) parts.push(cur);
    const authors = parts.map(a => a.trim()).filter(Boolean).map(a => /^\{.*\}$/.test(a) ? { corp: texClean(a) } : texClean(a));
    const last = a => a.corp ? a.corp : (a.includes(",") ? a.split(",")[0] : a.split(" ").slice(-1)[0]).trim();
    const auth = authors.length === 0 ? "" : authors.length === 1 ? last(authors[0]) : authors.length === 2 ? `${last(authors[0])} & ${last(authors[1])}` : `${last(authors[0])} et al.`;
    const year = (texClean(fields.year || fields.date || "").match(/\d{4}/) || [""])[0];
    out.push({ key, type, author: auth, authorsAll: authors.map(last).join(" "), year, title: texClean(fields.title || fields.booktitle || ""),
      venue: texClean(fields.journal || fields.journaltitle || fields.booktitle || fields.publisher || fields.institution || fields.school || "") });
  }
  return out;
}
async function loadBib() {
  const handle = async (name, text) => {
    const entries = parseBib(text);
    if (!entries.length) return toast("No references found in that file.", 4500);
    setBib(name, entries); lsSet(LS_BIB, JSON.stringify({ name, entries }));
    toast(`Loaded ${entries.length} references from ${name}. Type @ in Sources to cite one.`, 4500);
    renderPanel();
  };
  if (FSA) {
    try { const [h] = await window.showOpenFilePicker({ types: [{ description: "BibTeX", accept: { "text/plain": [".bib"] } }] }); const f = await h.getFile(); await handle(f.name, await f.text()); }
    catch (e) { if (e.name !== "AbortError") toast(e.message, 4500); }
  } else {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".bib,.txt";
    inp.onchange = async () => { const f = inp.files[0]; if (f) await handle(f.name, await f.text()); }; inp.click();
  }
}
const bibLookup = s => { const m = /^@([^\s]+)$/.exec(String(s).trim()); return m ? { key: m[1], entry: bib.byKey.get(m[1].toLowerCase()) } : null; };
const bibLabel = e => [e.author, e.year && `(${e.year})`].filter(Boolean).join(" ") || e.type;
function sourceSearchText(s) { const r = bibLookup(s); return r && r.entry ? `${s} ${r.entry.author} ${r.entry.authorsAll} ${r.entry.year} ${r.entry.title}` : s; }
function showBibResolved(value) {
  const ul = $("#bibres"); if (!ul) return;
  const ta = $("#f-src"); let typing = null;
  if (ta && document.activeElement === ta) { const before = ta.value.slice(0, ta.selectionStart); const ln = before.split("\n").pop(); if (/^@\S*$/.test(ln.trim()) && ta.value.slice(ta.selectionStart).split("\n")[0].trim() === "") typing = ln.trim(); }
  const lines = value.split("\n").map(x => x.trim()).filter(Boolean);
  ul.innerHTML = lines.map(l => {
    const r = bibLookup(l);
    if (!r || (l === typing && !r.entry)) return "";
    if (!r.entry) return `<li class="miss"><code>@${esc(r.key)}</code> ${bib.entries.length ? "is not in " + esc(bib.name) : "· load a .bib to check it"}</li>`;
    return `<li><code>@${esc(r.entry.key)}</code> <b>${esc(bibLabel(r.entry))}</b> ${esc(r.entry.title)}${r.entry.venue ? ` <i>${esc(r.entry.venue)}</i>` : ""}</li>`;
  }).join("");
}
function attachBibComplete(ta) {
  const pop = $("#bibpop"); let items = [], active = 0, token = null;
  const close = () => { pop.hidden = true; items = []; token = null; };
  const query = () => {
    const caret = ta.selectionStart; const before = ta.value.slice(0, caret);
    const m = /(^|\s)@([^\s@]*)$/.exec(before);
    return m ? { start: caret - m[2].length - 1, end: caret, q: m[2].toLowerCase() } : null;
  };
  const draw = () => {
    token = query(); if (!token) return close();
    if (!bib.entries.length) {
      pop.innerHTML = `<div class="empty">No bibliography loaded. <button type="button" class="btn small" id="bib-load-inline">Load .bib…</button></div>`;
      pop.hidden = false; $("#bib-load-inline").onmousedown = e => { e.preventDefault(); loadBib(); }; items = []; return;
    }
    const q = token.q.normalize("NFD").replace(/[\u0300-\u036f]/g, ""), words = q.split(/[\s:_-]+/).filter(Boolean);
    const score = e => {
      const k = e.key.toLowerCase(), hay = `${k} ${e.authorsAll} ${e.year} ${e.title} ${e.venue}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (!words.every(w => hay.includes(w))) return -1;
      return (k.startsWith(q) ? 100 : 0) + (k.includes(q) ? 40 : 0) + (e.authorsAll.toLowerCase().includes(q) ? 20 : 0) + (+e.year || 0) / 10000;
    };
    items = bib.entries.map(e => [score(e), e]).filter(x => x[0] >= 0).sort((a, b) => b[0] - a[0]).slice(0, 8).map(x => x[1]);
    active = Math.min(active, Math.max(0, items.length - 1));
    pop.innerHTML = items.length ? items.map((e, i) => `<div class="opt${i === active ? " on" : ""}" role="option" data-i="${i}"><code>@${esc(e.key)}</code><span class="who">${esc(bibLabel(e))}</span><span class="ttl">${esc(e.title)}</span></div>`).join("")
      : `<div class="empty">No reference matches “${esc(q)}” in ${esc(bib.name)}.</div>`;
    pop.hidden = false;
  };
  const pick = i => {
    const e = items[i]; if (!e || !token) return;
    const v = ta.value; let ins = "@" + e.key; const after = v.slice(token.end);
    if (!after.startsWith("\n")) ins += "\n";
    ta.value = v.slice(0, token.start) + ins + after.replace(/^[^\s\n]*/, "");
    const c = token.start + ins.length; ta.setSelectionRange(c, c); close();
    ta.dispatchEvent(new Event("input", { bubbles: true })); ta.focus();
  };
  ta.addEventListener("input", () => { active = 0; draw(); });
  ta.addEventListener("click", draw);
  ta.addEventListener("keydown", e => {
    if (pop.hidden || !items.length) { if (e.key === "Escape" && !pop.hidden) { e.stopPropagation(); close(); } return; }
    if (e.key === "ArrowDown") { e.preventDefault(); active = (active + 1) % items.length; draw(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); active = (active - 1 + items.length) % items.length; draw(); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(active); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
  });
  ta.addEventListener("blur", () => setTimeout(close, 150));
  pop.addEventListener("mousedown", e => { const o = e.target.closest(".opt"); if (o) { e.preventDefault(); pick(+o.dataset.i); } });
}
