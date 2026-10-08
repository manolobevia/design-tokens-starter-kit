---
name: "figma-type-scale"
description: Build Figma typography in one run: font family and weight variables, a Desktop/Mobile type scale in Responsive, and text styles. Use for Typography, with optional fonts, or reset Responsive.
---

# Figma type scale

Build the typography of the user's design system with one command, `Typography`. It does four things in order:

1. **Fonts.** Font family and font weight variables in the `Brand` collection (see "Font variables live in Brand").
2. **Responsive collection.** Created if missing, with a `Desktop` and a `Mobile` mode.
3. **Variables.** A modular type scale, written as number variables in `Responsive`.
4. **Text styles.** One text style per role, bound to those variables and to the font variables in `Brand`.

**The deliverable is the variables and the text styles in Figma.** A table in chat is only the receipt. The task is finished when they exist in the user's file and are bound to each other.

## The input

| The user types | What it means |
|---|---|
| `Typography` | Everything above, with Inter for headings and Roboto for body when no font is set yet |
| `Typography heading Playfair body Lato` | Same, with the fonts the user names. Either one can be given alone |
| `Typography base 18 ratio 1.333 mobile 1.25` | Same, with other scale settings (see "Settings") |
| "reset Responsive", "regenerate the scale" | Recalculate values that were changed by hand |
| "reset type styles" | Put hand-changed bindings of the styles back on the preset |
| "dry run" or "preview" with any of the above | Report what would happen and write nothing |

There are no separate commands for the variables alone, the styles alone, one group or one font. `Typography` is the entry point, and it is safe to repeat.

A message in one of these forms is the whole request and the go-ahead. Run it without asking for confirmation first, because the user designed these as one-line actions and the script is safe to repeat. The only reasons to stop are listed under "When to ask".

## How the scale is calculated

Every number comes from a few settings, so the whole scale can be regenerated from one line.

- **Base**: 16 px. `Body/Default` is always exactly the base.
- **Ratio**: 1.25 (Major Third) on Desktop and 1.2 (Minor Third) on Mobile. Mobile uses the same steps with the smaller ratio, which compresses the large sizes and leaves the small ones alone. Nothing on Mobile is picked by hand.
- **Font size** = base x ratio^step, rounded to the nearest multiple of 4. Ties round up. No calculated size goes below 12.
- **Line height** = the rounded font size x 1.2, rounded to the nearest multiple of 4 again. The order matters: calculating from the unrounded size gives different numbers.
- **Paragraph spacing** = the rounded font size x 0.5, rounded the same way. Single-line styles (Label, Overline) get 0.

With the default settings the result is (font size / line height / paragraph spacing):

| Style | Step | Desktop | Mobile |
|---|---|---|---|
| Display/Default | +7 | 76 / 92 / 40 | 56 / 68 / 28 |
| Heading/H1 | +6 | 60 / 72 / 32 | 48 / 56 / 24 |
| Heading/H2 | +5 | 48 / 56 / 24 | 40 / 48 / 20 |
| Heading/H3 | +4 | 40 / 48 / 20 | 32 / 40 / 16 |
| Heading/H4 | +3 | 32 / 40 / 16 | 28 / 32 / 16 |
| Heading/H5 | +2 | 24 / 28 / 12 | 24 / 28 / 12 |
| Heading/H6 | +1 | 20 / 24 / 12 | 20 / 24 / 12 |
| Body/Large | +1 | 20 / 24 / 12 | 20 / 24 / 12 |
| Body/Default | 0 | 16 / 20 / 8 | 16 / 20 / 8 |
| Body/Small | base - 2 | 14 / 20 / 8 | 14 / 20 / 8 |
| Label/Large | 0 | 16 / 20 / 0 | 16 / 20 / 0 |
| Label/Default | base - 2 | 14 / 16 / 0 | 14 / 16 / 0 |
| Label/Small | -1 | 12 / 16 / 0 | 12 / 16 / 0 |
| Caption/Default | -1 | 12 / 16 / 8 | 12 / 16 / 8 |
| Overline/Default | -1 | 12 / 16 / 0 | 12 / 16 / 0 |

