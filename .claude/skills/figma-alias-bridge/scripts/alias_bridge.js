// figma-alias-bridge
// Runs inside Figma (Plugin API) through a tool such as figma_execute.
// Mirrors every variable of a source group into a target group, where each
// target variable holds a real alias (reference) to its source variable.
//
// A note in parentheses at the end of the target, like "Alias/Primary (Purple)",
// is a reminder for the person typing the line. It is removed from the name,
// so the group is created as "Primary".
//
// Alias/Neutral is locked to Brand/Gray (see the guard below).
//
// Edit ONLY the CONFIG block. Send everything else unchanged.

// ---- CONFIG ----
const BRIDGES = [
  { from: "Brand/Purple", to: "Alias/Primary (Purple)" }
];
const DRY_RUN = false; // true = report what would happen, write nothing
// ---- END CONFIG ----

const clean = (s) => String(s).trim().replace(/\s*\/\s*/g, "/").replace(/^\/+|\/+$/g, "");
const low = (s) => s.toLowerCase();
// "Alias/Primary (Purple)" -> path "Alias/Primary" + note "Purple"
function splitNote(raw) {
  const m = String(raw).trim().match(/^(.*?)\s*\(([^()]*)\)$/);
  return m ? { path: m[1], note: m[2].trim() } : { path: String(raw).trim(), note: "" };
}

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
const collById = new Map(collections.map((c) => [c.id, c]));
const varById = new Map(variables.map((v) => [v.id, v]));

// "Brand/Purple" -> collection "Brand" + group "Purple".
// Collection names may contain slashes ("Brand/Primitives"), so match the
// longest collection name that the path starts with.
function splitPath(raw) {
  const path = clean(raw);
  let best = null;
  for (const c of collections) {
    const name = clean(c.name);
    if (low(path).startsWith(low(name) + "/") && (!best || name.length > clean(best.name).length)) best = c;
  }
  if (best) return { collection: best, collectionName: best.name, group: path.slice(clean(best.name).length + 1) };
  const i = path.indexOf("/");
  if (i < 0) return { collection: null, collectionName: path, group: "" };
  return { collection: null, collectionName: path.slice(0, i), group: path.slice(i + 1) };
}

function groupsOf(collection) {
  const seen = [];
  for (const id of collection.variableIds) {
    const v = varById.get(id);
    if (!v) continue;
    const g = v.name.includes("/") ? v.name.slice(0, v.name.lastIndexOf("/")) : "(no group)";
    if (!seen.includes(g)) seen.push(g);
  }
  return seen;
}

const hex2 = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
function describe(value) {
  if (value && value.type === "VARIABLE_ALIAS") {
    const t = varById.get(value.id);
    if (!t) return "missing variable";
    const c = collById.get(t.variableCollectionId);
    return (c ? c.name + "/" : "") + t.name;
  }
  if (value && typeof value === "object" && "r" in value) {
    const a = value.a === undefined || value.a >= 1 ? "" : hex2(value.a);
    return ("#" + hex2(value.r) + hex2(value.g) + hex2(value.b) + a).toUpperCase();
  }
  return value;
}
// Final value of a variable in its own default mode, following alias chains.
function resolved(v, depth = 0) {
  const c = collById.get(v.variableCollectionId);
  const value = c ? v.valuesByMode[c.defaultModeId] : undefined;
  if (value && value.type === "VARIABLE_ALIAS") {
    const t = varById.get(value.id);
    return t && depth < 10 ? resolved(t, depth + 1) : null;
  }
  return describe(value);
}

const results = [];

