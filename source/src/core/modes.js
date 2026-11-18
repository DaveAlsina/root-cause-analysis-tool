/* ================= Modes: the tools of the workbench ================= */
/* Each tool is its own HTML file in the same folder; index.html is the home page. The app defines MODE in its config. */
const MODES = [
  { id: "rca", file: "uchuva-rca.html", name: "Root causes" },
  { id: "system", file: "function-analysis.html#system", name: "System" }, // system and functions: two modes of one file
  { id: "fa", file: "function-analysis.html#functions", name: "Functions" },
];
function drawModeNav(current = MODE) {
  const nav = document.getElementById("modenav"); if (!nav) return;
  if (document.querySelector('meta[name="rca-publish"]')) { nav.hidden = true; return; } // the published viewer stands alone
  nav.innerHTML = `<a href="index.html" class="mn-home" title="Workbench home" aria-label="Workbench home">⌂</a>` + MODES.map(m =>
    m.id === current ? `<span class="mn-cur" aria-current="page">${m.name}</span>`
      : m.file ? `<a href="${m.file}">${m.name}</a>` : `<span class="mn-off" title="Not built yet">${m.name}</span>`).join("");
}
drawModeNav();
