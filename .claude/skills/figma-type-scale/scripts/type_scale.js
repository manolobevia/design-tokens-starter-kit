// figma-type-scale
// Runs inside Figma (Plugin API) through a tool such as figma_execute or use_figma.
//
// Step 1 (variables): builds the type scale as number variables in the
//   "Responsive" collection, with a Desktop and a Mobile mode:
//   Responsive / Heading / H1 / Font size | Line height | Paragraph spacing
// Step 2 (styles): creates ONE text style per role (Heading/H1, Body/Default ...)
//   and binds it to those variables plus the Font family and Font weight
//   variables of the Brand collection. A style has no modes of its own: the
//   mode set on a frame decides whether it resolves to Desktop or Mobile values.
//
// Edit ONLY the CONFIG block. Send everything else unchanged.

// ---- CONFIG ----
const REQUEST = {
  variables: true,   // step 1: write the Responsive variables
  styles: true,      // step 2: write the text styles
  groups: ["all"],   // "all" or any of: Display, Heading, Body, Label, Caption, Overline
  overwrite: { variables: false, styles: false },
                     // variables: true = recalculate values that were changed or built with other settings
                     // styles: true    = rebind styles whose bindings were changed by hand
  fonts: []          // optional, e.g. [{ path: "Brand/Font family/Body", value: "Roboto" }]
};
const SCALE = {
  base: 16,                   // px. Body/Default is always exactly this
  ratio: 1.25,                // Desktop ratio (Major Third)
  mobileRatio: 1.2,           // Mobile ratio (Minor Third), same steps
  grid: 4,                    // every value is rounded to the nearest multiple, ties round up
  lineHeight: 1.2,            // line height = rounded font size x this, rounded again
  bodyLineHeight: null,       // optional different multiplier for Body and Caption
  paragraphSpacing: 0.5,      // paragraph spacing = rounded font size x this, rounded
  bodyParagraphSpacing: null, // optional different multiplier for Body and Caption
  minSize: 12                 // no calculated font size goes below this
};
const DRY_RUN = false;  // true = report what would happen, write nothing
const EXPECT_FILE = ""; // optional file name guard, e.g. "Design System MB"
// ---- END CONFIG ----

