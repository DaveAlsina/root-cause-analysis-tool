/* ================= Goals: side panel ================= */
const goalSw = (T, gid) => `<span class="sw gsw${gid === GOAL_ROOT ? " groot" : ""}${gid !== GOAL_ROOT && T && goalOut(T, gid) ? " gout" : ""}"></span>`;
const goalList = (T, ids, extra = () => "") => `<ul class="list">${ids.map(id => `<li${extra(id) ? ' class="wbtn"' : ""}><button data-go="${esc(id)}">${goalSw(T, id)}<span>${id === GOAL_ROOT ? esc(goalLabel(id)) : nmOf(goalById(id))}</span></button>${extra(id)}</li>`).join("")}</ul>`;
const infoBtn = id => `<button type="button" class="infobtn" data-info="${id}" aria-expanded="false" aria-label="What this means" title="What this means">i</button>`;
function fnLine(x, T, extra = "") { // a function of a variant, with its relevance in the tree
  return `<li${extra ? ' class="wbtn"' : ""}><button data-fngo="${esc(x.f.id)}" data-fnv="${esc(x.V.id)}">${fnSwatchPlain(x.f)}<span>${x.f.key ? "★ " : ""}${nmOf(x.f)} <span class="muted">· ${esc(tx(x.V, "name"))}${x.rel != null ? ` · ${fmtRel(x.rel)}` : ""}</span></span></button>${extra}</li>`;
}

function goalsPanel(p) {
  const T = curTree();
  if (selId === GOAL_ROOT) return goalRootPanel(p, T);
  if (selId && T && gnode(T, selId)) return goalPanel(p, T, selId);
  goalsOverview(p, T);
}

function goalRootPanel(p, T) {
  p.innerHTML = `<div class="sec"><p class="kicker">Main goal · the root of every tree</p>
      ${textFields(doc.goals.root, "text", "Main goal", 3, true, "e.g. improve export revenues of uchuva while reducing Botrytis incidence")}
      <p class="muted">The main goal is the same in every tree. Below it, each boundary gets its own families of goals: what the design can achieve depends on where the system ends.</p>
      <div class="row"><button class="btn" id="g-add">Add a family <kbd>Tab</kbd></button></div></div>
    ${T ? `<div class="sec"><h2>Families in this tree · ${goalKids(T, GOAL_ROOT).length}</h2>${goalList(T, goalKids(T, GOAL_ROOT))}</div>` : ""}`;
  bindTextFields(GOAL_ROOT);
  $("#g-add").onclick = () => addGoal(GOAL_ROOT);
}

function scoreRow(T, gid, s, active) {
  const v = gnode(T, gid).scores[s.id] || 0;
  return `<div class="scrow${active ? " on" : ""}"><span class="scname" title="${esc(s.note || "")}">${esc(s.name)}</span>
    <span class="scbtns" role="group" aria-label="Score by ${esc(s.name)}">${[1, 2, 3, 4, 5].map(k => `<button type="button" data-score="${k}" data-sh="${esc(s.id)}" aria-pressed="${v === k}" title="${k}: ${esc(SCORE_ANCHORS[k])}">${k}</button>`).join("")}
    <button type="button" class="scclr" data-score="0" data-sh="${esc(s.id)}" aria-label="Clear the score" title="Clear the score"${v ? "" : " disabled"}>×</button></span></div>`;
}
function relFormula(T, gid, R, method) { // the arithmetic behind a relevance, step by step down the path
  const path = goalPath(T, gid), parts = [];
  for (const id of path) { const r = R.get(id); if (!r || r.s == null) return null;
    parts.push(method === "normalised" ? `${fmtScore(r.s)}/${fmtScore(r.sum)}` : `${fmtScore(r.s)}/5`); }
  return `${parts.join(" × ")} = ${fmtRel(relOf(R.get(gid), method), method)}`;
}

