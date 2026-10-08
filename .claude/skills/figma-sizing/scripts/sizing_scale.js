// figma-sizing
// Runs inside Figma (Plugin API) through a tool such as figma_execute or use_figma.
//
// Writes component sizes as number (FLOAT) variables in the Brand collection, in three groups:
//   Brand / Size / Icon / XSmall ... XLarge
//   Brand / Size / Control / Small | Default | Large | Touch
//   Brand / Size / Avatar / XSmall ... XLarge
// Sizes are mode-agnostic: the value is written to every mode of the collection and no mode is added.
//
// Edit ONLY the CONFIG block. Send everything else unchanged.

// ---- CONFIG ----
const REQUEST = {
  overwrite: false,  // true = reset values that were changed by hand back to the preset
  groups: ["all"]    // "all", or any of "Icon", "Control", "Avatar"
};
const COLLECTION = "Brand"; // matched by name (case-insensitive); created if the file has none by that name
const DRY_RUN = false;  // true = report what would happen, write nothing
const EXPECT_FILE = ""; // optional file name guard, e.g. "Design System MB"
// ---- END CONFIG ----

// ---- PRESET ----
// Names follow the text styles: Small, Default, Large, with XSmall and XLarge beyond them.
// Default is the one to use unless there is a reason not to.
const PRESET = [
  { group: "Icon", token: "XSmall", value: 12, use: "Inline icons in small text" },
  { group: "Icon", token: "Small", value: 16, use: "Icons beside body text and in dense UI" },
  { group: "Icon", token: "Default", value: 20, use: "Standard icon size" },
  { group: "Icon", token: "Large", value: 24, use: "Icons in navigation and headings" },
  { group: "Icon", token: "XLarge", value: 32, use: "Feature and empty-state icons" },
  { group: "Control", token: "Small", value: 32, use: "Compact buttons and inputs" },
  { group: "Control", token: "Default", value: 40, use: "Standard button, input and select height" },
  { group: "Control", token: "Large", value: 48, use: "Prominent buttons and inputs" },
  { group: "Control", token: "Touch", value: 44, use: "Minimum tap target on touch screens" },
  { group: "Avatar", token: "XSmall", value: 24, use: "Avatars in dense lists" },
  { group: "Avatar", token: "Small", value: 32, use: "Avatars in tables and comments" },
  { group: "Avatar", token: "Default", value: 40, use: "Standard avatar" },
  { group: "Avatar", token: "Large", value: 56, use: "Profile headers and cards" },
  { group: "Avatar", token: "XLarge", value: 72, use: "Profile pages" }
];
const SCOPES = ["WIDTH_HEIGHT"];
const MARK = "[figma-sizing]"; // sentinel so a later run can tell its own descriptions from the user's
// ---- END PRESET ----

const low = (s) => String(s).trim().toLowerCase();
const norm = (s) => low(s).replace(/[\s_-]+/g, "");
const msg = (e) => String((e && e.message) || e);
const same = (a, b) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 1e-6;
const nameOf = (p) => "Size/" + p.group + "/" + p.token;
const describe = (p) => nameOf(p) + " = " + p.value + "px. " + p.use + ". " + MARK;

const out = {
  dryRun: DRY_RUN, file: figma.root.name, status: "ok", collection: null,
  variables: { created: 0, updated: 0, unchanged: 0, kept: 0, failed: 0, scoped: 0, rows: [], others: [] },
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
if (!defs.length) { out.status = "error"; out.error = "No sizes to write. Groups: " + allGroups.join(", "); return out; }

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

for (const p of defs) {
  const name = nameOf(p);
  const row = { name, value: p.value, action: null };
  out.variables.rows.push(row);
  try {
    let v = byName[low(name)];
    if (!v) {
      if (!DRY_RUN) {
        v = figma.variables.createVariable(name, col, "FLOAT");
        for (const id of modeIds) v.setValueForMode(id, p.value);
        try { v.scopes = SCOPES; } catch (e) { /* scopes are a nicety */ }
        v.description = describe(p);
      }
      row.action = "created"; out.variables.created++;
      continue;
    }
    if (v.resolvedType !== "FLOAT") { row.action = "failed"; row.reason = name + " exists as " + v.resolvedType + ", expected a number"; out.variables.failed++; continue; }
    const differing = modeIds.filter((id) => !same(v.valuesByMode[id], p.value));
    if (!differing.length) { row.action = "unchanged"; out.variables.unchanged++; }
    else if (OW) {
      row.was = differing.map((id) => v.valuesByMode[id]).filter((x, i, a) => a.indexOf(x) === i);
      if (!DRY_RUN) for (const id of differing) v.setValueForMode(id, p.value);
      row.action = "updated"; out.variables.updated++;
    } else {
      row.action = "kept";
      row.current = modeIds.map((id) => v.valuesByMode[id]).filter((x, i, a) => a.indexOf(x) === i);
      out.variables.kept++;
    }
    if (!DRY_RUN) {
      if (v.scopes && v.scopes.length === 1 && v.scopes[0] === "ALL_SCOPES") { try { v.scopes = SCOPES; out.variables.scoped++; } catch (e) { /* ignore */ } }
      if (!v.description || v.description.endsWith(MARK)) v.description = describe(p);
    }
  } catch (e) { row.action = "failed"; row.reason = msg(e); out.variables.failed++; }
}
const presetNames = new Set(PRESET.map((p) => low(nameOf(p))));
for (const key of Object.keys(byName)) if (key.startsWith("size/") && !presetNames.has(key)) out.variables.others.push(byName[key].name);
if (out.variables.failed || out.problems.length) out.status = "partial";
return out;
