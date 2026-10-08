// figma-token-docs
// Runs inside Figma (Plugin API) through a tool such as figma_execute.
//
// Builds a visual reference page named "Design Tokens" from the live variables
// and text styles of the open file. Everything on the page is bound to the real
// variables and styles, so it stays true when a token changes: swatch fills,
// spacing widths, radius corners and stroke weights are variable bindings, the
// type samples use the real text styles, and the Light/Dark and Desktop/Mobile
// columns are frames set to those variable modes.
//
// Each section is its own frame on the page (1440 wide, laid out left to right).
// Only frames this script made are rebuilt (they carry plugin data). Anything
// else on the page is never touched. Running it again replaces its own sections.
//
// Edit ONLY the CONFIG block. Send everything else unchanged.

// ---- CONFIG ----
const PAGE = "Design Tokens";
const SECTIONS = ["all"]; // "all", or any of: header, brand, alias, mapped, contrast, typography, fonts, spacing, radius, border
const DRY_RUN = false;    // true = report what would be built, write nothing
const EXPECT_FILE = "";   // optional file name guard, e.g. "Design System MB"
// ---- END CONFIG ----

const TAG = "figma-token-docs";
const ORDER = ["header", "brand", "alias", "mapped", "contrast", "typography", "fonts", "spacing", "radius", "border"];
const W = 1440, PAD = 80, CONTENT = W - PAD * 2; // 1280

const low = (s) => String(s).trim().toLowerCase();
const msg = (e) => String((e && e.message) || e);

const out = { dryRun: DRY_RUN, file: figma.root.name, status: "ok", page: PAGE, sections: [], notes: [] };

if (EXPECT_FILE && low(EXPECT_FILE) !== low(figma.root.name)) {
  out.status = "error";
  out.error = 'This is "' + figma.root.name + '", not "' + EXPECT_FILE + '". Nothing was written.';
  return out;
}
const askedAll = SECTIONS.map(low);
const todo = ORDER.filter((s) => askedAll.includes("all") || askedAll.includes(s));
for (const a of askedAll) if (a !== "all" && !ORDER.includes(a)) out.notes.push('Unknown section "' + a + '". Sections: ' + ORDER.join(", "));
if (!todo.length) { out.status = "error"; out.error = "No sections to build."; return out; }

// ---------- file state ----------
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
const collById = new Map(collections.map((c) => [c.id, c]));
const varById = new Map(variables.map((v) => [v.id, v]));
const findColl = (n) => collections.find((c) => low(c.name) === low(n)) || null;
const varsOf = (c) => (c ? c.variableIds.map((id) => varById.get(id)).filter(Boolean) : []);
const brand = findColl("Brand"), alias = findColl("Alias"), mapped = findColl("Mapped"), responsive = findColl("Responsive");
const vget = (c, name) => (c ? varsOf(c).find((v) => low(v.name) === low(name)) || null : null);
const mv = (name) => vget(mapped, name);
const bv = (name) => vget(brand, name);
const textStyles = await figma.getLocalTextStylesAsync();
const styleByName = new Map(textStyles.map((s) => [low(s.name), s]));
const modeId = (c, name) => { const m = c && c.modes.find((x) => low(x.name) === low(name)); return m ? m.modeId : null; };

if (DRY_RUN) {
  out.sections = todo.map((id) => ({ id, action: "would build" }));
  out.counts = {
    brandColors: varsOf(brand).filter((v) => v.resolvedType === "COLOR").length,
    aliasColors: varsOf(alias).length, mapped: varsOf(mapped).length,
    textStyles: textStyles.length, responsive: varsOf(responsive).length
  };
  return out;
}

