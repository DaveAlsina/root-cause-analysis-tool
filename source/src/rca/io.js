/* ================= draw.io import ================= */
async function inflateRaw(bytes) {
  const ds = new DecompressionStream("deflate-raw");
  return await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
}
function htmlToText(v) {
  if (!v) return "";
  const d = new DOMParser().parseFromString("<body>" + v.replace(/<br\s*\/?>/gi, " ").replace(/<\/(div|p)>/gi, " ") + "</body>", "text/html");
  return (d.body.textContent || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
}
function parseStyle(s) { const o = {}; (s || "").split(";").forEach(kv => { const i = kv.indexOf("="); if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1); }); return o; }
async function parseDrawio(raw) {
  let txt = raw.trim();
  if (/^%3C/i.test(txt)) txt = decodeURIComponent(txt);
  let xml = new DOMParser().parseFromString(txt, "text/xml");
  if (xml.querySelector("parsererror")) throw new Error("That isn't valid draw.io XML. Copy it again from Extras → Edit Diagram.");
  let model = xml.querySelector("mxGraphModel");
  if (!model) {
    const dg = xml.querySelector("diagram"); if (!dg) throw new Error("No diagram found.");
    const b = Uint8Array.from(atob(dg.textContent.trim()), c => c.charCodeAt(0));
    let inner = await inflateRaw(b); try { inner = decodeURIComponent(inner); } catch (e) {}
    xml = new DOMParser().parseFromString(inner, "text/xml"); model = xml.querySelector("mxGraphModel");
    if (!model) throw new Error("The compressed diagram could not be read.");
  }
  const cats = doc ? clone(doc.categories) : clone(DEFAULT_CATS);
  const byFill = new Map(cats.map(c => [c.fill.toLowerCase(), c]));
  const nodes = [], edges = [];
  model.querySelectorAll("mxCell").forEach(c => {
    const st = parseStyle(c.getAttribute("style"));
    const wrapObj = c.parentElement && /^(UserObject|object)$/i.test(c.parentElement.tagName) ? c.parentElement : null;
    const cid = (wrapObj || c).getAttribute("id");
    const value = wrapObj ? wrapObj.getAttribute("label") : c.getAttribute("value");
    if (c.getAttribute("vertex") === "1") {
      const g = c.querySelector("mxGeometry");
      const fill = (st.fillColor || "#ffffff").toLowerCase();
      let cat = byFill.get(fill);
      if (!cat) { cat = { id: uid("c"), name: "Colour " + fill, fill, stroke: st.strokeColor || "#000000", font: st.fontColor || "#000000" }; cats.push(cat); byFill.set(fill, cat); }
      const w = +(g?.getAttribute("width") || 120), h = +(g?.getAttribute("height") || 50);
      const stt = wrapObj && STATUSES[wrapObj.getAttribute("status")] ? wrapObj.getAttribute("status") : "unassessed";
      const n = { id: cid, text: htmlToText(value) || " ", cat: cat.id, status: stt, notes: wrapObj ? (wrapObj.getAttribute("tooltip") || "").replace(/\nSources: .*$/s, "").replace(/^Sources: .*$/s, "") : "", sources: [],
        x: Math.round((+(g?.getAttribute("x") || 0) + w / 2) * 1.55), y: Math.round((+(g?.getAttribute("y") || 0) + h / 2) * 1.55) };
      const stroke = (st.strokeColor || "#000000").toLowerCase();
      if (stroke !== cat.stroke.toLowerCase() && stroke !== "none" && stt === "unassessed") n.outline = stroke;
      const tip = wrapObj && wrapObj.getAttribute("tooltip"); const m = tip && tip.match(/Sources: (.*)$/s);
      if (m) n.sources = m[1].split("; ").map(x => x.trim()).filter(Boolean);
      nodes.push(n);
    } else if (c.getAttribute("edge") === "1" && c.getAttribute("source") && c.getAttribute("target")) {
      edges.push({ id: "e" + cid, source: c.getAttribute("source"), target: c.getAttribute("target") });
    }
  });
  if (!nodes.length) throw new Error("The diagram has no boxes.");
  const ids = new Set(nodes.map(n => n.id));
  const used = new Set(nodes.map(n => n.cat));
  tidyPositions(nodes);
  return { categories: cats.filter(c => used.has(c.id) || DEFAULT_CATS.some(d => d.id === c.id)), nodes, edges: edges.filter(e => ids.has(e.source) && ids.has(e.target)) };
}