for (const bridge of BRIDGES) {
  const out = {
    from: bridge.from, to: bridge.to, status: "ok",
    collection: null, group: null, note: "", noteMatchesSource: true, collectionCreated: false,
    created: 0, repointed: 0, unchanged: 0, failed: 0,
    tokens: [], untouched: []
  };
  results.push(out);

  try {
    const src = splitPath(bridge.from);
    const target = splitNote(bridge.to);
    const dst = splitPath(target.path);
    out.note = target.note;

    if (!src.collection) {
      throw new Error('Source collection not found for "' + bridge.from + '". Collections in this file: ' +
        (collections.map((c) => c.name).join(", ") || "none"));
    }
    if (!src.group) throw new Error('Source needs a group after the collection, like "Brand/Purple".');
    if (!dst.group) throw new Error('Target needs a group after the collection, like "Alias/Primary".');

    const srcPrefix = low(src.group) + "/";
    const srcVars = src.collection.variableIds
      .map((id) => varById.get(id))
      .filter((v) => v && low(v.name).startsWith(srcPrefix));
    if (!srcVars.length) {
      throw new Error('No variables found in group "' + src.group + '" of collection "' + src.collection.name +
        '". Groups there: ' + (groupsOf(src.collection).join(", ") || "none"));
    }
    if (dst.collection && dst.collection.id === src.collection.id && low(dst.group) === low(src.group)) {
      throw new Error("Source and target are the same group.");
    }
    // Alias/Neutral is fixed: it always uses Brand/Gray, whatever line was typed.
    if (low(clean(dst.collectionName)) === "alias" && low(dst.group) === "neutral" && low(src.group) !== "gray") {
      throw new Error('Alias/Neutral always uses Brand/Gray, so "' + bridge.from + '" was not written. Use "Brand/Gray -> Alias/Neutral" or choose another role name.');
    }

    const srcGroupName = srcVars[0].name.slice(0, src.group.length);
    out.noteMatchesSource = !target.note || low(target.note) === low(srcGroupName.split("/").pop());

    let dstCol = dst.collection;
    out.collection = dst.collectionName;
    out.group = dst.group;
    if (!dstCol) {
      out.collectionCreated = true;
      if (!DRY_RUN) {
        dstCol = figma.variables.createVariableCollection(dst.collectionName);
        collections.push(dstCol);
        collById.set(dstCol.id, dstCol);
      }
    }

    const existing = new Map();
    if (dstCol) {
      for (const id of dstCol.variableIds) {
        const v = varById.get(id);
        if (v) existing.set(low(v.name), v);
      }
    }
    const pointsAt = (t, s) => dstCol.modes.every((m) => {
      const value = t.valuesByMode[m.modeId];
      return value && value.type === "VARIABLE_ALIAS" && value.id === s.id;
    });

    const mapped = new Set();
    // Source order is kept, so a 950 to 50 scale stays dark to light.
    for (const s of srcVars) {
      const name = dst.group + s.name.slice(src.group.length);
      mapped.add(low(name));
      const row = {
        alias: dst.collectionName + "/" + name,
        source: src.collection.name + "/" + s.name,
        value: resolved(s),
        action: "created"
      };
      out.tokens.push(row);

      try {
        let t = existing.get(low(name));
        if (t) {
          if (t.id === s.id) throw new Error("would point to itself");
          if (t.resolvedType !== s.resolvedType) {
            throw new Error("type mismatch: existing variable is " + t.resolvedType + ", source is " + s.resolvedType);
          }
          if (pointsAt(t, s)) { row.action = "unchanged"; out.unchanged++; continue; }
          row.action = "repointed";
          row.was = describe(t.valuesByMode[dstCol.defaultModeId]);
        }
        if (!DRY_RUN) {
          if (!t) {
            t = figma.variables.createVariable(name, dstCol, s.resolvedType);
            varById.set(t.id, t);
            existing.set(low(name), t);
          }
          const alias = figma.variables.createVariableAlias(s);
          for (const m of dstCol.modes) t.setValueForMode(m.modeId, alias);
          if (!pointsAt(t, s)) throw new Error("alias was not saved");
        }
        out[row.action]++;
      } catch (e) {
        row.action = "failed";
        row.error = String((e && e.message) || e);
        out.failed++;
      }
    }

    // Variables already in the target group with no partner in the source
    // group are reported, never deleted.
    const dstPrefix = low(dst.group) + "/";
    for (const [key, v] of existing) {
      if (key.startsWith(dstPrefix) && !mapped.has(key)) out.untouched.push(v.name);
    }
    if (out.failed) out.status = "partial";
  } catch (e) {
    out.status = "error";
    out.error = String((e && e.message) || e);
  }
}

return { dryRun: DRY_RUN, file: figma.root.name, results };