// ---------- colors ----------
function colorOf(v, mId, depth = 0) {
  const c = collById.get(v.variableCollectionId);
  const val = v.valuesByMode[mId || c.defaultModeId];
  if (val && val.type === "VARIABLE_ALIAS") {
    const t = varById.get(val.id);
    return t && depth < 10 ? colorOf(t, null, depth + 1) : null;
  }
  return val && typeof val === "object" && "r" in val ? val : null;
}
const h2 = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
const hexOf = (c) => (c ? ("#" + h2(c.r) + h2(c.g) + h2(c.b)).toUpperCase() : "n/a");
const lum = (c) => {
  const f = (x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};
const ratioOf = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
const GREY = { r: 0.5, g: 0.5, b: 0.5 };
const paint = (v) => (v ? figma.variables.setBoundVariableForPaint({ type: "SOLID", color: GREY }, "color", v) : { type: "SOLID", color: GREY });

// ---------- fonts and text ----------
const fontsLoaded = new Set();
async function loadFont(fn) {
  const k = fn.family + "|" + fn.style;
  if (fontsLoaded.has(k)) return;
  await figma.loadFontAsync(fn);
  fontsLoaded.add(k);
}
// T(): a text node using one of the file's text styles, colored by a bound variable.
async function T(parent, str, styleName, o = {}) {
  const t = figma.createText();
  const st = styleByName.get(low(styleName));
  if (st) {
    await loadFont(st.fontName);
    await t.setTextStyleIdAsync(st.id);
  } else {
    await loadFont({ family: "Inter", style: "Regular" });
    t.fontName = { family: "Inter", style: "Regular" };
    t.fontSize = o.size || 14;
  }
  t.characters = String(str);
  t.fills = [paint(o.color === undefined ? mv("Text/body") : o.color)];
  if (o.align) t.textAlignHorizontal = o.align;
  parent.appendChild(t);
  if (o.w) { t.textAutoResize = "HEIGHT"; t.resize(o.w, t.height); }
  if (o.fillW) { t.textAutoResize = "HEIGHT"; t.layoutSizingHorizontal = "FILL"; }
  return t;
}

// ---------- frames ----------
// F(): an auto-layout frame. o: dir, gap, gapY (wrap), pad, px, py, w, fill, stroke, radius, wrap, align, justify.
function F(parent, name, o = {}) {
  const f = figma.createFrame();
  f.name = name;
  f.fills = o.fill ? [paint(o.fill)] : [];
  f.clipsContent = false;
  f.layoutMode = o.dir || "VERTICAL";
  f.itemSpacing = o.gap || 0;
  f.paddingLeft = f.paddingRight = o.px !== undefined ? o.px : o.pad || 0;
  f.paddingTop = f.paddingBottom = o.py !== undefined ? o.py : o.pad || 0;
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "AUTO";
  if (o.align) f.counterAxisAlignItems = o.align;
  if (o.justify) f.primaryAxisAlignItems = o.justify;
  if (o.w) {
    f.resize(o.w, f.height || 10);
    if (f.layoutMode === "HORIZONTAL") f.primaryAxisSizingMode = "FIXED"; else f.counterAxisSizingMode = "FIXED";
  }
  if (o.wrap) { f.layoutWrap = "WRAP"; f.counterAxisSpacing = o.gapY !== undefined ? o.gapY : o.gap || 0; }
  if (o.radius) for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) f.setBoundVariable(k, o.radius);
  if (o.stroke) strokeOf(f, o.stroke.color, o.stroke.weight);
  if (parent) parent.appendChild(f);
  if (o.fillW) f.layoutSizingHorizontal = "FILL";
  return f;
}
function strokeOf(node, colorVar, weightVar, weightPx = 1) {
  node.strokes = [paint(colorVar)];
  node.strokeAlign = "INSIDE";
  if (weightVar) for (const k of ["strokeTopWeight", "strokeBottomWeight", "strokeLeftWeight", "strokeRightWeight"]) node.setBoundVariable(k, weightVar);
  else node.strokeWeight = weightPx;
}
function R(parent, name, w, h, o = {}) {
  const r = figma.createRectangle();
  r.name = name;
  r.resize(w, h);
  r.fills = o.fill ? [paint(o.fill)] : [];
  if (o.radius) for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) r.setBoundVariable(k, o.radius);
  if (o.stroke) strokeOf(r, o.stroke.color, o.stroke.weight);
  parent.appendChild(r);
  return r;
}

// ---------- common bound tokens used for the page chrome ----------
const rad1 = bv("Radius/1"), rad2 = bv("Radius/2"), rad3 = bv("Radius/3");
const hair = bv("Border width/0-25"), thin = bv("Border width/0-5");
const lineColor = mv("Border/secondary"), softLine = mv("Border/tertiary");
const tHead = mv("Text/heading"), tBody = mv("Text/body"), tMuted = mv("Text/body-secondary");