// ---- PRESET ----
const NAMES = {
  collection: "Responsive", desktop: "Desktop", mobile: "Mobile",
  fonts: "Brand", family: "Font family", weight: "Font weight"
};
// step   = position on the modular scale (0 is the base)
// offset = fixed distance from the base in px, for sizes that sit off the scale
// family = the font role: "Heading" or "Body". There are only these two, so a
//   designer never has to work out which font a style uses. Display and Heading
//   read Brand/Font family/Heading; everything else reads Brand/Font family/Body.
// weight / strong = Brand/Font weight names in order of preference; the first one
//   that exists and is a real style of the font is used. The first choices are
//   Regular, Medium and Bold, the weights that fonts almost always share.
// tracking = letter spacing in percent, set once when the style is created
const PRESET = [
  { group: "Display",  style: "Default", step: 7,  kind: "heading", family: ["Heading"], weight: ["Bold", "Semi Bold"], tracking: -2 },
  { group: "Heading",  style: "H1",      step: 6,  kind: "heading", family: ["Heading"], weight: ["Bold", "Semi Bold"], tracking: -2 },
  { group: "Heading",  style: "H2",      step: 5,  kind: "heading", family: ["Heading"], weight: ["Bold", "Semi Bold"], tracking: -2 },
  { group: "Heading",  style: "H3",      step: 4,  kind: "heading", family: ["Heading"], weight: ["Bold", "Semi Bold"], tracking: -1 },
  { group: "Heading",  style: "H4",      step: 3,  kind: "heading", family: ["Heading"], weight: ["Bold", "Semi Bold"], tracking: -1 },
  { group: "Heading",  style: "H5",      step: 2,  kind: "heading", family: ["Heading"], weight: ["Bold", "Semi Bold"], tracking: 0 },
  { group: "Heading",  style: "H6",      step: 1,  kind: "heading", family: ["Heading"], weight: ["Bold", "Semi Bold"], tracking: 0 },
  { group: "Body",     style: "Large",   step: 1,  kind: "body",    family: ["Body"], weight: ["Regular"], strong: ["Bold", "Semi Bold"], tracking: 0 },
  { group: "Body",     style: "Default", step: 0,  kind: "body",    family: ["Body"], weight: ["Regular"], strong: ["Bold", "Semi Bold"], tracking: 0 },
  { group: "Body",     style: "Small",   offset: -2, minLine: 20, kind: "body", family: ["Body"], weight: ["Regular"], strong: ["Bold", "Semi Bold"], tracking: 0 },
  { group: "Label",    style: "Large",   step: 0,  kind: "label",   family: ["Body"], weight: ["Medium", "Regular"], tracking: 0, noSpacing: true },
  { group: "Label",    style: "Default", offset: -2, kind: "label", family: ["Body"], weight: ["Medium", "Regular"], tracking: 0, noSpacing: true },
  { group: "Label",    style: "Small",   step: -1, kind: "label",   family: ["Body"], weight: ["Medium", "Regular"], tracking: 0, noSpacing: true },
  { group: "Caption",  style: "Default", step: -1, kind: "body",    family: ["Body"], weight: ["Regular"], tracking: 1 },
  { group: "Overline", style: "Default", step: -1, kind: "label",   family: ["Body"], weight: ["Bold", "Semi Bold", "Medium"], tracking: 8, upper: true, noSpacing: true }
];
const PROPS = [
  { key: "size",  name: "Font size",         scope: "FONT_SIZE",         field: "fontSize" },
  { key: "line",  name: "Line height",       scope: "LINE_HEIGHT",       field: "lineHeight" },
  { key: "space", name: "Paragraph spacing", scope: "PARAGRAPH_SPACING", field: "paragraphSpacing" }
];
const WEIGHT_NAMES = {
  100: ["Thin", "Hairline"], 200: ["Extra Light", "ExtraLight", "Ultra Light"], 300: ["Light"],
  400: ["Regular", "Normal", "Book"], 500: ["Medium"],
  600: ["Semi Bold", "SemiBold", "Semibold", "Demi Bold", "DemiBold"], 700: ["Bold"],
  800: ["Extra Bold", "ExtraBold", "Ultra Bold"], 900: ["Black", "Heavy"]
};
// ---- END PRESET ----

const low = (s) => String(s).trim().toLowerCase();
const norm = (s) => low(s).replace(/[\s_-]+/g, "");
const msg = (e) => String((e && e.message) || e);
const last = (name) => name.slice(name.lastIndexOf("/") + 1);
const same = (a, b) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 1e-6;

const out = {
  dryRun: DRY_RUN, file: figma.root.name, status: "ok",
  scale: Object.assign({}, SCALE),
  collection: null, fonts: [], variables: null, styles: null, problems: []
};

// ---------- guards ----------
if (EXPECT_FILE && low(EXPECT_FILE) !== low(figma.root.name)) {
  out.status = "error";
  out.error = 'This is "' + figma.root.name + '", not "' + EXPECT_FILE + '". Nothing was written.';
  return out;
}
const bad = [];
if (!(SCALE.base >= 8 && SCALE.base <= 40)) bad.push("base must be between 8 and 40");
if (!(SCALE.ratio > 1 && SCALE.ratio <= 2)) bad.push("ratio must be above 1 and at most 2");
if (!(SCALE.mobileRatio > 1 && SCALE.mobileRatio <= 2)) bad.push("mobile ratio must be above 1 and at most 2");
if (!(SCALE.grid >= 1)) bad.push("grid must be 1 or more");
if (!(SCALE.lineHeight >= 1 && SCALE.lineHeight <= 2.5)) bad.push("line height must be between 1 and 2.5");
if (!(SCALE.paragraphSpacing >= 0 && SCALE.paragraphSpacing <= 3)) bad.push("paragraph spacing must be between 0 and 3");
if (bad.length) {
  out.status = "error";
  out.error = "Scale settings are not usable: " + bad.join("; ") + ". Nothing was written.";
  return out;
}

const OW = REQUEST.overwrite === true ? { variables: true, styles: true } : Object.assign({ variables: false, styles: false }, REQUEST.overwrite || {});
const allGroups = [];
for (const d of PRESET) if (!allGroups.includes(d.group)) allGroups.push(d.group);
const asked = (REQUEST.groups || []).map(low);
let groups = asked.includes("all") ? allGroups.slice() : allGroups.filter((g) => asked.includes(low(g)));
for (const a of asked) {
  if (a !== "all" && !allGroups.some((g) => low(g) === a)) out.problems.push('Unknown group "' + a + '". Groups: ' + allGroups.join(", "));
}
const defs = PRESET.filter((d) => groups.includes(d.group));

