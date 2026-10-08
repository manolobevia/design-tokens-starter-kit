---
name: figma-sizing
description: Write icon, control and avatar sizes to Figma Brand as number variables (Size/Icon/Default = 20px). Use for Sizing, Sizing/Icon, Sizing/Control, Sizing/Avatar, or asks to reset or regenerate sizes.
---

# Figma sizing

Write component sizes to Figma as number variables, so icons, buttons, inputs and avatars share the same few sizes.

**The deliverable is the variables in Figma.** A table of values in chat is only the receipt. The task is finished when the variables exist in the user's file and you have confirmed it, so always carry on through Step 2 and Step 3.

The sizes are a fixed preset, not a calculation. A bare `Sizing` is the whole request and the go-ahead. Build it and write it without asking for confirmation first. The only reasons to stop are listed under "When to ask".

## Help

If the user types `-h`, `-help` or `help` with this skill, print the usage below as a code block and stop. Do not load Figma tools, run the script or write anything.

```
/figma-sizing  usage
Writes icon, control and avatar sizes to Brand as number variables.

  Sizing, Sizing scale        All three groups
  Sizing/Icon                 One group (Icon, Control or Avatar). Several can share a message
  reset Sizing                Overwrite values changed by hand
  dry run                     Preview only, writes nothing

Icon     XSmall 12, Small 16, Default 20, Large 24, XLarge 32
Control  Small 32, Default 40, Large 48, Touch 44 (minimum tap target)
Avatar   XSmall 24, Small 32, Default 40, Large 56, XLarge 72
```

## The input

| The user types | What it means |
|---|---|
| `Sizing` or `Sizing scale` | Write all three groups |
| `Sizing/Icon`, `Sizing/Control`, `Sizing/Avatar` | One group. Several can come in one message |
| "reset Sizing", "regenerate the sizes" | Put values changed by hand back on the preset (overwrite) |
| "dry run" or "preview" with any of the above | Report what would happen and write nothing |

## The sizes

| Group | Token | px | Use |
|---|---|---:|---|
| Icon | XSmall | 12 | Inline icons in small text |
| Icon | Small | 16 | Icons beside body text and in dense UI |
| Icon | Default | 20 | Standard icon size |
| Icon | Large | 24 | Icons in navigation and headings |
| Icon | XLarge | 32 | Feature and empty-state icons |
| Control | Small | 32 | Compact buttons and inputs |
| Control | Default | 40 | Standard button, input and select height |
| Control | Large | 48 | Prominent buttons and inputs |
| Control | Touch | 44 | Minimum tap target on touch screens |
| Avatar | XSmall | 24 | Avatars in dense lists |
| Avatar | Small | 32 | Avatars in tables and comments |
| Avatar | Default | 40 | Standard avatar |
| Avatar | Large | 56 | Profile headers and cards |
| Avatar | XLarge | 72 | Profile pages |

The full definition is the PRESET block at the top of `scripts/sizing_scale.js`. Read it when the user asks where a size comes from.

## The naming system

- **Variables are `Size/<Group>/<Token>`**: `Size/Icon/Default`, `Size/Control/Touch`. The slashes make Figma show them as groups.
- **Small, Default, Large**, the same words as the text styles. `Default` is the one to use unless there is a reason not to, and `XSmall` and `XLarge` sit beyond them.
- **Touch** is the exception: it is the 44px minimum tap target, not a step on the scale. A control that is shorter than 44 needs padding around it on touch screens.
- **No dots**: Figma forbids a dot in a variable name, and none of these sizes need one.

## Where it goes

- **Collection.** The `Brand` collection (matched ignoring case, created if missing).
- **Modes.** The value is written to every mode and no mode is added. A size is mode-agnostic.
- **Scopes.** Each variable is scoped to Width and height, so it shows up in size fields and not in padding, gap or corner radius.
- **Using them.** Bind a layer's width or height to the variable. In auto layout, fixed sizes like `Size/Control/Default` give every button the same height.

## Step 1: Get the tools

Figma tools are often deferred, meaning connected but not loaded. Load them with a tool search such as "figma execute". The script needs a tool that runs Figma Plugin API JavaScript in the open file. With the Figma Console MCP that is `figma_execute`.

## Step 2: Run the bundled script

Read `scripts/sizing_scale.js` and send its full contents as the code, changing only the CONFIG block at the top. Set `EXPECT_FILE` to the user's design system file name when you know it.

```js
const REQUEST = {
  overwrite: false,  // true = reset values changed by hand back to the preset
  groups: ["all"]    // "all", or any of "Icon", "Control", "Avatar"
};
const COLLECTION = "Brand";
const DRY_RUN = false;
const EXPECT_FILE = "";
```

| Request | CONFIG |
|---|---|
| `Sizing`, `Sizing scale` | defaults |
| `Sizing/Icon` and `Sizing/Avatar` | `groups: ["Icon", "Avatar"]` |
| reset, regenerate | `overwrite: true` |
| dry run, preview | `DRY_RUN = true` |

### What the script guarantees

- **Never duplicates.** Variables are found by name first, so running it twice changes nothing.
- **Never deletes.** Any `Size/...` variable outside the preset is left in place and listed under `others`.
- **Protects hand-tuned values.** A value other than the preset is kept and reported as `kept`. Only `overwrite: true` changes it.
- **Writes every mode**, and sets scopes and a description on variables that have none.

### Reading the result

- `status`: `ok`, `partial` (something failed) or `error` (nothing written).
- `collection`: the name used and whether it was created.
- `variables`: `created`, `updated`, `unchanged`, `kept`, `failed` counts, plus `rows` and `others`.

## Step 3: Confirm and report

Reply briefly:

- Which collection the variables went into, and whether it was newly created.
- A table of the sizes that were written, grouped Icon, Control, Avatar, so the user can check them against Figma. Leave out rows that were already correct unless it was a dry run.
- Anything `kept`, with its current value, so the user can decide whether to reset it. `others` in one line.
- Anything that `failed`, with the reason.

Do not add design advice unless asked.

## When to ask

- The request names a group that is not Icon, Control or Avatar.
- A reset would overwrite values reported as `kept` that the user did not clearly ask to reset.
- The open file is not the one the user means. Say which file is open and ask them to bring the right one to the front.
- After a tool search, nothing connected can run Plugin API code, or the call fails because Figma Desktop or the Desktop Bridge plugin is not running. Say plainly that nothing was created and name what is missing.
