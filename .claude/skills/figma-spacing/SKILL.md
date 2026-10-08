---
name: figma-spacing
description: Write the fixed 4px-unit spacing scale as number variables in Figma Brand under Spacing (Spacing/4 = 16px). Use for Spacing, Spacing scale, Spacing/4, or asks to reset or regenerate spacing tokens.
---

# Figma spacing

Write the spacing scale to Figma as number variables.

**The deliverable is the variables in Figma.** A table of values in chat is only the receipt. The task is finished when the variables exist in the user's file and you have confirmed it, so always carry on through Step 2 and Step 3.

The scale is a fixed preset, not a calculation. It is the same every run, so a bare `Spacing` is the whole request and the go-ahead. Build it and write it without asking for confirmation first. The only reasons to stop are listed under "When to ask".

## Help

If the user types `-h`, `-help` or `help` with this skill, print the usage below as a code block and stop. Do not load Figma tools, run the script or write anything.

```
/figma-spacing  usage
Writes the 4px-unit spacing scale as number variables in Brand under Spacing.

  Spacing, Spacing scale                       The whole scale
  Spacing/4                                    One step (several can share a message)
  reset Spacing, regenerate the spacing scale  Overwrite hand-changed values
  dry run                                      Preview only, writes nothing

Token = pixels / 4: Spacing/4 is 16px. Steps: 0, 0-25, 0-5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24.
```

## The input

| The user types | What it means |
|---|---|
| `Spacing` or `Spacing scale` | Write the whole Spacing group |
| `Spacing/4` | Write one or a few steps. Several can come in one message |
| "reset Spacing", "regenerate the spacing scale" | Recalculate values that were changed by hand (overwrite) |
| "dry run" or "preview" with any of the above | Report what would happen and write nothing |

## The scale

| Token | Value |
|---|---:|
| `0` | 0px |
| `0-25` | 1px |
| `0-5` | 2px |
| `1` | 4px |
| `2` | 8px |
| `3` | 12px |
| `4` | 16px |
| `5` | 20px |
| `6` | 24px |
| `8` | 32px |
| `10` | 40px |
| `12` | 48px |
| `16` | 64px |
| `20` | 80px |
| `24` | 96px |

The token is the value in 4px units, so `token x 4 = px` and a designer reads the number and knows the size. The value ramp is deliberately uneven: `0-25` and `0-5` are 1px and 2px hairline steps, `1` through `6` move on the 4px base, then the steps jump so large spacing is reached without dozens of near-identical values. Because the token counts units, those jumps show as gaps in the names (6, 8, 10, then 12, 16, 20) rather than hiding behind evenly spaced ordinals. Figma forbids a dot in a variable name, so the two sub-base steps use a hyphen as the decimal point: `0-25` is 0.25 units, `0-5` is 0.5. The full definition is the PRESET block at the top of `scripts/spacing_scale.js`. Read it when the user asks what a step is or where a value comes from.

## The naming system

- **Variables are `Spacing/Token`**: `Spacing/4`, `Spacing/24`, `Spacing/0-5`. The slash makes Figma show them as one group named `Spacing`.
- **The token is the count of 4px units, so `token x 4 = px`.** `Spacing/4` is 16px, `Spacing/6` is 24px. The number signals the size, which is the whole point: it is read and applied as the value of other tokens (border width, border radius), so an opaque ordinal would defeat it. This is on purpose different from the color scale, whose even 50 to 950 steps suit colour but mislead on uneven spacing.
- **Dots are illegal in Figma variable names, so fractions use a hyphen.** `0-25` means 0.25 units (1px), `0-5` means 0.5 (2px). Everything from `1` up is a whole number.
- **No step is marked "Default".** Unlike the color scale's `500 Default`, spacing has no single base step, so none is labelled.

## Where it goes

- **Collection.** The script writes to the `Brand` collection, grouped as `Spacing`. It matches a collection named Brand ignoring case, and creates one if the file has none by that name. Set `COLLECTION` in the CONFIG to point at a different collection.
- **Modes.** The value is written to every mode of the collection and no mode is added. A spacing primitive is mode-agnostic: a 16px gap is 16px on Desktop and Mobile alike. Responsive spacing belongs to an Alias or Mapped tier, not to the primitives.
- **Scopes.** Each variable is scoped to Gap and Width/height, so it shows up in auto-layout spacing, padding and sizing fields but not in corner radius. Radius is a separate scale and would be its own skill.

## Step 1: Get the tools

Figma tools are often deferred, meaning connected but not loaded yet. Not seeing them in your tool list is not a reason to stop at the table. Load them with a tool search such as "figma execute".

