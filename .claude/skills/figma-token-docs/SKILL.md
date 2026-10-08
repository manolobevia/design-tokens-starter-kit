---
name: figma-token-docs
description: Build a Design Tokens reference page in Figma from your live variables and text styles: color scales, roles, Light/Dark usage, contrast, type, spacing, radius, borders. Use for Design Tokens.
---

# Figma token docs

Build a page named **Design Tokens** in the open Figma file: a visual reference for the whole system. Each section is its own frame (1440 wide, with its own background), laid out left to right with space between (the How to use guide sits under the header frame), so people can find, link to or copy one section at a time. It is generated from the live variables and text styles, so rerunning it refreshes the page after any token change.

**The deliverable is the page in Figma.** A list in chat is only the receipt. The task is finished when the page exists, you have looked at it (see Step 3), and you have said what it shows.

## Help

If the user types `-h`, `-help` or `help` with this skill, print the usage below as a code block and stop. Do not load Figma tools, run the script or write anything.

```
/figma-token-docs  usage
Builds the Design Tokens page from the variables and text styles in the open file.

  Design Tokens        Build or refresh the whole page
  dry run              Report what would be built, writes nothing

Sections, in order: header, Contents, How to use, How names work, Token health, Brand colors, Alias roles, Mapped Light vs Dark,
contrast checks, typography (Desktop and Mobile), font families and weights,
spacing, border radius, border width.
Missing pieces get a one-line note on the page, never an error.
```

## The input

| The user types | What it means |
|---|---|
| `Design Tokens` | Build or refresh the whole page |
| "dry run" or "preview" | Report what would be built and write nothing |

A message in this form is the whole request and the go-ahead. Run it without asking for confirmation first. The only reasons to stop are listed under "When to ask".

## What the page shows

| # | Section | Shows |
|---|---|---|
| 1 | Header | File name, date, variable counts per collection |
| 1d | How names work | One screen: the three tiers, the naming rules (default, secondary, tertiary, action, -secondary, on-[surface], bare role names, 950 to 50) and a short Do and Don't |
| 1c | Token health | What needs attention, from checks on the live file: failing contrast, missing Mapped variables or Alias roles, a Neutral that is not Gray or has no visible steps, Dark surfaces that look alike, fonts missing a weight, Brand colors no role uses, duplicate colors. Issues and notes come first, each with the fix to run; passing checks are listed at the bottom |
| 1a | Contents | A clickable index: one card per frame with a number, the title (a link that jumps to the frame), a one-line description and a live stat from the file, such as "11 color scales" or "Light 51 of 54 · Dark 53 of 54 pass". Every other frame gets a "↑ Contents" link back. Cards also navigate in Present mode. Sits under the header, with the guide below it |
| 1b | How to use | How to run a skill, the build order, and a card per skill with the lines you type. Sits directly under the header frame |
| 2 | Brand colors | Every color group, 950 to 50, with hex |
| 3 | Alias roles | Every role, with the Brand group it points to |
| 4 | Mapped usage | Surface, Border, Text and Icon, Light and Dark side by side |
| 5 | Contrast checks | A "Does not pass" list up front, then every text and border pair against WCAG AA in Light and Dark, with failing rows highlighted |
| 6 | Typography | Every text style, Desktop and Mobile, with font, size, line height, paragraph spacing |
| 7 | Font families and weights | Heading and Body specimens in every weight |
| 8 | Spacing | Vertical bars on a shared baseline, whose height is the variable |
| 9 | Border radius | Squares with the variable as corner radius |
| 10 | Border width | Boxes with the variable as stroke weight |

Everything is bound to the real system: swatch fills, bar heights, corners and strokes are variable bindings, type samples use the real text styles, and the Light/Dark and Desktop/Mobile columns are frames set to those variable modes. Nothing is a copied value.

## Step 1: Get the tools

Figma tools are often deferred, meaning connected but not loaded. Not seeing them in your tool list is not a reason to stop. Load them with a tool search such as "figma execute" and "figma screenshot".

The script needs a tool that runs Figma Plugin API JavaScript in the open file. With the Figma Console MCP that is `figma_execute`, which works through the Desktop Bridge plugin in Figma Desktop.

## Step 2: Run the bundled script in groups

Read `scripts/design_tokens_page.js` and send its full contents as the code, changing only the CONFIG block at the top. Set `EXPECT_FILE` to the user's design system file name when you know it.

```js
const PAGE = "Design Tokens";
const SECTIONS = ["all"];
const DRY_RUN = false;
const EXPECT_FILE = "";
```

One call cannot build everything inside the 30 second limit, so build in groups and set the tool's timeout to 30000 ms for each. Run these in order:

| Call | `SECTIONS` |
|---|---|
| 1 | `["header", "guide", "names"]` |
| 2 | `["health", "brand", "alias"]` |
| 3 | `["mapped"]` |
| 4 | `["contrast"]` |
| 5 | `["typography", "fonts"]` |
| 6 | `["spacing", "radius", "border"]` |
| 7 | `["contents"]` |

The Contents frame links to the other frames by id, so the script rebuilds it automatically at the end of any run that replaced a frame; call 7 builds it the first time. The script puts each section in its fixed place, so any order or subset works. A subset is also how one section is refreshed on its own. `dry run` sets `DRY_RUN = true` and needs one call.

### What the script guarantees

- **Rebuilds only its own frames.** Every section frame it makes carries plugin data. A run replaces those frames, re-lays them out in order, and never touches anything else on the page, so rerunning never duplicates.
- **Never edits variables or styles.** It only reads them.
- **Bound, not copied.** Fills, widths, corners, strokes and modes are bindings to the variables. Text uses the file's own text styles.
- **Skips what is missing.** A section whose variables do not exist (no Radius yet, say) shows one line saying which skill to run. Contrast pairs whose variables are missing are listed under the summary.
- **Writes only to the page named `Design Tokens`**, which it creates when needed.

### Reading the result

- `status`: `ok`, `partial` (a section failed; see its `error`) or `error` (nothing written).
- `sections`: one row per section with `action` (`built` or `failed`) and `items` (groups, variables or styles shown).
- `notes`: anything skipped, for example contrast pairs without variables.
- `frames`: how many section frames are on the page. Each row in `sections` also has its `frame` id and `height`, handy for screenshots.

If a section failed, retry that section once on its own, then report what happened.

## Step 3: Look at it and report

The Figma Console server requires checking visual work. After each call, take a screenshot of the new sections with `figma_capture_screenshot` (use the `frame` id on each row of `sections` in the result). Look for clipped text, missing swatches and sections in the wrong order. Fix and rerun the section once if something is wrong.

Then reply briefly:

- That the page was built or refreshed, and the sections now on it.
- Anything skipped, with the skill to run for it.
- The contrast summary line (for example "Light: 21 of 23 pairs pass").
- Anything in the file the page revealed that the user may want to know, such as a font that lacks a weight ("Medium is not available for Moneta Sans").

Keep to what the page and the report contain. Do not add design advice unless asked.

## When to ask

- The open file is not the expected one (`EXPECT_FILE` stops the script). Say which file is open and ask the user to bring the right one to the front.
- A page named `Design Tokens` already holds content this skill did not make. It is left alone, but ask before building if the layout would clearly collide.
- After a tool search, nothing connected can run Plugin API code, or the call fails because Figma Desktop or the Desktop Bridge plugin is not running. Say plainly that nothing was built and name what is missing.