/* ================= Files: RCA-specific loading ================= */

function setDoc(d, name, handle) {
  view.branch = null; if (GRADING) { GRADING = false; document.body.classList.remove("grading"); $("#work-edit").setAttribute("aria-pressed", true); $("#work-grade").setAttribute("aria-pressed", false); }
  doc = d; fileName = name; fileHandle = handle || null; dirty = false;
  undoStack.length = 0; redoStack.length = 0; selRef = selCopy = selEdge = null; multi = [];
  view.folded.clear(); view.hiddenCats.clear(); view.tagFilter.clear(); view.diff = null; $("#diffbar").hidden = true; $("#depth").value = "all";
  autosave(); render({ fit: true, readable: true });
}
async function loadText(text, name, handle) {
  const t = text.trim();
  if (t.startsWith("{")) {
    let d; try { d = JSON.parse(t); } catch (e) { throw new Error("This file is not valid JSON."); }
    const nd = normalizeDoc(d); const mig = nd.meta.migratedKey; delete nd.meta.migratedKey;
    const guessed = nd.meta._guessedLang; delete nd.meta._guessedLang;
    setDoc(nd, name, handle);
    if (guessed) { dirty = true; updateChrome(); toast(`Opened ${name}. It looks like ${langName(nd.languages[0])}; change that or add languages in File → Languages.`, 6500); }
    else if (mig) { dirty = true; updateChrome(); toast(`Opened ${name}. Its colour key was updated to your meanings; save to keep it.`, 5500); }
    else toast(`Opened ${name}`);
  } else {
    const g = await parseDrawio(t);
    const d = emptyDoc(); d.categories = g.categories; d.nodes = g.nodes; d.edges = g.edges;
    d.title = name.replace(/\.(drawio|xml|dio|txt)$/i, "");
    d.versions = [mkVersion(d, "Imported from draw.io", `Imported from ${name}`)];
    setDoc(d, name.replace(/\.(drawio|xml|dio|txt)$/i, "") + ".json", null);
    dirty = true; updateChrome();
    toast(`Imported ${name}. Save it to create the RCA file.`, 4500);
  }
}

function newEmpty() {
  if (dirty && !confirm("You have unsaved changes. Start a new empty RCA anyway?")) return;
  const d = emptyDoc(); d.title = "New root-cause analysis";
  d.nodes = [newNode("Problem observed", "problem", 0, 0)];
  d.versions = [mkVersion(d, "Started", "")];
  setDoc(d, "new-rca.json", null);
}