// ---------- page ----------
let page = figma.root.children.find((p) => p.name === PAGE);
if (!page) { page = figma.createPage(); page.name = PAGE; out.pageCreated = true; }
await figma.setCurrentPageAsync(page);
const lightMode = mapped ? modeId(mapped, "Light") : null;
const GAP = 120; // space between section frames on the canvas (horizontal)
const mine = () => page.children.filter((n) => n.type === "FRAME" && n.getPluginData(TAG).startsWith("section:"));
// Lay the section frames out left to right in ORDER, top aligned at the origin of the page.
function restack() {
  const frames = mine().sort((a, b) => ORDER.indexOf(a.getPluginData(TAG).slice(8)) - ORDER.indexOf(b.getPluginData(TAG).slice(8)));
  let x = 0;
  for (const f of frames) { f.primaryAxisSizingMode = "AUTO"; f.x = x; f.y = 0; x += f.width + GAP; }
  return frames.length;
}

// A section: titled frame, replaced on every run, placed in ORDER, left to right, on the page.
async function section(id, title, subtitle) {
  for (const n of mine()) if (n.getPluginData(TAG) === "section:" + id) n.remove();
  const f = F(page, title, { dir: "VERTICAL", gap: 40, pad: PAD, fill: mv("Surface/page"), w: W });
  f.setPluginData(TAG, "section:" + id);
  if (lightMode) f.setExplicitVariableModeForCollection(mapped, lightMode);
  const head = F(f, "Heading", { dir: "VERTICAL", gap: 8 });
  await T(head, title, "Heading/H2", { color: tHead });
  if (subtitle) await T(head, subtitle, "Body/Default", { color: tMuted, w: CONTENT });
  return F(f, "Content", { dir: "VERTICAL", gap: 40, w: CONTENT });
}
const sectionNote = async (content, text) => { await T(content, text, "Body/Default", { color: tMuted }); };

// ---------- helpers for swatch rows (Brand, Alias) ----------
function groupsOf(coll, filter) {
  const map = new Map();
  for (const v of varsOf(coll)) {
    if (filter && !filter(v)) continue;
    const i = v.name.indexOf("/");
    const g = i < 0 ? v.name : v.name.slice(0, i);
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(v);
  }
  return map;
}
async function swatchRow(parent, groupName, caption, vars) {
  const row = F(parent, groupName, { dir: "VERTICAL", gap: 12 });
  const head = F(row, "Label", { dir: "HORIZONTAL", gap: 12, align: "CENTER" });
  await T(head, groupName, "Heading/H5", { color: tHead });
  if (caption) await T(head, caption, "Caption/Default", { color: tMuted });
  const line = F(row, "Swatches", { dir: "HORIZONTAL", gap: 8 });
  for (const v of vars) {
    const leaf = v.name.slice(v.name.indexOf("/") + 1);
    const s = F(line, leaf, { dir: "VERTICAL", gap: 6, w: 108 });
    R(s, "Swatch", 108, 64, { fill: v, radius: rad2, stroke: { color: lineColor, weight: hair } });
    await T(s, leaf, "Label/Small", { color: tHead, w: 108 });
    await T(s, hexOf(colorOf(v)), "Caption/Default", { color: tMuted, w: 108 });
  }
}

const built = {};
const SECTION_FN = {};

// ===================== header =====================
SECTION_FN.header = async () => {
  const c = await section("header", "Design Tokens", null);
  const sub = figma.root.name + " · generated " + new Date().toISOString().slice(0, 10) + " from the live variables and text styles.";
  await T(c, sub, "Body/Large", { color: tMuted, w: CONTENT });
  const chips = F(c, "Counts", { dir: "HORIZONTAL", gap: 12, wrap: true, w: CONTENT });
  const count = (coll) => varsOf(coll).length;
  const items = [
    ["Brand", count(brand) + " variables"], ["Alias", count(alias) + " variables"],
    ["Mapped", count(mapped) + " variables · " + (mapped ? mapped.modes.length : 0) + " modes"],
    ["Responsive", count(responsive) + " variables · " + (responsive ? responsive.modes.length : 0) + " modes"],
    ["Text styles", String(textStyles.length)]
  ];
  for (const [k, v] of items) {
    const chip = F(chips, k, { dir: "HORIZONTAL", gap: 8, px: 16, py: 10, fill: mv("Surface/secondary"), radius: rad3, align: "CENTER" });
    await T(chip, k, "Label/Default", { color: tHead });
    await T(chip, v, "Body/Small", { color: tMuted });
  }
  built.header = 1;
};