function goalPanel(p, T, gid) {
  const g = goalById(gid), n = gnode(T, gid), R = goalResults(T, view.scorer), r = R.get(gid), out = goalOut(T, gid);
  const kids = goalKids(T, gid), depth = goalDepth(T, gid), parent = n.parent || GOAL_ROOT, sc = goalScore(T, gid, view.scorer);
  const leaf = goalLeaves(T).includes(gid), sens = leaf && !out ? goalSensitivity(T, view.scorer) : null, rk = sens && sens.base.get(gid), rg = sens && sens.range.get(gid);
  const nLeaves = goalLeaves(T).length, M = doc.goals.method, other = M === "normalised" ? "absolute" : "normalised";
  const parentOpts = [GOAL_ROOT, ...T.nodes.map(x => x.goal).filter(id => id !== gid && !goalPath(T, id).includes(gid))]
    .map(id => `<option value="${esc(id)}"${parent === id ? " selected" : ""}>${"  ".repeat(id === GOAL_ROOT ? 0 : goalDepth(T, id))}${esc(goalLabel(id))}${id === GOAL_ROOT ? " (main goal)" : ""}</option>`).join("");
  const sibs = T.nodes.filter(x => (x.parent || null) === (n.parent || null)), si = sibs.indexOf(n);
  const scorer = view.scorer, others = treesWith(gid).filter(t => t !== T);
  const serving = doc.variants.flatMap(V => [V.root, ...Object.keys(V.placed)].map(fnById).filter(f => f && (f.serves || []).includes(gid)).map(f => ({ f, V, rel: treeForVariant(V) === T ? fnRelevance(f, T).rel : null })));
  const onlyChild = M === "normalised" && r && r.siblings === 1;
  p.innerHTML = `<div class="sec">
      <p class="kicker">${depth === 1 ? "Family of goals" : `Goal · level ${depth}`}${leaf ? " · leaf" : ""}${out ? " · out of scope" : ""}</p>
      ${textFields(g, "text", "Goal", 2, true, "A desired state, e.g. lower decay at arrival")}
      ${textFields(g, "measure", leaf ? "How it is measured · its performance specification" : "How it is measured", 1, false, "e.g. % decayed fruit at day 21 after arrival")}
      <label class="field"><span>Part of · its parent, which the score refers to</span><select id="g-parent">${parentOpts}</select></label>
      <div class="row"><button class="btn small icon" id="g-up" aria-label="Earlier" title="Earlier among its siblings"${si <= 0 ? " disabled" : ""}>↑</button><button class="btn small icon" id="g-down" aria-label="Later" title="Later among its siblings"${si >= sibs.length - 1 ? " disabled" : ""}>↓</button>
        <label class="chk outchk"><input type="checkbox" id="g-out"${n.out ? " checked" : ""}> Out of scope in this boundary</label></div></div>
    <div class="sec scoresec"><h2>Score · ${esc(SCORE_QUESTION.replace("this goal", `“${goalLabel(gid)}”`).replace("its parent", `“${goalLabel(parent)}”`))}</h2>
      <p class="anchors">${SCORE_ANCHORS.slice(1).map((a, i) => `<span><b>${i + 1}</b> ${esc(a)}</span>`).join("")}</p>
      ${out ? `<p class="muted">Out of scope here: it keeps its scores but counts for nothing in this tree.</p>` : ""}
      <div class="scrows">${doc.goals.stakeholders.map(s => scoreRow(T, gid, s, scorer === s.id || doc.goals.stakeholders.length === 1)).join("")}</div>
      <p class="muted">Keys <kbd>1</kbd>–<kbd>5</kbd> score as ${scorer !== "all" && shById(scorer) ? `<b>${esc(shById(scorer).name)}</b>` : doc.goals.stakeholders.length === 1 ? `<b>${esc(doc.goals.stakeholders[0].name)}</b>` : "the stakeholder picked in the toolbar"}; <kbd>0</kbd> clears.</p>
      ${sc && sc.n > 1 ? `<p class="combined">${esc(GOAL_AGGREGATES[doc.goals.aggregate].name)}: <b>${fmtScore(sc.s)}</b> of ${sc.n} · spread ${fmtRange(sc.lo, sc.hi)}${sc.hi - sc.lo >= 2 ? ` <span class="warnpill">they disagree</span>` : ""}</p>` : ""}</div>
    <div class="sec"><h2>Relevance${scorer !== "all" && shById(scorer) ? ` · as ${esc(shById(scorer).name)} scores it` : ""}</h2>
      ${out ? `<p class="muted">Out of scope in this boundary.</p>` : r && relOf(r) != null ? `<p class="relbig"><b>${fmtRel(relOf(r))}</b> <span class="muted">${esc(GOAL_METHODS[M].name.toLowerCase())} ${esc(GOAL_METHODS[M].short)}</span>
          <span class="muted">· ${esc(GOAL_METHODS[other].short)} ${fmtRel(relOf(r, other), other)}</span></p>
        <p class="formula">${esc(relFormula(T, gid, R, M))}</p>
        ${onlyChild ? `<p class="ckwarn">Its only sibling is itself: normalised, it gets its parent's whole share whatever its score.</p>` : ""}
        ${rk ? `<p>Rank <b>${rk}</b> of ${nLeaves} leaves · ${rg.lo === rg.hi ? "stays there under every ±1 change" : `between ${rg.lo} and ${rg.hi} when any one score moves by ±1`}</p>` : ""}`
        : `<p class="muted">Not yet: ${!sc ? "this goal has no score" : "a goal above it has no score"}.</p>`}</div>
    ${kids.length ? `<div class="sec"><h2>Subgoals · ${kids.length}</h2>${goalList(T, kids)}</div>` : ""}
    <div class="sec"><h2>Functions serving it · ${serving.length}</h2>
      ${serving.length ? `<ul class="list">${serving.map(x => fnLine(x, T)).join("")}</ul>` : `<p class="muted">None yet. In Functions, pick it under <b>Serves goals</b> for a function.</p>`}</div>
    <div class="sec">${notesAndSources(g)}
      ${others.length ? `<p class="muted">Also in the tree${others.length > 1 ? "s" : ""} of ${others.map(t => `<button type="button" class="linkbtn" data-tree="${esc(t.id)}">${esc(treeName(t))}</button>`).join(", ")}, with its own place and scores. Text, measure, notes and sources are shared.</p>` : ""}
      <div class="row"><button class="btn" id="g-sub">Add subgoal <kbd>Tab</kbd></button><button class="btn" id="g-sib">Add next to it</button><button class="btn danger" id="g-del">Remove <kbd>Del</kbd></button></div></div>`;
  bindTextFields(gid); bindNotesAndSources(gid);
  $("#g-parent").onchange = e => setGoalParent(gid, e.target.value);
  $("#g-up").onclick = () => moveGoal(gid, -1); $("#g-down").onclick = () => moveGoal(gid, 1);
  $("#g-out").onchange = e => commit(() => { gnode(curTree(), gid).out = e.target.checked; });
  $$("[data-score]").forEach(b => b.onclick = () => setScore(gid, b.dataset.sh, +b.dataset.score || null));
  $("#g-sub").onclick = () => addGoal(gid); $("#g-sib").onclick = () => addGoalSibling(gid); $("#g-del").onclick = deleteSelection;
  $$("[data-tree]").forEach(b => b.onclick = () => { switchTree(b.dataset.tree); setTimeout(() => goTo(gid), 60); });
}