/* ================= Exports ================= */
function baseName() { return fileName.replace(/\.json$/i, ""); }
function exportSVG() {
  const ink = "#1b2420", edgeC = "#5f6e68";
  const vis = cy.elements().filter(e => e.visible());
  const bb = vis.boundingBox({ includeLabels: false, includeOverlays: false });
  const pad = 24, W = Math.ceil(bb.w + pad * 2), H = Math.ceil(bb.h + pad * 2), ox = pad - bb.x1, oy = pad - bb.y1;
  const P = p => `${(p.x + ox).toFixed(1)},${(p.y + oy).toFixed(1)}`;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="IBM Plex Sans, Helvetica, Arial, sans-serif">`,
    `<title>${esc(tx(doc, "title"))}</title>`, `<rect width="100%" height="100%" fill="#ffffff"/>`];
  cy.edges().filter(e => e.visible()).forEach(e => {
    const pts = [e.sourceEndpoint(), ...(e.style("curve-style") === "segments" ? (e.segmentPoints() || []) : []), e.targetEndpoint()];
    if (pts.some(p => !p || !Number.isFinite(p.x))) return;
    const a = pts[pts.length - 2], b = pts[pts.length - 1]; const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, al = 9, aw = 4.5;
    const base = { x: b.x - ux * al, y: b.y - uy * al };
    const line = [...pts.slice(0, -1), base];
    const dash = e.hasClass("redundant") ? ` stroke-dasharray="6 4"` : "";
    out.push(`<polyline points="${line.map(P).join(" ")}" fill="none" stroke="${edgeC}" stroke-width="1.4"${dash}/>`);
    out.push(`<polygon points="${P(b)} ${P({ x: base.x - uy * aw, y: base.y + ux * aw })} ${P({ x: base.x + uy * aw, y: base.y - ux * aw })}" fill="${edgeC}"/>`);
  });
  cy.nodes().filter(n => n.visible()).forEach(n => {
    const d = n.data(), p = n.position();
    if (n.hasClass("tagchip")) {
      out.push(`<rect x="${(p.x - d.w / 2 + ox).toFixed(1)}" y="${(p.y - 10.5 + oy).toFixed(1)}" width="${d.w}" height="21" rx="10" fill="#ffffff" stroke="${edgeC}" stroke-width="1"/>`);
      out.push(`<text x="${(p.x + ox).toFixed(1)}" y="${(p.y + oy).toFixed(1)}" font-size="13" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" text-anchor="middle" dominant-baseline="central">${esc(d.label)}</text>`);
      return;
    }
    if (n.hasClass("badge")) {
      out.push(`<rect x="${(p.x - d.w / 2 + ox).toFixed(1)}" y="${(p.y - 9.5 + oy).toFixed(1)}" width="${d.w}" height="19" rx="9" fill="${ink}" stroke="#ffffff" stroke-width="2"/>`);
      out.push(`<text x="${(p.x + ox).toFixed(1)}" y="${(p.y + oy).toFixed(1)}" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${esc(d.label)}</text>`);
      return;
    }
    const dash = d.bs === "dashed" ? ` stroke-dasharray="7 4"` : d.bs === "dotted" ? ` stroke-dasharray="2 3"` : n.hasClass("ref") ? ` stroke-dasharray="5 3"` : "";
    const op = n.hasClass("refuted") ? ` opacity="0.5"` : n.hasClass("ref") ? ` opacity="0.8"` : "";
    out.push(`<g${op}><rect x="${(p.x - d.w / 2 + ox).toFixed(1)}" y="${(p.y - d.h / 2 + oy).toFixed(1)}" width="${d.w}" height="${d.h}" rx="7" fill="${d.fill}" stroke="${d.stroke}" stroke-width="${d.bw}"${dash}/>`);
    const lines = measureText(d.label).lines; const y0 = p.y - (lines.length - 1) * LINE / 2;
    const fw = (n.hasClass("q") ? ` font-weight="700" font-size="15"` : ` font-size="${FONT_PX}"`) + (d.fs === "italic" ? ` font-style="italic"` : "");
    lines.forEach((l, i) => out.push(`<text x="${(p.x + ox).toFixed(1)}" y="${(y0 + i * LINE + oy).toFixed(1)}"${fw} fill="${d.font}" text-anchor="middle" dominant-baseline="central">${esc(l)}</text>`));
    out.push(`</g>`);
  });
  out.push(`</svg>`);
  return { svg: out.join("\n"), W, H };
}
function exportPNG() {
  const { svg, W, H } = exportSVG(); const img = new Image(); const s = 2;
  img.onload = () => {
    const c = document.createElement("canvas"); c.width = W * s; c.height = H * s;
    const g = c.getContext("2d"); g.scale(s, s); g.drawImage(img, 0, 0);
    c.toBlob(b => { download(baseName() + ".png", b); toast("PNG exported."); }, "image/png");
  };
  img.onerror = () => toast("PNG export failed in this browser. Use SVG instead.");
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function xmlEsc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function exportDrawio() {
  const cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];
  const idOf = new Map(doc.nodes.map((n, i) => [n.id, "n" + i]));
  doc.nodes.forEach(n => {
    const c = catById(n.cat), m = boxSize(n), st = STATUSES[n.status];
    const stroke = st.color || n.outline || c.stroke;
    const style = `rounded=1;whiteSpace=wrap;html=1;fontSize=13;fillColor=${c.fill};strokeColor=${stroke};fontColor=${c.font};` +
      (st.style === "dashed" ? "dashed=1;" : st.style === "dotted" ? "dashed=1;dashPattern=1 2;" : "") + (st.width > 2 ? "strokeWidth=2;" : "");
    const tip = [n.notes, n.sources.length ? "Sources: " + n.sources.join("; ") : ""].filter(Boolean).join("\n");
    const tg = orderedTags(n.tags || []).map(x => x.emoji + " " + tx(x, "name")).join("; ");
    cells.push(`<UserObject label="${xmlEsc(tx(n))}"${tip ? ` tooltip="${xmlEsc(tip)}"` : ""}${tg ? ` tags="${xmlEsc(tg)}"` : ""} status="${n.status}" id="${idOf.get(n.id)}"><mxCell style="${style}" vertex="1" parent="1"><mxGeometry x="${Math.round(n.x - m.w / 2)}" y="${Math.round(n.y - m.h / 2)}" width="${m.w}" height="${m.h}" as="geometry"/></mxCell></UserObject>`);
  });
  doc.edges.forEach((e, i) => cells.push(`<mxCell id="a${i}" style="rounded=0;html=1;endArrow=classic;" edge="1" parent="1" source="${idOf.get(e.source)}" target="${idOf.get(e.target)}"><mxGeometry relative="1" as="geometry"/></mxCell>`));
  const xml = `<mxfile host="uchuva-rca"><diagram name="${xmlEsc(tx(doc, "title"))}" id="rca"><mxGraphModel><root>\n${cells.join("\n")}\n</root></mxGraphModel></diagram></mxfile>\n`;
  const sfx = doc.languages.length > 1 ? "-" + curLang() : "";
  download(baseName() + sfx + ".drawio", xml, "application/xml"); toast(`draw.io file exported in ${langName(curLang())}, with the positions from My layout.`);
}
function exportGraphML() {
  const L = doc.languages;
  const keys = [...L.map(l => ["text_" + l, "node"]), ["tags", "node"], ["category", "node"], ["status", "node"], ["notes", "node"], ["sources", "node"], ["x", "node", "double"], ["y", "node", "double"]];
  const out = [`<?xml version="1.0" encoding="UTF-8"?>`, `<graphml xmlns="http://graphml.graphdrawing.org/xmlns">`,
    ...keys.map(([k, f, t]) => `  <key id="${k}" for="${f}" attr.name="${k}" attr.type="${t || "string"}"/>`),
    `  <graph id="rca" edgedefault="directed">`];
  doc.nodes.forEach(n => out.push(`    <node id="${xmlEsc(n.id)}">${L.map(l => `<data key="text_${l}">${xmlEsc(txRaw(n, "text", l))}</data>`).join("")}<data key="tags">${xmlEsc(orderedTags(n.tags || []).map(x => x.name).join(" | "))}</data><data key="category">${xmlEsc(catById(n.cat).name)}</data><data key="status">${n.status}</data><data key="notes">${xmlEsc(n.notes)}</data><data key="sources">${xmlEsc(n.sources.join(" | "))}</data><data key="x">${n.x}</data><data key="y">${n.y}</data></node>`));
  doc.edges.forEach(e => out.push(`    <edge id="${xmlEsc(e.id)}" source="${xmlEsc(e.source)}" target="${xmlEsc(e.target)}"/>`));
  out.push(`  </graph>`, `</graphml>`, "");
  download(baseName() + ".graphml", out.join("\n"), "application/xml");
}
const csvCell = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function exportCSV(which) {
  const A = analyze();
  let rows;
  const L = doc.languages;
  if (which === "nodes") rows = [["id", ...L.map(l => "text_" + l), "category", "tags", "status", "level", "chains_to_rejection", "notes", "sources"],
    ...doc.nodes.map(n => [n.id, ...L.map(l => txRaw(n, "text", l)), tx(catById(n.cat), "name"), orderedTags(n.tags || []).map(x => tx(x, "name")).join(" | "), n.status, A.depth.get(n.id) || "", A.paths.get(n.id) || "", n.notes, n.sources.join(" | ")])];
  else rows = [["source_id", "source_text", "target_id", "target_text"],
    ...doc.edges.map(e => [e.source, tx(nodeById(e.source)), e.target, tx(nodeById(e.target))])];
  download(`${baseName()}-${which === "nodes" ? "boxes" : "arrows"}.csv`, "﻿" + rows.map(r => r.map(csvCell).join(",")).join("\r\n") + "\r\n", "text/csv");
}


