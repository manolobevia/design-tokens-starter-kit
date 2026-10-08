// figma-export-tokens, step 1 of 2
// Runs inside Figma (Plugin API) through a tool such as figma_execute.
//
// Reads every variable collection of the open file and returns it in a compact,
// lossless form: names, types, and one value per mode. A value that points at
// another variable is returned as { "$": "Collection/Variable name" } so the
// converter can keep references (CSS var() and DTCG {aliases}) instead of copies.
//
// The result is padded so the host saves it to a file instead of printing it:
// the converter (scripts/build_tokens.py) reads that file. Nothing is written to Figma.
//
// Edit ONLY the CONFIG block. Send everything else unchanged.

// ---- CONFIG ----
const EXPECT_FILE = ""; // optional file name guard, e.g. "Design System MB"
const PAD_TO = 130000;  // characters. Keeps the result large so it is saved to a file. 0 = no padding
// ---- END CONFIG ----

if (EXPECT_FILE && EXPECT_FILE.toLowerCase() !== figma.root.name.toLowerCase()) {
  return { error: 'This is "' + figma.root.name + '", not "' + EXPECT_FILE + '". Nothing was read.' };
}
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
const collById = new Map(collections.map((c) => [c.id, c]));
const varById = new Map(variables.map((v) => [v.id, v]));
const h2 = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
function enc(value) {
  if (value && value.type === "VARIABLE_ALIAS") {
    const t = varById.get(value.id);
    const c = t && collById.get(t.variableCollectionId);
    return t && c ? { "$": c.name + "/" + t.name } : { "$": "missing" };
  }
  if (value && typeof value === "object" && "r" in value) {
    const a = value.a === undefined || value.a >= 1 ? "" : h2(value.a);
    return ("#" + h2(value.r) + h2(value.g) + h2(value.b) + a).toUpperCase();
  }
  return value;
}
const out = { format: "figma-tokens/1", file: figma.root.name, collections: [] };
for (const c of collections) {
  const vars = c.variableIds.map((id) => varById.get(id)).filter(Boolean);
  out.collections.push({
    name: c.name,
    modes: c.modes.map((m) => m.name),
    variables: vars.map((v) => ({ n: v.name, t: v.resolvedType, v: c.modes.map((m) => enc(v.valuesByMode[m.modeId])) }))
  });
}
out.counts = out.collections.map((c) => c.name + ": " + c.variables.length);
const size = JSON.stringify(out).length;
if (PAD_TO > size) out.pad = "x".repeat(PAD_TO - size);
return out;
