---
name: "figma-mapped-roles"
description: Build the Mapped (usage) tier in Figma: Surface, Border, Text, Icon variables referencing Alias, in Light and Dark. Use for Mapped, Mapped/Text, Mapped dark, or arrows targeting Mapped.
---

# Figma mapped roles

Build the third tier of the user's color system. The tiers are Brand (raw values), Alias (roles such as Primary or Error) and Mapped (usage: what a color is for). Mapped is the tier designers actually apply to layers, and it is the tier that carries the Light and Dark modes.

**The deliverable is the variables in Figma.** A table in chat is only the receipt. The task is finished when the variables exist in the user's file and point at the right Alias variables.

## Help

If the user types `-h`, `-help` or `help` with this skill, print the usage below as a code block and stop. Do not load Figma tools, run the script or write anything.

```
/figma-mapped-roles  usage
Builds the Mapped (usage) tier: Surface, Border, Text and Icon, all references to Alias.

  Mapped                                       Full preset (Light mode)
  Mapped/Text, Mapped/Icon                     Only those groups
  Mapped dark                                  Add the Dark mode and fill it
  Mapped/Text dark                             Create the group and add Dark in one run
  Alias/Neutral/900 -> Mapped/Text/heading     Point one variable at one Alias variable
  ... -> Mapped/Text/action (dark)             Same, Dark only ((light) also works)
  rename Surface/sucess to Surface/success     Rename in place
  reset Mapped/Text                            Put hand-changed variables back on the preset
  dry run                                      Preview only, writes nothing
```

## The input

| The user types | What it means |
|---|---|
| `Mapped` | Create the full preset: Surface, Border, Text and Icon |
| `Mapped/Text` | Create one preset group. Several can come in one message |
| `Mapped dark` | Add the Dark mode and fill it for everything that already exists |
| `Mapped/Text dark` | Create the Text group and add the Dark mode in the same run |
| `Alias/Neutral/900 -> Mapped/Text/heading` | Point one variable at a specific Alias variable (creates it if it is new) |
| `Alias/Primary/300 -> Mapped/Text/action (dark)` | Same, for the Dark mode only |
| "rename Surface/sucess to Surface/success" | Rename in place, keeping everything bound to it connected |
| "reset Mapped/Text" | Put hand-changed variables of a group back on their preset values |
| "dry run" or "preview" with any of the above | Report what would happen and write nothing |

A message in one of these forms is the whole request and the go-ahead. Run it without asking for confirmation first, because the user designed these as one-line actions and the script is safe to repeat. The only reasons to stop are listed under "When to ask".

In an arrow line the source is on the left and the target on the right, the same direction as in figma-alias-bridge. The arrow can be `->`, `→`, `=>` or the word "to". The only note allowed in parentheses is `(light)` or `(dark)`.

## The naming system

The preset follows rules the user chose deliberately. Keep to them whenever a variable is added, so the system stays predictable:

- **Groups name what is being painted**: `Surface`, `Border`, `Text`, `Icon`. Variable names inside a group are lowercase with hyphens.
- **`default`, `secondary`, `tertiary` step down in prominence.** Ordinals are used because they always have a next word. Do not introduce adjectives such as subtle or strong.
- **`action` and the status names (`error`, `success`, `warning`, `information`) are the solid version**; `-secondary` is their light, tinted version. `surface/action` is a filled button, `surface/action-secondary` a secondary button.
- **`on-[surface]` is whatever sits on that surface.** `text/on-action` is the label on `surface/action`.
- **A bare role name in Text or Icon means "colored with that role".** `text/action` is a text link (the text itself is the action); `text/error` is an error message on a neutral surface.
- **Icon mirrors Text**: same names and same values, so an icon beside a label always matches it. Icon leaves out the few names that only make sense for type (subheading, caption, label, helper).

The full list of variables and what each points to is the PRESET block at the top of `scripts/mapped_roles.js`. Read it when the user asks what a group contains or which step a variable uses.

## Modes

Mapped has a **Light** mode and, once the user asks for it, a **Dark** mode. A new Figma collection calls its only mode "Mode 1"; the script renames it to Light.

Light comes first. The sound workflow is to build and test components in Light, then add Dark, because fixing two modes at once doubles every correction. So a plain `Mapped` or `Mapped/Text` never adds a mode; only a request that mentions dark does.

Dark values start from **mirroring the step** inside the same Alias group: 50 and 950 swap, 100 and 900, 200 and 800, 300 and 700, 400 and 600. 500 stays, because it is the recognizable brand color. White and Black swap.

Mirroring alone breaks a few pairs, so the preset carries a short list of exceptions. They exist only where the mirrored value fails contrast:

- A solid action or status surface keeps its brand color in dark, so its hover and pressed states keep their steps and the content on it keeps its color too (`text/on-action` stays white).
- With the default Green and Orange, white on a solid success surface (3.30:1), `text/success` at step 600 (4.34:1 on the page) and `border/warning` at step 500 (2.80:1) fail AA, so `text/on-success` uses Neutral 950 like `text/on-warning`, `text/success` uses step 700 and `border/warning` step 600.
- A 500 used as text or as a line on a dark surface is too dim, so `text/action`, `icon/action`, `border/action`, `border/focus` and `border/selected` move to lighter steps in dark (300, then 200 and 100 for hover and pressed; `text/action` and `icon/action` go one further, see below).
- `text/information` and `border/information` move one step lighter than the mirror for the same reason.
- A tinted surface would mirror to step 950, which is near black and invisible on a dark page. So the four `surface/*-secondary` status tints use step 900 in dark. The brand tints `surface/action-secondary` and `surface/selected` use 800 and `action-secondary-hover` uses 700, because a dark brand color such as Plum is already near black at 900.
- Because dark cards are lighter than the page, `text/action`, `icon/action` (and their hover and pressed states) and `border/default` move one step lighter than the mirror so they keep their contrast on a card. Text links use 200, 100 and 50.
- Surfaces step up in lightness in dark so raised layers read as raised: page is Neutral 950, `surface/default` 900, `secondary` 800 and `tertiary` 700 (`disabled` 800). Borders follow: `border/secondary` is 700, `tertiary` and `disabled` are 800.

The neutral scale needs visible steps between 950 and 600 for this to work. A near-black scale (a color like Midnight used as Neutral) makes every dark surface collapse into the same black, which is why `Alias/Neutral` is fixed to `Brand/Gray`.

These are a starting point, as the mirroring itself is. Taste-level tuning, such as a softer page background in dark, is the user's call after testing, and the script protects whatever they tune (see below).

Because a mode covers the whole collection, every run completes Dark for all variables in Mapped once the mode exists, including hand-made ones and groups that were not named in the request. It never creates variables from groups that were not asked for.

## Step 1: Get the tools

Figma tools are often deferred, meaning connected but not loaded. Not seeing them in your tool list is not a reason to stop. Load them with a tool search such as "figma execute".

The script needs a tool that runs Figma Plugin API JavaScript in the open file. With the Figma Console MCP that is `figma_execute`, which works through the Desktop Bridge plugin in Figma Desktop. If a different Figma MCP is connected, use its equivalent for running Plugin API code.

## Step 2: Run the bundled script

Read `scripts/mapped_roles.js` and send its full contents as the code, changing only the CONFIG block at the top. Set the tool's timeout to 15000 ms.

```js
const REQUEST = {
  groups: ["all"],
  dark: false,
  reset: false,
  retier: false,
  lines: [],
  renames: []
};
const DRY_RUN = false;
```

How each request maps to the CONFIG:

| Request | CONFIG |
|---|---|
| `Mapped` | `groups: ["all"]` |
| `Mapped/Text` and `Mapped/Icon` | `groups: ["Text", "Icon"]` |
| `Mapped dark` | `groups: [], dark: true` |
| `Mapped/Text dark` | `groups: ["Text"], dark: true` |
| `Alias/Neutral/900 -> Mapped/Text/heading` | `groups: [], lines: [{ from: "Alias/Neutral/900", to: "Mapped/Text/heading" }]` |
| `Alias/Primary/300 -> Mapped/Text/action (dark)` | `groups: [], lines: [{ from: "Alias/Primary/300", to: "Mapped/Text/action (dark)" }]` |
| rename Surface/sucess to Surface/success | `groups: [], renames: [{ from: "Mapped/Surface/sucess", to: "Mapped/Surface/success" }]` |
| reset Mapped/Text | `groups: ["Text"], reset: true` |
| move Mapped off Brand onto Alias | `groups: ["all"], retier: true` (see "Reading the result") |

Copy `from` and `to` exactly as the user typed them, note included. Renames run first, then groups, then lines, so one message can combine them. Set `DRY_RUN = true` only when the user asks for a preview or a dry run.

Use the script rather than writing the logic fresh each time. It reads the live file state itself, so there is no need to fetch variables first, and it already handles the cases that are easy to get wrong by hand.

### What the script guarantees