// ---------- the scale ----------
const G = SCALE.grid;
const snap = (x) => Math.round(x / G + 1e-9) * G;
function metrics(def, ratio) {
  let size;
  if (def.offset !== undefined) size = SCALE.base + def.offset;
  else if (def.step === 0) size = SCALE.base;
  else size = Math.max(SCALE.minSize, snap(SCALE.base * Math.pow(ratio, def.step)));
  const body = def.kind === "body";
  const lh = body && SCALE.bodyLineHeight ? SCALE.bodyLineHeight : SCALE.lineHeight;
  let line = snap(size * lh);
  if (line < size) line = Math.ceil(size / G) * G;
  if (def.minLine && line < def.minLine) line = def.minLine;
  const sp = body && SCALE.bodyParagraphSpacing !== null && SCALE.bodyParagraphSpacing !== undefined
    ? SCALE.bodyParagraphSpacing : SCALE.paragraphSpacing;
  const space = def.noSpacing ? 0 : snap(size * sp);
  return { size, line, space };
}
const MARK = " (figma-type-scale)";
function describeVar(def, prop) {
  if (prop.key === "size") {
    if (def.offset !== undefined) return "Fixed size: base " + SCALE.base + (def.offset < 0 ? " - " : " + ") + Math.abs(def.offset) + ". Same on Desktop and Mobile." + MARK;
    if (def.step === 0) return "The base size of the type scale. Same on Desktop and Mobile." + MARK;
    const s = (def.step > 0 ? "+" : "") + def.step;
    return "Step " + s + " of the type scale: " + SCALE.base + " x " + SCALE.ratio + "^" + def.step + " on Desktop, " + SCALE.base + " x " + SCALE.mobileRatio + "^" + def.step + " on Mobile, rounded to " + SCALE.grid + "." + MARK;
  }
  const body = def.kind === "body";
  if (prop.key === "line") return "Font size x " + (body && SCALE.bodyLineHeight ? SCALE.bodyLineHeight : SCALE.lineHeight) + ", rounded to " + SCALE.grid + (def.minLine ? ", and never below " + def.minLine : "") + "." + MARK;
  if (def.noSpacing) return "0: a single-line style." + MARK;
  return "Font size x " + (body && SCALE.bodyParagraphSpacing !== null && SCALE.bodyParagraphSpacing !== undefined ? SCALE.bodyParagraphSpacing : SCALE.paragraphSpacing) + ", rounded to " + SCALE.grid + "." + MARK;
}
const stepLabel = (def) => def.offset !== undefined
  ? "Fixed at base " + (def.offset < 0 ? "- " : "+ ") + Math.abs(def.offset)
  : "Step " + (def.step > 0 ? "+" : "") + def.step;

// ---------- file state ----------
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
const collById = new Map(collections.map((c) => [c.id, c]));
const varById = new Map(variables.map((v) => [v.id, v]));
const findCollection = (name) => collections.find((c) => low(c.name) === low(name)) || null;
const fullName = (v) => {
  const c = collById.get(v.variableCollectionId);
  return (c ? c.name + "/" : "") + v.name;
};
function resolveValue(v, depth = 0) {
  const c = collById.get(v.variableCollectionId);
  const value = c ? v.valuesByMode[c.defaultModeId] : undefined;
  if (value && value.type === "VARIABLE_ALIAS") {
    const t = varById.get(value.id);
    return t && depth < 10 ? resolveValue(t, depth + 1) : undefined;
  }
  return value;
}

