// figma-elevation
// Runs inside Figma (Plugin API) through a tool such as figma_execute.
//
// Builds shadows and elevation as tokens, following the Brand -> Alias -> Mapped chain:
//   Brand   Shadow/Soft, Medium, Strong, Heavy      black at 8%, 14%, 24%, 40% (color variables)
//           Elevation/<n>/Key Y, Key Blur, Ambient Y, Ambient Blur   (number variables, px)
//   Alias   Shadow/Soft ... Heavy                    references into Brand
//   Mapped  Shadow/key, Shadow/ambient               Light and Dark values that reference Alias
//   Styles  Elevation/1 ... Elevation/5              effect styles with two drop shadows each,
//                                                    every color, offset and blur bound to the variables
//
// A shadow color bound to a variable takes the variable's own opacity, so the opacity lives in the
// Brand colors. Dark mode uses stronger shadows because shadows are harder to see on dark surfaces.
//
// Edit ONLY the CONFIG block. Send everything else unchanged.

// ---- CONFIG ----
const REQUEST = {
  overwrite: false, // true = put values and styles changed by hand back on the preset
  levels: ["all"]   // "all", or a subset such as ["1", "3"]
};
const DRY_RUN = false;  // true = report what would happen, write nothing
const EXPECT_FILE = ""; // optional file name guard, e.g. "Design System MB"
// ---- END CONFIG ----

// ---- PRESET ----
const BRAND = "Brand", ALIAS = "Alias", MAPPED = "Mapped";
// Black at four opacities. Brand holds raw values, so the alpha lives here.
const SHADOW_COLORS = [["Soft", 0.08], ["Medium", 0.14], ["Strong", 0.24], ["Heavy", 0.40]];
// Mapped tokens: [name, Light alias, Dark alias]. Dark is stronger so shadows still read on dark surfaces.
const MAPPED_SHADOWS = [["Shadow/key", "Medium", "Heavy"], ["Shadow/ambient", "Soft", "Strong"]];
// level: [key Y, key blur, ambient Y, ambient blur, use]. X offset and spread are 0 on every layer.
const LEVELS = [
  ["1", 1, 3, 0, 1, "Cards and raised rows"],
  ["2", 2, 6, 0, 2, "Dropdowns and menus"],
  ["3", 6, 12, 1, 3, "Popovers and tooltips"],
  ["4", 12, 24, 2, 6, "Modals and drawers"],
  ["5", 24, 48, 4, 12, "Toasts and the top-most layer"]
];
const NUMBERS = ["Key Y", "Key Blur", "Ambient Y", "Ambient Blur"];
// ---- END PRESET ----

const low = (s) => String(s).trim().toLowerCase();
const msg = (e) => String((e && e.message) || e);
const same = (a, b) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 1e-6;

const out = {
  dryRun: DRY_RUN, file: figma.root.name, status: "ok",
  collections: [], variables: { created: 0, updated: 0, unchanged: 0, kept: 0, failed: 0 },
  styles: { created: 0, updated: 0, unchanged: 0, kept: 0, failed: 0, rows: [] },
  notes: [], problems: []
};
if (EXPECT_FILE && low(EXPECT_FILE) !== low(figma.root.name)) {
  out.status = "error";
  out.error = 'This is "' + figma.root.name + '", not "' + EXPECT_FILE + '". Nothing was written.';
  return out;
}
const asked = (REQUEST.levels || ["all"]).map(low);
const levels = asked.includes("all") ? LEVELS.slice() : LEVELS.filter((l) => asked.includes(l[0]));
for (const a of asked) if (a !== "all" && !LEVELS.some((l) => l[0] === a)) out.problems.push('Unknown level "' + a + '". Levels: ' + LEVELS.map((l) => l[0]).join(", "));
if (!levels.length) { out.status = "error"; out.error = "No levels to write."; return out; }
const OW = REQUEST.overwrite === true;

const collections = await figma.variables.getLocalVariableCollectionsAsync();
let variables = await figma.variables.getLocalVariablesAsync();
const findColl = (n) => collections.find((c) => low(c.name) === low(n)) || null;
const byId = (id) => variables.find((v) => v.id === id);
const inColl = (c, name) => (c ? variables.find((v) => v.variableCollectionId === c.id && low(v.name) === low(name)) || null : null);