// ===================== brand =====================
SECTION_FN.brand = async () => {
  const c = await section("brand", "Brand colors", "Raw color scales in the Brand collection. Each scale runs from 950 (darkest) to 50 (lightest); 500 Default is the base color.");
  if (!brand) { await sectionNote(c, "No Brand collection found."); built.brand = 0; return; }
  let n = 0;
  for (const [g, vars] of groupsOf(brand, (v) => v.resolvedType === "COLOR")) { await swatchRow(c, g, "", vars); n++; }
  built.brand = n;
};

// ===================== alias =====================
SECTION_FN.alias = async () => {
  const c = await section("alias", "Alias roles", "Roles that point at Brand colors. Change the Brand color a role points to and everything downstream follows.");
  if (!alias) { await sectionNote(c, "No Alias collection found."); built.alias = 0; return; }
  let n = 0;
  for (const [g, vars] of groupsOf(alias, (v) => v.resolvedType === "COLOR")) {
    const first = vars[0];
    const val = first.valuesByMode[alias.defaultModeId];
    const src = val && val.type === "VARIABLE_ALIAS" ? varById.get(val.id) : null;
    const cap = src ? "→ Brand/" + src.name.slice(0, src.name.indexOf("/")) : "";
    await swatchRow(c, g, cap, vars); n++;
  }
  built.alias = n;
};

// ===================== mapped =====================
function surfaceFor(leaf) {
  const base = leaf.slice(3);
  return mv("Surface/" + base) || (base.startsWith("inverse") ? mv("Surface/inverse") : null);
}
async function chipFor(parent, group, v) {
  const leaf = v.name.slice(v.name.indexOf("/") + 1);
  const slot = F(parent, "Chip", { dir: "HORIZONTAL", align: "CENTER", justify: "CENTER", w: 44 });
  slot.counterAxisSizingMode = "FIXED"; slot.resize(44, 44);
  if (group === "Surface") {
    slot.fills = [paint(v)];
    for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) slot.setBoundVariable(k, rad2);
    strokeOf(slot, mv("Border/secondary"), hair);
  } else if (group === "Border") {
    for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) slot.setBoundVariable(k, rad2);
    strokeOf(slot, v, thin);
  } else {
    const sur = leaf.startsWith("on-") ? surfaceFor(leaf) : null;
    if (sur) {
      slot.fills = [paint(sur)];
      for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) slot.setBoundVariable(k, rad2);
      strokeOf(slot, mv("Border/secondary"), hair);
    }
    if (group === "Text") await T(slot, "Aa", "Heading/H5", { color: v });
    else {
      const dot = figma.createEllipse(); dot.resize(20, 20); dot.fills = [paint(v)]; slot.appendChild(dot);
    }
  }
  return leaf;
}
SECTION_FN.mapped = async () => {
  const c = await section("mapped", "Mapped usage", "What each color is for. Every variable is shown in Light and Dark, resolved through Alias to Brand. Apply these to layers, not Brand or Alias.");
  if (!mapped) { await sectionNote(c, "No Mapped collection found."); built.mapped = 0; return; }
  const lightId = modeId(mapped, "Light"), darkId = modeId(mapped, "Dark");
  let n = 0;
  for (const [g, vars] of groupsOf(mapped, (v) => v.resolvedType === "COLOR")) {
    const block = F(c, g, { dir: "VERTICAL", gap: 16 });
    await T(block, g, "Heading/H4", { color: tHead });
    const cols = F(block, "Modes", { dir: "HORIZONTAL", gap: 24 });
    for (const [label, id] of [["Light", lightId], ["Dark", darkId]]) {
      if (!id) continue;
      const mf = F(cols, label, { dir: "VERTICAL", gap: 16, w: 628, pad: 24, fill: mv("Surface/page"), radius: rad3, stroke: { color: mv("Border/secondary"), weight: hair } });
      mf.setExplicitVariableModeForCollection(mapped, id);
      await T(mf, label, "Label/Default", { color: tMuted });
      const grid = F(mf, "Variables", { dir: "HORIZONTAL", gap: 16, gapY: 12, wrap: true, w: 580 });
      for (const v of vars) {
        const item = F(grid, v.name, { dir: "HORIZONTAL", gap: 12, align: "CENTER", w: 282 });
        const leaf = await chipFor(item, g, v);
        await T(item, leaf, "Body/Small", { color: tBody, w: 220 });
        n++;
      }
    }
  }
  built.mapped = n;
};