Two sizes sit off the scale on purpose. On a strict 4 px grid the step below 16 lands on 12 and would duplicate Caption, so `Body/Small` and `Label/Default` are fixed at base - 2 (14). `Body/Small` keeps a line height of at least 20 so small reading text does not get cramped.

The full definition is the PRESET block at the top of `scripts/type_scale.js`. Read it when the user asks what a group contains or where a number comes from.

### Settings

Settings can follow the trigger in the same message, in any order. Map them to the `SCALE` block:

| The user writes | SCALE field |
|---|---|
| `base 18` | `base` |
| `ratio 1.333`, or a name: Minor Second 1.067, Major Second 1.125, Minor Third 1.2, Major Third 1.25, Perfect Fourth 1.333, Augmented Fourth 1.414, Perfect Fifth 1.5, Golden Ratio 1.618 | `ratio` |
| `mobile 1.2` | `mobileRatio` |
| `line height 1.2` | `lineHeight` |
| `body line height 1.5` | `bodyLineHeight` (Body and Caption only) |
| `spacing 0.5` | `paragraphSpacing` |
| `body spacing 1` | `bodyParagraphSpacing` (Body and Caption only) |
| `grid 4` | `grid` |

`heading <font>` and `body <font>` name the two font families (a font name with spaces goes in quotes). Anything the user does not mention keeps its default. The settings are not stored in the file, so a later run needs them again to produce the same numbers; a plain `Typography` always calculates with the defaults.

## The naming system

The names follow rules the user chose deliberately. Keep to them whenever something is added.

- **Variables are `Group/Style/Property`**: `Heading/H1/Font size`, `Heading/H1/Line height`, `Heading/H1/Paragraph spacing`. Every path has the same depth, so groups with a single style still use `Default` (`Caption/Default/Font size`).
- **Text styles are `Group/Style`**: `Heading/H1`, `Body/Default`. A style and its variables share a name.
- **Groups name the role and match the text colors in Mapped** (`text/heading`, `text/body`, `text/caption`), so a style and its color read as a pair. It is `Body`, not Paragraph.
- **`Default`, not Medium.** The base style is the one to use unless there is a reason not to, the same idea as "500 Default" in the color scales. `Large` and `Small` are modifiers of it, which leaves room for XLarge or XSmall later without renaming.
- **`Display` sits above `H1`.** H1 is step +6 (60). The oversized step +7 (76) is its own style for hero text, so nobody enlarges H1 for a landing page.
- **`Strong`** is the emphasis twin of a Body style (`Body/Default Strong`). It shares the variables of its base style and differs only in weight, so it adds a text style and no variables.
- **`Label`** is single-line UI text (buttons, inputs, tabs, badges). **`Overline`** is the small uppercase eyebrow above a heading. **`Caption`** is helper text and metadata.

## Two font roles, never more

The system has exactly two font roles, and every style belongs to one of them:

| Font role | Styles that use it |
|---|---|
| `Brand/Font family/Heading` | Display, Heading H1 to H6 |
| `Brand/Font family/Body` | Body (including Strong), Label, Caption, Overline |

The user chose this on purpose. With three or four fonts a designer can no longer tell which font belongs where, and every extra font brings its own weight names. With two roles nobody picks a font at all: they pick a style, and the font comes with it. A Body style is always bound to the Body variable, so it can never end up in the heading font, and changing the body font means changing one variable.

So do not add a third font role, and do not point a style at a font name directly. If the `Brand/Font family` group holds other variables, the script ignores them and lists them under `unusedFamilies`. If the user asks for a style in another font, say that it breaks this rule and ask whether they want to change the rule before editing the preset.

## One style per role, modes decide the size

This is the idea the whole skill is built on. A text style has no modes of its own. `Heading/H1` is created once and bound to the variables `Heading/H1/Font size`, `Line height` and `Paragraph spacing`. Those variables carry the two modes. The mode set on a container (a frame, a section or the page) decides which values everything inside resolves to: in a frame set to Mobile, `Heading/H1` renders at 48 / 56, and in a Desktop frame the same style renders at 60 / 72.