function ensureColl(name) {
  let c = findColl(name);
  if (c) return c;
  out.collections.push(name + " (created)");
  if (DRY_RUN) return null;
  c = figma.variables.createVariableCollection(name);
  collections.push(c);
  return c;
}
const brand = ensureColl(BRAND), alias = ensureColl(ALIAS);
let mapped = findColl(MAPPED);
if (!mapped) {
  out.collections.push(MAPPED + " (created, Light only)");
  if (!DRY_RUN) { mapped = figma.variables.createVariableCollection(MAPPED); mapped.renameMode(mapped.defaultModeId, "Light"); collections.push(mapped); }
}
if (DRY_RUN) {
  out.notes.push("Would write " + SHADOW_COLORS.length + " Brand colors, " + SHADOW_COLORS.length + " Alias references, " + MAPPED_SHADOWS.length + " Mapped tokens, " + levels.length * NUMBERS.length + " Brand numbers and " + levels.length + " effect styles.");
  return out;
}
const lightMode = mapped.modes.find((m) => low(m.name) === "light") || mapped.modes[0];
const darkMode = mapped.modes.find((m) => low(m.name) === "dark") || null;
if (!darkMode) out.notes.push("Mapped has no Dark mode yet, so Shadow tokens only have Light values. Run Mapped dark and then Elevation again.");

// A variable made if missing. kind: "COLOR" | "FLOAT".
function ensureVar(coll, name, kind, scopes, description) {
  let v = inColl(coll, name);
  if (v) return { v, isNew: false };
  v = figma.variables.createVariable(name, coll, kind);
  try { v.scopes = scopes; } catch (e) { /* scopes are a nicety */ }
  v.description = description;
  variables.push(v);
  return { v, isNew: true };
}
const sameColor = (a, b) => a && b && typeof a === "object" && "r" in a && ["r", "g", "b", "a"].every((k) => Math.abs((a[k] === undefined ? 1 : a[k]) - (b[k] === undefined ? 1 : b[k])) < 0.005);
const count = (what) => { out.variables[what]++; };

