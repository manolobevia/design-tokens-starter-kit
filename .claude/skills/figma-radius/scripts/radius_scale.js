// figma-radius
// Runs inside Figma (Plugin API) through a tool such as figma_execute or use_figma.
//
// Writes the border-radius scale as number (FLOAT) variables in the Brand
// collection, one group named in 4px units (token x 4 = px value):
//   Brand / Radius / 0 | 0-5 | 1 | 2 | 3 | 4 | 6 | full
// "full" is 9999px: fully rounded (pills, circles).
//
// Radius primitives are mode-agnostic, so the value is written to every mode of
// the collection and no mode is added.
//
// Edit ONLY the CONFIG block. Send everything else unchanged.

// ---- CONFIG ----
const REQUEST = {
  overwrite: false,  // true = reset values that were changed by hand back to the preset
  tokens: ["all"]    // "all", or a subset of token names, e.g. ["1", "2"]
};
const COLLECTION = "Brand"; // the collection the Radius group lives in. Matched by name
                            // (case-insensitive); created if the file has none by that name.
const GROUP = "Radius";
const DRY_RUN = false;  // true = report what would happen, write nothing
const EXPECT_FILE = ""; // optional file name guard, e.g. "Design System MB"
// ---- END CONFIG ----

// ---- PRESET ----
// token = the name after the group (Radius/2). token x 4 = px, except "full".
// Figma forbids a dot in a variable name, so 0-5 is 0.5 units (2px).
const PRESET = [
  { token: "0",    value: 0 },
  { token: "0-5",  value: 2 },
  { token: "1",    value: 4 },
  { token: "2",    value: 8 },
  { token: "3",    value: 12 },
  { token: "4",    value: 16 },
  { token: "6",    value: 24 },
  { token: "full", value: 9999 }
];
// Scopes limit where the variable is offered in the UI: corner radius only.
const SCOPES = ["CORNER_RADIUS"];
const MARK = "[figma-radius]"; // sentinel so a later run can tell its own descriptions from the user's
// ---- END PRESET ----

const low = (s) => String(s).trim().toLowerCase();
const norm = (s) => low(s).replace(/[\s_-]+/g, "");
const msg = (e) => String((e && e.message) || e);
const same = (a, b) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 1e-6;
const describe = (p) => p.token === "full" ? "Radius/full = 9999px. Fully rounded corners (pills, circles). " + MARK : "Radius/" + p.token + " = " + p.value + "px (" + (p.value / 4) + " x 4px base). Primitive corner radius. " + MARK;

const out = {
  dryRun: DRY_RUN, file: figma.root.name, status: "ok",
  collection: null, group: GROUP,
  variables: { created: 0, updated: 0, unchanged: 0, kept: 0, failed: 0, scoped: 0, rows: [], others: [] },
  problems: []
};

// ---------- guards ----------
if (EXPECT_FILE && low(EXPECT_FILE) !== low(figma.root.name)) {
  out.status = "error";
  out.error = 'This is "' + figma.root.name + '", not "' + EXPECT_FILE + '". Nothing was written.';
  return out;
}

const OW = REQUEST.overwrite === true;
const asked = (REQUEST.tokens || ["all"]).map(low);
let defs = asked.includes("all") ? PRESET.slice() : PRESET.filter((p) => asked.includes(low(p.token)));
for (const a of asked) {
  if (a !== "all" && !PRESET.some((p) => low(p.token) === a)) out.problems.push('Unknown token "' + a + '". Tokens: ' + PRESET.map((p) => p.token).join(", "));
}
if (!defs.length) {
  out.status = "error";
  out.error = "No tokens to write. Tokens: " + PRESET.map((p) => p.token).join(", ");
  return out;
}

// ---------- choose the collection ----------
const collections = await figma.variables.getLocalVariableCollectionsAsync();
let col = null;
let created = false;

const target = COLLECTION || "Brand";
col = collections.find((c) => low(c.name) === low(target)) || collections.find((c) => norm(c.name) === norm(target));
if (!col) {
  if (!DRY_RUN) col = figma.variables.createVariableCollection(target);
  created = true;
}

if (DRY_RUN && created) {
  // nothing was actually created; report intent and the token table only
  out.collection = { name: target, created: true };
  out.variables.rows = defs.map((p) => ({ token: p.token, value: p.value, action: "create" }));
  out.variables.created = defs.length;
  return out;
}

out.collection = { name: col.name, created: created };
const modeIds = col.modes.map((m) => m.modeId);

// ---------- existing variables in this collection ----------
const allVars = await figma.variables.getLocalVariablesAsync();
const mine = allVars.filter((v) => v.variableCollectionId === col.id);
const byName = {};
for (const v of mine) byName[low(v.name)] = v;

const presetNames = new Set(defs.map((p) => low(GROUP + "/" + p.token)));

// ---------- write each token ----------
for (const p of defs) {
  const name = GROUP + "/" + p.token;
  const row = { token: p.token, value: p.value, action: null };
  try {
    let v = byName[low(name)];

    if (!v) {
      if (!DRY_RUN) {
        v = figma.variables.createVariable(name, col, "FLOAT");
        for (const id of modeIds) v.setValueForMode(id, p.value);
        try { v.scopes = SCOPES; } catch (e) { /* scopes are a nicety */ }
        v.description = describe(p);
      }
      row.action = "created";
      out.variables.created++;
      out.variables.rows.push(row);
      continue;
    }

    if (v.resolvedType !== "FLOAT") {
      row.action = "failed";
      row.reason = name + " exists as " + v.resolvedType + ", expected a number";
      out.variables.failed++;
      out.variables.rows.push(row);
      continue;
    }

    // compare every mode to the preset value
    const differing = modeIds.filter((id) => !same(v.valuesByMode[id], p.value));

    if (differing.length === 0) {
      row.action = "unchanged";
      out.variables.unchanged++;
    } else if (OW) {
      row.was = differing.map((id) => v.valuesByMode[id]).filter((x, i, a) => a.indexOf(x) === i);
      if (!DRY_RUN) for (const id of differing) v.setValueForMode(id, p.value);
      row.action = "updated";
      out.variables.updated++;
    } else {
      row.action = "kept";
      row.current = modeIds.map((id) => v.valuesByMode[id]).filter((x, i, a) => a.indexOf(x) === i);
      out.variables.kept++;
    }

    // tidy scopes and description without touching a hand-set value
    if (!DRY_RUN) {
      if (v.scopes && v.scopes.length === 1 && v.scopes[0] === "ALL_SCOPES") {
        try { v.scopes = SCOPES; out.variables.scoped++; } catch (e) { /* ignore */ }
      }
      if (!v.description || v.description.endsWith(MARK)) v.description = describe(p);
    }

    out.variables.rows.push(row);
  } catch (e) {
    row.action = "failed";
    row.reason = msg(e);
    out.variables.failed++;
    out.variables.rows.push(row);
  }
}

// ---------- note extra group variables not in the preset (never deleted) ----------
for (const v of mine) {
  if (low(v.name).indexOf(low(GROUP) + "/") === 0 && !presetNames.has(low(v.name))) {
    out.variables.others.push(v.name);
  }
}

if (out.variables.failed > 0) out.status = "partial";
return out;