So never create separate desktop and mobile styles such as "Mobile/H1", and never create a second set of variables for mobile. A mobile artboard is a desktop artboard with the mode switched.

`Desktop` is created first so it is the collection's default: anything without an explicit mode renders with Desktop values. A new Figma collection calls its only mode "Mode 1"; the script renames it to Desktop and adds Mobile.

### Switching a frame between Desktop and Mobile

In Figma: select the frame, open the Appearance section in the right panel, click "Apply variable mode", then choose Responsive and the mode.

When the user asks you to do it ("set this frame to Mobile"), run this with the node id they gave or the current selection. Text inside the frame changes size, so its fonts have to be loaded first:

```js
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const col = collections.find((c) => c.name.toLowerCase() === "responsive");
const mode = col.modes.find((m) => m.name.toLowerCase() === "mobile");
const nodes = figma.currentPage.selection; // or [await figma.getNodeByIdAsync("12:34")]
for (const node of nodes) {
  const texts = node.type === "TEXT" ? [node] : node.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) for (const seg of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(seg.fontName);
  node.setExplicitVariableModeForCollection(col, mode.modeId);
}
return nodes.map((n) => ({ id: n.id, name: n.name, mode: mode.name }));
```

## Step 1: Get the tools

Figma tools are often deferred, meaning connected but not loaded. Not seeing them in your tool list is not a reason to stop. Load them with a tool search such as "figma execute".

The script needs a tool that runs Figma Plugin API JavaScript in the open file. With the Figma Console MCP that is `figma_execute`, which works through the Desktop Bridge plugin in Figma Desktop. With the Figma MCP it is `use_figma`, which needs the file key from the user's Figma link.

## Step 2: Run the bundled script

Read `scripts/type_scale.js` and send its full contents as the code, changing only the CONFIG block at the top. Set the tool's timeout to 30000 ms, because creating styles loads fonts.

```js
const REQUEST = {
  variables: true,
  styles: true,
  groups: ["all"],
  overwrite: { variables: false, styles: false },
  fontDefaults: true,
  fonts: []
};
const SCALE = {
  base: 16, ratio: 1.25, mobileRatio: 1.2, grid: 4,
  lineHeight: 1.2, bodyLineHeight: null,
  paragraphSpacing: 0.5, bodyParagraphSpacing: null,
  minSize: 12
};
const DRY_RUN = false;
const EXPECT_FILE = "";
```

How each request maps to the CONFIG:

| Request | CONFIG |
|---|---|
| `Typography` | `variables: true, styles: true, fontDefaults: true` |
| `Typography heading Playfair body Lato` | the same, plus `fonts: [{ path: "Brand/Font family/Heading", value: "Playfair" }, { path: "Brand/Font family/Body", value: "Lato" }]` |
| `Typography ratio 1.333` | the same, `SCALE.ratio = 1.333`, `overwrite.variables: true` |
| reset Responsive, regenerate the scale | `variables: true, styles: false, fontDefaults: false, overwrite.variables: true` |
| reset type styles | `variables: false, styles: true, fontDefaults: false, overwrite.styles: true` |

A message that names scale settings is a request to calculate with them, so set `overwrite.variables: true`; without it, existing values that differ would be reported as kept and nothing would change. Fonts are written first, so the styles in the same run already see them. A font the user names always wins, even when the variable already exists. With `fontDefaults: true` the script only creates the font variables that are missing (Inter, Roboto, and the four weights) and never changes one that exists, so a rerun cannot overwrite a font the user chose.

Set `EXPECT_FILE` to the name of the user's design system file when you know it (from this conversation or from memory), and pass the file key to the tool when you have it. Figma's active file can change without notice, and this guard stops the script before it writes into the wrong one. Set `DRY_RUN = true` only when the user asks for a preview or a dry run.

Use the script rather than writing the logic fresh each time. It reads the live file state itself, so there is no need to fetch variables first, and it already handles the cases that are easy to get wrong by hand.

### What the script guarantees

