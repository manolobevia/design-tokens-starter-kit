// Runs the Figma scripts of the figma-* skills against a small in-memory fake of the Plugin API.
// Usage: node figma_harness.js <steps.json>
//   steps.json = { "file": "Name", "steps": [ { "path": "<script file>" } ... ] }
// Prints { results: [return value of each script], variables: [...], textStyles: [...] } as JSON.
// Only what the variable and text style scripts use is faked. The page script is not run here.
const fs = require("fs");

let nextId = 1;
const id = (p) => p + ":" + nextId++;

function makeFigma(fileName) {
  const collections = [];
  const variables = [];
  const styles = [];
  const byVarId = () => new Map(variables.map((v) => [v.id, v]));

  const FONTS = {
    Inter: ["Light", "Regular", "Medium", "Semi Bold", "Bold"],
    Roboto: ["Light", "Regular", "Medium", "Bold"],
    Playfair: ["Regular", "Medium", "Semi Bold", "Bold"],
    Lato: ["Light", "Regular", "Medium", "Semi Bold", "Bold"]
  };

  const figma = {
    root: { name: fileName, children: [] },
    variables: {
      async getLocalVariableCollectionsAsync() { return collections.slice(); },
      async getLocalVariablesAsync() { return variables.slice(); },
      createVariableCollection(name) {
        const modeId = id("m");
        const c = {
          id: id("VariableCollectionId"), name, modes: [{ modeId, name: "Mode 1" }], defaultModeId: modeId, variableIds: [],
          renameMode(mid, n) { this.modes.find((m) => m.modeId === mid).name = n; },
          addMode(n) { const m = { modeId: id("m"), name: n }; this.modes.push(m); return m.modeId; }
        };
        collections.push(c);
        return c;
      },
      createVariable(name, collection, type) {
        const v = {
          id: id("VariableID"), name, resolvedType: type, variableCollectionId: collection.id, valuesByMode: {},
          scopes: ["ALL_SCOPES"], description: "",
          setValueForMode(mid, value) { this.valuesByMode[mid] = value; },
          remove() { variables.splice(variables.indexOf(this), 1); collection.variableIds = collection.variableIds.filter((x) => x !== this.id); }
        };
        // Figma starts a variable at the default value of its type in every mode.
        for (const m of collection.modes) v.valuesByMode[m.modeId] = type === "COLOR" ? { r: 1, g: 1, b: 1, a: 1 } : type === "STRING" ? "" : 0;
        variables.push(v);
        collection.variableIds.push(v.id);
        return v;
      },
      createVariableAlias(v) { return { type: "VARIABLE_ALIAS", id: v.id }; }
    },
    async listAvailableFontsAsync() {
      return Object.entries(FONTS).flatMap(([family, ss]) => ss.map((style) => ({ fontName: { family, style } })));
    },
    async loadFontAsync() {},
    async getLocalTextStylesAsync() { return styles.slice(); },
    createTextStyle() {
      const s = {
        id: id("S"), name: "", boundVariables: {},
        setBoundVariable(field, v) { this.boundVariables[field] = v ? { type: "VARIABLE_ALIAS", id: v.id } : undefined; },
        remove() { styles.splice(styles.indexOf(this), 1); }
      };
      styles.push(s);
      return s;
    }
  };

  const dump = () => {
    const colById = new Map(collections.map((c) => [c.id, c]));
    const varById = byVarId();
    const enc = (val) => (val && val.type === "VARIABLE_ALIAS"
      ? { alias: colById.get(varById.get(val.id).variableCollectionId).name + "/" + varById.get(val.id).name } : val);
    return {
      variables: variables.map((v) => {
        const c = colById.get(v.variableCollectionId);
        return {
          collection: c.name, name: v.name, type: v.resolvedType, scopes: v.scopes, description: v.description,
          values: Object.fromEntries(c.modes.map((m) => [m.name, enc(v.valuesByMode[m.modeId])]))
        };
      }),
      modes: Object.fromEntries(collections.map((c) => [c.name, c.modes.map((m) => m.name)])),
      textStyles: styles.map((s) => ({ name: s.name, fontName: s.fontName, fontSize: s.fontSize, bound: Object.keys(s.boundVariables).filter((k) => s.boundVariables[k]) }))
    };
  };
  return { figma, dump };
}

(async () => {
  const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const { figma, dump } = makeFigma(spec.file || "Test file");
  const results = [];
  for (const step of spec.steps) {
    const src = fs.readFileSync(step.path, "utf8");
    const fn = new (Object.getPrototypeOf(async function () {}).constructor)("figma", src);
    results.push(await fn(figma));
  }
  process.stdout.write(JSON.stringify({ results, ...dump() }));
})().catch((e) => { process.stderr.write(String(e && e.stack || e)); process.exit(1); });
