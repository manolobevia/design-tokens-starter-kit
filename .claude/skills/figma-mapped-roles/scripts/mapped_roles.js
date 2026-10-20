// figma-mapped-roles
// Runs inside Figma (Plugin API) through a tool such as figma_execute.
// Builds the Mapped (usage) tier: Surface, Border, Text and Icon color variables,
// each holding a real alias to an Alias-tier variable, in a Light mode and,
// when asked, a Dark mode.
//
// Edit ONLY the CONFIG block. Send everything else unchanged.

// ---- CONFIG ----
const REQUEST = {
  groups: ["all"], // "all", or any of "Surface", "Border", "Text", "Icon". [] = create nothing from the preset
  dark: false,     // true = add the Dark mode if it is missing. Once Dark exists it is filled on every run
  reset: false,    // true = put existing preset variables back on their preset values
  retier: false,   // true = variables pointing straight at Brand are moved to the Alias variable of the same color
  lines: [],       // single variables: { from: "Alias/Neutral/900", to: "Mapped/Text/heading (dark)" }
  renames: []      // { from: "Mapped/Surface/sucess", to: "Mapped/Surface/success" }
};
const DRY_RUN = false; // true = report what would happen, write nothing
// ---- END CONFIG ----

const SOURCE = "Alias";
const TARGET = "Mapped";

