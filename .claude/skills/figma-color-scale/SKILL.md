---
name: figma-color-scale
description: Create 11-step color scales (950-50) as Figma Brand variables from Name:#HEX, or add the default set (-default: red, blue, orange, green, gray, Foundation) for tints, shades and color ramps.
---

# Figma color scale

Turn one base color into an 11-step scale and add it to Figma as variables.

**The deliverable is the variables in Figma.** A table of hex values in chat is only the receipt. The task is finished when the variables exist in the user's file and you have confirmed it, so always carry on through Step 2 and Step 3 after calculating.

## Help

If the user types `-h`, `-help` or `help` with this skill, print the usage below as a code block and stop. Do not load Figma tools, run the script or write anything.

```
/figma-color-scale  usage
Turns one base color into an 11-step scale (950 to 50) in the Brand collection.

  Purple:#5C3FC4          Scale Purple/950 to Purple/50. Your hex is the 500 Default
  Name=#HEX, Name:HEX     Also accepted (with or without #, 3 or 6 digits)
  several colors          One per line, or separated by spaces or commas
  -default                Red, Blue, Orange, Green, Gray, plus Foundation
  Foundation              Only Foundation/White and Foundation/Black
  -default Purple:#3B1A53 The default set plus your own color
  dry run                 Preview only, writes nothing
```

The user's input is a single line per color:

```
Purple:#5C3FC4
```

The name becomes the variable group. The hex is the 500 Default step. Several colors can arrive in one message, one per line or separated by spaces or commas. Handle each the same way.

### Default set

Two extra triggers add the standard system colors without typing hexes:

