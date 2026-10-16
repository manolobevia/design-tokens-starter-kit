// figma-contrast-fix
// Runs inside Figma (Plugin API) through a tool such as figma_execute.
//
// Finds the Mapped Text and Border pairs that fail WCAG AA (4.5:1 text, 3:1 control borders) in
// Light and Dark, and for each Mapped variable that fails picks the closest Alias step of the same
// role that passes on every surface it is used on.
//   MODE "preview": builds a frame on the Design Tokens page with the current colors next to the
//                   fix for every failing pair. Writes nothing to the variables.
//   MODE "apply":   points those Mapped variables at the chosen Alias step (a reference, never a
//                   hex). Only the variables and modes that fail are touched.
//
// Edit ONLY the CONFIG block. Send everything else unchanged.

// ---- CONFIG ----
const MODE = "preview";   // "preview" or "apply"
const ONLY = ["all"];     // "all", or Mapped variables such as "Text/action", "Border/error"
const MODES = ["Light", "Dark"]; // limit to one mode, e.g. ["Dark"]
const DRY_RUN = false;    // true = apply reports what it would change and writes nothing
const EXPECT_FILE = "";   // optional file name guard, e.g. "Resumatic"
const PAGE = "Design Tokens";
// ---- END CONFIG ----

const FRAME_NAME = "Contrast fixes (preview)";
const TAG = "figma-token-docs";
const low = (s) => String(s).trim().toLowerCase();
const msg = (e) => String((e && e.message) || e);
const out = { file: figma.root.name, mode: MODE, dryRun: DRY_RUN, status: "ok", failing: 0, fixable: 0, applied: [], unfixable: [], notes: [] };

if (EXPECT_FILE && low(EXPECT_FILE) !== low(figma.root.name)) {
  out.status = "error";
  out.error = 'This is "' + figma.root.name + '", not "' + EXPECT_FILE + '". Nothing was written.';
  return out;
}

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
const collById = new Map(collections.map((c) => [c.id, c]));
const varById = new Map(variables.map((v) => [v.id, v]));
const findColl = (n) => collections.find((c) => low(c.name) === low(n)) || null;
const varsOf = (c) => (c ? c.variableIds.map((id) => varById.get(id)).filter(Boolean) : []);
const brand = findColl("Brand"), alias = findColl("Alias"), mapped = findColl("Mapped");
if (!mapped || !alias) {
  out.status = "error";
  out.error = "Needs the Alias and Mapped collections. Run figma-alias-bridge and figma-mapped-roles first.";
  return out;
}
const mv = (n) => varsOf(mapped).find((v) => v.name === n) || null;
const bv = (n) => varsOf(brand).find((v) => v.name === n) || null;
const av = (n) => varsOf(alias).find((v) => v.name === n) || null;
const modeOf = (n) => { const m = mapped.modes.find((x) => low(x.name) === low(n)); return m ? m.modeId : null; };
const modeList = MODES.map((n) => [n, modeOf(n)]).filter(([, id]) => id);
if (!modeList.length) { out.status = "error"; out.error = "Mapped has none of the modes " + MODES.join(", ") + "."; return out; }

function colorOf(v, mId, depth = 0) {
  const c = collById.get(v.variableCollectionId);
  const val = v.valuesByMode[mId || c.defaultModeId];
  if (val && val.type === "VARIABLE_ALIAS") { const t = varById.get(val.id); return t && depth < 10 ? colorOf(t, null, depth + 1) : null; }
  return val && typeof val === "object" && "r" in val ? val : null;
}
const h2 = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
const hexOf = (c) => ("#" + h2(c.r) + h2(c.g) + h2(c.b)).toUpperCase();
const lum = (c) => { const f = (x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)); return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const ratioOf = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
const aliasOf = (v, id) => { const val = v.valuesByMode[id]; return val && val.type === "VARIABLE_ALIAS" ? varById.get(val.id) : null; };

// ---- the pairs that are meant to be used together (same as the Contrast checks frame) ----
const ROLES = ["error", "success", "warning", "information"];
const content = ["heading", "subheading", "body", "body-secondary", "caption", "label", "helper", "action", "action-hover", "action-pressed", ...ROLES];
const pairs = [];
for (const bg of ["default", "page"]) for (const t of content) pairs.push(["Text/" + t, "Surface/" + bg, 4.5]);
const onMap = { "on-action": ["action", "action-hover", "action-pressed"], "on-action-secondary": ["action-secondary", "action-secondary-hover"], "on-selected": ["selected"], "on-inverse": ["inverse"], "on-inverse-secondary": ["inverse"] };
for (const r of ROLES) { onMap["on-" + r] = [r]; onMap["on-" + r + "-secondary"] = [r + "-secondary"]; }
for (const fg of Object.keys(onMap)) for (const bg of onMap[fg]) pairs.push(["Text/" + fg, "Surface/" + bg, 4.5]);
for (const b of ["default", "action", "action-hover", "action-pressed", "focus", "selected", ...ROLES]) pairs.push(["Border/" + b, "Surface/default", 3]);