/* ================= Versions: what an RCA snapshot holds ================= */
function diffCores(a, b) { // a = old snapshot, b = new
  const an = new Map(a.nodes.map(n => [n.id, n])), bn = new Map(b.nodes.map(n => [n.id, n]));
  const added = b.nodes.filter(n => !an.has(n.id)), removed = a.nodes.filter(n => !bn.has(n.id));
  const trs = n => JSON.stringify(n.textTr || {}), tgs = n => (n.tags || []).join(",");
  const changed = b.nodes.filter(n => { const o = an.get(n.id); return o && (o.text !== n.text || trs(o) !== trs(n) || tgs(o) !== tgs(n) || o.cat !== n.cat || o.status !== n.status || o.notes !== n.notes || (o.sources || []).join("\n") !== (n.sources || []).join("\n")); });
  const k = e => e.source + ">" + e.target;
  const ae = new Set(a.edges.map(k)), be = new Set(b.edges.map(k));
  return { added, removed, changed, edgesAdded: b.edges.filter(e => !ae.has(k(e))), edgesRemoved: a.edges.filter(e => !be.has(k(e))), an, bn };
}
const chgLine = d => `<span class="chg"><span class="p">+${d.added.length}</span> / <span class="m">−${d.removed.length}</span> boxes · <span class="c">${d.changed.length} edited</span> · arrows <span class="p">+${d.edgesAdded.length}</span> / <span class="m">−${d.edgesRemoved.length}</span></span>`;