| The user types | What it writes |
|---|---|
| `-default` | Red (error), Blue (information), Orange (warning), Green (success), Gray (neutral), each a full scale, plus Foundation |
| `Foundation` | Only `Foundation/White` (#FFFFFF) and `Foundation/Black` (#000000), single variables, not scales |

They combine with typed colors, for example `-default` followed by `Purple:#3B1A53`. A color typed by the user wins over the preset color of the same name. Pass `-default` or `Foundation` to the script as an argument and use its output like any other color. Foundation steps are not scales, so create them as plain variables with no 500 Default.

A message in this format is the whole request and the go-ahead. Build the scale and write it to Figma without asking for confirmation first, because the user designed this to be a one-line action. The only reasons to stop and ask are listed under "When to ask".

## The method

This reproduces what the designer does by hand in Figma, so the numbers match what they would get manually: place the base color on a solid surface, lower its opacity, and sample the flattened result.

| Step | Base color opacity | Surface |
|---|---|---|
| 950 | 10% | Pure black #000000 |
| 900 | 20% | Pure black #000000 |
| 800 | 40% | Pure black #000000 |
| 700 | 60% | Pure black #000000 |
| 600 | 80% | Pure black #000000 |
| 500 Default | 100% | None, this is the base color |
| 400 | 80% | Pure white #FFFFFF |
| 300 | 60% | Pure white #FFFFFF |
| 200 | 40% | Pure white #FFFFFF |
| 100 | 20% | Pure white #FFFFFF |
| 50 | 10% | Pure white #FFFFFF |

Steps move in 20% increments, except the two ends of the scale (950 and 50), which use 10%. That is why the names jump by 100 everywhere except 900 to 950 and 100 to 50.

Per RGB channel: `result = base * opacity + surface * (1 - opacity)`, rounded to the nearest whole number.

The dark surface is pure black, not Figma's dark canvas color (#1E1E1E). Sampling swatches that sit on the canvas instead of on a black frame is an easy mistake that produces different, grayer dark steps, so do not "correct" toward those values even if older variables in the file look that way.

## Step 1: Calculate the scale

Run the bundled script. Do not work the values out mentally; 30 channel calculations per color is where small errors creep in, and a one-digit hex error is invisible until someone compares swatches.

```bash
python scripts/color_scale.py "Purple:#5C3FC4"
```

Pass several colors as separate arguments. The output is JSON with the 11 steps already named and ordered 950 to 50. Add `--table` for a markdown table.

The script accepts `Name:#RRGGBB`, `Name:RRGGBB`, `Name=#RRGGBB`, and 3-digit hex. It capitalizes the first letter of the name. If it reports that it could not read the input, ask the user for the color again in the `Name:#HEX` format.

If code execution is not available, calculate with the formula above and double-check each value.

Reference result for checking your setup, `Purple:#5C3FC4`:

```
Purple/950          #090614
Purple/900          #120D27
Purple/800          #25194E
Purple/700          #372676
Purple/600          #4A329D
Purple/500 Default  #5C3FC4
Purple/400          #7D65D0
Purple/300          #9D8CDC
Purple/200          #BEB2E7
Purple/100          #DED9F3
Purple/50           #EFECF9
```

## Step 2: Write the variables to Figma

### Get the tools

Figma tools are often deferred, meaning they are connected but not loaded yet. Not seeing them in your tool list is not a reason to stop at the table. Load them first with a tool search such as "figma variables create" and "figma get variables". Only conclude that Figma is unavailable after that search returns nothing that can write variables.

These instructions use the Figma Console MCP (tools named `figma_get_variables`, `figma_batch_create_variables`, and so on), which writes to the file open in Figma Desktop through its Desktop Bridge plugin. If a different Figma MCP is connected instead, use its equivalent for listing collections and creating color variables.

### Read the file's current state

Call `figma_get_variables` with `format: "filtered"`, `refreshCache: true`, `includePublished: false`, and `verbosity: "inventory"`. Refresh the cache every time, because the user often edits or deletes variables between requests and a stale read leads to duplicates or writes into a collection that no longer exists.

From the result you need: the collections, and the names of existing variables.

### Choose the collection

The collection is always named `Brand`, never Primitives.

- If a collection named `Brand` exists (ignore case), use it.
- Otherwise create one named `Brand` (see the first case below), even if other collections exist.

### Create the variables

Rules that apply in every case:

- Type `COLOR`.
- Names exactly as the script outputs them: `Purple/950` through `Purple/50`, with the base step named `Purple/500 Default`. The slash makes Figma show them as a group named after the color.
- Create them in the script's order, 950 first and 50 last, one color after another. Figma lists variables in creation order, and the user reads the scale dark to light.
- Set the value in every mode of the collection, so no mode is left holding Figma's default white.

**No collection exists yet.** Use `figma_setup_design_tokens`, which creates the collection, its mode, and all variables in one call. Values are keyed by mode name:

```json
{
  "collectionName": "Brand",
  "modes": ["Mode 1"],
  "tokens": [
    {"name": "Purple/950", "resolvedType": "COLOR", "values": {"Mode 1": "#090614"}},
    {"name": "Purple/900", "resolvedType": "COLOR", "values": {"Mode 1": "#120D27"}}
  ]
}
```

**The collection exists.** Use `figma_batch_create_variables`. Values are keyed by mode ID, not mode name. If the inventory read did not include mode IDs, read the collection again with `verbosity: "standard"` to get them.

```json
{
  "collectionId": "VariableCollectionId:9:249",
  "variables": [
    {"name": "Blue/950", "resolvedType": "COLOR", "valuesByMode": {"9:1": "#010811"}},
    {"name": "Blue/900", "resolvedType": "COLOR", "valuesByMode": {"9:1": "#021022"}}
  ]
}
```

Both tools take up to 100 variables per call, so up to 9 colors fit in one call. Split larger requests.

**The group already exists.** When variables with the same names are already in the collection, update their values in place with `figma_batch_update_variables` instead of creating new ones. Creating again would leave duplicates, and updating keeps the variable IDs so anything already bound to them stays connected. Create only the steps that are missing.

## Step 3: Confirm and report

Check the tool response: it reports how many variables were created and how many failed. If anything failed, retry those and say what happened.

Then reply briefly:

- Which collection the variables went into, and whether it was newly created.
- A table of the steps with their hex values (one column per color when there are several), so the user can check them against Figma.
- Whether anything was updated rather than created.

Do not add contrast audits or usage advice unless asked. The one exception: if a hex clearly does not match its name (for example a yellow labelled "Orange"), mention it in one line after the table, since it is probably a typo and easy to fix by sending the corrected `Name:#HEX`.

## When to ask

- The input cannot be parsed as a name plus a hex color.
- After a tool search, no Figma tool that can write variables is connected, or the write fails because Figma Desktop or the Desktop Bridge plugin is not running. In that case give the scale table, say plainly that the variables were not created, and name what is missing so the user can fix it and resend the color.
