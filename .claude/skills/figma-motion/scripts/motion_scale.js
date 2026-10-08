// figma-motion
// Runs inside Figma (Plugin API) through a tool such as figma_execute or use_figma.
//
// Writes motion tokens to the Brand collection with Figma's native variable types:
//   Brand / Motion / Duration / XFast | Fast | Default | Slow | XSlow     TIMING variables (milliseconds)
//   Brand / Motion / Easing   / Standard | Enter | Exit | Linear          EASING variables (cubic bezier)
//
// TIMING and EASING variables can be used in prototype transitions and in code. They cannot have
// scopes. Motion is mode-agnostic, so the value is written to every mode and no mode is added.
// A Motion variable made by an older version of this skill as a number or text is replaced by the
// native type (only when its description carries this skill's mark, so nothing made by hand is touched).
//
// Edit ONLY the CONFIG block. Send everything else unchanged.

// ---- CONFIG ----
const REQUEST = {
  overwrite: false,  // true = reset values that were changed by hand back to the preset
  groups: ["all"]    // "all", or any of "Duration", "Easing"
};
const COLLECTION = "Brand"; // matched by name (case-insensitive); created if the file has none by that name
const DRY_RUN = false;  // true = report what would happen, write nothing
const EXPECT_FILE = ""; // optional file name guard, e.g. "Design System MB"
// ---- END CONFIG ----

// ---- PRESET ----
// Durations in milliseconds. Easing curves are cubic beziers [x1, y1, x2, y2].
// "Enter" decelerates (things arriving), "Exit" accelerates (things leaving), "Standard" does both.
const PRESET = [
  { group: "Duration", token: "XFast", type: "TIMING", value: 50, use: "Micro feedback: a pressed state, a color change" },
  { group: "Duration", token: "Fast", type: "TIMING", value: 100, use: "Small elements: toggles, checkboxes, hover" },
  { group: "Duration", token: "Default", type: "TIMING", value: 200, use: "Most transitions: menus, tooltips, expanding rows" },
  { group: "Duration", token: "Slow", type: "TIMING", value: 300, use: "Larger elements: panels, drawers, modals" },
  { group: "Duration", token: "XSlow", type: "TIMING", value: 500, use: "Full-screen and page transitions" },
  { group: "Easing", token: "Standard", type: "EASING", value: [0.2, 0, 0, 1], use: "Elements that move within the screen" },
  { group: "Easing", token: "Enter", type: "EASING", value: [0, 0, 0, 1], use: "Elements arriving: they start fast and settle" },
  { group: "Easing", token: "Exit", type: "EASING", value: [0.3, 0, 1, 1], use: "Elements leaving: they speed up and go" },
  { group: "Easing", token: "Linear", type: "EASING", value: [0, 0, 1, 1], use: "Progress bars and loaders: constant speed" }
];
const MARK = "[figma-motion]"; // sentinel so a later run can tell its own variables from the user's
// ---- END PRESET ----

const low = (s) => String(s).trim().toLowerCase();
const norm = (s) => low(s).replace(/[\s_-]+/g, "");
const msg = (e) => String((e && e.message) || e);
const nameOf = (p) => "Motion/" + p.group + "/" + p.token;
const describe = (p) => nameOf(p) + " = " + (p.type === "TIMING" ? p.value + "ms" : "cubic-bezier(" + p.value.join(", ") + ")") + ". " + p.use + ". " + MARK;
// What Figma stores: a number for TIMING, a custom cubic bezier object for EASING.
const toFigma = (p) => (p.type === "TIMING" ? p.value : { type: "CUSTOM_CUBIC_BEZIER", easingFunctionCubicBezier: { x1: p.value[0], y1: p.value[1], x2: p.value[2], y2: p.value[3] } });
const bezierOf = (v) => (v && v.easingFunctionCubicBezier ? [v.easingFunctionCubicBezier.x1, v.easingFunctionCubicBezier.y1, v.easingFunctionCubicBezier.x2, v.easingFunctionCubicBezier.y2] : null);
const same = (p, cur) => (p.type === "TIMING"
  ? typeof cur === "number" && Math.abs(cur - p.value) < 1e-6
  : (() => { const b = bezierOf(cur); return !!b && b.every((x, i) => Math.abs(x - p.value[i]) < 0.001); })());