function versionSize(s) { return `${s.nodes.length} boxes, ${s.edges.length} arrows`; }
function versionCompare(v, d, box) { // the comparison shown under the version list
  const li = arr => arr.length ? `<ul>${arr.slice(0, 40).map(x => `<li>${esc(x)}</li>`).join("")}${arr.length > 40 ? `<li>…and ${arr.length - 40} more</li>` : ""}</ul>` : `<p class="muted">None.</p>`;
  const et = (e, m) => `${tx(m.get(e.source) || {}) || e.source} → ${tx(m.get(e.target) || {}) || e.target}`;
  box.innerHTML = `<h4>Now compared with “${esc(v.name)}”</h4>${chgLine(d)}
    <b>New boxes</b>${li(d.added.map(n => tx(n)))}<b>Edited boxes</b>${li(d.changed.map(n => { const o = d.an.get(n.id); return o.text !== n.text ? `${o.text} ⟶ ${n.text}` : tx(n); }))}
    <b>Removed boxes</b>${li(d.removed.map(n => tx(n)))}<b>New arrows</b>${li(d.edgesAdded.map(e => et(e, d.bn)))}<b>Removed arrows</b>${li(d.edgesRemoved.map(e => et(e, d.an)))}
    <div class="row"><button class="btn primary" id="vd-show">Highlight on the graph</button></div>`;
  $("#vd-show").onclick = () => {
    view.diff = { added: new Set(d.added.map(n => n.id)), changed: new Set(d.changed.map(n => n.id)), name: v.name };
    const bar = $("#diffbar"); bar.hidden = false;
    bar.innerHTML = `Compared with “${esc(v.name)}”: <span class="a">${d.added.length} new</span> <span class="c">${d.changed.length} edited</span> ${d.removed.length ? `· ${d.removed.length} removed (listed in Versions)` : ""}<button class="btn small" id="diff-clear">Clear</button>`;
    $("#diff-clear").onclick = () => { view.diff = null; bar.hidden = true; render(); };
    $("#m-versions").hidden = true; render();
  };
}

