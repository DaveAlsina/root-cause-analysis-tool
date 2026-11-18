/* Shared core of the design-analysis workbench: helpers, text measuring, languages, tags.
   Loaded after the app's config.js and before the app's own files. */
/* ================= Constants shared by every tool ================= */
const LANG_NAMES = { en: "English", es: "Español", nl: "Nederlands", de: "Deutsch", fr: "Français", pt: "Português", it: "Italiano" };
const DEFAULT_TAG_GROUPS = [
  { id: "product", name: "Product flow", nameTr: { es: "Flujo de producto" } },
  { id: "info", name: "Information flow", nameTr: { es: "Flujo de información" } },
];
// stages of a fresh-produce export chain, in chain order; offered as an example set in the tag editor
const STAGE_TEMPLATE = [
  { id: "t-culture",  group: "product", emoji: "🌱", name: "Culture care",      es: "Cuidado del cultivo",   desc: "Field and pre-harvest crop management" },
  { id: "t-harvest",  group: "product", emoji: "🧺", name: "Harvest",           es: "Cosecha",               desc: "" },
  { id: "t-drying",   group: "product", emoji: "🌬️", name: "Calyx drying",      es: "Secado del cáliz",      desc: "" },
  { id: "t-sorting",  group: "product", emoji: "🔍", name: "Sorting",           es: "Selección",             desc: "Grading and discarding fruit" },
  { id: "t-packing",  group: "product", emoji: "📦", name: "Packing",           es: "Empaque",               desc: "" },
  { id: "t-storage",  group: "product", emoji: "❄️", name: "Storage",           es: "Almacenamiento",        desc: "Cold rooms at farm, packhouse or exporter" },
  { id: "t-inland",   group: "product", emoji: "🚚", name: "Inland transport",  es: "Transporte terrestre",  desc: "Farm to packhouse, packhouse to port" },
  { id: "t-port",     group: "product", emoji: "🛃", name: "Port & inspection", es: "Puerto e inspección",   desc: "Port queues, phytosanitary and anti-narcotics checks" },
  { id: "t-sea",      group: "product", emoji: "🚢", name: "Sea freight",       es: "Transporte marítimo",   desc: "Reefer container, cold chain at sea" },
  { id: "t-monitor",  group: "info",    emoji: "📈", name: "Monitoring",        es: "Monitoreo",             desc: "Measuring conditions (°C, RH, rainfall) in the field and along the chain, and using the data for modelling and decisions" },
  { id: "t-comms",    group: "info",    emoji: "💬", name: "Communication",     es: "Comunicación",          desc: "Sharing information and relevant events along the chain, to build trust and improve the process" },
];
const EMOJI_PALETTE = "🌱🌿🌧️☀️🌡️💧🧺✂️🌬️🔍👁️📦🏷️❄️🧊🏭🚚🛃🚢✈️🏬🛒📈📊📡🧪🦠🍄💬📣🤝📋⚠️❓✅❌💰⏱️🔧👷🎓".match(/\p{Extended_Pictographic}\uFE0F?/gu);
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';