const show = (p, cur) => (p.type === "TIMING" ? cur : bezierOf(cur));

const out = {
  dryRun: DRY_RUN, file: figma.root.name, status: "ok", collection: null,
  variables: { created: 0, updated: 0, unchanged: 0, kept: 0, replaced: 0, failed: 0, rows: [], others: [] },
  problems: []
};
if (EXPECT_FILE && low(EXPECT_FILE) !== low(figma.root.name)) {
  out.status = "error";
  out.error = 'This is "' + figma.root.name + '", not "' + EXPECT_FILE + '". Nothing was written.';
  return out;
}
const OW = REQUEST.overwrite === true;
const asked = (REQUEST.groups || ["all"]).map(low);
const allGroups = [];
for (const p of PRESET) if (!allGroups.includes(p.group)) allGroups.push(p.group);
const defs = PRESET.filter((p) => asked.includes("all") || asked.includes(low(p.group)));
for (const a of asked) if (a !== "all" && !allGroups.some((g) => low(g) === a)) out.problems.push('Unknown group "' + a + '". Groups: ' + allGroups.join(", "));
if (!defs.length) { out.status = "error"; out.error = "No motion tokens to write. Groups: " + allGroups.join(", "); return out; }

const collections = await figma.variables.getLocalVariableCollectionsAsync();
let col = collections.find((c) => low(c.name) === low(COLLECTION)) || collections.find((c) => norm(c.name) === norm(COLLECTION));
let created = false;
if (!col) {
  if (!DRY_RUN) col = figma.variables.createVariableCollection(COLLECTION);
  created = true;
}
if (DRY_RUN && created) {
  out.collection = { name: COLLECTION, created: true };
  out.variables.rows = defs.map((p) => ({ name: nameOf(p), value: p.value, action: "create" }));
  out.variables.created = defs.length;
  return out;
}
out.collection = { name: col.name, created };
const modeIds = col.modes.map((m) => m.modeId);
const all = await figma.variables.getLocalVariablesAsync();
const byName = {};
for (const v of all.filter((v) => v.variableCollectionId === col.id)) byName[low(v.name)] = v;

function make(p) {
  const v = figma.variables.createVariable(nameOf(p), col, p.type);
  for (const id of modeIds) v.setValueForMode(id, toFigma(p));
  v.description = describe(p);
  return v;
}
for (const p of defs) {
  const name = nameOf(p);
  const row = { name, value: p.value, action: null };
  out.variables.rows.push(row);
  try {
    let v = byName[low(name)];
    if (!v) {
      if (!DRY_RUN) make(p);
      row.action = "created"; out.variables.created++;
      continue;
    }
    if (v.resolvedType !== p.type) {
      // An older version of this skill made these as numbers and text: swap them for the native type.
      if ((v.description || "").endsWith(MARK)) {
        row.was = v.resolvedType;
        if (!DRY_RUN) { v.remove(); make(p); }
        row.action = "replaced"; out.variables.replaced++;
      } else {
        row.action = "failed"; row.reason = name + " exists as " + v.resolvedType + " and was not made by this skill, so it was left alone";
        out.variables.failed++;
      }
      continue;
    }
    const differing = modeIds.filter((id) => !same(p, v.valuesByMode[id]));
    if (!differing.length) { row.action = "unchanged"; out.variables.unchanged++; }
    else if (OW) {
      row.was = differing.map((id) => show(p, v.valuesByMode[id]));
      if (!DRY_RUN) for (const id of differing) v.setValueForMode(id, toFigma(p));
      row.action = "updated"; out.variables.updated++;
    } else {
      row.action = "kept";
      row.current = modeIds.map((id) => show(p, v.valuesByMode[id]));
      out.variables.kept++;
    }
    if (!DRY_RUN && (!v.description || v.description.endsWith(MARK))) v.description = describe(p);
  } catch (e) { row.action = "failed"; row.reason = msg(e); out.variables.failed++; }
}
const presetNames = new Set(PRESET.map((p) => low(nameOf(p))));
for (const key of Object.keys(byName)) if (key.startsWith("motion/") && !presetNames.has(key)) out.variables.others.push(byName[key].name);
if (out.variables.failed || out.problems.length) out.status = "partial";
return out;