/* ================= Colour key editor ================= */
let catDraft = [], catMoves = {}, catAssign = null;
function openCats(assignRef) {
  catDraft = clone(doc.categories); catMoves = {}; catAssign = null; drawCats(); $("#m-cats").hidden = false;
  if (typeof assignRef === "string") { // "New category…" from a box: add a row, and give the box that category on Apply
    const c = { id: uid("c"), name: "New category", nameTr: {}, role: "none", desc: "", fill: "#c8e6c9", stroke: "#2e7d32", font: "#1a1a1a" };
    catDraft.push(c); catAssign = { ref: assignRef, cat: c.id }; drawCats();
    setTimeout(() => { const el = $(`#cat-name-${catDraft.length - 1}`); if (el) { el.focus(); el.select(); el.scrollIntoView({ block: "nearest" }); } }, 20);
  }
}
function hexToHsl(h) {
  const n = parseInt(h.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let H = 0, S = 0; const L = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; S = L > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    H = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H /= 6; }
  return [H, S, L];
}
function hslToHex(H, S, L) {
  const f = n => { const k = (n + H * 12) % 12, a = S * Math.min(L, 1 - L); const c = L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, "0"); };
  return "#" + f(0) + f(8) + f(4);
}
function lum(h) { const n = parseInt(h.slice(1), 16); const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
function shadeOf(c, step) { // a darker (step > 0) or lighter (step < 0) variant of a category
  const [H, S, L] = hexToHsl(c.fill); const nl = Math.max(.12, Math.min(.95, L - step * .12));
  const fill = hslToHex(H, Math.min(1, S * (step > 0 ? 1.05 : .95)), nl);
  const [h2, s2] = hexToHsl(c.stroke);
  return { fill, stroke: hslToHex(h2, s2, Math.max(.1, nl - .28)), font: lum(fill) > .32 ? "#1a1a1a" : "#ffffff" };
}
function drawCats() {
  const counts = {}; doc.nodes.forEach(n => (counts[n.cat] = (counts[n.cat] || 0) + 1));
  $("#cat-rows").innerHTML = catDraft.map((c, i) => {
    const used = counts[c.id] || 0, moving = catMoves[c.id] !== undefined;
    return `<div class="catcard${moving ? " deleting" : ""}" data-i="${i}">
    <div class="catrow">
      <span class="prev" style="background:${c.fill};border-color:${c.stroke};color:${c.font}">${esc(c.name || "Unnamed")}</span>
      <input type="text" id="cat-name-${i}" value="${esc(c.name)}" aria-label="Category name" placeholder="Name">
      <label>fill<input type="color" id="cat-fill-${i}" value="${c.fill}"></label>
      <label>outline<input type="color" id="cat-stroke-${i}" value="${c.stroke}"></label>
      <label>text<input type="color" id="cat-font-${i}" value="${c.font}"></label>
    </div>
    ${doc.languages.length > 1 ? `<div class="catrow3">${doc.languages.slice(1).map(l => `<label class="trin"><b>${esc(l.toUpperCase())}</b><input type="text" data-trl="${esc(l)}" value="${esc((c.nameTr || {})[l] || "")}" placeholder="${esc(langName(l))} name"></label>`).join("")}</div>` : ""}
    <div class="catrow2">
      <input type="text" id="cat-desc-${i}" value="${esc(c.desc || "")}" placeholder="What this colour means" aria-label="Meaning">
      <select id="cat-role-${i}" aria-label="Rule" title="${esc(ROLES[c.role || "none"].hint)}">${Object.entries(ROLES).map(([k, r]) => `<option value="${k}"${(c.role || "none") === k ? " selected" : ""}>${k === "none" ? "No rule" : "Acts as: " + r.name}</option>`).join("")}</select>
      <span class="catacts">
        <button class="btn small" data-cshade="${i}" data-step="-1" title="Add a lighter shade">+ lighter</button>
        <button class="btn small" data-cshade="${i}" data-step="1" title="Add a darker shade">+ darker</button>
        <button class="btn small icon" data-cup="${i}" ${i === 0 ? "disabled" : ""} title="Move up" aria-label="Move up">↑</button>
        <button class="btn small icon" data-cdel="${i}" title="Delete" aria-label="Delete category">×</button>
      </span>
    </div>
    <div class="catmeta">${used} box${used === 1 ? "" : "es"}${moving ? ` · will be deleted, its boxes move to
      <select data-cmove="${esc(c.id)}">${catDraft.filter(o => o.id !== c.id && catMoves[o.id] === undefined).map(o => `<option value="${esc(o.id)}"${catMoves[c.id] === o.id ? " selected" : ""}>${esc(o.name)}</option>`).join("")}</select>
      <button class="linkbtn" data-cundo="${esc(c.id)}">keep it</button>` : ""}</div>
  </div>`; }).join("");
}
$("#cat-rows").addEventListener("input", e => {
  const card = e.target.closest(".catcard"); if (!card) return;
  if (e.target.dataset.trl) { const c = catDraft[+card.dataset.i]; c.nameTr = c.nameTr || {}; c.nameTr[e.target.dataset.trl] = e.target.value.trim(); return; }
  if (!e.target.id) return; const c = catDraft[+card.dataset.i];
  const k = e.target.id.split("-")[1]; c[k] = e.target.value;
  const pv = card.querySelector(".prev"); pv.style.background = c.fill; pv.style.borderColor = c.stroke; pv.style.color = c.font; pv.textContent = c.name || "Unnamed";
});
$("#cat-rows").addEventListener("change", e => {
  if (e.target.dataset.cmove) { catMoves[e.target.dataset.cmove] = e.target.value; return; }
  const card = e.target.closest(".catcard"); if (card && e.target.id.startsWith("cat-role")) catDraft[+card.dataset.i].role = e.target.value;
});
$("#cat-rows").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.cundo) { delete catMoves[b.dataset.cundo]; drawCats(); return; }
  if (b.dataset.cdel !== undefined) {
    const i = +b.dataset.cdel, c = catDraft[i];
    const used = doc.nodes.some(n => n.cat === c.id);
    if (!used) { catDraft.splice(i, 1); drawCats(); return; }
    const target = catDraft.find(o => o.id !== c.id && catMoves[o.id] === undefined);
    if (!target) return toast("Keep at least one category for its boxes to move to.");
    catMoves[c.id] = target.id; drawCats(); return;
  }
  if (b.dataset.cup !== undefined) { const i = +b.dataset.cup; [catDraft[i - 1], catDraft[i]] = [catDraft[i], catDraft[i - 1]]; drawCats(); return; }
  if (b.dataset.cshade !== undefined) {
    const i = +b.dataset.cshade, c = catDraft[i], step = +b.dataset.step;
    const base = c.name.replace(/ \((lighter|darker)( \d+)?\)$/, ""), dir = step > 0 ? "darker" : "lighter";
    let nm = `${base} (${dir})`, k = 2; while (catDraft.some(o => o.name === nm)) nm = `${base} (${dir} ${k++})`;
    catDraft.splice(i + 1, 0, { id: uid("c"), name: nm, nameTr: {}, role: c.role, desc: c.desc, ...shadeOf(c, step) });
    drawCats(); setTimeout(() => { const el = $(`#cat-name-${i + 1}`); if (el) { el.focus(); el.select(); } }, 20);
  }
});
$("#cat-add").onclick = () => { catDraft.push({ id: uid("c"), name: "New category", nameTr: {}, role: "none", desc: "", fill: "#c8e6c9", stroke: "#2e7d32", font: "#1a1a1a" }); drawCats();
  setTimeout(() => { const el = $(`#cat-name-${catDraft.length - 1}`); if (el) { el.focus(); el.select(); } }, 20); };
