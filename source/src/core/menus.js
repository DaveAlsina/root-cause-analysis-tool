/* ================= Menus and dialogs: data-act buttons, data-close, click outside ================= */
/* The app supplies: ACTIONS. */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (b && ACTIONS[b.dataset.act]) { $$("details.menu").forEach(d => d.open = false); ACTIONS[b.dataset.act](); return; }
  if (!e.target.closest("details.menu")) $$("details.menu").forEach(d => d.open = false);
  const c = e.target.closest("[data-close]"); if (c) c.closest(".overlay").hidden = true;
});
$$(".overlay").forEach(o => o.addEventListener("pointerdown", e => { if (e.target === o) o.hidden = true; }));