/* ================= Small helpers ================= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const clone = o => JSON.parse(JSON.stringify(o));
const nowISO = () => new Date().toISOString();
function roman(n) {
  const m = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let s = ""; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s;
}
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) + " " +
         d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
let toastTimer = null;
function toast(msg, ms = 3200) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), ms);
}
function download(name, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };

/* ================= Text measuring ================= */
const mctx = document.createElement("canvas").getContext("2d");
function wrap(text, maxw = MAXW) { // a line break the author typed (Shift+Enter) always starts a new line
  mctx.font = `${FONT_PX}px ${FONT_STACK}`;
  const lines = [];
  String(text || " ").split("\n").forEach(par => {
    let cur = "";
    for (const w of par.trim().split(/\s+/)) {
      const t = cur ? cur + " " + w : w;
      if (mctx.measureText(t).width <= maxw || !cur) cur = t; else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
  });
  if (!lines.length) lines.push(" ");
  return { lines, w: Math.max(...lines.map(l => mctx.measureText(l).width)) };
}
const cleanText = v => String(v || "").replace(/[ \t\r\f\v]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{2,}/g, "\n").trim(); // keeps single line breaks
const sizeCache = new Map();
function measureText(text, boxW = null) { // boxW: a width the author set by dragging the box edge; the text wraps inside it
  const key = boxW ? boxW + "|" + text : text;
  if (sizeCache.has(key)) return sizeCache.get(key);
  let r;
  if (text.trim() === "?") r = { w: 30, h: 30, lines: ["?"] };
  else if (boxW) { const m = wrap(text, boxW - PADX * 2); r = { w: boxW, h: m.lines.length * LINE + PADY * 2, lines: m.lines }; }
  else { const m = wrap(text); r = { w: Math.ceil(Math.min(MAXW, m.w)) + PADX * 2, h: m.lines.length * LINE + PADY * 2, lines: m.lines }; }
  sizeCache.set(key, r); return r;
}

/* ================= Small model helpers ================= */
function stageTags(langs) { // the example stage set, named in the project's languages where the template has them
  const main = langs[0];
  const pick = t => main === "es" ? t.es : t.name;
  const tr = t => { const o = {}; langs.slice(1).forEach(l => { if (l === "es") o.es = t.es; if (l === "en") o.en = t.name; }); return o; };
  return STAGE_TEMPLATE.map(t => ({ id: t.id, group: t.group, emoji: t.emoji, name: pick(t), nameTr: tr(t), desc: t.desc }));
}
function groupsFor(langs) {
  const main = langs[0];
  return DEFAULT_TAG_GROUPS.map(g => ({ id: g.id, name: main === "es" ? g.nameTr.es : g.name,
    nameTr: Object.fromEntries(langs.slice(1).filter(l => l === "es" || l === "en").map(l => [l, l === "es" ? g.nameTr.es : g.name])) }));
}
function guessLang(texts) { // rough stop-word vote, only used for files saved before languages existed
  const s = " " + texts.join(" ").toLowerCase().replace(/[^\p{L}\s]/gu, " ") + " ";
  const count = ws => ws.reduce((a, w) => a + (s.split(" " + w + " ").length - 1), 0);
  const es = count(["la", "el", "de", "que", "los", "las", "se", "del", "por", "con", "una", "es", "está", "son"]);
  const en = count(["the", "is", "of", "and", "to", "are", "not", "with", "for", "by", "in", "it"]);
  return es > en * 1.2 ? "es" : "en";
}
const trObj = o => { const r = {}; if (o && typeof o === "object") Object.entries(o).forEach(([k, v]) => { if (typeof v === "string" && v.trim()) r[k] = v; }); return r; };

/* ================= Languages: main text in `field`, others in `fieldTr[lang]` ================= */
const langName = c => LANG_NAMES[c] || c.toUpperCase();
const mainLang = () => doc.languages[0];
const curLang = () => (doc.languages.includes(view.lang) ? view.lang : mainLang());
const neutralText = s => /^[\s?¿!.…\-–—]*$/.test(s || "");
function txRaw(o, f, lang) { return lang === mainLang() ? (o[f] || "") : ((o[f + "Tr"] || {})[lang] || ""); }
function tx(o, f = "text", lang = curLang()) {
  if (!o) return "";
  return txRaw(o, f, lang) || o[f] || Object.values(o[f + "Tr"] || {}).find(Boolean) || "";
}
const txAll = (o, f = "text") => [o[f] || "", ...Object.values(o[f + "Tr"] || {})].filter(Boolean);
function txMissing(o, f = "text", lang = curLang()) {
  if (txRaw(o, f, lang).trim()) return false;
  const all = txAll(o, f); return all.length > 0 && !all.every(neutralText);
}
function txSet(o, f, lang, v) {
  if (lang === mainLang()) o[f] = v;
  else { o[f + "Tr"] = o[f + "Tr"] || {}; if (v) o[f + "Tr"][lang] = v; else delete o[f + "Tr"][lang]; }
}

const tagById = id => doc.tags.find(t => t.id === id);
const orderedTags = ids => doc.tags.filter(t => ids.includes(t.id)); // in the order of the tag list = chain order
