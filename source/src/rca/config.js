/* Uchuva RCA Workbench — offline root-cause-analysis editor.
   Data lives in one JSON document (boxes, arrows, colour key, versions). */
/* global cytoscape, ELK */
"use strict";

/* ================= Constants ================= */
const APP_VERSION = "2.0";
const MODE = "rca"; // this tool, for the mode switcher
const FONT_PX = 13, LINE = 17, MAXW = 150, PADX = 11, PADY = 8;
const FONT_STACK = '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
const STATUSES = {
  unassessed: { name: "Not assessed", short: "None",       color: null,      style: "solid",  width: 1.3 },
  hypothesis: { name: "Hypothesis",   short: "Hypothesis", color: "#D99A00", style: "dashed", width: 3 },
  supported:  { name: "Supported by evidence", short: "Supported", color: "#15924F", style: "solid",  width: 3 },
  refuted:    { name: "Refuted",      short: "Refuted",    color: "#D23B3B", style: "dotted", width: 3 },
};
const ROLES = {
  none:         { name: "No rule",              hint: "" },
  problem:      { name: "Problem statement",    hint: "The problem being explained" },
  intermediate: { name: "Intermediate cause",   hint: "Should be explained by at least one deeper cause" },
  root:         { name: "Root cause",           hint: "Should be the end of its chain: no deeper causes" },
  uncertain:    { name: "Uncertain",            hint: "A cause you are not sure about" },
  question:     { name: "Open question",        hint: "A gap still to investigate" },
};
const DEFAULT_CATS = [
  { id: "problem",  name: "Root problem",       role: "problem",      desc: "The problem being explained.", fill: "#fff2cc", stroke: "#d6b656", font: "#1a1a1a" },
  { id: "cause",    name: "Intermediate cause", role: "intermediate", desc: "A cause that is itself explained by deeper causes.", fill: "#1ba1e2", stroke: "#006eaf", font: "#ffffff" },
  { id: "fact",     name: "Root cause",         role: "root",         desc: "The very root cause, or the last causal point I was able to determine.", fill: "#f5f5f5", stroke: "#666666", font: "#333333" },
  { id: "plant",    name: "Unsure",             role: "uncertain",    desc: "A cause I am not sure about. Shades of purple show the degree of doubt.", fill: "#e1d5e7", stroke: "#9673a6", font: "#1a1a1a" },
  { id: "question", name: "Open question",      role: "question",     desc: "A gap in the chain still to investigate.", fill: "#d80073", stroke: "#a50040", font: "#ffffff" },
];
// names the first version of the app guessed; files that still carry them get the real meanings
const OLD_GUESSES = { problem: "Observed problem", cause: "Cause", fact: "Supporting fact / condition", plant: "Plant-level factor", question: "Open question" };
const DEFAULT_VIEW = { lang: null, legendOpen: false, tagChips: true, mode: "manual", focusR: 0, trace: true, redundant: "show", effort: 3, place: 1,
  levelSp: 70, nodeSp: 14, route: "ORTHOGONAL", keepOrder: false, split: false, repeat: true };
const LS_DOC = "uchuva-rca:doc", LS_VIEW = "uchuva-rca:view", LS_FILE = "uchuva-rca:file";
// names the shared core uses for this tool
const FILE_DESC = "RCA file";
const FILE_OPEN_TYPE = { description: "RCA file or draw.io diagram", accept: { "application/json": [".json"], "application/xml": [".drawio", ".xml", ".dio"] } };
const TAG_HOLDER = ["box", "boxes"];