// ---- PRESET ----
// Row: [name, light, dark, use]. Light and dark are variables of the Alias collection.
// dark null = the mirrored step of light (50<->950, 100<->900 ... 500 stays, White<->Black).
// dark KEEP = same as light. A named dark is an exception where mirroring fails contrast.
// Dark exceptions also cover visibility: a mirrored 950 tint (action-secondary, selected, the status
// -secondary surfaces) is invisible on a near-black page, so tints use 900 (800 on hover), and surfaces
// step up in lightness (page 950, default 900, secondary 800, tertiary 700) so raised layers read as raised.
// Text links and the default control border move one step lighter in dark so they keep their contrast on the lighter card.
const KEEP = "=";
const N = "Neutral/", P = "Primary/", WHITE = "Foundation/White";
const ROLES = ["error", "success", "warning", "information"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

const TEXT = [
  ["heading", N + 900, null, "Titles"],
  ["subheading", N + 800, null, "Secondary titles"],
  ["body", N + 700, null, "Paragraph text"],
  ["body-secondary", N + 600, null, "Supporting copy"],
  ["caption", N + 600, null, "Captions, metadata"],
  ["label", N + 700, null, "Form labels, table headers"],
  ["helper", N + 600, null, "Hint text under inputs"],
  ["placeholder", N + 400, null, "Input placeholders"],
  ["disabled", N + 300, null, "Disabled text"],
  ["action", P + 500, P + 200, "Text links"],
  ["action-hover", P + 600, P + 100, "Text link, hover"],
  ["action-pressed", P + 700, P + 50, "Text link, pressed"],
  ["error", "Error/600", null, "Error message on neutral surfaces"],
  ["success", "Success/700", null, "Success message on neutral surfaces"],
  ["warning", "Warning/700", null, "Warning message on neutral surfaces"],
  ["information", "Information/600", "Information/300", "Information message on neutral surfaces"],
  ["on-action", WHITE, KEEP, "On surface/action, all states"],
  ["on-action-secondary", P + 700, P + 200, "On surface/action-secondary"],
  ["on-selected", P + 700, null, "On surface/selected"],
  ["on-disabled", N + 400, null, "On surface/disabled"],
  ["on-inverse", WHITE, null, "On surface/inverse"],
  ["on-inverse-secondary", N + 300, null, "Supporting content on surface/inverse"],
  ...ROLES.map((r) => ["on-" + r, r === "warning" || r === "success" ? N + 950 : WHITE, KEEP, "On surface/" + r]),
  ...ROLES.map((r) => ["on-" + r + "-secondary", cap(r) + "/800", null, "On surface/" + r + "-secondary"])
];

// Icon mirrors Text: same names, same values, so an icon next to a label always matches it.
const NOT_ICONS = ["subheading", "caption", "label", "helper"];
const ICON = TEXT.filter((r) => !NOT_ICONS.includes(r[0]))
  .map((r) => [r[0], r[1], r[2], r[0].startsWith("on-") ? r[3] : "Icon paired with text/" + r[0]]);

const PRESET = {
  Surface: [
    ["page", N + 50, null, "App background"],
    ["default", WHITE, N + 900, "Cards, panels, modals"],
    ["secondary", N + 100, N + 800, "Secondary sections, table stripes"],
    ["tertiary", N + 200, N + 700, "Wells, chips, tracks"],
    ["inverse", N + 900, null, "Tooltips, dark sections"],
    ["overlay", N + 950, KEEP, "Scrim behind modals (set the opacity on the layer)"],
    ["disabled", N + 100, N + 800, "Disabled controls"],
    ["action", P + 500, null, "Filled buttons"],
    ["action-hover", P + 600, KEEP, "Filled button, hover"],
    ["action-pressed", P + 700, KEEP, "Filled button, pressed"],
    ["action-secondary", P + 50, P + 800, "Secondary button fill"],
    ["action-secondary-hover", P + 100, P + 700, "Secondary button fill, hover"],
    ["selected", P + 50, P + 800, "Selected rows, active nav item"],
    ...ROLES.map((r) => [r, cap(r) + "/500", null, "Solid " + r + " badges, toasts"]),
    ...ROLES.map((r) => [r + "-secondary", cap(r) + "/50", cap(r) + "/900", "Tinted " + r + " banners, alerts"])
  ],
  Border: [
    ["default", N + 400, N + 500, "Input outlines, controls"],
    ["secondary", N + 200, N + 700, "Cards, dividers"],
    ["tertiary", N + 100, N + 800, "Light separators"],
    ["disabled", N + 200, N + 800, "Disabled controls"],
    ["action", P + 500, P + 300, "Outlined buttons"],
    ["action-hover", P + 600, P + 200, "Outlined button, hover"],
    ["action-pressed", P + 700, P + 100, "Outlined button, pressed"],
    ["focus", P + 500, P + 300, "Focus ring"],
    ["selected", P + 500, P + 300, "Selected card, active tab underline"],
    ["on-inverse", N + 700, null, "Dividers on surface/inverse"],
    ...ROLES.map((r) => [r, cap(r) + (r === "warning" ? "/600" : "/500"), r === "information" ? "Information/400" : null, cap(r) + " outline, input validation"]),
    ...ROLES.map((r) => [r + "-secondary", cap(r) + "/200", null, "Outline on tinted " + r + " banners"])
  ],
  Text: TEXT,
  Icon: ICON
};
// Where each group's variables can be applied, so the color picker only offers relevant ones.
const SCOPES = {
  surface: ["FRAME_FILL", "SHAPE_FILL"],
  border: ["STROKE_COLOR"],
  text: ["TEXT_FILL"],
  icon: ["SHAPE_FILL", "STROKE_COLOR"]
};
// ---- END PRESET ----

const clean = (s) => String(s).trim().replace(/\s*\/\s*/g, "/").replace(/^\/+|\/+$/g, "");
const low = (s) => String(s).toLowerCase();
const msg = (e) => String((e && e.message) || e);

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
const collById = new Map(collections.map((c) => [c.id, c]));
const varById = new Map(variables.map((v) => [v.id, v]));
const findColl = (name) => collections.find((c) => low(clean(c.name)) === low(clean(name))) || null;
const varsOf = (c) => c.variableIds.map((id) => varById.get(id)).filter(Boolean);

// "Primary/500" also finds "Primary/500 Default".
function findIn(coll, name) {
  if (!coll) return null;
  const want = low(clean(name));
  const pool = varsOf(coll);
  const exact = pool.find((v) => low(v.name) === want);
  if (exact) return exact;
  const loose = pool.filter((v) => low(v.name).startsWith(want + " "));
  return loose.length === 1 ? loose[0] : null;
}
// "Alias/Neutral/900" -> collection + variable. Collection names may contain slashes.
function findPath(raw) {
  const path = clean(raw);
  let best = null;
  for (const c of collections) {
    const name = clean(c.name);
    if (low(path).startsWith(low(name) + "/") && (!best || name.length > clean(best.name).length)) best = c;
  }
  return best ? findIn(best, path.slice(clean(best.name).length + 1)) : null;
}
// "Mapped/Text/heading (dark)" -> path + note
function splitNote(raw) {
  const m = String(raw).trim().match(/^(.*?)\s*\(([^()]*)\)$/);
  return m ? { path: m[1], note: low(m[2].trim()) } : { path: String(raw).trim(), note: "" };
}

const isAlias = (a) => !!a && a.type === "VARIABLE_ALIAS";
const sameAlias = (a, b) => isAlias(a) && isAlias(b) && a.id === b.id;
const pointsAt = (a, v) => isAlias(a) && !!v && a.id === v.id;
const targetOf = (a) => (isAlias(a) ? varById.get(a.id) || null : null);
const hex2 = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
function describe(value) {
  if (isAlias(value)) {
    const t = varById.get(value.id);
    if (!t) return "missing variable";
    const c = collById.get(t.variableCollectionId);
    return (c ? c.name + "/" : "") + t.name;
  }
  if (value && typeof value === "object" && "r" in value) return ("#" + hex2(value.r) + hex2(value.g) + hex2(value.b)).toUpperCase();
  return value === undefined ? null : value;
}
// Final color of a value, following alias chains through each collection's default mode.
function colorOf(value, depth = 0) {
  if (isAlias(value)) {
    const t = varById.get(value.id);
    const c = t && collById.get(t.variableCollectionId);
    return t && c && depth < 10 ? colorOf(t.valuesByMode[c.defaultModeId], depth + 1) : null;
  }
  return value && typeof value === "object" && "r" in value ? value : null;
}
// The dark partner of a variable: the mirrored step in the same group.
function mirror(v) {
  const i = v.name.lastIndexOf("/");
  const group = v.name.slice(0, i + 1);
  const leaf = low(v.name.slice(i + 1));
  let want;
  if (leaf === "white") want = "black";
  else if (leaf === "black") want = "white";
  else {
    const m = leaf.match(/^(\d+)/);
    const n = m ? Number(m[1]) : 0;
    if (n <= 0 || n >= 1000) return null;
    if (n === 500) return v;
    want = String(1000 - n);
  }
  return findIn(collById.get(v.variableCollectionId), group + want);
}

const out = {
  dryRun: DRY_RUN, file: figma.root.name, status: "ok",
  collection: TARGET, collectionCreated: false,
  modes: { light: null, lightRenamedFrom: null, dark: null, darkCreated: false, darkError: null },
  renames: [], groups: [], lines: [], darkFilled: [], missingSources: [], contrast: []
};

const src = findColl(SOURCE);
if (!src) {
  out.status = "error";
  out.error = 'Source collection "' + SOURCE + '" not found. Collections in this file: ' + (collections.map((c) => c.name).join(", ") || "none");
  return out;
}
let dst = findColl(TARGET);
if (!dst) {
  out.collectionCreated = true;
  if (!DRY_RUN) {
    dst = figma.variables.createVariableCollection(TARGET);
    collections.push(dst);
    collById.set(dst.id, dst);
  }
}

// Modes. The single default mode ("Mode 1") becomes Light. Dark is only added on request.
let lightMode = null;
let darkMode = null;
if (dst) {
  lightMode = dst.modes.find((m) => low(m.name) === "light") || null;
  if (!lightMode && dst.modes.length === 1) {
    lightMode = dst.modes[0];
    out.modes.lightRenamedFrom = lightMode.name;
    if (!DRY_RUN) dst.renameMode(lightMode.modeId, "Light");
    out.modes.light = "Light";
  } else {
    if (!lightMode) lightMode = dst.modes.find((m) => m.modeId === dst.defaultModeId) || dst.modes[0];
    out.modes.light = lightMode.name;
  }
  darkMode = dst.modes.find((m) => low(m.name) === "dark") || null;
} else {
  out.modes.light = "Light";
  out.modes.lightRenamedFrom = "Mode 1";
}
let darkPending = false; // dry run only: the mode would be created
if (!darkMode && REQUEST.dark) {
  if (DRY_RUN) { darkPending = true; out.modes.darkCreated = true; }
  else {
    try {
      const id = dst.addMode("Dark");
      darkMode = { modeId: id, name: "Dark" };
      out.modes.darkCreated = true;
    } catch (e) {
      out.modes.darkError = msg(e);
    }
  }
}
const hasDark = !!darkMode || darkPending;
out.modes.dark = hasDark ? "Dark" : null;

// Live picture of the target collection: name -> variable + its value per mode.
const state = new Map();
if (dst) {
  for (const v of varsOf(dst)) {
    const light = v.valuesByMode[lightMode.modeId];
    // A new mode starts as a copy of the default mode.
    const dark = darkMode ? v.valuesByMode[darkMode.modeId] : darkPending ? light : undefined;
    state.set(low(v.name), { v, name: v.name, light, dark });
  }
}
const missing = new Set();
function need(ref) {
  const v = findIn(src, ref);
  if (!v) missing.add(SOURCE + "/" + ref);
  return v;
}
function put(st, mode, sourceVar) {
  st[mode] = { type: "VARIABLE_ALIAS", id: sourceVar.id };
  if (DRY_RUN) return;
  const m = mode === "light" ? lightMode : darkMode;
  st.v.setValueForMode(m.modeId, figma.variables.createVariableAlias(sourceVar));
}
function make(name) {
  const st = { v: null, name, light: undefined, dark: undefined };
  if (!DRY_RUN) {
    st.v = figma.variables.createVariable(name, dst, "COLOR");
    varById.set(st.v.id, st.v);
  }
  state.set(low(name), st);
  return st;
}
// Scope and description are only filled in where nothing has been set by hand.
function decorate(st, group, use) {
  const scopes = SCOPES[low(group)];
  if (!st.v) return !!scopes;
  let scoped = false;
  if (scopes && st.v.scopes.length === 1 && st.v.scopes[0] === "ALL_SCOPES") {
    if (!DRY_RUN) st.v.scopes = scopes;
    scoped = true;
  }
  if (use && !st.v.description && !DRY_RUN) st.v.description = use;
  return scoped;
}
// A dark value that is empty, a raw color, or identical to light has not been set yet.
const darkUnset = (st) => !isAlias(st.dark) || sameAlias(st.dark, st.light);
// The Alias variable that carries the same color as a value pointing outside Alias.
function aliasTwin(value) {
  const t = targetOf(value);
  if (!t || t.variableCollectionId === src.id) return null;
  const twins = varsOf(src).filter((a) => pointsAt(a.valuesByMode[src.defaultModeId], t));
  return twins.length === 1 ? twins[0] : null;
}
const skipsTier = (value) => { const t = targetOf(value); return !!t && t.variableCollectionId !== src.id; };

// Brings one variable to its wanted state and returns its report row.
// lightRef / darkSpec come from the preset (null for a variable that is not in the preset).
// opts.sweep = only complete the Dark mode of an existing variable, change nothing else.
const done = new Set();
function settle(group, name, lightRef, darkSpec, use, counts, opts) {
  const row = { name, light: null, action: "unchanged" };
  const reset = REQUEST.reset && !opts.sweep;
  const retier = REQUEST.retier && !opts.sweep;
  const find = (ref) => (opts.sweep ? findIn(src, ref) : need(ref));
  done.add(low(name));
  try {
    const wantL = lightRef ? find(lightRef) : null;
    let st = state.get(low(name));
    const isNew = !st;
    let wrote = false;
    let custom = false;
    if (isNew) {
      if (!wantL) throw new Error(SOURCE + "/" + lightRef + " not found");
      st = make(name);
      put(st, "light", wantL);
    }
    const unset = isNew || darkUnset(st); // read before light changes
    if (!isNew && lightRef && !pointsAt(st.light, wantL)) {
      if (reset && wantL) { row.was = describe(st.light); put(st, "light", wantL); wrote = true; }
      else custom = true;
    }
    if (!isNew && retier && skipsTier(st.light)) {
      const twin = aliasTwin(st.light);
      if (twin) { row.was = describe(st.light); put(st, "light", twin); wrote = true; custom = !!lightRef && (!wantL || twin.id !== wantL.id); }
    }
    const onPreset = !!wantL && pointsAt(st.light, wantL);
    if (hasDark) {
      const lightVar = targetOf(st.light);
      let wantD = null;
      if (onPreset && darkSpec === KEEP) wantD = lightVar;
      else if (onPreset && darkSpec) wantD = find(darkSpec);
      if (!wantD && lightVar) wantD = mirror(lightVar) || lightVar;
      if (wantD && !pointsAt(st.dark, wantD)) {
        if (isNew || unset || reset) { put(st, "dark", wantD); if (!isNew) wrote = true; }
        else if (retier && skipsTier(st.dark) && aliasTwin(st.dark)) { put(st, "dark", aliasTwin(st.dark)); wrote = true; custom = true; }
        else custom = true;
      }
    }
    if (!opts.sweep && decorate(st, group, use)) counts.scoped++;
    row.light = describe(st.light);
    if (hasDark) row.dark = describe(st.dark);
    row.action = isNew ? "created" : wrote ? "updated" : custom ? "kept" : "unchanged";
    if (custom && lightRef) row.preset = SOURCE + "/" + (wantL ? wantL.name : lightRef + " (missing)");
    if (skipsTier(st.light) || skipsTier(st.dark)) row.skipsAlias = true;
  } catch (e) {
    row.action = "failed";
    row.error = msg(e);
  }
  counts[row.action]++;
  return row;
}

// 1. Renames, in place, so anything already bound to the variable stays connected.
for (const r of REQUEST.renames) {
  const row = { from: r.from, to: r.to, action: "renamed" };
  out.renames.push(row);
  const strip = (p) => { const c = clean(p); return low(c).startsWith(low(TARGET) + "/") ? c.slice(TARGET.length + 1) : c; };
  const from = strip(r.from), to = strip(r.to);
  const a = state.get(low(from)), b = state.get(low(to));
  if (!a && b) row.action = "unchanged";
  else if (!a) { row.action = "failed"; row.error = "not found"; }
  else if (b && b !== a) { row.action = "failed"; row.error = "a variable with the new name already exists"; }
  else {
    if (!DRY_RUN) a.v.name = to;
    state.delete(low(from));
    a.name = to;
    state.set(low(to), a);
  }
}

// 2. Preset groups.
const wanted = REQUEST.groups.map(low);
const groupNames = Object.keys(PRESET).filter((g) => wanted.includes("all") || wanted.includes(low(g)));
for (const g of wanted) {
  if (g !== "all" && !Object.keys(PRESET).some((k) => low(k) === g)) {
    out.groups.push({ group: g, status: "error", error: "No preset group with this name. Preset groups: " + Object.keys(PRESET).join(", ") });
  }
}
for (const group of groupNames) {
  const counts = { created: 0, updated: 0, unchanged: 0, kept: 0, failed: 0, scoped: 0 };
  const tokens = [];
  const seen = new Set();
  for (const [leaf, lightRef, darkSpec, use] of PRESET[group]) {
    const name = group + "/" + leaf;
    seen.add(low(name));
    tokens.push(settle(group, name, lightRef, darkSpec, use, counts, {}));
  }
  // Variables already in the group that are not in the preset: never deleted, dark is filled by mirroring.
  const others = [];
  for (const [key, st] of Array.from(state)) {
    if (key.startsWith(low(group) + "/") && !seen.has(key)) others.push(settle(group, st.name, null, null, "", counts, {}));
  }
  out.groups.push({ group, status: counts.failed ? "partial" : "ok", ...counts, tokens, others });
}

// 3. Single variables typed as "Alias/Neutral/900 -> Mapped/Text/heading (dark)".
for (const line of REQUEST.lines) {
  const row = { from: line.from, to: line.to, action: "unchanged" };
  out.lines.push(row);
  try {
    const target = splitNote(line.to);
    const path = clean(target.path);
    if (!low(path).startsWith(low(TARGET) + "/") || path.length <= TARGET.length + 1) {
      throw new Error("the target has to be a variable in " + TARGET + ', like "' + TARGET + '/Text/heading"');
    }
    if (target.note && target.note !== "dark" && target.note !== "light") throw new Error('the note in parentheses can only be "light" or "dark"');
    const name = path.slice(TARGET.length + 1);
    const group = name.includes("/") ? name.slice(0, name.indexOf("/")) : "";
    const source = findPath(line.from);
    if (!source) throw new Error('source "' + line.from + '" not found');
    let st = state.get(low(name));
    if (target.note === "dark") {
      if (!st) throw new Error("this variable does not exist yet, so it needs a light value first");
      if (!hasDark) throw new Error("there is no Dark mode yet");
      if (pointsAt(st.dark, source)) row.action = "unchanged";
      else { row.was = describe(st.dark); put(st, "dark", source); row.action = "updated"; }
    } else {
      const isNew = !st;
      if (isNew) st = make(name);
      // Dark follows the new light when it was never set, or was just the mirror of the old light.
      const old = isNew ? null : targetOf(st.light);
      const unset = isNew || darkUnset(st) || (!!old && pointsAt(st.dark, mirror(old) || old));
      if (isNew || !pointsAt(st.light, source)) {
        if (!isNew) row.was = describe(st.light);
        put(st, "light", source);
        row.action = isNew ? "created" : "updated";
      }
      if (hasDark && unset) {
        const wantD = mirror(source) || source;
        if (!pointsAt(st.dark, wantD)) { put(st, "dark", wantD); if (!isNew) row.action = "updated"; }
      }
      decorate(st, group, "");
    }
    done.add(low(name));
    row.name = st.name;
    row.light = describe(st.light);
    if (hasDark) row.dark = describe(st.dark);
    if (source.variableCollectionId !== src.id) row.skipsAlias = true;
  } catch (e) {
    row.action = "failed";
    row.error = msg(e);
  }
}

// 4. A mode belongs to the whole collection, so Dark is completed for every other variable too.
if (hasDark) {
  const rows = new Map();
  for (const g of Object.keys(PRESET)) for (const r of PRESET[g]) rows.set(low(g + "/" + r[0]), r);
  const counts = { created: 0, updated: 0, unchanged: 0, kept: 0, failed: 0, scoped: 0 };
  for (const [key, st] of Array.from(state)) {
    if (done.has(key)) continue;
    const r = rows.get(key);
    const row = settle("", st.name, r ? r[1] : null, r ? r[2] : null, "", counts, { sweep: true });
    if (row.action === "updated" || row.action === "failed") out.darkFilled.push(row);
  }
}

out.missingSources = Array.from(missing);

// 5. Contrast of the pairs that are meant to be used together (WCAG AA), failures only.
const lum = (c) => {
  const f = (x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};
const pairs = [];
const content = ["heading", "subheading", "body", "body-secondary", "caption", "label", "helper", "action", "action-hover", "action-pressed", ...ROLES];
for (const bg of ["default", "page"]) {
  for (const c of content) pairs.push(["Text/" + c, "Surface/" + bg, 4.5], ["Icon/" + c, "Surface/" + bg, 3]);
}
const onMap = {
  "on-action": ["action", "action-hover", "action-pressed"],
  "on-action-secondary": ["action-secondary", "action-secondary-hover"],
  "on-selected": ["selected"],
  "on-inverse": ["inverse"],
  "on-inverse-secondary": ["inverse"]
};
for (const r of ROLES) { onMap["on-" + r] = [r]; onMap["on-" + r + "-secondary"] = [r + "-secondary"]; }
for (const fg of Object.keys(onMap)) {
  for (const bg of onMap[fg]) pairs.push(["Text/" + fg, "Surface/" + bg, 4.5], ["Icon/" + fg, "Surface/" + bg, 3]);
}
for (const b of ["default", "action", "action-hover", "action-pressed", "focus", "selected", ...ROLES]) pairs.push(["Border/" + b, "Surface/default", 3]);
for (const mode of hasDark ? ["light", "dark"] : ["light"]) {
  for (const [fg, bg, min] of pairs) {
    const a = state.get(low(fg)), b = state.get(low(bg));
    const ca = a && colorOf(a[mode]), cb = b && colorOf(b[mode]);
    if (!ca || !cb) continue;
    const la = lum(ca), lb = lum(cb);
    const ratio = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    if (ratio < min) out.contrast.push({ mode, pair: fg + " on " + bg, ratio: Math.round(ratio * 100) / 100, needs: min });
  }
}

if (out.groups.some((g) => g.status !== "ok") || out.lines.some((l) => l.action === "failed") || out.renames.some((r) => r.action === "failed") || out.modes.darkError) out.status = "partial";
return out;
