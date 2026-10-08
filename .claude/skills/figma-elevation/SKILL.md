---
name: figma-elevation
description: Build shadows and elevation as tokens: black opacity colors, offsets and blurs, Light/Dark shadow colors, and Elevation/1 to 5 effect styles. Use for Elevation, Elevation/3, or Shadows.
---

# Figma elevation

Build shadows as part of the token system, not as loose effect styles. Each of five levels is two layered drop shadows (a key shadow and a soft ambient one), and every color, offset and blur is bound to a variable, so shadows follow Light and Dark and change when a number changes.

**The deliverable is the variables and the effect styles in Figma.** A table in chat is only the receipt.

## Help

If the user types `-h`, `-help` or `help` with this skill, print the usage below as a code block and stop. Do not load Figma tools, run the script or write anything.

```
/figma-elevation  usage
Builds shadow tokens and 5 elevation effect styles.

  Elevation, Shadows       Everything: colors, numbers and Elevation/1 to Elevation/5
  Elevation/3              One level (several can share a message: Elevation/1 Elevation/4)
  reset Elevation          Put values and styles changed by hand back on the preset
  dry run                  Preview only, writes nothing

Levels: 1 cards and raised rows, 2 dropdowns and menus, 3 popovers and tooltips,
4 modals and drawers, 5 toasts and the top-most layer.
```

## The input

| The user types | What it means |
|---|---|
| `Elevation` or `Shadows` | Write everything: the variables and all five styles |
| `Elevation/3` | One level. Several can come in one message |
| "reset Elevation", "regenerate the shadows" | Put values and styles changed by hand back on the preset (overwrite) |
| "dry run" or "preview" with any of the above | Report what would happen and write nothing |

A message in this form is the whole request and the go-ahead. Run it without asking for confirmation first, because the script is safe to repeat. The only reasons to stop are listed under "When to ask".

## What it builds

| Tier | What | Value |
|---|---|---|
| Brand | `Shadow/Soft`, `Medium`, `Strong`, `Heavy` | Black at 8%, 14%, 24%, 40% |
| Brand | `Elevation/<n>/Key Y`, `Key Blur`, `Ambient Y`, `Ambient Blur` | Numbers in px, five levels |
| Alias | `Shadow/Soft` to `Heavy` | References into Brand |
| Mapped | `Shadow/key` | Light: Medium, Dark: Heavy |
| Mapped | `Shadow/ambient` | Light: Soft, Dark: Strong |
| Styles | `Elevation/1` to `Elevation/5` | Two drop shadows each, all values bound |

| Level | Key Y / blur | Ambient Y / blur | Use |
|---|---|---|---|
| 1 | 1 / 3 | 0 / 1 | Cards and raised rows |
| 2 | 2 / 6 | 0 / 2 | Dropdowns and menus |
| 3 | 6 / 12 | 1 / 3 | Popovers and tooltips |
| 4 | 12 / 24 | 2 / 6 | Modals and drawers |
| 5 | 24 / 48 | 4 / 12 | Toasts and the top-most layer |

The full definition is the PRESET block at the top of `scripts/elevation.js`. Read it when the user asks where a value comes from.

Two design choices to know about:
- **The opacity lives in the Brand colors.** A shadow color bound to a variable takes that variable's own opacity, so the four black opacities are color variables. Brand holds raw values, Alias references them, Mapped says which one means key and ambient.
- **Dark mode is stronger on purpose**, because a black shadow is harder to see on a dark surface. Even so, on near-black surfaces most of the lift in Dark comes from lighter card surfaces (`Surface/default` is lighter than `Surface/page` in Dark), not from the shadow. Say so if the user asks why Dark shadows look subtle.

## Step 1: Get the tools

Figma tools are often deferred, meaning connected but not loaded. Load them with a tool search such as "figma execute". The script needs a tool that runs Figma Plugin API JavaScript in the open file. With the Figma Console MCP that is `figma_execute`.

## Step 2: Run the bundled script

Read `scripts/elevation.js` and send its full contents as the code, changing only the CONFIG block at the top. Set the tool's timeout to 30000 ms. Set `EXPECT_FILE` to the user's design system file name when you know it.

```js
const REQUEST = {
  overwrite: false,  // true = reset values and styles changed by hand
  levels: ["all"]    // "all", or a subset like ["1", "3"]
};
const DRY_RUN = false;
const EXPECT_FILE = "";
```

| Request | CONFIG |
|---|---|
| `Elevation`, `Shadows` | defaults |
| `Elevation/3` | `levels: ["3"]` |
| reset, regenerate | `overwrite: true` |
| dry run, preview | `DRY_RUN = true` |

### What the script guarantees

- **Never duplicates.** Every variable and style is found by name first. Running it twice changes nothing.
- **Never deletes.** It only creates and, with `overwrite`, resets.
- **Protects hand-tuned values.** A number, color or style that differs from the preset is kept and counted as `kept`. Only `overwrite: true` changes it.
- **Follows the architecture.** Brand holds values, Alias references Brand, Mapped references Alias. It creates the Brand, Alias and Mapped collections only if they are missing.
- **Writes every mode** of Brand and Alias, and Light and Dark in Mapped when the Dark mode exists. If Mapped has no Dark mode yet, it says so; run `Mapped dark` and then `Elevation` again.

### Reading the result

- `status`: `ok`, `partial` (something failed; see `problems`) or `error` (nothing written).
- `variables`: `created`, `updated`, `unchanged`, `kept`, `failed` counts across Brand, Alias and Mapped.
- `styles`: counts plus a row per level with its `action` and `use`.
- `collections`: any collection the script had to create.
- `notes` and `problems`: anything that applies to the whole run.

## Step 3: Confirm and report

Reply briefly:

- How many variables and styles were created, updated, kept or already correct.
- A short table of the five levels with their use, so the user can check them against Figma.
- Any note, such as Mapped having no Dark mode, and anything `kept`, so the user can decide whether to reset it.
- How to apply a style: select a layer, then choose `Elevation/3` under Effects. In Dark, set the frame to the Dark mode of `Mapped`.

Do not add design advice unless asked.

## When to ask

- The request names a level that is not in the preset (1 to 5).
- The open file is not the one the user means. Say which file is open and ask them to bring the right one to the front.
- A reset would overwrite values reported as `kept` that the user did not clearly ask to reset.
- After a tool search, nothing connected can run Plugin API code, or the call fails because Figma Desktop or the Desktop Bridge plugin is not running. Say plainly that nothing was created and name what is missing.