// ===================== contrast =====================
SECTION_FN.contrast = async () => {
  const c = await section("contrast", "Contrast checks", "Text and border pairs that are meant to be used together, checked against WCAG AA (4.5:1 for text, 3:1 for control borders).");
  if (!mapped) { await sectionNote(c, "No Mapped collection found."); built.contrast = 0; return; }
  const lightId = modeId(mapped, "Light"), darkId = modeId(mapped, "Dark");
  const ROLES = ["error", "success", "warning", "information"];
  const content = ["heading", "subheading", "body", "body-secondary", "caption", "label", "helper", "action", "action-hover", "action-pressed", ...ROLES];
  const pairs = [];
  for (const bg of ["default", "page"]) for (const t of content) pairs.push(["Text/" + t, "Surface/" + bg, 4.5]);
  const onMap = { "on-action": ["action", "action-hover", "action-pressed"], "on-action-secondary": ["action-secondary", "action-secondary-hover"], "on-selected": ["selected"], "on-inverse": ["inverse"], "on-inverse-secondary": ["inverse"] };
  for (const r of ROLES) { onMap["on-" + r] = [r]; onMap["on-" + r + "-secondary"] = [r + "-secondary"]; }
  for (const fg of Object.keys(onMap)) for (const bg of onMap[fg]) pairs.push(["Text/" + fg, "Surface/" + bg, 4.5]);
  for (const b of ["default", "action", "action-hover", "action-pressed", "focus", "selected", ...ROLES]) pairs.push(["Border/" + b, "Surface/default", 3]);
  const rows = [];
  const skipped = new Set();
  for (const [fg, bg, min] of pairs) {
    const a = mv(fg), b = mv(bg);
    if (!a || !b) { skipped.add(!a ? fg : bg); continue; }
    const row = { fg, bg, min };
    for (const [k, id] of [["light", lightId], ["dark", darkId]]) {
      if (!id) continue;
      const ca = colorOf(a, id), cb = colorOf(b, id);
      row[k] = ca && cb ? ratioOf(ca, cb) : null;
    }
    rows.push(row);
  }
  const pass = (r, k) => r[k] === undefined || r[k] === null ? null : r[k] >= r.min;
  const tally = (k) => rows.filter((r) => pass(r, k) !== null);
  const lt = tally("light"), dk = tally("dark");
  const sum = "Light: " + lt.filter((r) => pass(r, "light")).length + " of " + lt.length + " pairs pass.   Dark: " + dk.filter((r) => pass(r, "dark")).length + " of " + dk.length + " pairs pass.";
  await T(c, sum, "Body/Large", { color: tHead, w: CONTENT });
  // What does not pass, listed on its own so it cannot be missed.
  const fails = [];
  for (const r of rows) for (const k of ["light", "dark"]) if (pass(r, k) === false) fails.push({ mode: k === "light" ? "Light" : "Dark", pair: r.fg.replace("Text/", "").replace("Border/", "border ") + " on " + r.bg.replace("Surface/", ""), ratio: r[k], min: r.min });
  const box = F(c, "Does not pass", { dir: "VERTICAL", gap: 12, pad: 24, w: CONTENT, fill: fails.length ? mv("Surface/error-secondary") : mv("Surface/success-secondary"), radius: rad3 });
  await T(box, fails.length ? "Does not pass (" + fails.length + ")" : "Does not pass (0)", "Heading/H5", { color: tHead });
  if (!fails.length) await T(box, "Every checked pair passes in every mode.", "Body/Default", { color: tBody, w: CONTENT - 48 });
  for (const f of fails) await T(box, f.mode + " · " + f.pair + " · " + f.ratio.toFixed(2) + ":1, needs " + f.min + ":1", "Body/Default", { color: tBody, w: CONTENT - 48 });
  built.failures = fails.length;
  if (skipped.size) await T(c, "Not checked, variable missing in Mapped: " + Array.from(skipped).join(", ") + ".", "Body/Small", { color: tMuted, w: CONTENT });
  const half = Math.ceil(rows.length / 2);
  const cols = F(c, "Tables", { dir: "HORIZONTAL", gap: 40, w: CONTENT });
  for (const chunk of [rows.slice(0, half), rows.slice(half)]) {
    const tbl = F(cols, "Table", { dir: "VERTICAL", gap: 0, w: 620 });
    const hd = F(tbl, "Head", { dir: "HORIZONTAL", gap: 8, py: 8, w: 620 });
    await T(hd, "Pair", "Label/Small", { color: tMuted, w: 300 });
    await T(hd, "Light", "Label/Small", { color: tMuted, w: 150 });
    await T(hd, "Dark", "Label/Small", { color: tMuted, w: 150 });
    for (const r of chunk) {
      const failing = pass(r, "light") === false || pass(r, "dark") === false;
      const line = F(tbl, r.fg + " on " + r.bg, { dir: "HORIZONTAL", gap: 8, py: 8, w: 620, align: "CENTER", fill: failing ? mv("Surface/error-secondary") : null });
      line.strokes = [paint(softLine)]; line.strokeAlign = "INSIDE";
      for (const k of ["strokeTopWeight", "strokeLeftWeight", "strokeRightWeight"]) line.setBoundVariable(k, bv("Border width/0"));
      line.setBoundVariable("strokeBottomWeight", hair);
      await T(line, r.fg.replace("Text/", "").replace("Border/", "border ") + " on " + r.bg.replace("Surface/", ""), "Body/Small", { color: tBody, w: 300 });
      for (const k of ["light", "dark"]) {
        const cell = F(line, k, { dir: "HORIZONTAL", gap: 8, w: 150, align: "CENTER" });
        if (r[k] === undefined) continue;
        const ok = pass(r, k);
        await T(cell, r[k] === null ? "n/a" : r[k].toFixed(2), "Body/Small", { color: tBody });
        await T(cell, ok === null ? "" : ok ? "Pass" : "Fail", "Label/Small", { color: ok ? mv("Text/success") : mv("Text/error") });
      }
    }
  }
  built.contrast = rows.length;
};