The script needs a tool that runs Figma Plugin API JavaScript in the open file. With the Figma Console MCP that is `figma_execute`, which works through the Desktop Bridge plugin in Figma Desktop. With the Figma MCP it is `use_figma`, which needs the file key from the user's Figma link. Only conclude that Figma is unavailable after the search returns nothing that can run plugin code.

## Step 2: Run the bundled script

Read `scripts/spacing_scale.js` and send its full contents as the code, changing only the CONFIG block at the top.

```js
const REQUEST = {
  overwrite: false,  // true = reset values changed by hand back to the preset
  tokens: ["all"]    // "all", or a subset like ["4", "6", "8"]
};
const COLLECTION = "Brand"; // the collection the Spacing group lives in; created if missing
const GROUP = "Spacing";
const DRY_RUN = false;
const EXPECT_FILE = "";
```

How each request maps to the CONFIG:

| Request | CONFIG |
|---|---|
| `Spacing` or `Spacing scale` | defaults (`overwrite: false`, `tokens: ["all"]`) |
| `Spacing/4` and `Spacing/6` | `tokens: ["4", "6"]` |
| reset Spacing, regenerate the spacing scale | `overwrite: true` |
| dry run, preview | `DRY_RUN = true` |

Set `EXPECT_FILE` to the user's design system file name when you know it, from the conversation or memory, so the script stops rather than writing into the wrong file if Figma's active file has changed. Use the script rather than issuing variable-create calls by hand: it reads the live file state itself, so there is no need to fetch variables first, and it handles the cases that are easy to get wrong.

### What the script guarantees

- **Checks before it creates.** It finds the `Brand` collection and creates one only if it is missing. Collection and variable names are matched ignoring case.
- **Never duplicates.** Running the same request twice changes nothing.
- **Never deletes.** Any `Spacing/...` variable that is not in the preset is left in place and listed under `others`.
- **Protects hand-tuned values.** If an existing variable holds a value other than the preset, it is kept and reported as `kept`, because an optical correction made after testing must survive later runs. Only `overwrite: true` changes it.
- **Writes every mode.** The value is set in all of the collection's modes, so no mode is left on Figma's default.
- **Sets scopes and a description.** New variables are scoped to Gap and Width/height, and given a description saying which step they are. An existing variable's scopes are tidied only if they are still the Figma default of all-scopes, and its description is only filled if empty or previously written by this skill, so a scope or note the user set by hand is left alone.

### Reading the result

- `status`: `ok`, `partial` (something failed; see the failed rows) or `error` (nothing written; `error` explains why).
- `collection`: the `name` used and whether it was `created`.
- `variables`: `created`, `updated`, `unchanged`, `kept`, `failed` and `scoped` counts, plus `rows` and `others`.
  - Each row is one token with its `value` and an `action`: `created`, `updated`, `unchanged`, `kept` or `failed`. `was` is the old value on an update; `current` is the kept value; `reason` is why one failed.
  - `others` lists `Spacing/...` variables outside the preset. Do not delete them yourself.

## Step 3: Confirm and report

Reply briefly:

- Which collection the variables went into, and whether it was newly created.
- A table of the steps so the user can check them against Figma. Leave out rows that were already correct unless it was a dry run.

| Token | Value |
|---|---:|
| Spacing/4 | 16px |

- Anything `kept`, in one line, with its current value, so the user can decide whether to reset it. If almost everything is `kept`, the group was probably built by hand with other values; say that sending "reset Spacing" will put it on the preset.
- `others`, in one line, if it is not empty.
- Anything that `failed`, with the reason.

Keep to what the report contains. Do not add spacing advice or suggestions for extra steps unless asked.

## Changing the preset

To add, remove or change a step, edit the PRESET block in the script and repackage the skill. Say so when the user asks for a permanent change, because editing values in Figma fixes their file but not the next file the skill runs on. Keep the token equal to the value in 4px units (`token x 4 = px`), and write any sub-base fraction with a hyphen for the decimal point, since Figma rejects a dot in a name.

## When to ask

- The request names a token that is not in the scale.
- There is no collection named `Brand` and you are not sure the skill should create one. By default it creates `Brand`; if the user keeps spacing in a differently named collection, set `COLLECTION` to that name instead.
- A reset would overwrite values reported as `kept`. Confirm before sending `overwrite: true` if the user did not clearly ask to reset.
- The script stops because the open file is not the expected one. Say which file is open and ask the user to bring the right one to the front.
- After a tool search, nothing connected can run Plugin API code, or the call fails because Figma Desktop or the Desktop Bridge plugin is not running. Give the scale table, say plainly that nothing was created, and name what is missing so the user can fix it and resend.