- **References only.** Every value is an alias to an Alias-tier variable. It never writes a hex, and it never falls back to one. A copied color would look identical today and silently stop following the brand tomorrow.
- **Never duplicates.** Variables are matched by name, ignoring case. Running the same request twice changes nothing.
- **Never deletes.** Variables in a group that are not part of the preset are left in place and listed under `others`.
- **Protects hand-tuned values.** If an existing variable points somewhere other than its preset value, the script keeps it and reports it as `kept`, because contrast fixes made after testing must survive later runs. Only `reset: true` or an explicit arrow line changes it.
- **Fills Dark only where it was never set.** A dark value that is empty or still identical to its light value counts as not set, and gets the mirrored step. A dark value that differs from both is treated as tuned and kept.
- **Creates the collection and the modes when needed**, and reuses them when they exist.
- **Finds step names loosely**, so `Primary/500` matches a variable named `Primary/500 Default`.
- **Sets scopes and descriptions** on variables that have none: Text variables are offered only for text fills, Border only for strokes, Surface for frame and shape fills, Icon for shape fills and strokes. Scopes or descriptions set by hand are not overwritten.

### Reading the result

- `status`: `ok`, `partial` (something failed, details are on the rows) or `error` (nothing written; `error` explains why).
- `modes`: the Light mode name and `lightRenamedFrom` if "Mode 1" was renamed; `darkCreated`; `darkError` if Figma refused to add the mode.
- `groups`: one entry per preset group with `created`, `updated`, `unchanged`, `kept`, `failed` and `scoped` counts, `tokens` (one row per preset variable) and `others` (variables in the group outside the preset).
- Each row has `name`, `light`, `dark` when the mode exists, and an `action`:
  - `created`, `unchanged`
  - `updated`: an existing variable was written; `was` shows the previous light value
  - `kept`: it differs from the preset and was left alone; `preset` shows what the preset would use
  - `failed`: `error` says why
- `skipsAlias: true` on a row means the variable points straight at a Brand variable. That works visually but breaks the tier chain: repointing an Alias role would no longer reach it. `retier: true` fixes it without changing any color, by moving each such variable to the Alias variable that carries the same Brand color.
- `lines` and `renames`: one row per requested line or rename.
- `darkFilled`: variables outside the requested groups whose Dark value was completed.
- `missingSources`: Alias variables the preset needs that do not exist. The variables depending on them are `failed` and everything else is still written.
- `contrast`: pairs that are meant to be used together and fail WCAG AA in a mode (4.5:1 for text, 3:1 for icons and control borders). Only failures are listed.

If anything failed for a reason that looks transient, retry once, then report what happened.

## Step 3: Confirm and report

Reply briefly:

- Which groups were written and the counts: created, updated, already correct, kept.
- The modes: say so if "Mode 1" was renamed to Light or if Dark was added.
- A table of the variables that were created or updated, so the user can check it against Figma. Add the Dark column only when the mode exists:

| Variable | Light | Dark |
|---|---|---|
| Text/heading | Neutral/900 | Neutral/100 |

  For a large run (the full preset is about 95 variables) show one table per group and leave out rows that were already correct.
- Anything `kept`, in one line per group, with what the preset would use, so the user can decide whether to reset it.
- `others`, in one line, so the user can decide whether to rename or remove them. Do not delete them yourself.
- If `missingSources` is not empty, name what is missing and how to add it. The usual case is `Alias/Foundation/White`: the user's Brand collection has `Foundation/White` and `Foundation/Black`, and sending `Brand/Foundation -> Alias/Foundation` (figma-alias-bridge) creates the Alias pair. Then the same Mapped line can be sent again.
- If rows have `skipsAlias`, say how many and offer `retier` once.
- If `contrast` is not empty, list the failing pairs in one or two lines with their ratios. Do not add contrast commentary when the list is empty.
- If `darkError` is set, say that Light was written and Dark could not be added, and quote the reason. The number of modes a collection may have depends on the Figma plan.

Keep to what the report contains. Do not add naming advice or suggestions for new groups unless asked.

## Adding to the system

When the user wants a variable or group that the preset does not have, use arrow lines; a line creates the variable if it is new, and its dark value is the mirror of the source unless a `(dark)` line says otherwise. Name it by the rules in "The naming system". For a whole new group such as Focus, Overlay or Shadow, propose the names and sources first, then send them as lines once the user agrees.

A permanent change to the preset itself (a different default step, a new preset variable) means editing the PRESET block in the script and repackaging the skill. Say so when the user asks for one, because a one-off line fixes their file but not the next file the skill runs on.

## When to ask

- The request cannot be read as one of the forms above, or an arrow line has no variable name after `Mapped/`.
- The script reports that the Alias collection does not exist, or that a source in an arrow line was not found. Relay what does exist so the user can resend a corrected line. Do not guess which variable they meant: a wrong guess silently wires a role to the wrong color.
- The user asks to reset, and it would overwrite values reported as `kept` in a group they did not name. Reset only the groups they named.
- After a tool search, nothing connected can run Plugin API code, or the call fails because Figma Desktop or the Desktop Bridge plugin is not running. Say plainly that nothing was created and name what is missing, so the user can fix it and resend the line.
