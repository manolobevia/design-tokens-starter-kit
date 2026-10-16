---
name: figma-contrast-fix
description: Find Mapped text and border pairs that fail WCAG AA, preview each with a passing fix, then apply the fixes. Use for Contrast fix, Contrast fix apply, or Contrast fix apply Text/action.
---

# Figma contrast fix

Show which Mapped color pairs fail accessibility contrast, preview a fix for each one, and apply the fixes you choose.

**The deliverable is a preview frame in Figma, and, when asked, retargeted Mapped variables.** A table in chat is only the receipt. Never change variables unless the user typed `apply`.

## Help

If the user types `-h`, `-help` or `help` with this skill, print the usage below as a code block and stop. Do not load Figma tools, run the script or write anything.

```
/figma-contrast-fix  usage
Finds Mapped Text and Border pairs below WCAG AA (4.5:1 text, 3:1 borders) in Light and Dark.

  Contrast fix                      Preview: a frame with each failing pair, current next to fix. Writes no variables
  Contrast fix apply                Apply every fix (points Mapped variables at a passing Alias step)
  Contrast fix apply Text/action    Apply the fix for one Mapped variable. Several can share a line
  Contrast fix apply dark           Only the Dark mode ("light" works too)
  dry run                           With apply: list the changes and write nothing

A fix is the closest step of the same Alias role that passes on every surface the variable is used on.
It never edits Brand or Alias, and never writes a hex.
```

## The input

| The user types | What it means |
|---|---|
| `Contrast fix`, `Contrast fix preview` | Build the **Contrast fixes (preview)** frame on the Design Tokens page. Variables are not changed |
| `Contrast fix apply` | Apply every fix that exists |
| `Contrast fix apply Text/action Border/error` | Apply only those Mapped variables |
| `Contrast fix apply dark` / `light` | Apply only that mode |
| "dry run" with apply | Report what would change and write nothing |

A bare `Contrast fix` is the whole request and the go-ahead for the preview. **Applying is a separate request**: run `apply` only when the user typed it, because a fix can be a brand decision (for example a much darker orange for links).

## What the script does

- Checks the same Mapped pairs as the Contrast checks frame: Text on Surface, Text on-[surface] on its surface, and Border on Surface/default, in Light and Dark.
- Groups the failures by Mapped variable and mode. A variable is used on several surfaces (`Text/action` on default and on page), so the fix has to pass on **all** of them. It picks the closest passing step, so the color changes as little as possible.
- For `Text/on-*` it tries Neutral 950, Neutral 900, Foundation Black and Foundation White. For everything else it tries the other steps of the variable's own Alias role.
- **Preview** builds the frame: one row per failing pair titled like `Light · action-hover on default · 4.45:1, needs 4.5:1`, with a box in the current colors, a box in the fix colors, the Alias step, hex, ratio and the retarget line (`Alias/Primary/700 -> Mapped/Text/action`). Boxes are bound to the real Mapped variables in the right mode.
- **Apply** points the Mapped variable at the new Alias step in the failing mode only. The Icon variable of the same name follows only if it pointed at the same step. Everything is a reference.
- Where no single step passes on every surface (for example `Text/on-action` on three button states), it says so and changes nothing. The fix there is a different surface.

## Step 1: Get the tools

Figma tools are often deferred. Load them with a tool search such as "figma execute" and "figma screenshot". The script needs a tool that runs Plugin API code in the open file (`figma_execute` with the Figma Console MCP).

## Step 2: Run the bundled script

Read `scripts/contrast_fix.js` and send its full contents as the code, changing only the CONFIG block. Set the tool's timeout to 120000 ms for a preview (it creates many nodes) and 30000 ms for apply.

```js
const MODE = "preview";   // "preview" or "apply"
const ONLY = ["all"];     // or ["Text/action", "Border/error"]
const MODES = ["Light", "Dark"];
const DRY_RUN = false;
const EXPECT_FILE = "";
```

| Request | CONFIG |
|---|---|
| `Contrast fix` | defaults |
| `Contrast fix apply` | `MODE = "apply"` |
| `Contrast fix apply Text/action` | `MODE = "apply"`, `ONLY = ["Text/action"]` |
| `Contrast fix apply dark` | `MODE = "apply"`, `MODES = ["Dark"]` |
| dry run | `DRY_RUN = true` (matters for apply) |

Set `EXPECT_FILE` to the user's file name when you know it.

### What the script guarantees

- **Preview never touches variables.** It only creates or replaces the frame named `Contrast fixes (preview)` on the Design Tokens page, below the Contrast frame.
- **References only.** Apply writes aliases to Alias variables, never a hex.
- **Never edits Brand or Alias.** Only Mapped Text, Border and the matching Icon variables move.
- **Only what fails.** Variables and modes that already pass are left alone, so hand-tuned values that work survive.
- **Safe to repeat.** After a fix the pair passes, so a second run finds nothing to change.

### Reading the result

`failing` (failing pairs), `fixable` (variable and mode groups with a fix), `applied` (rows with `variable`, `mode`, `was`, `now`), `unfixable` (groups with no passing step), `frame` and `preview` for a preview.

## Step 3: Look and report

After a preview, take a screenshot of the frame (`figma_capture_screenshot` with the `frame` id) and check that boxes and text are not clipped. Then report briefly:

- How many pairs fail and how many have a fix.
- The fixes in one table: variable, mode, current step, fix step.
- The unfixable groups and why, with the usual remedy (change the surface or the role).
- For a preview, that nothing was changed and the exact line to apply, for example `/figma-contrast-fix apply`.
- For apply, what changed, and: "Run `Design Tokens` to refresh the page, and `reset Mapped/<group>` (figma-mapped-roles) puts a variable back on its preset."

Do not apply fixes the user did not ask for. Do not add design advice unless asked.

## When to ask

- The open file has no Alias or Mapped collection. Say which skill to run first.
- The user types `apply` with a variable that is not a checked Text or Border variable. List the valid names.
- The file name does not match `EXPECT_FILE`.
- After a tool search, nothing can run Plugin API code, or Figma Desktop or the Desktop Bridge plugin is not running. Say plainly that nothing was changed.