function goalsOverview(p, T) {
  const G = doc.goals, B = doc.system.boundaries, missing = [...B.filter(b => !treeOfBoundary(b.id)), ...(treeOfBoundary(null) ? [] : [null])];
  const startList = `<ul class="list startlist">${missing.map(b => `<li class="wbtn"><span class="stl"><span class="bdash"></span>${b ? esc(tx(b, "name")) : "No boundary · the whole system"}</span><span class="bacts"><button class="btn small" data-start="${b ? esc(b.id) : ""}">Start empty</button>${G.trees.length ? `<select class="btn small" data-startcopy="${b ? esc(b.id) : ""}" aria-label="Start from the structure of another tree"><option value="">Copy structure of…</option>${G.trees.map(t => `<option value="${esc(t.id)}">${esc(treeName(t))}</option>`).join("")}</select>` : ""}</span></li>`).join("")}</ul>`;
  if (!T) {
    p.innerHTML = `<div class="sec"><h2>Goals</h2>
        <p>Goals say what the design must achieve, under one main goal. Each system boundary gets its own tree: families of goals, broken down into goals you can measure.</p>
        <p class="muted">${B.length ? "Start a tree for one of the boundaries of the system map." : `Draw boundaries in the <button type="button" class="linkbtn" data-tomode="system">System</button> mode first, or start a tree for the whole system.`}</p>
        ${startList}</div>
      ${mainGoalSec()}${methodSec()}`;
    bindOverview(T); return;
  }
  const c = goalChecks(T), R = c.R, sens = goalSensitivity(T, view.scorer), leaves = goalLeaves(T), RS = goalResults(T, view.scorer);
  const S = G.stakeholders, scored = s => T.nodes.filter(n => n.scores[s.id]).length;
  const leafRows = [...leaves].filter(id => sens.base.has(id)).sort((a, b) => sens.base.get(a) - sens.base.get(b));
  const unranked = leaves.filter(id => !sens.base.has(id));
  const perSh = S.filter(s => scored(s) > 0);
  const shRanks = perSh.map(s => leafRanks(T, s.id));
  const nChecks = c.single.length + c.noMeasure.length + c.unscored.length + c.disagree.length + c.unserved.length + c.noGoal.length + c.keyLow.length + c.highNoKey.length + c.elsewhere.length;
  const vs = c.variants, chk = (title, n, body, open) => `<details class="ck"${open && n ? " open" : ""}><summary>${title} · ${n}</summary>${n ? body : `<p class="muted">None.</p>`}</details>`;
  const fnList = rows => `<ul class="list">${rows.map(x => fnLine(x, T)).join("")}</ul>`;
  p.innerHTML = `
    <div class="sec"><h2>Goals tree · ${esc(treeName(T))}</h2>
      <p class="muted">${T.nodes.length} goal${T.nodes.length === 1 ? "" : "s"}, ${leaves.length} lea${leaves.length === 1 ? "f" : "ves"} in scope. ${vs.length ? `Used by the variant${vs.length > 1 ? "s" : ""} ${vs.map(v => `<button type="button" class="linkbtn" data-tovariant="${esc(v.id)}">${esc(tx(v, "name"))}</button>`).join(", ")}.` : "No variant works inside this boundary yet."}</p>
      <label class="field"><span>Why these goals here · only for you</span><textarea id="g-tnote" rows="2" placeholder="e.g. what the exporter can change inside this boundary">${esc(T.note)}</textarea></label>
      <div class="row"><button class="btn" id="g-addfam">Add a family</button><button class="btn danger" id="g-deltree">Delete this tree</button></div>
      ${missing.length ? `<details class="ck"><summary>Start a tree for another boundary · ${missing.length}</summary>${startList}</details>` : ""}</div>
    ${mainGoalSec()}
    <div class="sec"><h2>Who scores · ${S.length}</h2>
      <p class="muted">${esc(SCORE_QUESTION)} Each stakeholder scores each goal from 1 to 5; leave it blank if you didn't ask them.</p>
      <div class="shlist">${S.map(s => `<div class="shrow${view.scorer === s.id ? " on" : ""}"><input type="text" data-shname="${esc(s.id)}" value="${esc(s.name)}" aria-label="Name of the stakeholder"><span class="shn" title="Goals of this tree they scored">${scored(s)}/${T.nodes.length}</span>
        <button class="btn small" data-scoreas="${esc(s.id)}"${view.scorer === s.id ? " disabled" : ""}>${view.scorer === s.id ? "Scoring" : "Score as"}</button><button class="btn small icon danger" data-shdel="${esc(s.id)}" aria-label="Delete stakeholder" title="Delete stakeholder"${S.length < 2 ? " disabled" : ""}>×</button></div>`).join("")}</div>
      <div class="row"><button class="btn" id="g-addsh">Add a stakeholder</button>${S.length > 1 ? `<button class="btn" id="g-all"${view.scorer === "all" ? " disabled" : ""}>Show them combined</button>` : ""}</div></div>
    ${methodSec()}
    <div class="sec"><h2>Ranking of the leaves${view.scorer !== "all" && shById(view.scorer) ? ` · ${esc(shById(view.scorer).name)}` : ""}</h2>
      ${leafRows.length ? `<table class="ranktab"><thead><tr><th>#</th><th>Goal</th><th>${esc(GOAL_METHODS[G.method].short)}</th><th title="The ranks it takes when any one score moves by ±1">±1</th></tr></thead><tbody>
        ${leafRows.map(id => { const rg = sens.range.get(id); return `<tr class="${rg.lo !== rg.hi ? "unstable" : ""}"><td>${sens.base.get(id)}</td><td><button type="button" class="linkbtn" data-go="${esc(id)}">${nmOf(goalById(id))}</button></td><td class="num">${fmtRel(relOf(RS.get(id)))}</td><td class="num">${fmtRange(rg.lo, rg.hi)}</td></tr>`; }).join("")}</tbody></table>
        <p class="${sens.changes.length ? "ckwarn" : "okline"}">${sens.changes.length ? `The top three change in ${sens.changes.length} of the ±1 nudges:` : `${sens.top.map(goalLabel).map(esc).join(", ")} stay the top three when any one score moves by ±1${sens.top.some(id => { const r = sens.range.get(id); return r.lo !== r.hi; }) ? ", though their order can change" : ", in the same order"}.`}</p>
        ${sens.changes.length ? `<ul class="list nudges">${sens.changes.slice(0, 12).map(x => `<li><button data-go="${esc(x.gid)}"><span><b>${esc(goalLabel(x.gid))}</b> ${fmtScore(x.from)} → ${fmtScore(x.to)} <span class="muted">· top three: ${x.top.map(goalLabel).map(esc).join(", ")}</span></span></button></li>`).join("")}</ul>` : ""}
        ${unranked.length ? `<p class="muted">${unranked.length} lea${unranked.length === 1 ? "f has" : "ves have"} no relevance yet: ${unranked.map(goalLabel).map(esc).join(", ")}.</p>` : ""}`
        : `<p class="muted">Score the goals to rank the leaves.</p>`}
      ${perSh.length > 1 && leafRows.length ? `<details class="ck"><summary>Rank per stakeholder</summary><table class="ranktab"><thead><tr><th>Goal</th>${perSh.map(s => `<th>${esc(s.name)}</th>`).join("")}</tr></thead><tbody>
        ${[...leafRows, ...unranked].map(id => `<tr><td>${esc(goalLabel(id))}</td>${shRanks.map(r => `<td class="num">${r.get(id) || "–"}</td>`).join("")}</tr>`).join("")}</tbody></table></details>` : ""}</div>
    <div class="sec"><h2>Checks · ${nChecks ? `${nChecks} to look at` : "nothing to look at"}</h2>
      ${chk("★ key functions with low relevance", c.keyLow.length, fnList(c.keyLow), true)}
      ${chk("Highly relevant functions without ★", c.highNoKey.length, fnList(c.highNoKey), true)}
      ${chk("Leaf goals no function serves", c.unserved.length, goalList(T, c.unserved), true)}
      ${chk("Functions serving no goal of this tree", c.noGoal.length, fnList(c.noGoal), false)}
      ${chk("Functions serving goals outside this tree", c.elsewhere.length, fnList(c.elsewhere), false)}
      ${chk("Goals without a score", c.unscored.length, goalList(T, c.unscored), false)}
      ${chk("Stakeholders disagree (2 points or more)", c.disagree.length, goalList(T, c.disagree), false)}
      ${chk("Goals with a single subgoal", c.single.length, `<p class="muted">One subgoal often means the level isn't needed, or siblings are missing. Normalised, its score is ignored.</p>` + goalList(T, c.single), false)}
      ${chk("Leaves without a measure", c.noMeasure.length, goalList(T, c.noMeasure), false)}
      <p class="muted">High and low relevance are measured against the most relevant leaf: ${Math.round(REL_HIGH * 100)} % of it or more is high, under ${Math.round(REL_LOW * 100)} % is low.${vs.length ? "" : " Function checks need a variant that works inside this boundary."}</p></div>
    ${catalogueSec(T)}
    <div class="sec"><h2>Getting around</h2>
      <p class="muted">Double-click the canvas to add a family, a goal to rename it. <kbd>Tab</kbd> adds a subgoal to the selected goal, <kbd>Enter</kbd> renames it, <kbd>1</kbd>–<kbd>5</kbd> score it, <kbd>Del</kbd> removes it from this tree. Drag a goal onto another to move it under that one. The shaded part of a goal is its relevance next to the most relevant one.</p></div>`;
  bindOverview(T);
}
function mainGoalSec() {
  return `<div class="sec"><h2>Main goal</h2>${txAll(doc.goals.root).length ? `<p><button type="button" class="linkbtn" data-go="${GOAL_ROOT}">${esc(goalLabel(GOAL_ROOT))}</button></p>` : `<p class="muted">Not written yet. <button type="button" class="linkbtn" data-go="${GOAL_ROOT}">Write it</button>: it is the root of every tree.</p>`}</div>`;
}
function methodSec() {
  const G = doc.goals;
  return `<div class="sec"><h2>How scores become relevance</h2>
    <div class="field"><span>Down the tree ${infoBtn("method")}</span><div class="seg methseg" role="group" aria-label="Relevance">${Object.entries(GOAL_METHODS).map(([k, m]) => `<button data-method="${k}" aria-pressed="${G.method === k}">${esc(m.name)}</button>`).join("")}</div></div>
    <div class="infobox" id="info-method" hidden>${Object.entries(GOAL_METHODS).map(([k, m]) => `<p><b>${esc(m.name)}.</b> ${esc(m.how)} ${esc(m.good)} ${esc(m.use)}</p>`).join("")}
      <p class="sugg"><b>Suggested:</b> absolute to rank goals and choose key functions; normalised when you need weights to evaluate concepts. It's your call: the choice is saved in the file, and the goals table exports both.</p></div>
    <div class="field"><span>Across stakeholders ${infoBtn("agg")}</span><div class="seg aggseg" role="group" aria-label="Combining stakeholders">${Object.entries(GOAL_AGGREGATES).map(([k, a]) => `<button data-agg="${k}" aria-pressed="${G.aggregate === k}">${esc(a.name)}</button>`).join("")}</div></div>
    <div class="infobox" id="info-agg" hidden>${Object.entries(GOAL_AGGREGATES).map(([k, a]) => `<p><b>${esc(a.name)}.</b> ${esc(a.how)} ${esc(a.why)}</p>`).join("")}
      <p class="sugg"><b>Suggested:</b> the geometric mean, because relevance multiplies down the tree. Blank scores are left out, so a stakeholder who wasn't asked doesn't pull a goal down.</p></div></div>`;
}
function catalogueSec(T) {
  const loose = doc.goals.catalogue.filter(g => !inTree(g.id, T));
  if (!loose.length) return "";
  return `<div class="sec"><h2>Catalogue · not in this tree · ${loose.length}</h2>
    <p class="muted">Goals from other trees, or removed from this one, with their notes and sources. Place one here to reuse it.</p>
    <ul class="list">${loose.map(g => `<li class="catline"><span class="cl-name"><span class="sw gsw"></span><span>${nmOf(g)}</span></span><span class="cl-acts"><button class="btn small" data-gplace="${esc(g.id)}">Place here</button><button class="btn small icon danger" data-gdel="${esc(g.id)}" title="Delete everywhere" aria-label="Delete everywhere">×</button></span></li>`).join("")}</ul></div>`;
}
function bindOverview(T) {
  $$("[data-start]").forEach(b => b.onclick = () => startTree(b.dataset.start || null));
  $$("[data-startcopy]").forEach(s => s.onchange = () => s.value && startTree(s.dataset.startcopy || null, s.value));
  $$("[data-info]").forEach(b => b.onclick = () => { const box = $("#info-" + b.dataset.info), open = box.hidden; box.hidden = !open; b.setAttribute("aria-expanded", String(open)); });
  $$("[data-method]").forEach(b => b.onclick = () => commit(() => { doc.goals.method = b.dataset.method; }));
  $$("[data-agg]").forEach(b => b.onclick = () => commit(() => { doc.goals.aggregate = b.dataset.agg; }));
  $$("[data-gplace]").forEach(b => b.onclick = () => placeGoal(b.dataset.gplace));
  $$("[data-gdel]").forEach(b => b.onclick = () => deleteGoal(b.dataset.gdel));
  if (!T) return;
  $("#g-tnote").addEventListener("input", e => fieldEdit(T.id, m => { m.note = e.target.value; }));
  $("#g-addfam").onclick = () => addGoal(GOAL_ROOT);
  $("#g-deltree").onclick = () => deleteTree(T.id);
  $$("[data-shname]").forEach(i => i.addEventListener("change", () => { const v = i.value.trim(); if (v) commit(() => { shById(i.dataset.shname).name = v; }); }));
  $$("[data-scoreas]").forEach(b => b.onclick = () => { view.scorer = b.dataset.scoreas; render({ skipPanel: false }); });
  $$("[data-shdel]").forEach(b => b.onclick = () => deleteStakeholder(b.dataset.shdel));
  $("#g-addsh").onclick = () => addStakeholder();
  $("#g-all") && ($("#g-all").onclick = () => { view.scorer = "all"; render(); });
  $$("[data-tovariant]").forEach(b => b.onclick = () => { setMode("functions").then(() => switchVariant(b.dataset.tovariant)); });
}

/* ================= Functions mode: the goals a function serves ================= */
function servesField(f, V) {
  const T = treeForVariant(V);
  if (!doc.goals.catalogue.length) return `<div class="field"><span>Serves goals</span><p class="muted">Write goals in the <button type="button" class="linkbtn" data-tomode="goals">Goals</button> mode to say which ones this function serves.</p></div>`;
  const R = T ? goalResults(T) : new Map(), fr = fnRelevance(f, T, R);
  const chipOf = id => { const here = T && inTree(id, T) && !goalOut(T, id), v = here ? relOf(R.get(id)) : null;
    return `<span class="rcachip${here ? "" : " warnchip"}" title="${here ? "" : T ? "Not in the goals tree of this variant's boundary" : "This variant has no goals tree"}">${here ? "" : "⚠ "}<button type="button" class="linkbtn" data-go="${esc(id)}">${esc(goalLabel(id))}</button>${v != null ? `<span class="muted">${fmtRel(v)}</span>` : ""}<button type="button" data-unserve="${esc(id)}" aria-label="Remove">×</button></span>`; };
  const opts = T ? T.nodes.filter(n => !(f.serves || []).includes(n.goal)).map(n => `<option value="${esc(n.goal)}">${"  ".repeat(goalDepth(T, n.goal) - 1)}${esc(goalLabel(n.goal))}${goalOut(T, n.goal) ? " (out of scope)" : ""}</option>`).join("") : "";
  return `<div class="field"><span>Serves goals · ${T ? `the tree of ${esc(treeName(T))}` : "this variant's boundary has no goals tree"}</span>
    <div class="rcalinks">${(f.serves || []).filter(goalById).map(chipOf).join("")}</div>
    ${T ? `<select id="f-serves"><option value="">Add a goal…</option>${opts}</select>` : `<p class="muted">Start one in <button type="button" class="linkbtn" data-tomode="goals">Goals</button>.</p>`}
    ${fr.goals.length > 1 ? `<p class="muted">${doc.goals.method === "normalised" ? "Normalised: its weight is the sum of the goals it serves" : "Absolute: its relevance is that of the most relevant goal it serves"}${fr.goals.length > goalTopCount(fr.goals, T) ? "; a goal served together with its parent counts once" : ""}.</p>` : ""}</div>`;
}
const goalTopCount = (ids, T) => ids.filter(g => !goalPath(T, g).slice(0, -1).some(p => ids.includes(p))).length;
function bindServes(f) {
  $$("[data-unserve]").forEach(b => b.onclick = () => commit(() => { const m = fnById(f.id); m.serves = (m.serves || []).filter(x => x !== b.dataset.unserve); }));
  $("#f-serves") && ($("#f-serves").onchange = e => { const v = e.target.value; if (v) commit(() => { const m = fnById(f.id); m.serves = [...new Set([...(m.serves || []), v])]; }); });
}
function relPill(f, V) { // the relevance beside the ★
  const T = treeForVariant(V); if (!T) return "";
  const r = fnRelevance(f, T).rel;
  return r == null ? `<span class="relpill none" title="It serves no scored goal of this boundary's tree">no relevance yet</span>` : `<span class="relpill" title="${esc(GOAL_METHODS[doc.goals.method].name)} ${esc(GOAL_METHODS[doc.goals.method].short)}, from the goals it serves (combined scores)">${esc(GOAL_METHODS[doc.goals.method].short)} ${fmtRel(r)}</span>`;
}
function goalsSection(V) { // in the overview of a variant: how its functions stand against the goals
  const T = treeForVariant(V); if (!T) return "";
  const c = goalChecks(T), mine = x => x.V.id === V.id;
  const keyLow = c.keyLow.filter(mine), highNoKey = c.highNoKey.filter(mine), noGoal = c.noGoal.filter(mine);
  const fs = [V.root, ...Object.keys(V.placed)].map(fnById).filter(Boolean), served = new Set(fs.flatMap(f => fnRelevance(f, T, c.R).goals));
  served.forEach(g => goalDesc(T, g).forEach(d => served.add(d)));
  const unserved = goalLeaves(T).filter(g => !served.has(g));
  const n = keyLow.length + highNoKey.length + noGoal.length + unserved.length;
  const fl = rows => `<ul class="list">${rows.map(x => `<li><button data-go="${esc(x.f.id)}">${fnSwatch(x.f.id)}<span>${x.f.key ? "★ " : ""}${nmOf(x.f)}${x.rel != null ? ` <span class="muted">· ${fmtRel(x.rel)}</span>` : ""}</span></button></li>`).join("")}</ul>`;
  return `<div class="sec"><h2>Against the goals · ${n ? `${n} to look at` : "no gaps"}</h2>
    <p class="muted">The tree of <button type="button" class="linkbtn" data-tomode="goals">${esc(treeName(T))}</button>, ${esc(GOAL_METHODS[doc.goals.method].name.toLowerCase())} ${esc(GOAL_METHODS[doc.goals.method].short)}, combined scores.</p>
    <details class="ck"${keyLow.length ? " open" : ""}><summary>★ key functions with low relevance · ${keyLow.length}</summary>${keyLow.length ? fl(keyLow) : `<p class="muted">None.</p>`}</details>
    <details class="ck"${highNoKey.length ? " open" : ""}><summary>Highly relevant functions without ★ · ${highNoKey.length}</summary>${highNoKey.length ? fl(highNoKey) : `<p class="muted">None.</p>`}</details>
    <details class="ck"${unserved.length ? " open" : ""}><summary>Leaf goals no function here serves · ${unserved.length}</summary>${unserved.length ? goalList(T, unserved) : `<p class="muted">Every leaf is served.</p>`}</details>
    <details class="ck"><summary>Functions serving no goal · ${noGoal.length}</summary>${noGoal.length ? fl(noGoal) : `<p class="muted">None.</p>`}</details></div>`;
}