// ===================== typography =====================
SECTION_FN.typography = async () => {
  const c = await section("typography", "Typography", "Every text style, shown in the Desktop and Mobile modes of the Responsive collection. One style per role: the frame's mode decides the size.");
  if (!responsive || !textStyles.length) { await sectionNote(c, "No text styles or Responsive collection found. Run Typography first."); built.typography = 0; return; }
  const dId = modeId(responsive, "Desktop"), mId = modeId(responsive, "Mobile");
  const GROUPS = ["Display", "Heading", "Body", "Label", "Caption", "Overline"];
  const sorted = textStyles.slice().sort((a, b) => {
    const ga = GROUPS.indexOf(a.name.split("/")[0]), gb = GROUPS.indexOf(b.name.split("/")[0]);
    return (ga < 0 ? 99 : ga) - (gb < 0 ? 99 : gb);
  });
  const resVar = (style, prop) => vget(responsive, style.replace(/ Strong$/, "") + "/" + prop);
  const num = (v, id) => (v && typeof v.valuesByMode[id] === "number" ? v.valuesByMode[id] : null);
  const head = F(c, "Columns", { dir: "HORIZONTAL", gap: 24, w: CONTENT });
  await T(head, "Style", "Label/Small", { color: tMuted, w: 240 });
  await T(head, "Desktop", "Label/Small", { color: tMuted, w: 620 });
  await T(head, "Mobile", "Label/Small", { color: tMuted, w: 360 });
  const list = F(c, "Styles", { dir: "VERTICAL", gap: 0, w: CONTENT });
  for (const st of sorted) {
    const row = F(list, st.name, { dir: "HORIZONTAL", gap: 24, py: 24, w: CONTENT });
    row.strokes = [paint(softLine)]; row.strokeAlign = "INSIDE";
    for (const k of ["strokeTopWeight", "strokeLeftWeight", "strokeRightWeight"]) row.setBoundVariable(k, bv("Border width/0"));
    row.setBoundVariable("strokeBottomWeight", hair);
    const spec = F(row, "Spec", { dir: "VERTICAL", gap: 4, w: 240 });
    await T(spec, st.name, "Label/Default", { color: tHead, w: 240 });
    const fv = resVar(st.name, "Font size"), lv = resVar(st.name, "Line height"), pv = resVar(st.name, "Paragraph spacing");
    const fmt = (id) => (num(fv, id) === null ? "n/a" : num(fv, id) + " / " + num(lv, id) + " · ¶ " + num(pv, id));
    await T(spec, st.fontName.family + " " + st.fontName.style, "Caption/Default", { color: tMuted, w: 240 });
    await T(spec, "Desktop " + fmt(dId), "Caption/Default", { color: tMuted, w: 240 });
    await T(spec, "Mobile " + fmt(mId), "Caption/Default", { color: tMuted, w: 240 });
    const sample = st.name.startsWith("Display") ? "Design Tokens" : st.name.startsWith("Heading") ? "Headline for a page" : st.name.startsWith("Overline") ? "Section label" : st.name.startsWith("Label") ? "Button label" : "The quick brown fox jumps over the lazy dog";
    for (const [label, id, w] of [["Desktop", dId, 620], ["Mobile", mId, 360]]) {
      const col = F(row, label, { dir: "VERTICAL", w });
      if (id) col.setExplicitVariableModeForCollection(responsive, id);
      const t = figma.createText();
      await loadFont(st.fontName);
      await t.setTextStyleIdAsync(st.id);
      t.characters = sample;
      t.fills = [paint(tHead)];
      col.appendChild(t);
      t.textAutoResize = "HEIGHT"; t.layoutSizingHorizontal = "FILL";
    }
  }
  built.typography = sorted.length;
};