// ---------- fonts available in this Figma account ----------
let fontIndex = null; // lower family -> { family, styles:Set }
const needFonts = REQUEST.styles || (REQUEST.fonts && REQUEST.fonts.length);
if (needFonts) {
  try {
    const list = await figma.listAvailableFontsAsync();
    fontIndex = new Map();
    for (const f of list) {
      const k = low(f.fontName.family);
      if (!fontIndex.has(k)) fontIndex.set(k, { family: f.fontName.family, styles: new Set() });
      fontIndex.get(k).styles.add(f.fontName.style);
    }
  } catch (e) {
    fontIndex = null;
    out.problems.push("Could not list the available fonts (" + msg(e) + "). Font names are not checked before use.");
  }
}
function distance(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function nearest(value, options) {
  let best = null, bestD = 4;
  for (const o of options) {
    const d = norm(o) === norm(value) ? 0 : distance(low(value), low(o));
    if (d < bestD) { best = o; bestD = d; }
  }
  return best;
}
const familyEntry = (family) => (fontIndex && typeof family === "string" ? fontIndex.get(low(family)) : null);
const familyOk = (family) => { const e = familyEntry(family); return !!e && e.family === family; };
const styleOk = (family, style) => { const e = familyEntry(family); return !!e && e.family === family && e.styles.has(style); };
function familyHint(family) {
  if (!fontIndex) return "";
  const n = nearest(String(family), Array.from(fontIndex.values()).map((e) => e.family));
  return n ? ' Closest available font: "' + n + '".' : "";
}
const loaded = new Set();
async function load(family, style) {
  const k = family + "|" + style;
  if (loaded.has(k)) return;
  await figma.loadFontAsync({ family, style });
  loaded.add(k);
}

// ---------- font variables: primitives in the Brand collection ----------
let fontCol = findCollection(NAMES.fonts);
function fontGroup(group) { // normalized last segment -> variable
  const map = new Map();
  if (!fontCol) return map;
  const prefix = low(group) + "/";
  for (const id of fontCol.variableIds) {
    const v = varById.get(id);
    if (v && low(v.name).startsWith(prefix)) map.set(norm(v.name.slice(prefix.length)), v);
  }
  return map;
}

// ---------- optional: set font variables ("Brand/Font family/Body = Roboto") ----------
for (const line of REQUEST.fonts || []) {
  const row = { path: line.path, value: line.value, action: "created" };
  out.fonts.push(row);
  try {
    const path = String(line.path).trim().replace(/\s*\/\s*/g, "/");
    const head = low(NAMES.fonts) + "/";
    if (!low(path).startsWith(head)) throw new Error('The path must start with "' + NAMES.fonts + '/".');
    const name = path.slice(head.length);
    const isFamily = low(name).startsWith(low(NAMES.family) + "/");
    const isWeight = low(name).startsWith(low(NAMES.weight) + "/");
    if (!isFamily && !isWeight) throw new Error('Only "' + NAMES.family + '/..." and "' + NAMES.weight + '/..." can be set here.');
    let value = String(line.value).trim();
    if (!value) throw new Error("No value given.");
    if (isFamily && fontIndex && !familyOk(value)) {
      throw new Error('"' + value + '" is not a font available in this Figma account.' + familyHint(value));
    }
    let v = null;
    if (fontCol) for (const id of fontCol.variableIds) { const x = varById.get(id); if (x && low(x.name) === low(name)) v = x; }
    const families = Array.from(fontGroup(NAMES.family).values()).map(resolveValue).filter((x) => typeof x === "string");
    const weights = Array.from(fontGroup(NAMES.weight).values()).map(resolveValue).filter((x) => typeof x === "string");
    if (isWeight && fontIndex && families.length && !families.some((f) => styleOk(f, value))) {
      row.warning = '"' + value + '" is not a style of ' + families.join(" or ") + ". Styles using it will be skipped until it matches.";
    }
    const type = v ? v.resolvedType : "STRING";
    let write = value;
    if (type === "FLOAT") { write = Number(value); if (!isFinite(write)) throw new Error("This variable is a number and the value is not."); }
    else if (type !== "STRING") throw new Error("Existing variable is " + type + ", expected text or number.");
    if (v) {
      const was = fontCol.modes.map((m) => v.valuesByMode[m.modeId]);
      if (was.every((x) => x === write)) { row.action = "unchanged"; continue; }
      row.action = "updated"; row.was = was[0];
    }
    if (!DRY_RUN) {
      // Fonts a variable may resolve to have to be loaded before it changes.
      const pairs = isFamily ? weights.concat(["Regular"]).map((s) => [value, s]) : families.map((f) => [f, value]);
      for (const [f, s] of pairs) { if (!fontIndex || styleOk(f, s)) { try { await load(f, s); } catch (e) { /* not fatal */ } } }
      if (!fontCol) {
        fontCol = figma.variables.createVariableCollection(NAMES.fonts);
        collections.push(fontCol); collById.set(fontCol.id, fontCol);
        row.collectionCreated = true;
      }
      if (!v) {
        const g = isFamily ? NAMES.family : NAMES.weight;
        v = figma.variables.createVariable(g + "/" + last(name), fontCol, "STRING");
        varById.set(v.id, v);
        try { v.scopes = [isFamily ? "FONT_FAMILY" : "FONT_STYLE"]; } catch (e) { /* scopes are a nicety */ }
      }
      for (const m of fontCol.modes) v.setValueForMode(m.modeId, write);
    }
  } catch (e) {
    row.action = "failed"; row.error = msg(e);
  }
}

// ---------- Step 1: Responsive collection, modes and variables ----------
let col = findCollection(NAMES.collection);
const info = {
  name: NAMES.collection, created: false,
  desktop: NAMES.desktop, desktopRenamedFrom: null,
  mobile: NAMES.mobile, mobileCreated: false, mobileError: null, otherModes: []
};
out.collection = info;
let desktopId = null, mobileId = null, mobileIsNew = false;
const planned = new Set(); // lower variable names that a dry run would create

if (REQUEST.variables) {
  if (!col) {
    info.created = true;
    if (!DRY_RUN) {
      col = figma.variables.createVariableCollection(NAMES.collection);
      collections.push(col); collById.set(col.id, col);
    }
  }
}
if (col) {
  let d = col.modes.find((m) => low(m.name) === low(NAMES.desktop));
  let mob = col.modes.find((m) => low(m.name) === low(NAMES.mobile));
  if (!d && REQUEST.variables) {
    const first = col.modes.find((m) => m.modeId === col.defaultModeId) || col.modes[0];
    if (mob && first.modeId === mob.modeId) {
      // The only candidate is the Mobile mode: Desktop has to be added.
      if (!DRY_RUN) {
        try { const id = col.addMode(NAMES.desktop); d = col.modes.find((m) => m.modeId === id); }
        catch (e) { out.problems.push("Could not add the " + NAMES.desktop + " mode: " + msg(e)); }
      }
      out.problems.push('"' + NAMES.mobile + '" is the first mode of this collection, so it is the default. Drag ' + NAMES.desktop + " to the first position in Figma if Desktop should be the default.");
    } else if (/^mode ?1$/i.test(first.name.trim()) || col.variableIds.length === 0) {
      info.desktopRenamedFrom = first.name;
      if (!DRY_RUN) col.renameMode(first.modeId, NAMES.desktop);
      d = first;
    } else {
      d = first; info.desktop = first.name; // used as the Desktop mode, name left as the user set it
    }
  }
  if (!mob && REQUEST.variables) {
    if (DRY_RUN) { info.mobileCreated = true; }
    else {
      try {
        const id = col.addMode(NAMES.mobile);
        mob = col.modes.find((m) => m.modeId === id) || { modeId: id, name: NAMES.mobile };
        info.mobileCreated = true; mobileIsNew = true;
      } catch (e) { info.mobileError = msg(e); }
    }
  }
  desktopId = d ? d.modeId : col.defaultModeId;
  mobileId = mob ? mob.modeId : null;
  info.otherModes = col.modes.filter((m) => m.modeId !== desktopId && m.modeId !== mobileId).map((m) => m.name);
}

const responsive = new Map(); // lower name -> variable
if (col) for (const id of col.variableIds) { const v = varById.get(id); if (v) responsive.set(low(v.name), v); }
const varName = (def, prop) => def.group + "/" + def.style + "/" + prop.name;

if (REQUEST.variables) {
  const res = { created: 0, updated: 0, unchanged: 0, kept: 0, failed: 0, scoped: 0, rows: [], others: [] };
  out.variables = res;
  for (const def of defs) {
    const dm = metrics(def, SCALE.ratio), mm = metrics(def, SCALE.mobileRatio);
    const row = {
      style: def.group + "/" + def.style, step: stepLabel(def),
      desktop: dm.size + " / " + dm.line + " / " + dm.space,
      mobile: mm.size + " / " + mm.line + " / " + mm.space,
      action: "unchanged"
    };
    res.rows.push(row);
    const acts = new Set();
    for (const prop of PROPS) {
      const name = varName(def, prop);
      const want = { d: dm[prop.key], m: mm[prop.key] };
      try {
        let v = responsive.get(low(name));
        if (!v) {
          acts.add("created"); res.created++;
          planned.add(low(name));
          if (!DRY_RUN) {
            v = figma.variables.createVariable(name, col, "FLOAT");
            varById.set(v.id, v); responsive.set(low(name), v);
            for (const m of col.modes) v.setValueForMode(m.modeId, m.modeId === mobileId ? want.m : want.d);
            try { v.scopes = [prop.scope]; } catch (e) { /* scopes are a nicety */ }
            v.description = describeVar(def, prop);
          }
          continue;
        }
        if (v.resolvedType !== "FLOAT") throw new Error(name + " exists as " + v.resolvedType + ", expected a number");
        const curD = v.valuesByMode[desktopId];
        const curM = mobileId ? v.valuesByMode[mobileId] : undefined;
        let wrote = false, held = false;
        if (!same(curD, want.d)) {
          if (OW.variables || curD === undefined) {
            if (!DRY_RUN) v.setValueForMode(desktopId, want.d);
            wrote = true; (row.was = row.was || []).push(prop.name + " " + curD + " -> " + want.d);
          } else {
            held = true; (row.kept = row.kept || []).push({ variable: prop.name, mode: info.desktop, current: typeof curD === "number" ? curD : "alias", calculated: want.d });
          }
        }
        if (mobileId && !same(curM, want.m)) {
          // A Mobile value that was never set is a copy of Desktop: fill it.
          const neverSet = mobileIsNew || curM === undefined || same(curM, curD);
          if (OW.variables || neverSet) {
            if (!DRY_RUN) v.setValueForMode(mobileId, want.m);
            wrote = true;
          } else {
            held = true; (row.kept = row.kept || []).push({ variable: prop.name, mode: info.mobile, current: typeof curM === "number" ? curM : "alias", calculated: want.m });
          }
        } else if (!mobileId && info.mobileCreated && DRY_RUN && !same(want.m, want.d)) {
          wrote = true; // dry run: the new Mobile mode would be filled
        }
        if (!DRY_RUN && v.scopes && v.scopes.length === 1 && v.scopes[0] === "ALL_SCOPES") {
          try { v.scopes = [prop.scope]; res.scoped++; } catch (e) { /* ignore */ }
        }
        // Refresh the explanation only where this script wrote it.
        if (!DRY_RUN && wrote && (!v.description || v.description.endsWith(MARK))) v.description = describeVar(def, prop);
        if (wrote) { acts.add("updated"); res.updated++; }
        if (held) { acts.add("kept"); res.kept++; }
        if (!wrote && !held) { acts.add("unchanged"); res.unchanged++; }
      } catch (e) {
        acts.add("failed"); res.failed++;
        (row.errors = row.errors || []).push(msg(e));
      }
    }
    row.action = acts.has("failed") ? "failed" : acts.has("created") ? (acts.size === 1 ? "created" : "completed")
      : acts.has("updated") ? "updated" : acts.has("kept") ? "kept" : "unchanged";
  }
  const presetNames = new Set();
  for (const d of PRESET) for (const p of PROPS) presetNames.add(low(varName(d, p)));
  for (const [k, v] of responsive) if (!presetNames.has(k)) res.others.push(v.name);
  if (res.failed || info.mobileError) out.status = "partial";
}

// ---------- Step 2: one text style per role, bound to the variables ----------
if (REQUEST.styles) {
  const res = { created: 0, updated: 0, unchanged: 0, kept: 0, failed: 0, rows: [], blocked: [], others: [], unusedFamilies: [], fontsElsewhere: [], duplicates: [] };
  out.styles = res;
  const families = fontGroup(NAMES.family), weights = fontGroup(NAMES.weight);
  const existing = new Map();
  const local = await figma.getLocalTextStylesAsync();
  for (const s of local) { const k = low(s.name); if (existing.has(k)) res.duplicates.push(s.name); else existing.set(k, s); }

  // Font variables found outside Brand are never used. Name them so the cause is obvious.
  const strays = [];
  for (const v of varById.values()) {
    const n = low(v.name);
    const isFont = n.startsWith(low(NAMES.family) + "/") || n.startsWith(low(NAMES.weight) + "/");
    if (isFont && (!fontCol || v.variableCollectionId !== fontCol.id)) strays.push(fullName(v));
  }
  res.fontsElsewhere = strays;
  if (strays.length && (!families.size || !weights.size)) {
    out.problems.push("Font variables exist outside " + NAMES.fonts + " (" + strays.join(", ") + "). This skill reads fonts only from " + NAMES.fonts + "/" + NAMES.family + " and " + NAMES.fonts + "/" + NAMES.weight + ".");
  }
  if (!fontCol) {
    res.error = 'Collection "' + NAMES.fonts + '" not found, so there are no Font family or Font weight variables to bind. No styles were written.';
    out.status = "partial";
  } else {
    const boundId = (style, field) => {
      const b = style.boundVariables && style.boundVariables[field];
      const a = Array.isArray(b) ? b[0] : b;
      return a && a.id ? a.id : null;
    };
    const describeId = (id) => { const v = id && varById.get(id); return v ? fullName(v) : "another variable"; };

    function pickFamily(prefs) {
      for (const p of prefs) { const v = families.get(norm(p)); if (v) return v; }
      return null;
    }
    function pickWeight(prefs, family) {
      const tried = [];
      for (const p of prefs) {
        const v = weights.get(norm(p));
        if (!v) { tried.push(NAMES.weight + "/" + p + " does not exist"); continue; }
        const value = resolveValue(v);
        if (v.resolvedType === "STRING") {
          if (!fontIndex || styleOk(family, value)) return { variable: v, style: value, field: "fontStyle", other: "fontWeight", pref: p, tried };
          const e = familyEntry(family);
          const hint = e ? nearest(String(value), Array.from(e.styles)) : null;
          tried.push(fullName(v) + ' is "' + value + '", which is not a style of ' + family + (hint ? ' (the font calls it "' + hint + '")' : ""));
        } else if (v.resolvedType === "FLOAT") {
          const key = Math.min(900, Math.max(100, Math.round(value / 100) * 100));
          const style = (WEIGHT_NAMES[key] || []).find((s) => !fontIndex || styleOk(family, s));
          if (style) return { variable: v, style, field: "fontWeight", other: "fontStyle", pref: p, tried };
          tried.push(fullName(v) + " is " + value + ", and " + family + " has no matching style");
        } else tried.push(fullName(v) + " is not a text or number variable");
      }
      return { variable: null, tried };
    }

    const jobs = [];
    for (const def of defs) {
      jobs.push({ def, name: def.group + "/" + def.style, prefs: def.weight });
      if (def.strong) jobs.push({ def, name: def.group + "/" + def.style + " Strong", prefs: def.strong, strong: true });
    }
    const presetStyles = new Set();
    for (const d of PRESET) { presetStyles.add(low(d.group + "/" + d.style)); if (d.strong) presetStyles.add(low(d.group + "/" + d.style + " Strong")); }

    for (const job of jobs) {
      const def = job.def;
      const row = { style: job.name, action: "created" };
      res.rows.push(row);
      try {
        // 1. the three Responsive variables
        const sizeVars = {};
        const missing = [];
        for (const prop of PROPS) {
          const n = varName(def, prop);
          const v = responsive.get(low(n));
          if (v) sizeVars[prop.field] = v;
          else if (!(DRY_RUN && planned.has(low(n)))) missing.push(n);
        }
        if (missing.length) {
          row.missing = missing;
          throw new Error("The " + NAMES.collection + " variables for this style do not exist yet. Build the variables first (send: Responsive).");
        }

        // 2. font family and weight from Brand
        const famVar = pickFamily(def.family);
        if (!famVar) throw new Error(NAMES.fonts + "/" + NAMES.family + "/" + def.family[0] + " does not exist.");
        const family = resolveValue(famVar);
        if (typeof family !== "string") throw new Error(fullName(famVar) + " does not hold a font name.");
        if (fontIndex && !familyOk(family)) {
          throw new Error(fullName(famVar) + ' is "' + family + '", which is not a font available in this Figma account.' + familyHint(family));
        }
        const w = pickWeight(job.prefs, family);
        if (!w.variable) throw new Error("No usable font weight: " + w.tried.join("; ") + ".");
        row.family = fullName(famVar); row.weight = fullName(w.variable); row.font = family + " " + w.style;
        if (w.pref !== job.prefs[0]) row.note = "Preferred weight " + job.prefs[0] + " is not usable (" + w.tried.join("; ") + "), so " + w.pref + " is used.";

        const dm = metrics(def, SCALE.ratio);
        const current = (field, fallback) => {
          const v = sizeVars[field];
          const x = v ? v.valuesByMode[desktopId] : undefined;
          return typeof x === "number" ? x : fallback;
        };
        const targets = [
          ["fontFamily", famVar], [w.field, w.variable],
          ["fontSize", sizeVars.fontSize], ["lineHeight", sizeVars.lineHeight], ["paragraphSpacing", sizeVars.paragraphSpacing]
        ];

        let style = existing.get(low(job.name));
        if (!style) {
          if (DRY_RUN) { res.created++; continue; }
          await load(family, w.style);
          style = figma.createTextStyle();
          try {
            style.name = job.name;
            style.fontName = { family, style: w.style };
            style.fontSize = current("fontSize", dm.size);
            style.lineHeight = { unit: "PIXELS", value: current("lineHeight", dm.line) };
            style.paragraphSpacing = current("paragraphSpacing", dm.space);
            style.letterSpacing = { unit: "PERCENT", value: def.tracking || 0 };
            if (def.upper) style.textCase = "UPPER";
            style.description = "Size, line height and paragraph spacing follow the " + NAMES.collection + " mode of the frame (" + info.desktop + " or " + info.mobile + ").";
            for (const [field, v] of targets) style.setBoundVariable(field, v);
            const loose = targets.filter(([field, v]) => boundId(style, field) !== v.id).map(([field]) => field);
            if (loose.length) row.unverified = loose; // set without error, but could not be read back
          } catch (e) {
            try { style.remove(); } catch (x) { /* leave no half-built style */ }
            throw e;
          }
          existing.set(low(job.name), style);
          res.created++;
          continue;
        }

        // Existing style: bind what is unbound, keep what the user rebound.
        let wrote = false, held = false;
        const todo = [];
        for (const [field, v] of targets) {
          const isWeight = field === w.field;
          const cur = boundId(style, field) || (isWeight ? boundId(style, w.other) : null);
          if (cur === v.id) continue;
          if (!cur || OW.styles) { todo.push([field, v, isWeight]); wrote = true; }
          else { held = true; (row.kept = row.kept || []).push({ field, current: describeId(cur), preset: fullName(v) }); }
        }
        if (todo.length && !DRY_RUN) {
          const fn = style.fontName;
          if (fn && fn.family) { try { await load(fn.family, fn.style); } catch (e) { /* the target font below is what matters */ } }
          await load(family, w.style);
          for (const [field, v, isWeight] of todo) {
            if (isWeight && boundId(style, w.other)) style.setBoundVariable(w.other, null);
            style.setBoundVariable(field, v);
            if (boundId(style, field) !== v.id) (row.unverified = row.unverified || []).push(field);
          }
        }
        const now = style.fontName; // report the font the style really has, not the preset's
        if (now && now.family && (held || DRY_RUN)) row.font = now.family + " " + now.style;
        row.action = wrote ? "updated" : held ? "kept" : "unchanged";
        res[row.action]++;
      } catch (e) {
        row.action = "failed"; row.error = msg(e); res.failed++;
      }
    }
    for (const [k, s] of existing) if (!presetStyles.has(k)) res.others.push(s.name);
    // Only the two font roles are used. Other Font family variables are left alone and reported.
    const roles = new Set();
    for (const d of PRESET) for (const f of d.family) roles.add(norm(f));
    res.unusedFamilies = Array.from(families).filter(([k]) => !roles.has(k)).map(([, v]) => fullName(v));
    // The same cause usually blocks many styles: list each cause once.
    const causes = new Map();
    for (const r of res.rows) if (r.action === "failed") { if (!causes.has(r.error)) causes.set(r.error, []); causes.get(r.error).push(r.style); }
    res.blocked = Array.from(causes, ([reason, styles]) => ({ reason, styles }));
    if (res.failed) out.status = "partial";
  }
}

if (out.fonts.some((f) => f.action === "failed")) out.status = "partial";
return out;
