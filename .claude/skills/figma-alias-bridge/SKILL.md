---
name: "figma-alias-bridge"
description: Link Brand groups to Alias roles in Figma as references. Use for arrow lines like Brand/Purple -> Alias/Primary (Purple), or -default for Primary, Neutral, Error, Success, Warning, Information.
---

# Figma alias bridge

Link one group of Figma variables to another, tier to tier. Each variable in the target group holds an alias (a reference) to the matching variable in the source group.

**The deliverable is the alias variables in Figma.** A table in chat is only the receipt. The task is finished when the variables exist in the user's file and point at the right sources.

## The input

One line per bridge, source on the left, target on the right:

```
Brand/Purple -> Alias/Primary (Purple)
```

Read it as "take everything in the Purple group of the Brand collection and mirror it into the Alias collection as a group named Primary".

- The first segment of each side is the **collection** (`Brand`, `Alias`). Everything after it is the **group**.
- **The part in parentheses is a note, not part of the name.** The user writes `(Purple)` to remind themselves which brand color feeds the role. The group is created as `Primary`, so the variables are `Primary/950` through `Primary/50`. An alias name describes a role and has to survive a change of color: if Primary becomes blue one day, a group called "Primary (Purple)" would be lying. The script removes the note for you, so pass the user's line through as typed and never add a color to a group name yourself.
- Apart from the note, the target group name is used exactly as typed, including spaces and capitalization.
- The note is optional. `Brand/Purple -> Alias/Primary` gives the same result.
- The arrow can be `->`, `→`, `=>`, or the word "to". Several bridges can arrive in one message, one per line. Handle each the same way.

### Default set

`-default` is shorthand for these six lines. Put them in `BRIDGES` exactly as written:

```
Brand/Purple -> Alias/Primary (Purple)
Brand/Gray -> Alias/Neutral (Gray)
Brand/Red -> Alias/Error (Red)
Brand/Green -> Alias/Success (Green)
Brand/Orange -> Alias/Warning (Orange)
Brand/Blue -> Alias/Information (Blue)
```

It can be combined with typed lines, for example `-default` followed by `Brand/Brown -> Alias/Primary`. A typed line replaces the default line for the same target role, so the example above feeds Primary from Brown and not from Purple. If a Brand group in the set does not exist, the script reports it under the usual missing-source rule: bridge the groups that exist, name the ones that do not, and do not guess. Foundation is not part of the set.

A message in this format is the whole request and the go-ahead. Run it without asking for confirmation first, because the user designed this to be a one-line action and the operation is safe to repeat (see "What the script guarantees"). The only reasons to stop are listed under "When to ask".

## Why aliases and not values

The user works in three tiers: Brand (raw values), Alias (roles like Primary), Mapped (usage). The whole point of the Alias tier is that it stores no color of its own. If Brand/Purple changes, Primary follows; if Primary should become blue one day, one repoint changes everything downstream.

So a target variable that holds a copied hex is a failure even though it looks identical on screen. Tools that create variables from hex strings (`figma_batch_create_variables`, `figma_batch_update_variables`) cannot produce a reference, so do not use them for this, and never fall back to copying values when alias creation is not possible. Say what is blocking instead.

## Step 1: Get the tools

Figma tools are often deferred, meaning connected but not loaded. Not seeing them in your tool list is not a reason to stop. Load them with a tool search such as "figma execute".

The script needs a tool that runs Figma Plugin API JavaScript in the open file. With the Figma Console MCP that is `figma_execute`, which works through the Desktop Bridge plugin in Figma Desktop. If a different Figma MCP is connected, use its equivalent for running Plugin API code.

## Step 2: Run the bundled script

Read `scripts/alias_bridge.js` and send its full contents as the code, changing only the CONFIG block at the top:

```js
const BRIDGES = [
  { from: "Brand/Purple", to: "Alias/Primary (Purple)" }
];
const DRY_RUN = false;
```

Put one object per bridge in `BRIDGES`, with `from` and `to` copied from the user's line, note included. The script strips the note and reports it back. Send everything below the CONFIG block unchanged. Set the tool's timeout to 15000 ms.

Use the script rather than writing the logic fresh each time. It reads the live file state itself, so there is no need to call `figma_get_variables` first, and it already handles the cases that are easy to get wrong by hand (see below).

Set `DRY_RUN = true` only when the user asks for a preview or a dry run. It returns the same report with nothing written.

### What the script guarantees

- **Mirrors the source group one to one.** Every variable in the source group gets a partner with the same step name, so `Brand/Purple/500 Default` becomes `Alias/Primary/500 Default`. Nothing is renamed or skipped.
- **Keeps the source order**, so a 950 to 50 scale stays dark to light in the panel.
- **Creates the target collection if it does not exist** and reuses it if it does.
- **Never duplicates.** If a target variable already exists it is repointed in place, which keeps its ID so anything already bound to it stays connected. Running the same line twice changes nothing.
- **Sets the alias in every mode** of the target collection, so no mode is left on Figma's default white.
- **Never deletes.** Variables already in the target group that have no partner in the source are left alone and listed under `untouched`.
- **Matches collection and group names case-insensitively** when looking things up, and handles collection names that contain a slash.

### Reading the result

The script returns one entry per bridge:

- `status`: `ok`, `partial` (some variables failed, each with its own `error`), or `error` (nothing written for that bridge; `error` explains why and lists the collections or groups that do exist).
- `collection`, `group` (the name actually used, without the note), and `collectionCreated`.
- `note` and `noteMatchesSource`: the text that was in parentheses, and whether it names the source group.
- `created`, `repointed`, `unchanged`, `failed` counts.
- `tokens`: one row per variable with `alias`, `source`, the resolved `value`, the `action`, and for repointed variables `was` (what it pointed to before).
- `untouched`: leftovers in the target group.

If anything failed, retry once, then report what happened.

## Step 3: Confirm and report

Reply briefly:

- Which collection the group went into and whether it was newly created.
- How many variables were created, repointed, or already correct.
- A table of alias, what it points to, and the resolved value, so the user can check it against Figma:

| Alias | Points to | Value |
|---|---|---|
| Primary/950 | Brand/Purple/950 | #090614 |

- If a group was repointed, say what it pointed to before.
- If `noteMatchesSource` is false (for example `Brand/Red -> Alias/Error (Blue)`), mention it in one line. The source on the left is what the variables point to; the mismatch is probably a typo and the user can resend the line if they meant the other color.
- If `untouched` is not empty, list those names in one line so the user can decide whether to remove them. Do not delete them yourself.

Do not add contrast notes, naming advice, or suggestions for the next tier unless asked.

## When to ask

- The line cannot be read as a source and a target, or one side has a collection but no group.
- The script reports that the source collection or group does not exist. Relay the names that do exist so the user can resend a corrected line. Do not guess which one they meant: a wrong guess silently wires a role to the wrong color.
- The script reports a type mismatch (for example an existing target variable is a number and the source is a color).
- After a tool search, nothing connected can run Plugin API code, or the call fails because Figma Desktop or the Desktop Bridge plugin is not running. Say plainly that nothing was created and name what is missing, so the user can fix it and resend the line.