- **Checks before it creates.** It looks for the `Responsive` collection and creates it only if it is missing. Collection, mode, variable and style names are matched ignoring case.
- **Never duplicates.** Running the same request twice changes nothing.
- **Never deletes.** Variables and styles outside the preset are left in place and listed under `others`.
- **Protects hand-tuned values.** If an existing variable holds a number other than the calculated one, it is kept and reported as `kept`, because optical corrections made after testing must survive later runs. Only `overwrite.variables` changes it.
- **Fills Mobile only where it was never set.** A Mobile value that is still a copy of the Desktop value counts as not set and gets the calculated number. A Mobile value that differs from both is treated as tuned and kept.
- **Styles are bound, never hardcoded.** Each style is bound to five variables: font family, font weight, font size, line height and paragraph spacing. If a variable it needs does not exist, the style is not created and the report says what is missing. It never falls back to raw values, because a style with copied numbers looks right today and silently stops following the system tomorrow.
- **Checks fonts before using them.** It reads the fonts available in the Figma account and uses a weight only if the font really has a style with that exact name. A font variable holding a misspelled name is reported with the closest real name, and the styles that depend on it are skipped.
- **Uses the weights both fonts share.** The first choices are Regular (body text, captions), Medium (labels) and Bold (display, headings, Strong, Overline), because nearly every font has them under the same name. If a first choice is missing or is not a real style of the font, the next one in the style's list is used (Bold falls back to Semi Bold, Medium to Regular) and the report says so.
- **Two font roles only.** Display and Heading styles bind to `Font family/Heading`; every other style binds to `Font family/Body`. No other Font family variable is ever used.
- **Keeps bindings changed by hand.** On an existing style it binds what is unbound and leaves a different binding alone, reported as `kept`. Only `overwrite.styles` rebinds it.
- **Sets letter spacing and case once**, when a style is created (tighter on large headings, wider and uppercase on Overline). Later runs never touch them, so they are free to tune.
- **Sets scopes and descriptions** on the variables: a Font size variable is offered only for font size, and its description says which step it is and how it was calculated.
- **Works with text or number weights.** A text weight variable ("Semi Bold") is bound as font style; a number weight variable (600) is bound as font weight.

### Reading the result

- `status`: `ok`, `partial` (something failed, details are on the rows) or `error` (nothing written; `error` explains why).
- `collection`: `created`; `desktopRenamedFrom` if "Mode 1" was renamed; `mobileCreated`; `mobileError` if Figma refused to add the mode; `otherModes` (modes the script does not manage, such as Tablet; new variables get the Desktop value there).
- `variables`: `created`, `updated`, `unchanged`, `kept`, `failed` and `scoped` counts (counted per variable, three per style), `rows` and `others`.
  - Each row is one style with `step`, `desktop` and `mobile` as "size / line height / paragraph spacing" (the calculated values) and an `action`: `created`, `completed` (some of its variables existed), `updated`, `kept`, `unchanged` or `failed`.
  - `was` lists Desktop values that were replaced. `kept` lists each variable and mode that was left alone, with its `current` and `calculated` value.
- `styles`: counts, `rows`, `blocked`, `others` and `duplicates` (two styles with the same name; the first one is used).
  - Each row has `style`, `action`, the `family` and `weight` variables it is bound to and the resolved `font`.
  - `note` says a preferred weight was not usable and which one was taken instead.
  - `kept` lists bindings left alone, with `current` and `preset`.
  - `unusedFamilies` lists variables in `Brand/Font family` that no style uses, because only Heading and Body are font roles.
  - `fontsElsewhere` lists Font family and Font weight variables found in any collection other than Brand. They are never used.
  - `blocked` groups the failed styles by cause. One wrong font name usually blocks many styles, so read this instead of the individual rows.
  - `unverified` lists bindings that were set without an error but could not be read back. Mention it once and suggest checking one style in Figma.
- `fonts`: one row per font line with `action` (`created`, `updated`, `unchanged`, `failed`), `was`, and a `warning` when a weight name is not a style of the fonts in use.
- `problems`: notes that apply to the whole run.

If anything failed for a reason that looks transient, retry once, then report what happened.

## Step 3: Confirm and report

Reply briefly:

- What was written and the counts, per step. Say so if the collection was created, if "Mode 1" was renamed to Desktop or if Mobile was added.
- For the variables, one table so the user can check it against Figma. Leave out rows that were already correct unless it was a dry run:

| Style | Desktop | Mobile |
|---|---|---|
| Heading/H1 | 60 / 72 / 32 | 48 / 56 / 24 |

- For the styles, which were created or updated and the font each resolved to. A short table or one line per group is enough.
- Every `note` about a fallback weight, grouped: "Labels use Regular because Brand/Font weight/Medium is not a style of Roboto." Say how to get the first choice: fix or add the variable with a font line, then send "reset type styles".
- `unusedFamilies`, in one line, if it is not empty: those variables exist but no style uses them.
- Everything in `blocked`, one line per cause, with the fix. The usual cause is a font variable whose value is not a real font name. Quote the closest name the script found and offer the command that fixes it, for example `Typography body Roboto`. Do not apply the fix yourself: the user may have meant a different font.
- Anything `kept`, in one line per group, so the user can decide whether to reset it. If almost every variable is `kept`, the file was probably built with other settings; say that, and that sending the line with those settings will match it.
- `others`, in one line. Do not delete them yourself.
- If `mobileError` is set, say that Desktop was written and Mobile could not be added, and quote the reason. The number of modes a collection may have depends on the Figma plan.

Keep to what the report contains. Do not add type advice or suggestions for new styles unless asked.

## Font variables live in Brand

Font family and font weight are primitives: raw values such as "Inter" and "Bold", the same kind of thing as a hex color or a spacing number. So they live in the `Brand` collection with the other primitives, not in Alias:

- `Brand/Font family/Heading` and `Brand/Font family/Body` (see "Two font roles, never more")
- `Brand/Font weight/Light`, `Regular`, `Medium` and `Bold`, each holding the font style of the same name (Light = "Light")

The defaults are Inter for `Heading` and Roboto for `Body`. `Typography` creates any of these six variables that is missing and leaves existing ones alone.

The text styles bind to these directly. There is no font tier in Alias, and the script never reads or writes font variables there. The user moved them out of Alias on purpose, so do not recreate them there.

If the report lists `fontsElsewhere`, a file still has font variables in another collection, usually Alias from an older setup. Nothing uses them. When styles are blocked because Brand has no font variables, say that the fonts were found in the other collection and offer the font lines that create them in Brand with the same values. Do not delete the old ones yourself: say they are unused and let the user remove them.

A font the user names (`Typography heading Playfair`) sets one variable. It creates the variable if it is new and changes it if it exists. A family that is not available in the Figma account is refused, with the closest name. Only `Font family` variables can be set from the command; the weights keep their default values.

The weight variables are shared by both fonts, so a weight only works cleanly when the heading font and the body font both have it under the same name. That is why the preset sticks to Light, Regular, Medium and Bold. Light is created for the user's own use; no preset style binds to it. In-between weights are where fonts disagree: Inter calls it "Semi Bold", others "SemiBold", and some fonts have no such weight at all. The script checks every style against its own family, so if a weight exists in one font and not the other, the style that cannot use it gets the fallback and the report says so. Recommend against adding a weight that only one of the two fonts has.

## Changing the preset

To add a style, change a step, or change the preferred weights, edit the PRESET block in the script and repackage the skill. Say so when the user asks for a permanent change, because editing values in Figma fixes their file but not the next file the skill runs on.

Name anything new by the rules in "The naming system", and give it a `step` (or an `offset` from the base) so it stays part of the calculation instead of becoming a magic number.

## When to ask

- The request cannot be read as one of the forms above, or a setting has no number.
- The user asks for styles and the report says the `Brand` collection or a font family variable does not exist. Say what is missing and offer the font line that creates it. Do not invent a font for them.
- The user asks to reset and it would overwrite values reported as `kept` in a group they did not name. Reset only the groups they named.
- The script stops because the open file is not the expected one. Say which file is open and ask the user to bring the right one to the front.
- After a tool search, nothing connected can run Plugin API code, or the call fails because Figma Desktop or the Desktop Bridge plugin is not running. Say plainly that nothing was created and name what is missing, so the user can fix it and resend the line.
