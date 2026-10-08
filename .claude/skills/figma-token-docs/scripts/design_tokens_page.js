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
const SECTIONS = ["all"]; // "all", or any of: header, contents, guide, names, health, brand, alias, mapped, contrast, typography, fonts, spacing, radius, border, motion
const DRY_RUN = false;    // true = report what would be built, write nothing
const EXPECT_FILE = "";   // optional file name guard, e.g. "Design System MB"
const REFRESH_CONTENTS = true; // false = leave the Contents frame alone in this run (set true on the last call of a rebuild)
// ---- END CONFIG ----

const TAG = "figma-token-docs";
const ORDER = ["header", "contents", "guide", "names", "health", "brand", "alias", "mapped", "contrast", "typography", "fonts", "spacing", "radius", "border", "motion"];
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
// "Contents" and "How to use" are the exception: they stack in a column directly under the header
// frame, in the empty space below it, so they are the first things people see.
const COLUMN = ["contents", "guide"];
function restack() {
  const all = mine().sort((a, b) => ORDER.indexOf(a.getPluginData(TAG).slice(8)) - ORDER.indexOf(b.getPluginData(TAG).slice(8)));
  const idOf = (f) => f.getPluginData(TAG).slice(8);
  const col = all.filter((f) => COLUMN.includes(idOf(f)));
  const row = all.filter((f) => !COLUMN.includes(idOf(f)));
  let x = 0;
  for (const f of row) { f.primaryAxisSizingMode = "AUTO"; f.x = x; f.y = 0; x += f.width + GAP; }
  const head = row[0];
  let y = head ? head.y + head.height + GAP : 0;
  for (const f of col) { f.primaryAxisSizingMode = "AUTO"; f.x = head ? head.x : 0; f.y = y; y += f.height + GAP; }
  return all.length;
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

// Every text and border pair that is meant to be used together, with its ratio in Light and Dark.
// Shared by the Contrast checks frame and the Token health frame.
function contrastData() {
  const rows = [], skipped = new Set();
  const pass = (r, k) => (r[k] === undefined || r[k] === null ? null : r[k] >= r.min);
  if (!mapped) return { rows, skipped, pass };
  const lightId = modeId(mapped, "Light"), darkId = modeId(mapped, "Dark");
  const ROLES = ["error", "success", "warning", "information"];
  const content = ["heading", "subheading", "body", "body-secondary", "caption", "label", "helper", "action", "action-hover", "action-pressed", ...ROLES];
  const pairs = [];
  for (const bg of ["default", "page"]) for (const t of content) pairs.push(["Text/" + t, "Surface/" + bg, 4.5]);
  const onMap = { "on-action": ["action", "action-hover", "action-pressed"], "on-action-secondary": ["action-secondary", "action-secondary-hover"], "on-selected": ["selected"], "on-inverse": ["inverse"], "on-inverse-secondary": ["inverse"] };
  for (const r of ROLES) { onMap["on-" + r] = [r]; onMap["on-" + r + "-secondary"] = [r + "-secondary"]; }
  for (const fg of Object.keys(onMap)) for (const bg of onMap[fg]) pairs.push(["Text/" + fg, "Surface/" + bg, 4.5]);
  for (const b of ["default", "action", "action-hover", "action-pressed", "focus", "selected", ...ROLES]) pairs.push(["Border/" + b, "Surface/default", 3]);
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
  return { rows, skipped, pass };
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

// ===================== contents =====================
const TOC = {
  guide: ["How to use these skills", "How to run a skill, the build order, and the lines to type for each one."],
  names: ["How names work", "The three tiers, the naming rules and a short Do and Don't."],
  health: ["Token health", "What needs attention in this file, with the fix to run."],
  brand: ["Brand colors", "Raw color scales, 950 to 50, with the hex of every step."],
  alias: ["Alias roles", "Roles that point at Brand colors, and which color feeds each."],
  mapped: ["Mapped usage", "What each color is for, in Light and Dark side by side."],
  contrast: ["Contrast checks", "Every text and border pair against WCAG AA, with what fails listed first."],
  typography: ["Typography", "Every text style in Desktop and Mobile, with the exact sizes."],
  fonts: ["Font families and weights", "The heading and body fonts in every weight."],
  spacing: ["Spacing", "The spacing scale as bars that match the real values."],
  radius: ["Border radius", "Corner radius scale, from square to pill."],
  border: ["Border width", "Stroke weights from none to heavy."],
  motion: ["Motion", "Duration and easing variables, drawn as bars and curves."]
};
SECTION_FN.contents = async () => {
  const c = await section("contents", "Contents", "Click a title to jump to that frame. Each frame has a link back here. In Present mode, click a card.");
  const frames = {};
  for (const f of mine()) frames[f.getPluginData(TAG).slice(8)] = f;
  const count = (prefix) => (brand ? varsOf(brand).filter((v) => low(v.name).startsWith(prefix)).length : 0);
  const stat = (id) => {
    if (id === "guide") return GUIDE.length + " skills";
    if (id === "names") return NAME_RULES.length + " rules";
    if (id === "health") return (frames.health && frames.health.getPluginData("stat")) || "Checks run on every build";
    if (id === "brand") return (brand ? groupsOf(brand, (v) => v.resolvedType === "COLOR").size : 0) + " color scales";
    if (id === "alias") return (alias ? groupsOf(alias, (v) => v.resolvedType === "COLOR").size : 0) + " roles";
    if (id === "mapped") return (mapped ? varsOf(mapped).length : 0) + " tokens · " + (mapped ? mapped.modes.map((m) => m.name).join(" and ") : "");
    if (id === "contrast") {
      const { rows, pass } = contrastData();
      const t = (k) => rows.filter((r) => pass(r, k) !== null);
      return "Light " + t("light").filter((r) => pass(r, "light")).length + " of " + t("light").length + " · Dark " + t("dark").filter((r) => pass(r, "dark")).length + " of " + t("dark").length + " pass";
    }
    if (id === "typography") return textStyles.length + " text styles";
    if (id === "fonts") return count("font family/") + " families · " + count("font weight/") + " weights";
    if (id === "spacing") return count("spacing/") + " steps";
    if (id === "radius") return count("radius/") + " steps";
    if (id === "border") return count("border width/") + " steps";
    if (id === "motion") {
      const m = brand ? varsOf(brand).filter((v) => low(v.name).startsWith("motion/")) : [];
      const d = m.filter((v) => v.resolvedType === "TIMING" && typeof v.valuesByMode[brand.defaultModeId] === "number" && v.valuesByMode[brand.defaultModeId] > 0).length;
      return d + " durations · " + m.filter((v) => v.resolvedType === "EASING").length + " easings";
    }
    return "";
  };
  const grid = F(c, "Cards", { dir: "HORIZONTAL", gap: 24, gapY: 24, wrap: true, w: CONTENT });
  let n = 0;
  for (const id of ORDER) {
    if (!TOC[id] || !frames[id]) continue;
    n++;
    const [title, what] = TOC[id];
    const card = F(grid, title, { dir: "VERTICAL", gap: 10, pad: 24, w: 408, fill: mv("Surface/default"), radius: rad3, stroke: { color: lineColor, weight: hair } });
    const top = F(card, "Top", { dir: "HORIZONTAL", gap: 12, align: "CENTER" });
    const num = F(top, "Number", { dir: "HORIZONTAL", px: 10, py: 4, fill: mv("Surface/action-secondary"), radius: rad1 });
    await T(num, String(n).padStart(2, "0"), "Label/Small", { color: mv("Text/on-action-secondary") });
    const t = await T(top, title, "Heading/H5", { color: mv("Text/action") });
    try { t.setRangeHyperlink(0, t.characters.length, { type: "NODE", value: frames[id].id }); } catch (e) { out.notes.push("Could not link " + title + ": " + msg(e)); }
    await T(card, what, "Body/Small", { color: tBody, w: 360 });
    await T(card, stat(id), "Label/Small", { color: tMuted, w: 360 });
    // An explicit link to click. Figma stores a link to a frame in the same file as a node link.
    const go = await T(card, "Go to section →", "Label/Small", { color: mv("Text/action") });
    go.name = "Go to section";
    try { go.setRangeHyperlink(0, go.characters.length, { type: "NODE", value: frames[id].id }); } catch (e) { /* ignore */ }
    // Present mode: clicking the card navigates to the frame.
    try { await card.setReactionsAsync([{ trigger: { type: "ON_CLICK" }, actions: [{ type: "NODE", destinationId: frames[id].id, navigation: "NAVIGATE", transition: null, resetVideoPosition: false }] }]); } catch (e) { /* prototype links are a nicety */ }
  }
  // Equal card heights, so the grid reads as a grid.
  const hmax = Math.max(...grid.children.map((k) => k.height));
  for (const k of grid.children) { k.primaryAxisSizingMode = "FIXED"; k.resize(408, hmax); }
  // A link back to the contents on every other frame, so a long page never gets people lost.
  const me = frames.contents;
  for (const id of Object.keys(frames)) {
    if (id === "contents" || id === "header") continue;
    const f = frames[id];
    let back = f.findOne((x) => x.type === "TEXT" && x.name === "Back to contents");
    if (!back) {
      back = await T(f.children[0], "↑ Contents", "Label/Default", { color: mv("Text/action") });
      back.name = "Back to contents";
    }
    try { back.setRangeHyperlink(0, back.characters.length, { type: "NODE", value: me.id }); } catch (e) { /* ignore */ }
  }
  built.contents = n;
};

// ===================== guide =====================
const GUIDE = [
  { name: "figma-color-scale", does: "Turns one base color into an 11-step scale (950 to 50) in Brand.", rows: [
    ["Purple:#5C3FC4", "Scale Purple/950 to 50. Your hex is the 500 Default"],
    ["-default", "Red, Blue, Orange, Green, Gray and Foundation"],
    ["Foundation", "Only Foundation/White and Foundation/Black"] ] },
  { name: "figma-alias-bridge", does: "Links a Brand color group to an Alias role, step for step, as references.", rows: [
    ["Brand/Purple -> Alias/Primary", "Every Purple step becomes a reference in Primary"],
    ["-default", "Neutral, Error, Success, Warning, Information and Foundation. Neutral is always Gray"] ] },
  { name: "figma-mapped-roles", does: "Builds the usage tier: Surface, Border, Text and Icon, in Light and Dark.", rows: [
    ["Mapped", "The full preset in Light"],
    ["Mapped dark", "Adds the Dark mode and fills it"],
    ["Mapped/Text", "One group only"],
    ["Alias/Neutral/900 -> Mapped/Text/heading", "Point one variable at one alias"] ] },
  { name: "figma-type-scale", does: "Builds fonts, the Responsive type scale (Desktop and Mobile) and text styles.", rows: [
    ["Typography", "Everything, with Inter for headings and Roboto for body"],
    ["Typography heading Playfair body Lato", "Your own fonts"],
    ["Typography base 18 ratio 1.333", "Scale settings"],
    ["reset Responsive", "Recalculate the size variables"] ] },
  { name: "figma-spacing", does: "Writes the spacing scale in 4px units to Brand.", rows: [
    ["Spacing", "The whole scale"], ["Spacing/4", "One step. Token x 4 = px, so Spacing/4 is 16px"] ] },
  { name: "figma-radius", does: "Writes the border-radius scale to Brand, plus full for pills and circles.", rows: [
    ["Radius", "The whole scale"], ["Radius/2", "One step (8px)"] ] },
  { name: "figma-border-width", does: "Writes the border-weight scale to Brand.", rows: [
    ["Border width", "The whole scale"], ["Border width/0-5", "One step (2px)"] ] },
  { name: "figma-motion", does: "Writes durations and easing curves to Brand as native TIMING and EASING variables.", rows: [
    ["Motion", "Durations (ms) and easing curves"], ["Motion/Easing", "One group"] ] },
  { name: "figma-token-docs", does: "Builds or refreshes this page from the live variables and styles.", rows: [
    ["Design Tokens", "The whole page. Rerun it after a token changes"] ] },
  { name: "figma-export-tokens", does: "Writes the tokens as code for developers: CSS, JSON and a Tailwind v4 theme.", rows: [
    ["Export tokens", "tokens.css, tokens.tokens.json and tailwind.theme.css in ./tokens"],
    ["Export tokens css", "Only the CSS file"] ] }
];
const BUILD_ORDER = [
  ["1", "figma-color-scale", "Brand colors"],
  ["2", "figma-alias-bridge", "Roles"],
  ["3", "figma-mapped-roles", "Usage"],
  ["4", "spacing, radius, border width, motion, type scale", "Primitives"],
  ["5", "figma-token-docs", "This page"],
  ["6", "figma-export-tokens", "Code for developers"]
];
SECTION_FN.guide = async () => {
  const c = await section("guide", "How to use these skills", "Type a short line in Claude Code and the skill writes real variables and styles to this file. Everything on this page is generated from them.");
  const run = F(c, "Running a skill", { dir: "VERTICAL", gap: 12 });
  await T(run, "Running a skill", "Heading/H4", { color: tHead });
  await T(run, "Type the line, for example Spacing, or call the skill by name: /figma-spacing. Parameters go after the name, as in /figma-type-scale Typography base 18.", "Body/Default", { color: tBody, w: CONTENT });
  await T(run, "Add dry run to any line to preview without writing. Type -h (for example /figma-radius -h) to print a skill's usage.", "Body/Default", { color: tBody, w: CONTENT });
  const ord = F(c, "Build order", { dir: "VERTICAL", gap: 16 });
  await T(ord, "Build order", "Heading/H4", { color: tHead });
  await T(ord, "Each tier references the one before it, so run the skills in this order.", "Body/Default", { color: tMuted, w: CONTENT });
  const steps = F(ord, "Steps", { dir: "HORIZONTAL", gap: 12, wrap: true, w: CONTENT });
  for (const [n, who, what] of BUILD_ORDER) {
    const chip = F(steps, "Step " + n, { dir: "VERTICAL", gap: 4, pad: 16, w: 200, fill: mv("Surface/secondary"), radius: rad3 });
    await T(chip, n + " · " + what, "Label/Default", { color: tHead, w: 168 });
    await T(chip, who, "Caption/Default", { color: tMuted, w: 168 });
  }
  const sk = F(c, "Skills", { dir: "VERTICAL", gap: 16 });
  await T(sk, "The skills", "Heading/H4", { color: tHead });
  const grid = F(sk, "Cards", { dir: "HORIZONTAL", gap: 24, wrap: true, w: CONTENT });
  for (const g of GUIDE) {
    const card = F(grid, g.name, { dir: "VERTICAL", gap: 12, pad: 24, w: 628, fill: mv("Surface/default"), radius: rad3, stroke: { color: lineColor, weight: hair } });
    await T(card, g.name, "Heading/H5", { color: tHead });
    await T(card, g.does, "Body/Small", { color: tMuted, w: 580 });
    for (const [cmd, res] of g.rows) {
      const row = F(card, cmd, { dir: "HORIZONTAL", gap: 16, w: 580 });
      await T(row, cmd, "Label/Default", { color: mv("Text/action"), w: 270 });
      await T(row, res, "Body/Small", { color: tBody, w: 294 });
    }
  }
  built.guide = GUIDE.length;
};

// ===================== names =====================
const TIERS = [
  ["Brand", "Raw colors, spacing and fonts. Nothing points anywhere else.", "Plum/500"],
  ["Alias", "Roles that point at Brand colors, so a role survives a change of color.", "Primary/500"],
  ["Mapped", "What a color is for. This is the tier you apply to layers.", "Surface/action"]
];
const NAME_RULES = [
  ["default, secondary, tertiary", "Step down in prominence: Surface/default, Surface/secondary, Border/tertiary."],
  ["action", "The solid version: Surface/action is a filled button. Status names (error, success, warning, information) work the same way."],
  ["-secondary", "The tinted version: Surface/action-secondary is a secondary button, Surface/error-secondary an error banner."],
  ["on-[surface]", "What sits on that surface: Text/on-action is the label on Surface/action."],
  ["A bare role name", "Colored with that role: Text/action is a link, Text/error an error message. Icon mirrors Text."],
  ["950 to 50", "Scales run dark to light, 500 Default is the base color. Spacing, radius and border tokens count 4px units: Spacing/4 is 16px."]
];
const DOS = [
  "Apply Mapped tokens to layers: Surface for fills, Text for type, Border for strokes, Icon for icons.",
  "Choose by purpose: an error banner uses Surface/error-secondary, not a red you like.",
  "Change a color once, in Brand or at the role in Alias, and everything follows.",
  "Use the text styles. For mobile, switch the frame to the Mobile mode."
];
const DONTS = [
  "Don't apply Brand or Alias variables to layers. They skip the usage tier and Dark mode will not follow.",
  "Don't type a hex or pick a color by hand.",
  "Don't make separate mobile text styles. One style per role, the mode sets the size.",
  "Don't name a role after a color. It is Primary, not Purple."
];
SECTION_FN.names = async () => {
  const c = await section("names", "How names work", "The naming rules behind the variables, and what to do and not to do. Read this once and the rest of the page makes sense.");
  const tiers = F(c, "Tiers", { dir: "HORIZONTAL", gap: 16, align: "CENTER", w: CONTENT });
  for (let i = 0; i < TIERS.length; i++) {
    const [name, what, ex] = TIERS[i];
    const box = F(tiers, name, { dir: "VERTICAL", gap: 6, pad: 20, w: 400, fill: mv("Surface/secondary"), radius: rad3 });
    await T(box, name, "Heading/H5", { color: tHead });
    await T(box, what, "Body/Small", { color: tBody, w: 360 });
    await T(box, "e.g. " + ex, "Caption/Default", { color: tMuted, w: 360 });
    if (i < TIERS.length - 1) await T(tiers, "→", "Heading/H4", { color: tMuted });
  }
  const cols = F(c, "Rules and guidance", { dir: "HORIZONTAL", gap: 24, w: CONTENT });
  const rules = F(cols, "Naming rules", { dir: "VERTICAL", gap: 16, pad: 24, w: 628, fill: mv("Surface/default"), radius: rad3, stroke: { color: lineColor, weight: hair } });
  await T(rules, "Naming rules", "Heading/H5", { color: tHead });
  for (const [k, v] of NAME_RULES) {
    const row = F(rules, k, { dir: "VERTICAL", gap: 2 });
    await T(row, k, "Label/Default", { color: mv("Text/action"), w: 580 });
    await T(row, v, "Body/Small", { color: tBody, w: 580 });
  }
  const side = F(cols, "Do and Don't", { dir: "VERTICAL", gap: 24, w: 628 });
  for (const [title, items, surface, mark] of [["Do", DOS, "Surface/success-secondary", "✓"], ["Don't", DONTS, "Surface/error-secondary", "✕"]]) {
    const box = F(side, title, { dir: "VERTICAL", gap: 12, pad: 24, w: 628, fill: mv(surface), radius: rad3 });
    await T(box, title, "Heading/H5", { color: tHead });
    for (const t of items) await T(box, mark + "  " + t, "Body/Small", { color: tBody, w: 580 });
  }
  built.names = NAME_RULES.length;
};

// ===================== health =====================
SECTION_FN.health = async () => {
  const c = await section("health", "Token health", "Checks run on the live variables every time this page is built. Issues need a fix, notes are worth a look.");
  const checks = []; // { status: "issue" | "note" | "ok", title, detail, fix }
  const add = (status, title, detail, fix) => checks.push({ status, title, detail: detail || "", fix: fix || "" });
  const list = (a, n = 6) => a.slice(0, n).join("; ") + (a.length > n ? "; and " + (a.length - n) + " more" : "");
  const darkId = mapped ? modeId(mapped, "Dark") : null;
  const groupOf = (v) => v.name.slice(0, v.name.indexOf("/"));

  // 1. Contrast
  const { rows, skipped, pass } = contrastData();
  const fails = [];
  for (const r of rows) for (const k of ["light", "dark"]) if (pass(r, k) === false) fails.push((k === "light" ? "Light" : "Dark") + " " + r.fg.replace("Text/", "").replace("Border/", "border ") + " on " + r.bg.replace("Surface/", "") + " " + r[k].toFixed(2) + ":1 (needs " + r.min + ")");
  if (!rows.length) add("issue", "Contrast could not be checked", "The Mapped collection has no pairs to check.", "Run /figma-mapped-roles Mapped.");
  else if (fails.length) add("issue", fails.length + " contrast pair" + (fails.length === 1 ? "" : "s") + " do not pass WCAG AA", list(fails), "Retarget one variable with an arrow line, for example Alias/Success/700 -> Mapped/Text/success. The Contrast frame lists every pair.");
  else add("ok", "Every checked contrast pair passes in Light and Dark");

  // 2. Missing Mapped variables
  if (skipped.size) add("issue", "Mapped variables are missing", Array.from(skipped).join(", "), "Run /figma-alias-bridge -default, then /figma-mapped-roles Mapped.");
  else add("ok", "No Mapped variables are missing");

  // 3. Alias roles
  const aliasGroups = alias ? Array.from(groupsOf(alias, (v) => v.resolvedType === "COLOR").keys()) : [];
  const expected = ["Primary", "Neutral", "Error", "Success", "Warning", "Information", "Foundation"];
  const lacking = expected.filter((g) => !aliasGroups.map(low).includes(low(g)));
  if (lacking.length) add("issue", "Alias roles are missing: " + lacking.join(", "), "", lacking.includes("Primary") ? "Primary needs your color: Brand/<color> -> Alias/Primary. For the rest run /figma-alias-bridge -default." : "Run /figma-alias-bridge -default.");
  else add("ok", "All core Alias roles exist");

  // 4. Neutral is Gray, and has visible steps
  const neutral = alias ? vget(alias, "Neutral/500 Default") || vget(alias, "Neutral/500") : null;
  if (neutral) {
    const val = neutral.valuesByMode[alias.defaultModeId];
    const src = val && val.type === "VARIABLE_ALIAS" ? varById.get(val.id) : null;
    const from = src ? groupOf(src) : null;
    if (from && low(from) !== "gray") add("issue", "Alias/Neutral points to Brand/" + from + ", not Gray", "", "Brand/Gray -> Alias/Neutral");
    else add("ok", "Alias/Neutral uses Brand/Gray");
    const n950 = vget(alias, "Neutral/950"), n700 = vget(alias, "Neutral/700");
    const c950 = n950 && colorOf(n950), c700 = n700 && colorOf(n700);
    if (c950 && c700 && ratioOf(c950, c700) < 1.5) add("issue", "Neutral 950 to 700 are almost the same color", "Dark surfaces will blend into one black.", "Use a neutral scale with visible steps (Brand/Gray).");
    else add("ok", "Neutral has visible steps between 950 and 700");
  }

  // 5. Dark surface layers
  if (darkId) {
    const layers = ["page", "default", "secondary", "tertiary"].map((n) => mv("Surface/" + n));
    if (layers.every(Boolean)) {
      const cs = layers.map((v) => colorOf(v, darkId));
      const names = ["page", "default", "secondary", "tertiary"];
      const alike = [];
      for (let i = 0; i < cs.length - 1; i++) if (cs[i] && cs[i + 1] && ratioOf(cs[i], cs[i + 1]) < 1.08) alike.push(names[i] + " and " + names[i + 1]);
      if (alike.length) add("issue", "Dark surfaces look alike: " + alike.join(", "), "", "Run reset on Mapped/Surface so the preset's dark steps apply, or choose steps with an arrow line.");
      else add("ok", "Dark surface layers are distinguishable");
    }
  }

  // 6. Fonts
  let fonts = null;
  try { fonts = new Map(); for (const f of await figma.listAvailableFontsAsync()) { const k = low(f.fontName.family); if (!fonts.has(k)) fonts.set(k, new Set()); fonts.get(k).add(f.fontName.style); } } catch (e) { fonts = null; }
  const fam = brand ? varsOf(brand).filter((v) => low(v.name).startsWith("font family/")) : [];
  const wts = brand ? varsOf(brand).filter((v) => low(v.name).startsWith("font weight/")) : [];
  const sv = (v) => (typeof v.valuesByMode[brand.defaultModeId] === "string" ? v.valuesByMode[brand.defaultModeId] : null);
  if (!fam.length) add("note", "No font family variables yet", "", "Run /figma-type-scale Typography.");
  else if (fonts) {
    const gaps = [], missingFamily = [];
    for (const fv of fam) {
      const family = sv(fv); if (!family) continue;
      const styles = fonts.get(low(family));
      if (!styles) { missingFamily.push(family); continue; }
      for (const wv of wts) { const st = sv(wv); if (st && !styles.has(st)) gaps.push(family + " has no " + st + " style"); }
    }
    if (missingFamily.length) add("issue", "Font not available in this Figma account: " + missingFamily.join(", "), "Text styles that use it cannot be built.", "Choose another font: /figma-type-scale Typography heading <font> body <font>.");
    if (gaps.length) add("note", gaps.join(", "), "Styles that use that weight fall back to another weight.", "Pick another font, or accept the fallback.");
    if (!missingFamily.length && !gaps.length) add("ok", "Both fonts have every weight in the scale");
  }

  // 7. Brand colors nothing uses, and duplicates
  if (brand) {
    const brandGroups = groupsOf(brand, (v) => v.resolvedType === "COLOR");
    const used = new Set();
    if (alias) for (const v of varsOf(alias)) { const val = v.valuesByMode[alias.defaultModeId]; const t = val && val.type === "VARIABLE_ALIAS" ? varById.get(val.id) : null; if (t && t.variableCollectionId === brand.id) used.add(low(groupOf(t))); }
    const unused = Array.from(brandGroups.keys()).filter((g) => !used.has(low(g)));
    if (unused.length) add("note", "Brand colors no Alias role uses: " + unused.join(", "), "", "Keep them as spares, or bridge one: Brand/<name> -> Alias/<Role>.");
    else add("ok", "Every Brand color feeds an Alias role");
    const bases = new Map();
    for (const [g, vs] of brandGroups) { const b = vs.find((v) => /500/.test(v.name)); const col = b && colorOf(b); if (col) { const h = hexOf(col); if (!bases.has(h)) bases.set(h, []); bases.get(h).push(g); } }
    const dups = Array.from(bases.values()).filter((a) => a.length > 1).map((a) => a.join(" and "));
    if (dups.length) add("note", "Same base color under two names: " + dups.join("; "), "", "Delete the extra group in Brand, or keep both if that is intended.");
    else add("ok", "No duplicate Brand colors");
  }

  // 8. Other tokens present
  const missingPrims = [];
  if (!(brand && varsOf(brand).some((v) => low(v.name).startsWith("spacing/")))) missingPrims.push("Spacing (/figma-spacing)");
  if (!(brand && varsOf(brand).some((v) => low(v.name).startsWith("radius/")))) missingPrims.push("Radius (/figma-radius)");
  if (!(brand && varsOf(brand).some((v) => low(v.name).startsWith("border width/")))) missingPrims.push("Border width (/figma-border-width)");
  if (!(brand && varsOf(brand).some((v) => low(v.name).startsWith("motion/")))) missingPrims.push("Motion (/figma-motion)");
  if (!(responsive && responsive.modes.length >= 2)) missingPrims.push("Responsive with Desktop and Mobile (/figma-type-scale Typography)");
  if (missingPrims.length) add("note", "Not built yet: " + missingPrims.join(", "), "", "");
  else add("ok", "Spacing, radius, border width and the Responsive modes all exist");

  // ---- render ----
  const issues = checks.filter((k) => k.status === "issue"), notes = checks.filter((k) => k.status === "note"), oks = checks.filter((k) => k.status === "ok");
  await T(c, issues.length + " issue" + (issues.length === 1 ? "" : "s") + ", " + notes.length + " note" + (notes.length === 1 ? "" : "s") + ", " + oks.length + " check" + (oks.length === 1 ? "" : "s") + " passing.", "Body/Large", { color: tHead, w: CONTENT });
  const card = async (parent, k) => {
    const isIssue = k.status === "issue";
    const box = F(parent, k.title, { dir: "VERTICAL", gap: 8, pad: 24, w: CONTENT, fill: mv(isIssue ? "Surface/error-secondary" : "Surface/warning-secondary"), radius: rad3 });
    const head = F(box, "Title", { dir: "HORIZONTAL", gap: 12, align: "CENTER" });
    const chip = F(head, "Status", { dir: "HORIZONTAL", px: 10, py: 4, fill: mv(isIssue ? "Surface/error" : "Surface/warning"), radius: rad1 });
    await T(chip, isIssue ? "Issue" : "Note", "Label/Small", { color: mv(isIssue ? "Text/on-error" : "Text/on-warning") });
    await T(head, k.title, "Heading/H5", { color: tHead });
    if (k.detail) await T(box, k.detail, "Body/Small", { color: tBody, w: CONTENT - 48 });
    if (k.fix) await T(box, "Fix: " + k.fix, "Body/Small", { color: mv("Text/action"), w: CONTENT - 48 });
  };
  const todoList = F(c, "Needs attention", { dir: "VERTICAL", gap: 16, w: CONTENT });
  for (const k of issues) await card(todoList, k);
  for (const k of notes) await card(todoList, k);
  const good = F(c, "Passing", { dir: "VERTICAL", gap: 12, pad: 24, w: CONTENT, fill: mv("Surface/success-secondary"), radius: rad3 });
  await T(good, "Passing (" + oks.length + ")", "Heading/H5", { color: tHead });
  for (const k of oks) await T(good, "✓ " + k.title, "Body/Small", { color: tBody, w: CONTENT - 48 });
  c.parent.setPluginData("stat", issues.length + " issue" + (issues.length === 1 ? "" : "s") + " · " + notes.length + " note" + (notes.length === 1 ? "" : "s"));
  built.health = issues.length + notes.length;
  built.healthSummary = issues.length + " issues, " + notes.length + " notes";
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
  const { rows, skipped, pass } = contrastData();
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

// ===================== motion =====================
SECTION_FN.motion = async () => {
  const c = await section("motion", "Motion", "Duration (TIMING) and easing (EASING) variables, Figma's native motion types. A bar is 1px per 4 milliseconds.");
  const vars = brand ? varsOf(brand).filter((v) => low(v.name).startsWith("motion/")) : [];
  if (!vars.length) { await sectionNote(c, "No Motion variables in Brand. Run /figma-motion."); built.motion = 0; return; }
  const val = (v) => v.valuesByMode[brand.defaultModeId];
  const ms = (v) => Math.round(val(v) * 1000); // a TIMING variable is stored in seconds
  // Descriptions read "NAME = VALUE. USE. [figma-motion]". Split on dot-space so a dot inside a number (0.2) is safe.
  const useOf = (v) => ((v.description || "").split(". ")[1] || "").replace(/\.$/, "");
  const bez = (v) => { const e = val(v) && val(v).easingFunctionCubicBezier; return e ? [e.x1, e.y1, e.x2, e.y2].map((n) => Math.round(n * 1000) / 1000) : null; };
  const dur = vars.filter((v) => v.resolvedType === "TIMING" && typeof val(v) === "number" && val(v) > 0).sort((a, b) => val(a) - val(b));
  const eas = vars.filter((v) => v.resolvedType === "EASING" && bez(v));
  if (!dur.length && !eas.length) { await sectionNote(c, "The Motion variables are not the TIMING and EASING types. Run /figma-motion to convert them."); built.motion = 0; return; }
  if (dur.length) {
    const block = F(c, "Durations", { dir: "VERTICAL", gap: 16 });
    await T(block, "Duration", "Heading/H4", { color: tHead });
    const list = F(block, "List", { dir: "VERTICAL", gap: 14 });
    for (const v of dur) {
      const row = F(list, v.name, { dir: "HORIZONTAL", gap: 24, align: "CENTER" });
      await T(row, v.name.split("/").pop(), "Label/Default", { color: tHead, w: 100 });
      await T(row, ms(v) + " ms", "Caption/Default", { color: tMuted, w: 70 });
      R(row, "Bar", Math.max(ms(v) / 4, 1), 16, { fill: mv("Surface/action"), radius: rad1 });
      await T(row, useOf(v), "Body/Small", { color: tBody, w: 420 });
    }
  }
  if (eas.length) {
    const block = F(c, "Easing", { dir: "VERTICAL", gap: 16 });
    await T(block, "Easing", "Heading/H4", { color: tHead });
    const wrap = F(block, "Curves", { dir: "HORIZONTAL", gap: 32, gapY: 32, wrap: true, w: CONTENT });
    const S = 160;
    for (const v of eas) {
      const [x1, y1, x2, y2] = bez(v);
      const cell = F(wrap, v.name, { dir: "VERTICAL", gap: 10, w: 260 });
      const g = figma.createFrame();
      g.name = "Curve"; g.resize(S, S); g.clipsContent = false; g.layoutMode = "NONE";
      g.fills = [paint(mv("Surface/default"))];
      for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) g.setBoundVariable(k, rad2);
      strokeOf(g, lineColor, hair);
      cell.appendChild(g);
      const d = "M 0 " + S + " C " + (x1 * S) + " " + (S - y1 * S) + " " + (x2 * S) + " " + (S - y2 * S) + " " + S + " 0";
      const vec = figma.createVector();
      vec.vectorPaths = [{ windingRule: "NONE", data: d }];
      vec.fills = [];
      vec.strokes = [paint(mv("Text/action"))];
      vec.strokeWeight = 3;
      g.appendChild(vec);
      vec.x = 0; vec.y = 0;
      await T(cell, v.name.split("/").pop(), "Label/Default", { color: tHead, w: 260 });
      await T(cell, "cubic-bezier(" + [x1, y1, x2, y2].join(", ") + ")", "Caption/Default", { color: tMuted, w: 260 });
      await T(cell, useOf(v), "Body/Small", { color: tBody, w: 260 });
    }
  }
  built.motion = dur.length + eas.length;
};

// ---------- run ----------
// The Contents frame links to the other frames by id, so it is built last, and rebuilt after any run
// that replaced a frame (a replaced frame has a new id).
const runList = todo.filter((id) => id !== "contents");
const contentsExists = mine().some((f) => f.getPluginData(TAG) === "section:contents");
if (todo.includes("contents") || (REFRESH_CONTENTS && runList.length && contentsExists)) runList.push("contents");
for (const id of runList) {
  const row = { id, action: "built" };
  out.sections.push(row);
  try {
    await SECTION_FN[id]();
    row.items = built[id];
    if (id === "health") row.summary = built.healthSummary;
  } catch (e) {
    row.action = "failed";
    row.error = msg(e);
    out.status = "partial";
  }
}
out.frames = restack();
out.sections.forEach((r) => { const f = mine().find((n) => n.getPluginData(TAG) === "section:" + r.id); if (f) { r.frame = f.id; r.height = Math.round(f.height); } });
return out;