// 1. Brand: shadow colors
for (const [name, alpha] of SHADOW_COLORS) {
  try {
    const want = { r: 0, g: 0, b: 0, a: alpha };
    const { v, isNew } = ensureVar(brand, "Shadow/" + name, "COLOR", ["EFFECT_COLOR"], "Black at " + Math.round(alpha * 100) + "%. Shadow color. [figma-elevation]");
    if (isNew) { for (const m of brand.modes) v.setValueForMode(m.modeId, want); count("created"); continue; }
    const cur = v.valuesByMode[brand.defaultModeId];
    if (sameColor(cur, want)) count("unchanged");
    else if (OW) { for (const m of brand.modes) v.setValueForMode(m.modeId, want); count("updated"); }
    else count("kept");
  } catch (e) { count("failed"); out.problems.push("Brand/Shadow/" + name + ": " + msg(e)); }
}
// 2. Alias: references into Brand
const pointsAt = (coll, v, target) => coll.modes.every((m) => { const x = v.valuesByMode[m.modeId]; return x && x.type === "VARIABLE_ALIAS" && x.id === target.id; });
for (const [name] of SHADOW_COLORS) {
  try {
    const target = inColl(brand, "Shadow/" + name);
    const { v, isNew } = ensureVar(alias, "Shadow/" + name, "COLOR", ["EFFECT_COLOR"], "Shadow color, from Brand/Shadow/" + name + ". [figma-elevation]");
    if (!isNew && pointsAt(alias, v, target)) { count("unchanged"); continue; }
    if (!isNew && !OW) { count("kept"); continue; }
    for (const m of alias.modes) v.setValueForMode(m.modeId, figma.variables.createVariableAlias(target));
    count(isNew ? "created" : "updated");
  } catch (e) { count("failed"); out.problems.push("Alias/Shadow/" + name + ": " + msg(e)); }
}
// 3. Mapped: shadow key and ambient, Light and Dark, references into Alias
for (const [name, lightRef, darkRef] of MAPPED_SHADOWS) {
  try {
    const { v, isNew } = ensureVar(mapped, name, "COLOR", ["EFFECT_COLOR"], "Shadow color for elevation. [figma-elevation]");
    const want = [[lightMode, lightRef], [darkMode, darkRef]].filter(([m]) => m);
    let wrote = false, held = false;
    for (const [m, ref] of want) {
      const target = inColl(alias, "Shadow/" + ref);
      const cur = v.valuesByMode[m.modeId];
      if (cur && cur.type === "VARIABLE_ALIAS" && cur.id === target.id) continue;
      if (isNew || OW || !(cur && cur.type === "VARIABLE_ALIAS")) { v.setValueForMode(m.modeId, figma.variables.createVariableAlias(target)); wrote = true; }
      else held = true;
    }
    count(isNew ? "created" : wrote ? "updated" : held ? "kept" : "unchanged");
  } catch (e) { count("failed"); out.problems.push("Mapped/" + name + ": " + msg(e)); }
}
// 4. Brand: elevation numbers
for (const [n, ky, kb, ay, ab] of levels) {
  [ky, kb, ay, ab].forEach((val, i) => {
    try {
      const name = "Elevation/" + n + "/" + NUMBERS[i];
      const { v, isNew } = ensureVar(brand, name, "FLOAT", ["EFFECT_FLOAT"], name + " = " + val + "px. [figma-elevation]");
      if (isNew) { for (const m of brand.modes) v.setValueForMode(m.modeId, val); count("created"); return; }
      if (same(v.valuesByMode[brand.defaultModeId], val)) count("unchanged");
      else if (OW) { for (const m of brand.modes) v.setValueForMode(m.modeId, val); count("updated"); }
      else count("kept");
    } catch (e) { count("failed"); out.problems.push("Elevation/" + n + ": " + msg(e)); }
  });
}
variables = await figma.variables.getLocalVariablesAsync();

// 5. Effect styles: two drop shadows each, every color, offset and blur bound to a variable
const styles = await figma.getLocalEffectStylesAsync();
const styleByName = new Map(styles.map((s) => [low(s.name), s]));
function layer(colorVar, yVar, blurVar) {
  let e = { type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.14 }, offset: { x: 0, y: 0 }, radius: 0, spread: 0, visible: true, blendMode: "NORMAL" };
  e = figma.variables.setBoundVariableForEffect(e, "color", colorVar);
  e = figma.variables.setBoundVariableForEffect(e, "offsetY", yVar);
  e = figma.variables.setBoundVariableForEffect(e, "radius", blurVar);
  return e;
}
const boundIds = (effects) => effects.map((e) => ["color", "offsetY", "radius"].map((k) => (e.boundVariables && e.boundVariables[k] ? e.boundVariables[k].id : "")).join("|")).join(";");
for (const [n, , , , , use] of levels) {
  const row = { style: "Elevation/" + n, action: "created", use };
  out.styles.rows.push(row);
  try {
    const get = (k) => inColl(brand, "Elevation/" + n + "/" + k);
    const key = inColl(mapped, "Shadow/key"), amb = inColl(mapped, "Shadow/ambient");
    const effects = [layer(key, get("Key Y"), get("Key Blur")), layer(amb, get("Ambient Y"), get("Ambient Blur"))];
    let st = styleByName.get(low("Elevation/" + n));
    if (!st) {
      st = figma.createEffectStyle();
      st.name = "Elevation/" + n;
      st.description = use + ". Two shadows, every value bound to a variable. [figma-elevation]";
      st.effects = effects;
      out.styles.created++;
      continue;
    }
    if (boundIds(st.effects) === boundIds(effects)) { row.action = "unchanged"; out.styles.unchanged++; continue; }
    if (OW) { st.effects = effects; row.action = "updated"; out.styles.updated++; }
    else { row.action = "kept"; out.styles.kept++; }
  } catch (e) { row.action = "failed"; row.error = msg(e); out.styles.failed++; }
}
if (out.variables.failed || out.styles.failed || out.problems.length) out.status = "partial";
return out;