// ===================== fonts =====================
SECTION_FN.fonts = async () => {
  const c = await section("fonts", "Font families and weights", "The two font roles and the weights both share. Text styles bind to these variables.");
  const fam = brand ? varsOf(brand).filter((v) => low(v.name).startsWith("font family/")) : [];
  const wts = brand ? varsOf(brand).filter((v) => low(v.name).startsWith("font weight/")) : [];
  if (!fam.length) { await sectionNote(c, "No Font family variables in Brand. Run Typography first."); built.fonts = 0; return; }
  const val = (v) => { const x = v.valuesByMode[brand.defaultModeId]; return typeof x === "string" ? x : null; };
  let n = 0;
  for (const fv of fam) {
    const family = val(fv);
    const role = fv.name.slice(fv.name.indexOf("/") + 1);
    const card = F(c, role, { dir: "VERTICAL", gap: 20, pad: 32, w: CONTENT, fill: mv("Surface/default"), radius: rad3, stroke: { color: mv("Border/secondary"), weight: hair } });
    const head = F(card, "Label", { dir: "HORIZONTAL", gap: 12, align: "CENTER" });
    await T(head, role, "Heading/H5", { color: tHead });
    await T(head, "Brand/Font family/" + role + " · " + (family || "n/a"), "Caption/Default", { color: tMuted });
    const line = F(card, "Weights", { dir: "HORIZONTAL", gap: 40, wrap: true, gapY: 20, w: CONTENT - 64 });
    for (const wv of wts) {
      const style = val(wv);
      if (!family || !style) continue;
      const cell = F(line, wv.name, { dir: "VERTICAL", gap: 4, w: 260 });
      const t = figma.createText();
      try {
        await loadFont({ family, style });
        t.fontName = { family, style };
        t.fontSize = 56;
        t.characters = "Aa";
        t.fills = [paint(tHead)];
        cell.appendChild(t);
        await T(cell, style + " · Brand/Font weight/" + wv.name.slice(wv.name.indexOf("/") + 1), "Caption/Default", { color: tMuted, w: 260 });
        n++;
      } catch (e) {
        t.remove();
        await T(cell, style + " is not available for " + family, "Caption/Default", { color: tMuted, w: 260 });
      }
    }
  }
  built.fonts = n;
};

