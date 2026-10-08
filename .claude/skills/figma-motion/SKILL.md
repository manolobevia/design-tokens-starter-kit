---
name: figma-motion
description: Write animation durations and easing curves to Figma Brand as native TIMING and EASING variables (Motion/Duration/Default = 1000ms). Use for Motion, Motion/Easing, or reset.
---

# Figma motion

Write animation durations and easing curves to Figma as variables of Figma's native motion types, so designers and developers use the same timing.

**The deliverable is the variables in Figma.** A table of values in chat is only the receipt. The task is finished when the variables exist in the user's file and you have confirmed it, so always carry on through Step 2 and Step 3.

The tokens are a fixed preset. A bare `Motion` is the whole request and the go-ahead. Build it and write it without asking for confirmation first. The only reasons to stop are listed under "When to ask".

## Help

If the user types `-h`, `-help` or `help` with this skill, print the usage below as a code block and stop. Do not load Figma tools, run the script or write anything.

```
/figma-motion  usage
Writes animation durations and easing curves to Brand, for code.

  Motion                      Durations and easing curves
  Motion/Duration             One group (Duration or Easing)
  reset Motion                Overwrite values changed by hand
  dry run                     Preview only, writes nothing

Duration  XFast 250ms, Fast 500ms, Default 1000ms, Slow 1500ms, XSlow 2500ms
Easing    Standard, Enter, Exit, Linear (CSS timing functions)

Durations are TIMING variables and easings are EASING variables, Figma's native
motion types. figma-export-tokens writes them as 1000ms and cubic-bezier(...).
```

## The input

| The user types | What it means |
|---|---|
| `Motion` | Write both groups |
| `Motion/Duration`, `Motion/Easing` | One group. Both can come in one message |
| "reset Motion", "regenerate the motion tokens" | Put values changed by hand back on the preset (overwrite) |
| "dry run" or "preview" with any of the above | Report what would happen and write nothing |

## The tokens

| Token | Value | Use |
|---|---|---|
| `Motion/Duration/XFast` | 250 ms | Micro feedback: a pressed state, a color change |
| `Motion/Duration/Fast` | 500 ms | Small elements: toggles, checkboxes, hover |
| `Motion/Duration/Default` | 1000 ms | Most transitions: menus, tooltips, expanding rows |
| `Motion/Duration/Slow` | 1500 ms | Larger elements: panels, drawers, modals |
| `Motion/Duration/XSlow` | 2500 ms | Full-screen and page transitions |
| `Motion/Easing/Standard` | `cubic-bezier(0.2, 0, 0, 1)` | Elements that move within the screen |
| `Motion/Easing/Enter` | `cubic-bezier(0, 0, 0, 1)` | Elements arriving: they start fast and settle |
| `Motion/Easing/Exit` | `cubic-bezier(0.3, 0, 1, 1)` | Elements leaving: they speed up and go |
| `Motion/Easing/Linear` | `cubic-bezier(0, 0, 1, 1)` | Progress bars and loaders: constant speed |

The full definition is the PRESET block at the top of `scripts/motion_scale.js`.

## The naming system

- **Variables are `Motion/<Group>/<Token>`**, in the `Brand` collection like every other primitive.
- **Units.** The scale is in proportion to `Default` (1000 ms): XFast is a quarter, Fast a half, Slow one and a half, XSlow two and a half. **A TIMING variable is stored in seconds**, so Default is the number `1`, and Figma's Variables panel shows it as 1000 ms. The script takes the preset in milliseconds and converts it, so never write `200` meaning 200 ms: Figma would show 200000 ms.
- **Native types.** Durations are `TIMING` variables and easings are `EASING` variables (a custom cubic bezier), the types Figma added for motion. Linear is the bezier `0, 0, 1, 1`. `Default` is the one to use unless there is a reason not to; `XFast` and `XSlow` sit beyond Fast and Slow.
- **Enter and Exit** are named for what the element does, not for the curve: arriving things decelerate, leaving things accelerate.
- **No scopes.** Figma does not let TIMING and EASING variables have scopes, so none are set.
- **Upgrading.** An earlier version of this skill wrote durations as numbers and easings as text. A run replaces those, and only those (the description carries this skill's mark), with the native types. A `Motion/...` variable made by hand is never touched.

## Where it goes

- **Collection.** The `Brand` collection (matched ignoring case, created if missing).
- **Modes.** The value is written to every mode and no mode is added. Motion is mode-agnostic.

## Step 1: Get the tools

Figma tools are often deferred, meaning connected but not loaded. Load them with a tool search such as "figma execute". The script needs a tool that runs Figma Plugin API JavaScript in the open file. With the Figma Console MCP that is `figma_execute`.

## Step 2: Run the bundled script

Read `scripts/motion_scale.js` and send its full contents as the code, changing only the CONFIG block at the top. Set `EXPECT_FILE` to the user's design system file name when you know it.

```js
const REQUEST = {
  overwrite: false,  // true = reset values changed by hand back to the preset
  groups: ["all"]    // "all", or any of "Duration", "Easing"
};
const COLLECTION = "Brand";
const DRY_RUN = false;
const EXPECT_FILE = "";
```

| Request | CONFIG |
|---|---|
| `Motion` | defaults |
| `Motion/Easing` | `groups: ["Easing"]` |
| reset, regenerate | `overwrite: true` |
| dry run, preview | `DRY_RUN = true` |

### What the script guarantees

- **Never duplicates.** Variables are found by name first, so running it twice changes nothing.
- **Never deletes.** Any `Motion/...` variable outside the preset is left in place and listed under `others`.
- **Protects hand-tuned values.** A value other than the preset is kept and reported as `kept`. Only `overwrite: true` changes it.
- **Writes every mode**, and adds a description to each variable.
- **Replaces older number and text versions** of its own tokens with the native types, and reports them as `replaced`.

### Reading the result

- `status`: `ok`, `partial` (something failed) or `error` (nothing written).
- `collection`: the name used and whether it was created.
- `variables`: `created`, `updated`, `unchanged`, `kept`, `replaced`, `failed` counts, plus `rows` and `others`.

## Step 3: Confirm and report

Reply briefly:

- Which collection the variables went into, and whether it was newly created.
- A table of the tokens that were written (durations in ms, easings as curves).
- Anything `kept`, with its current value, so the user can decide whether to reset it. `others` in one line.
- Anything that `failed`, with the reason.
- That the values use Figma's native types. In the Variables panel Motion/Duration/Default should read 1000 ms; if it does not, say so, because the unit is what Figma shows. `Export tokens` writes them as CSS (`--brand-motion-duration-default: 1000ms`).

Do not add animation advice unless asked.

## When to ask

- The request names a group that is not Duration or Easing.
- A reset would overwrite values reported as `kept` that the user did not clearly ask to reset.
- The open file is not the one the user means. Say which file is open and ask them to bring the right one to the front.
- After a tool search, nothing connected can run Plugin API code, or the call fails because Figma Desktop or the Desktop Bridge plugin is not running. Say plainly that nothing was created and name what is missing.
