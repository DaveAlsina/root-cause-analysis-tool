
/* ================= Publishing: public copy, share links, deep links ================= */
const LS_BASE = "uchuva-rca:site";
function bytesToB64url(bytes) { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function b64urlToBytes(str) { str = str.replace(/-/g, "+").replace(/_/g, "/"); while (str.length % 4) str += "="; return Uint8Array.from(atob(str), c => c.charCodeAt(0)); }
async function deflateRawText(text) { const cs = new CompressionStream("deflate-raw"); return new Uint8Array(await new Response(new Blob([new TextEncoder().encode(text)]).stream().pipeThrough(cs)).arrayBuffer()); }
function compactForLink(d) { // shorter ids and no arrow ids: the link carries less, the diagram is the same
  const map = new Map(d.nodes.map((n, i) => [n.id, i.toString(36)]));
  const c = clone(d);
  c.nodes.forEach(n => { n.id = map.get(n.id); });
  c.edges = c.edges.map(e => [map.get(e.source), map.get(e.target)]);
  c.edgeList = 1; delete c.meta;
  return c;
}
async function encodeShare(obj) { return "1" + bytesToB64url(await deflateRawText(JSON.stringify(compactForLink(obj)))); }
async function decodeShare(str) {
  if (str[0] !== "1") throw new Error("This link was made by a newer version of the tool.");
  const d = JSON.parse(await inflateRaw(b64urlToBytes(str.slice(1))));
  if (d.edgeList) { d.edges = d.edges.map(([s, t], i) => ({ id: "e" + i, source: s, target: t })); delete d.edgeList; }
  return d;
}
function publishedDoc(o) { // a copy for the public: strips what is only for the researcher, drops empty fields
  const d = { format: "uchuva-rca", schema: 2, app: APP_VERSION, ...clone(coreOf(doc)) };
  d.nodes = d.nodes.map(n => {
    const r = { ...n }; delete r.origin;
    if (!o.notes || !r.notes) delete r.notes;
    if (!o.sources || !(r.sources || []).length) delete r.sources;
    if (!o.status || r.status === "unassessed") delete r.status;
    if (!Object.keys(r.textTr || {}).length) delete r.textTr;
    if (!(r.tags || []).length) delete r.tags;
    if (!r.kind) delete r.kind; if (!r.logic) delete r.logic;
    return r;
  });
  d.categories = d.categories.map(c => { const r = { ...c }; if (!o.notes) r.desc = ""; return r; });
  d.tags = d.tags.map(tg => ({ ...tg, desc: o.notes ? tg.desc : "" }));
  d.versions = o.versions ? clone(doc.versions) : [];
  if (o.sources && bib.entries.length) {
    const keys = new Set(); doc.nodes.forEach(n => (n.sources || []).forEach(x => { const r = bibLookup(x); if (r && r.entry) keys.add(r.entry.key); }));
    if (keys.size) d.bib = bib.entries.filter(e => keys.has(e.key)).map(({ key, author, year, title, venue }) => ({ key, author, year, title, venue }));
  }
  d.viewDefaults = { lang: o.lang, mode: o.mode };
  d.meta = { published: nowISO() };
  return d;
}
const pageBase = () => location.href.split(/[?#]/)[0];
function siteBase() { const v = ($("#pub-base") && $("#pub-base").value.trim()) || lsGet(LS_BASE) || ""; return v || (location.protocol.startsWith("http") ? pageBase() : ""); }
function deepLink(extra = {}) {
  const q = new URLSearchParams();
  const src = new URLSearchParams(location.search).get("src"); if (src) q.set("src", src);
  if (doc.languages.length > 1) q.set("lang", curLang());
  if (view.mode === "untangle") q.set("mode", "untangle");
  if (view.split) q.set("split", "1");
  if (view.branch) q.set("branch", view.branch);
  if (view.focusR) q.set("radius", view.focusR);
  if (view.tagFilter.size) q.set("tags", [...view.tagFilter].join(","));
  Object.entries(extra).forEach(([k, v]) => q.set(k, v));
  const hash = location.hash.startsWith("#d=") ? location.hash : "";
  return pageBase() + "?" + q.toString() + hash;
}
function copyText(text, msg) {
  const done = () => toast(msg || "Copied");
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => prompt("Copy this:", text));
  else prompt("Copy this:", text);
}
function pubOpts() {
  return { notes: $("#pub-notes").checked, sources: $("#pub-sources").checked, status: $("#pub-status").checked, versions: $("#pub-versions").checked,
    lang: $("#pub-lang").value, mode: $("#pub-mode").value };
}
function openPublish() {
  if (VIEWER) return;
  $("#pub-lang").innerHTML = doc.languages.map(l => `<option value="${esc(l)}"${l === curLang() ? " selected" : ""}>${esc(langName(l))}</option>`).join("");
  $("#pub-mode").value = view.mode;
  $("#pub-base").value = lsGet(LS_BASE) || (location.protocol.startsWith("http") ? pageBase() : "");
  $("#m-publish").hidden = false; updatePublishInfo();
}
let pubTimer = null;
async function updatePublishInfo() {
  const d = publishedDoc(pubOpts()); const json = JSON.stringify(d); const link = await encodeShare(d);
  const base = siteBase(), url = (base || pageBase()) + "#d=" + link;
  const miss = missingSummary().filter(m => m.boxes || m.other);
  $("#pub-info").innerHTML = `Public file: <b>${(json.length / 1024).toFixed(1)} KB</b> · share link: <b>${url.length.toLocaleString()}</b> characters` +
    (url.length > 30000 ? `<br><span class="ckwarn">Long links get cut by some chat and email apps. Prefer publishing the file on GitHub Pages.</span>` : "") +
    (!base ? `<br><span class="ckwarn">No viewer address yet: the link would only open on this computer.</span>` : "") +
    (miss.length ? `<br><span class="ckwarn">Missing translations: ${miss.map(m => `${m.l.toUpperCase()} ${m.boxes + m.other}`).join(", ")}. Viewers see those texts in another language, in italics.</span>` : "");
  return { d, url, link };
}
["pub-notes", "pub-sources", "pub-status", "pub-versions", "pub-lang", "pub-mode"].forEach(id => $("#" + id).addEventListener("change", () => updatePublishInfo()));
$("#pub-base").addEventListener("input", () => { clearTimeout(pubTimer); pubTimer = setTimeout(() => { lsSet(LS_BASE, $("#pub-base").value.trim()); updatePublishInfo(); }, 300); });
$("#pub-download").onclick = async () => { const { d } = await updatePublishInfo(); download("rca.json", JSON.stringify(d) + "\n", "application/json"); toast("rca.json downloaded. Put it in the docs folder of your repository and push."); };
$("#pub-copy").onclick = async () => { const { url } = await updatePublishInfo(); copyText(url, "Share link copied. Anyone who opens it sees this diagram, read-only."); };
$("#pub-preview").onclick = async () => { const { link } = await updatePublishInfo(); window.open(pageBase() + "#d=" + link, "_blank"); };
async function openFromUrl() {
  const u = (prompt("Address of an RCA file (.json), a raw GitHub or Gist link, or a share link") || "").trim(); if (!u) return;
  if (dirty && !confirm("You have unsaved changes. Open the linked RCA anyway?")) return;
  try {
    const h = u.indexOf("#d=");
    if (h >= 0) { const d = await decodeShare(u.slice(h + 3)); await loadText(JSON.stringify(d), "shared-rca.json", null); dirty = true; updateChrome(); return; }
    const r = await fetch(u); if (!r.ok) throw new Error(`The server answered ${r.status}.`);
    await loadText(await r.text(), decodeURIComponent(u.split("/").pop().split("?")[0]) || "linked-rca.json", null); dirty = true; updateChrome();
  } catch (e) { toast("Could not open that link: " + (e.message || e), 6000); }
}

/* ================= Viewer mode ================= */
async function viewerSource() {
  const q = new URLSearchParams(location.search);
  const hash = location.hash.startsWith("#d=") ? location.hash.slice(3) : "";
  const meta = document.querySelector('meta[name="rca-publish"]');
  if (q.has("edit")) return { edit: true, hash };
  if (hash) return { data: await decodeShare(hash) };
  if (q.get("src")) { const r = await fetch(q.get("src")); if (!r.ok) throw new Error(`Could not load ${q.get("src")} (${r.status})`); return { data: await r.json() }; }
  if (meta && meta.content) { const r = await fetch(meta.content, { cache: "no-cache" }); if (!r.ok) throw new Error(`Could not load ${meta.content} (${r.status})`); return { data: await r.json() }; }
  return null;
}
function enterViewer(d) {
  VIEWER = true; document.body.classList.add("viewer");
  doc = normalizeDoc(d); delete doc.meta._guessedLang; dirty = false;
  if (doc.bib) setBib("", doc.bib);
  const q = new URLSearchParams(location.search), vd = doc.viewDefaults || {};
  Object.assign(view, DEFAULT_VIEW);
  let pref = {}; try { pref = JSON.parse(lsGet(LS_VPREF) || "{}"); } catch (e) {}
  const lang = [q.get("lang"), pref.lang, vd.lang].find(l => l && doc.languages.includes(l)); view.lang = lang || null;
  if (pref.tagChips === false) view.tagChips = false;
  if (pref.gates === false) view.gates = false; if (pref.kinds === true) view.kinds = true;
  view.mode = (q.get("mode") || vd.mode) === "untangle" ? "untangle" : "manual";
  view.split = q.get("split") === "1";
  if (q.get("branch") && nodeById(q.get("branch"))) view.branch = q.get("branch");
  const box = q.get("box"); if (box && nodeById(box)) { selRef = box; selCopy = box; multi = [box]; }
  const r = +q.get("radius"); if (r > 0 && selRef) view.focusR = Math.min(6, r);
  (q.get("tags") || "").split(",").filter(x => tagById(x)).forEach(x => view.tagFilter.add(x));

  applyUI();
}