$("#cat-save").onclick = () => {
  const moves = { ...catMoves };
  const d = clone(catDraft).filter(c => moves[c.id] === undefined).map(c => ({ ...c, name: c.name.trim() || "Unnamed", nameTr: trObj(c.nameTr) }));
  if (!d.length) return toast("Keep at least one category.");
  $("#m-cats").hidden = true;
  commit(() => {
    doc.categories = d;
    doc.nodes.forEach(n => { let t = moves[n.cat], guard = 0; while (t !== undefined && moves[t] !== undefined && guard++ < 20) t = moves[t]; if (t !== undefined) n.cat = t; });
    Object.keys(moves).forEach(id => view.hiddenCats.delete(id));
    if (catAssign && d.some(c => c.id === catAssign.cat)) { const n = nodeById(catAssign.ref); if (n) n.cat = catAssign.cat; }
  });
  catAssign = null;
  toast("Colour key updated. Ctrl Z to undo.");
};


/* ================= New RCA ================= */
function openNew() {
  if (dirty && !confirm("You have unsaved changes. Start a new RCA anyway?")) return;
  $("#new-main").innerHTML = Object.keys(LANG_NAMES).map(l => `<option value="${l}">${esc(langName(l))}</option>`).join("");
  $("#new-main").value = "en"; drawNewExtra(); $("#new-title").value = ""; $("#m-new").hidden = false; $("#new-title").focus();
}
function drawNewExtra() {
  const main = $("#new-main").value;
  $("#new-extra").innerHTML = Object.keys(LANG_NAMES).filter(l => l !== main).map(l => `<label class="chk"><input type="checkbox" value="${l}"> ${esc(langName(l))}</label>`).join("");
}
$("#new-main").onchange = drawNewExtra;
$("#new-form").onsubmit = e => {
  e.preventDefault();
  const langs = [$("#new-main").value, ...$$("#new-extra input:checked").map(i => i.value)];
  const d = emptyDoc(); d.languages = langs; d.title = $("#new-title").value.trim() || (langs[0] === "es" ? "Nuevo análisis de causa raíz" : "New root-cause analysis");
  d.tagGroups = groupsFor(langs); d.tags = [];
  const cats = clone(DEFAULT_CATS);
  const ES = { problem: "Problema raíz", cause: "Causa intermedia", fact: "Causa raíz", plant: "Incierto", question: "Pregunta abierta" };
  cats.forEach(c => { c.nameTr = {}; if (langs[0] === "es") { const en = c.name; c.name = ES[c.id]; if (langs.includes("en")) c.nameTr.en = en; } else if (langs.includes("es")) c.nameTr.es = ES[c.id]; });
  d.categories = cats;
  const root = newNode(langs[0] === "es" ? "Problema observado" : "Problem observed", "problem", 0, 0); d.nodes = [root];
  d.versions = [mkVersion(d, "Started", "")];
  $("#m-new").hidden = true;
  setDoc(d, "new-rca.json", null); view.lang = null;
  setTimeout(() => { selRef = root.id; selCopy = root.id; multi = [root.id]; applySelection(); renderPanel(); inlineEdit(root.id, false); }, 400);
};

/* ================= Paste draw.io ================= */
$("#paste-go").onclick = async () => {
  try {
    const g = await parseDrawio($("#paste-text").value);
    $("#m-paste").hidden = true;
    commit(() => { doc.categories = g.categories; doc.nodes = g.nodes; doc.edges = g.edges; selRef = selCopy = selEdge = null; multi = []; view.folded.clear(); }, { fit: true });
    toast("Diagram replaced. Ctrl Z brings back the previous content.", 4500);
  } catch (err) { $("#paste-err").textContent = err.message; $("#paste-err").hidden = false; }
};
