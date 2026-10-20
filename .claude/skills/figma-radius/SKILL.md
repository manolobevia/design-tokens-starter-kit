---
name: figma-radius
description: Write the border-radius scale as number variables in Figma Brand under Border radius (Border radius/2 = 8px, plus full). Use for Border radius or asks to reset the scale.
---

# Figma radius

Write the radius scale to Figma as number variables.

**The deliverable is the variables in Figma.** A table of values in chat is only the receipt. The task is finished when the variables exist in the user's file and you have confirmed it, so always carry on through Step 2 and Step 3.

The scale is a fixed preset, not a calculation. It is the same every run, so a bare `Border radius` is the whole request and the go-ahead. Build it and write it without asking for confirmation first. The only reasons to stop are listed under "When to ask".

## Help

If the user types `-h`, `-help` or `help` with this skill, print the usage below as a code block and stop. Do not load Figma tools, run the script or write anything.

```
/figma-radius  usage
  Border radius, Radius                    The whole scale
  Border radius/2                             One step (several can share a message)
  reset Border radius, regenerate the scale   Overwrite hand-changed values
  dry run                              Preview only, writes nothing

Token = pixels / 4: Border radius/2 is 8px. Steps: 0, 0-5, 1, 2, 3, 4, 6, full (9999px).
```

## The input

| The user types | What it means |
|---|---|
| `Border radius` | Write the whole Border radius group |
| `Border radius/2` | Write one or a few steps. Several can come in one message |
| "reset Border radius", "regenerate the scale" | Recalculate values that were changed by hand (overwrite) |
| "dry run" or "preview" with any of the above | Report what would happen and write nothing |

## The scale

| Token | Value |
|---|---:|
| `0` | 0px |
| `0-5` | 2px |
| `1` | 4px |
| `2` | 8px |
| `3` | 12px |
| `4` | 16px |
| `6` | 24px |
| `full` | 9999px (fully rounded: pills, circles) |

The token is the value in 4px units, so `token x 4 = px`, the same rule as the spacing scale. `full` is the one exception: 9999px, which Figma clamps to a perfect pill or circle on any layer.

The full definition is the PRESET block at the top of `scripts/radius_scale.js`. Read it when the user asks what a step is or where a value comes from.

## The naming system

- **Variables are `Border radius/Token`**: `Border radius/2`, `Border radius/full`. The slash makes Figma show them as one group named `Border radius`.
- **The token counts 4px units**, so `Border radius/2` is 8px. Same rule as `Spacing`.
- **Dots are illegal in Figma variable names**, so the 2px step is `0-5` (0.5 units).
- **No step is marked "Default".**

## Where it goes

- **Collection.** The script writes to the `Brand` collection, grouped as `Border radius`. It matches a collection named Brand ignoring case, and creates one if the file has none by that name. Set `COLLECTION` in the CONFIG to point at a different collection.
- **Modes.** The value is written to every mode of the collection and no mode is added. A primitive is mode-agnostic.
- **Scopes.** Each variable is scoped to Corner radius, so it shows up in the corner radius fields and not in gap, padding or sizing.

## Step 1: Get the tools

Figma tools are often deferred, meaning connected but not loaded yet. Not seeing them in your tool list is not a reason to stop at the table. Load them with a tool search such as "figma execute".

The script needs a tool that runs Figma Plugin API JavaScript in the open file. With the Figma Console MCP that is `figma_execute`, which works through the Desktop Bridge plugin in Figma Desktop. With the Figma MCP it is `use_figma`, which needs the file key from the user's Figma link. Only conclude that Figma is unavailable after the search returns nothing that can run plugin code.

## Step 2: Run the bundled script

**Fast path, no pasting.** If the script server is running (`curl -s localhost:9231/health` prints `ok`), do not read or paste the script. Send this instead, with the CONFIG constants you would have changed given as JSON in `cfg` (a constant replaces the whole value, so give a full object for `REQUEST` or `SCALE`; an unknown name is refused). The result is the same one the script returns when pasted.

```js
const u = "http://localhost:9231/figma-radius/scripts/radius_scale.js?cfg=" + encodeURIComponent(JSON.stringify({ EXPECT_FILE: "<file name>" }));
return await (0, eval)("(async()=>{" + await (await fetch(u)).text() + "})()");
```

Start the server once per session with `python3 ~/.claude/skills/figma-starter/scripts/serve_scripts.py` as a background command. If it cannot run, paste the script as described next.

Read `scripts/radius_scale.js` and send its full contents as the code, changing only the CONFIG block at the top.

```js
const REQUEST = {
  overwrite: false,  // true = reset values changed by hand back to the preset
  tokens: ["all"]    // "all", or a subset like ["1", "2"]
};
const COLLECTION = "Brand";
const GROUP = "Border radius";
const DRY_RUN = false;
const EXPECT_FILE = "";
```

How each request maps to the CONFIG:

| Request | CONFIG |
|---|---|
| `Border radius` | defaults (`overwrite: false`, `tokens: ["all"]`) |
| `Border radius/2` | `tokens: ["1", "2"]` |
| reset, regenerate | `overwrite: true` |
| dry run, preview | `DRY_RUN = true` |

Set `EXPECT_FILE` to the user's design system file name when you know it, so the script stops rather than writing into the wrong file if Figma's active file has changed. Use the script rather than issuing variable-create calls by hand: it reads the live file state itself, so there is no need to fetch variables first.

### What the script guarantees

- **Checks before it creates.** It finds the `Brand` collection and creates one only if it is missing. Names are matched ignoring case.
- **Never duplicates.** Running the same request twice changes nothing.
- **Never deletes.** Any `Border radius/...` variable that is not in the preset is left in place and listed under `others`.
- **Protects hand-tuned values.** A value other than the preset is kept and reported as `kept`. Only `overwrite: true` changes it.
- **Writes every mode**, so no mode is left on Figma's default.
- **Sets scopes and a description.** New variables are scoped and described. An existing variable's scopes are tidied only if they are still the Figma default of all-scopes, and its description is only filled if empty or previously written by this skill.

### Reading the result

- `status`: `ok`, `partial` (something failed; see the failed rows) or `error` (nothing written; `error` explains why).
- `collection`: the `name` used and whether it was `created`.
- `variables`: `created`, `updated`, `unchanged`, `kept`, `failed` and `scoped` counts, plus `rows` and `others`. Each row has the `token`, its `value` and an `action`; `was` is the old value on an update, `current` the kept value, `reason` why one failed.

## Step 3: Confirm and report

Reply briefly:

- Which collection the variables went into, and whether it was newly created.
- A table of the steps so the user can check them against Figma. Leave out rows that were already correct unless it was a dry run.
- Anything `kept`, in one line, with its current value, so the user can decide whether to reset it.
- `others`, in one line, if it is not empty.
- Anything that `failed`, with the reason.

Keep to what the report contains. Do not add design advice unless asked.

## Changing the preset

To add, remove or change a step, edit the PRESET block in the script and repackage the skill. Say so when the user asks for a permanent change, because editing values in Figma fixes their file but not the next file the skill runs on.

## When to ask

- The request names a token that is not in the scale.
- A reset would overwrite values reported as `kept`. Confirm before sending `overwrite: true` if the user did not clearly ask to reset.
- The script stops because the open file is not the expected one. Say which file is open and ask the user to bring the right one to the front.
- After a tool search, nothing connected can run Plugin API code, or the call fails because Figma Desktop or the Desktop Bridge plugin is not running. Give the scale table, say plainly that nothing was created, and name what is missing so the user can fix it and resend.