// ===================== spacing =====================
SECTION_FN.spacing = async () => {
  const c = await section("spacing", "Spacing", "Spacing scale in 4px units: token × 4 = px. Bar heights are bound to the variables.");
  const vars = brand ? varsOf(brand).filter((v) => low(v.name).startsWith("spacing/") && v.resolvedType === "FLOAT") : [];
  if (!vars.length) { await sectionNote(c, "No Spacing variables in Brand. Run Spacing first."); built.spacing = 0; return; }
  const px = (v) => v.valuesByMode[brand.defaultModeId];
  const MAXH = Math.max(...vars.map(px));
  const row = F(c, "Spacing", { dir: "HORIZONTAL", gap: 8 });
  for (const v of vars) {
    const leaf = v.name.slice(v.name.indexOf("/") + 1);
    const cell = F(row, v.name, { dir: "VERTICAL", gap: 12, w: 72 });
    // The bar area is as tall as the largest step and anchors every bar to the same baseline.
    const well = F(cell, "Bar area", { dir: "VERTICAL", justify: "MAX", align: "CENTER", w: 72 });
    well.primaryAxisSizingMode = "FIXED"; well.resize(72, MAXH);
    const bar = R(well, "Bar", 40, Math.max(px(v), 1), { fill: mv("Surface/action"), radius: rad1 });
    if (px(v) > 0) bar.setBoundVariable("height", v); else bar.visible = false;
    await T(cell, leaf, "Label/Default", { color: tHead, w: 72, align: "CENTER" });
    await T(cell, px(v) + " px", "Caption/Default", { color: tMuted, w: 72, align: "CENTER" });
  }
  built.spacing = vars.length;
};

// ===================== radius =====================
SECTION_FN.radius = async () => {
  const c = await section("radius", "Border radius", "Corner radius scale in 4px units; full is a pill or circle. Corners are bound to the variables.");
  const vars = brand ? varsOf(brand).filter((v) => low(v.name).startsWith("radius/") && v.resolvedType === "FLOAT") : [];
  if (!vars.length) { await sectionNote(c, "No Radius variables in Brand. Run Radius first."); built.radius = 0; return; }
  const wrap = F(c, "Radius", { dir: "HORIZONTAL", gap: 32, gapY: 32, wrap: true, w: CONTENT });
  for (const v of vars) {
    const px = v.valuesByMode[brand.defaultModeId];
    const cell = F(wrap, v.name, { dir: "VERTICAL", gap: 12, w: 140 });
    const r = R(cell, "Shape", 140, 140, { fill: mv("Surface/secondary"), stroke: { color: mv("Border/default"), weight: thin } });
    for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) r.setBoundVariable(k, v);
    await T(cell, v.name, "Label/Default", { color: tHead, w: 140 });
    await T(cell, px >= 9999 ? "full" : px + " px", "Caption/Default", { color: tMuted, w: 140 });
  }
  built.radius = vars.length;
};

// ===================== border =====================
SECTION_FN.border = async () => {
  const c = await section("border", "Border width", "Stroke weights in 4px units. Strokes are bound to the variables.");
  const vars = brand ? varsOf(brand).filter((v) => low(v.name).startsWith("border width/") && v.resolvedType === "FLOAT") : [];
  if (!vars.length) { await sectionNote(c, "No Border width variables in Brand. Run Border width first."); built.border = 0; return; }
  const wrap = F(c, "Border width", { dir: "HORIZONTAL", gap: 32, gapY: 32, wrap: true, w: CONTENT });
  for (const v of vars) {
    const px = v.valuesByMode[brand.defaultModeId];
    const cell = F(wrap, v.name, { dir: "VERTICAL", gap: 12, w: 200 });
    const r = R(cell, "Shape", 200, 96, { radius: rad2 });
    r.strokes = [paint(tHead)]; r.strokeAlign = "INSIDE";
    for (const k of ["strokeTopWeight", "strokeBottomWeight", "strokeLeftWeight", "strokeRightWeight"]) r.setBoundVariable(k, v);
    await T(cell, v.name, "Label/Default", { color: tHead, w: 200 });
    await T(cell, px + " px", "Caption/Default", { color: tMuted, w: 200 });
  }
  built.border = vars.length;
};

// ---------- run ----------
for (const id of todo) {
  const row = { id, action: "built" };
  out.sections.push(row);
  try {
    await SECTION_FN[id]();
    row.items = built[id];
  } catch (e) {
    row.action = "failed";
    row.error = msg(e);
    out.status = "partial";
  }
}
out.frames = restack();
out.sections.forEach((r) => { const f = mine().find((n) => n.getPluginData(TAG) === "section:" + r.id); if (f) { r.frame = f.id; r.height = Math.round(f.height); } });
return out;