const wanted = ONLY.map(low);
const isWanted = (fg) => wanted.includes("all") || wanted.includes(low(fg)) || wanted.includes(low("Mapped/" + fg));
const known = new Set(pairs.map((p) => low(p[0])));
for (const w of wanted) if (w !== "all" && !known.has(low(w.replace(/^mapped\//, "")))) out.notes.push('"' + w + '" is not a Text or Border variable that is checked.');

// ---- group by (variable, mode): one fix has to pass on every surface the variable is used on ----
const groups = new Map();
for (const [fg, bg, min] of pairs) {
  const a = mv(fg), b = mv(bg);
  if (!a || !b) continue;
  for (const [mode, id] of modeList) {
    const key = fg + "|" + mode;
    if (!groups.has(key)) groups.set(key, { fg, mode, id, fgVar: a, uses: [] });
    const ca = colorOf(a, id), cb = colorOf(b, id);
    groups.get(key).uses.push({ bg, bgVar: b, min, cb, ratio: ca && cb ? ratioOf(ca, cb) : null });
  }
}
const failingGroups = Array.from(groups.values()).filter((g) => isWanted(g.fg) && g.uses.some((u) => u.ratio !== null && u.ratio < u.min));
for (const g of failingGroups) {
  g.cur = aliasOf(g.fgVar, g.id);
  g.curColor = colorOf(g.fgVar, g.id);
  g.failingUses = g.uses.filter((u) => u.ratio !== null && u.ratio < u.min);
  // Candidates: dark or light content for on-* text, otherwise the other steps of the same Alias role.
  let cands;
  if (g.fg.startsWith("Text/on-")) cands = ["Neutral/950", "Neutral/900", "Foundation/Black", "Foundation/White"].map(av).filter(Boolean);
  else { const grp = g.cur ? g.cur.name.split("/")[0] : null; cands = grp ? varsOf(alias).filter((v) => v.name.startsWith(grp + "/")) : []; }
  const ok = cands
    .map((v) => ({ v, c: colorOf(v) }))
    .filter((x) => x.c && g.uses.every((u) => !u.cb || ratioOf(x.c, u.cb) >= u.min));
  // The closest passing step, so the color changes as little as possible.
  ok.sort((x, y) => Math.min(...g.uses.map((u) => ratioOf(x.c, u.cb) / u.min)) - Math.min(...g.uses.map((u) => ratioOf(y.c, u.cb) / u.min)));
  g.pick = ok[0] || null;
}
out.failing = failingGroups.reduce((n, g) => n + g.failingUses.length, 0);
out.fixable = failingGroups.filter((g) => g.pick).length;
for (const g of failingGroups) if (!g.pick) out.unfixable.push(g.mode + " · " + g.fg + " on " + g.uses.map((u) => u.bg.replace("Surface/", "")).join(", ") + ": no single step passes on every surface it is used on");

// ---- apply ----
if (MODE === "apply") {
  const icon = (fg) => (fg.startsWith("Text/") ? mv("Icon/" + fg.slice(5)) : null); // Icon mirrors Text
  for (const g of failingGroups) {
    if (!g.pick) continue;
    const row = { variable: g.fg, mode: g.mode, was: g.cur ? "Alias/" + g.cur.name : null, now: "Alias/" + g.pick.v.name };
    try {
      if (!DRY_RUN) {
        g.fgVar.setValueForMode(g.id, figma.variables.createVariableAlias(g.pick.v));
        const ic = icon(g.fg);
        // The Icon twin follows only if it pointed at the same step as the text did.
        if (ic && g.cur && aliasOf(ic, g.id) && aliasOf(ic, g.id).id === g.cur.id) {
          ic.setValueForMode(g.id, figma.variables.createVariableAlias(g.pick.v));
          row.also = "Icon/" + g.fg.slice(5);
        }
      }
      out.applied.push(row);
    } catch (e) { row.error = msg(e); out.status = "partial"; out.applied.push(row); }
  }
  return out;
}

// ---- preview ----
const textStyles = await figma.getLocalTextStylesAsync();
const styleByName = new Map(textStyles.map((s) => [low(s.name), s]));
const GREY = { r: 0.5, g: 0.5, b: 0.5 };
const paint = (v) => (v ? figma.variables.setBoundVariableForPaint({ type: "SOLID", color: GREY }, "color", v) : { type: "SOLID", color: GREY });
const fonts = new Set();
async function T(parent, str, styleName, color, w) {
  const t = figma.createText();
  const st = styleByName.get(low(styleName));
  const fn = st ? st.fontName : { family: "Inter", style: "Regular" };
  const k = fn.family + "|" + fn.style;
  if (!fonts.has(k)) { await figma.loadFontAsync(fn); fonts.add(k); }
  if (st) await t.setTextStyleIdAsync(st.id); else t.fontName = fn;
  t.characters = String(str);
  t.fills = [paint(color)];
  parent.appendChild(t);
  if (w) { t.textAutoResize = "HEIGHT"; t.resize(w, t.height); }
  return t;
}
function F(parent, name, o = {}) {
  const f = figma.createFrame();
  f.name = name; f.fills = o.fill ? [paint(o.fill)] : []; f.clipsContent = false;
  f.layoutMode = o.dir || "VERTICAL"; f.itemSpacing = o.gap || 0;
  f.paddingLeft = f.paddingRight = o.pad || 0; f.paddingTop = f.paddingBottom = o.pad || 0;
  f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "AUTO";
  if (o.w) { f.resize(o.w, f.height || 10); if (f.layoutMode === "HORIZONTAL") f.primaryAxisSizingMode = "FIXED"; else f.counterAxisSizingMode = "FIXED"; }
  if (o.radius) for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) f.setBoundVariable(k, o.radius);
  if (parent) parent.appendChild(f);
  return f;
}
const rad3 = bv("Border radius/3"), thin = bv("Border width/0-5");
const tHead = mv("Text/heading"), tBody = mv("Text/body"), tMuted = mv("Text/body-secondary");
let page = figma.root.children.find((p) => p.name === PAGE);
if (!page) { page = figma.createPage(); page.name = PAGE; }
await figma.setCurrentPageAsync(page);
const contrastFrame = page.children.find((n) => n.getPluginData && n.getPluginData(TAG) === "section:contrast");
for (const n of page.children.filter((n) => n.name === FRAME_NAME)) n.remove();
const root = F(page, FRAME_NAME, { gap: 48, pad: 80, w: 1440, fill: mv("Surface/page") });
const light = modeOf("Light");
if (light) root.setExplicitVariableModeForCollection(mapped, light);
const head = F(root, "Heading", { gap: 8 });
await T(head, "Contrast fixes", "Heading/H2", tHead);
await T(head, out.failing ? "Each pair that does not pass, with the current colors next to a fix that does. Nothing in the variables has changed. A fix is an Alias step to point the Mapped variable at." : "Every checked pair passes in Light and Dark. Nothing to fix.", "Body/Default", tMuted, 1280);
const list = F(root, "Pairs", { gap: 48 });
for (const g of failingGroups) {
  for (const u of g.failingUses) {
    const title = g.mode + " · " + g.fg.replace("Text/", "").replace("Border/", "border ") + " on " + u.bg.replace("Surface/", "") + " · " + u.ratio.toFixed(2) + ":1, needs " + u.min + ":1";
    const row = F(list, title, { gap: 16 });
    await T(row, title, "Heading/H5", tHead);
    const cols = F(row, "Versions", { dir: "HORIZONTAL", gap: 24 });
    for (const kind of ["Current", "Fix"]) {
      const col = F(cols, kind, { gap: 8, w: 628 });
      await T(col, kind, "Label/Default", tMuted);
      const fgVar = kind === "Current" ? g.fgVar : g.pick ? g.pick.v : null;
      if (!fgVar) { await T(col, "No single step passes on every surface this variable is used on. Change the surface or choose another role.", "Body/Small", tMuted, 628); continue; }
      const card = F(col, "Box", { gap: 8, pad: 32, w: 628, fill: u.bgVar, radius: rad3 });
      card.setExplicitVariableModeForCollection(mapped, g.id);
      if (g.fg.startsWith("Border/")) {
        card.strokes = [paint(fgVar)]; card.strokeAlign = "INSIDE";
        for (const k of ["strokeTopWeight", "strokeBottomWeight", "strokeLeftWeight", "strokeRightWeight"]) { if (thin) card.setBoundVariable(k, thin); else card[k] = 2; }
        await T(card, "Outlined control", "Label/Large", tBody, 560);
      } else {
        await T(card, g.fg.startsWith("Text/on-") ? "Button label" : "The quick brown fox jumps", "Heading/H4", fgVar, 560);
        await T(card, "Body text sample: small copy must reach 4.5:1.", "Body/Default", fgVar, 560);
      }
      const c = kind === "Current" ? g.curColor : g.pick.c;
      const caption = kind === "Current"
        ? (g.cur ? "Alias/" + g.cur.name : g.fg) + " · " + hexOf(c) + " · " + ratioOf(c, u.cb).toFixed(2) + ":1 (fails)"
        : "Alias/" + g.pick.v.name + " · " + hexOf(c) + " · " + ratioOf(c, u.cb).toFixed(2) + ":1 (passes). Retarget: Alias/" + g.pick.v.name + " -> Mapped/" + g.fg + (g.mode === "Dark" ? " (dark)" : "");
      await T(col, caption, "Caption/Default", tMuted, 628);
    }
  }
}
if (contrastFrame) { root.x = contrastFrame.x; root.y = contrastFrame.y + contrastFrame.height + 120; }
figma.viewport.scrollAndZoomIntoView([root]);
out.frame = root.id;
out.height = Math.round(root.height);
out.preview = failingGroups.map((g) => ({ variable: g.fg, mode: g.mode, current: g.cur ? "Alias/" + g.cur.name : null, fix: g.pick ? "Alias/" + g.pick.v.name : null }));
return out;
