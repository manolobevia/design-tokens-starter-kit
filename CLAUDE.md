# CLAUDE.md

Project context for Claude Code. This project builds and maintains a Figma
design system through a set of custom skills. Each skill turns a short typed
line into real Figma variables or text styles, written to the open file. The
deliverable is always the variables in Figma, never a table in chat. A table
is only the receipt.

## Token architecture

The color system has three tiers, plus a separate collection for responsive
type values.

- **Brand** (collection): raw values. Color scales, spacing, font family and
  font weight live here. Nothing references anything else at this tier.
- **Alias** (collection): roles such as Primary, Neutral, Error. Every Alias
  variable is a reference to a Brand variable, never a copied hex. Alias has a
  single mode.
- **Mapped** (collection): usage, meaning what a color is for (Surface,
  Border, Text, Icon). This is the tier designers actually apply to layers.
  Every Mapped variable references an Alias variable, never a hex. Dark mode
  lives here: Mapped has a Light and a Dark mode, and Dark points at the
  mirrored Alias step (950 Light equals 50 Dark, and the 500 Default stays the
  same in both).
- **Responsive** (collection): type scale number variables (font size, line
  height, paragraph spacing) with a Desktop and a Mobile mode.

Rule that holds across every skill: a target variable that holds a copied hex
instead of a reference is a failure, even if it looks identical on screen. If a
reference cannot be created, stop and say what is blocking it rather than
falling back to values.

## The skills

### figma-color-scale
Turns one base color into an 11-step scale (950 to 50) written as color
variables in Brand.
- **Trigger:** a line in the form `Name:#HEX`, for example `Purple:#5C3FC4`.
  Several colors can arrive in one message, one per line. `-default` adds Red,
  Blue, Orange, Green and Gray scales plus Foundation (White, Black);
  `Foundation` adds only the last.
- **Method:** the hex is the 500 Default. Darker steps lower the base color's
  opacity over pure black, lighter steps over pure white, in 20% increments,
  with the two ends (950 and 50) at 10%. This reproduces the manual Figma
  method so the numbers match what the designer would get by hand.
- **Writes to:** Brand, as a group named after the color.

### figma-alias-bridge
Links a whole Brand group to an Alias group, step for step, so each Alias
variable references the matching Brand variable.
- **Trigger:** an arrow line, source left, target right:
  `Brand/Purple -> Alias/Primary (Purple)`. The arrow can be `->`, the arrow
  glyph, `=>`, or the word "to". `-default` runs six bridges: Gray to
  Neutral (Alias/Neutral always uses Brand/Gray; other sources are refused), Red to Error, Green to Success, Orange to Warning, Blue to
  Information, Foundation to Foundation (Mapped needs Alias/Foundation). Primary and other brand roles are never included; the user
  types those lines.
- **Notes:** the part in parentheses is a reminder of which brand color feeds
  the role and is stripped from the name. The group is created as `Primary`,
  so an alias name survives a change of color later. Alias has one mode; Light
  and Dark are set in Mapped.
- **Writes to:** Alias, as references into Brand.

### figma-mapped-roles
Builds the usage tier: the Surface, Border, Text and Icon groups, each
variable referencing an Alias variable.
- **Trigger:** `Mapped` (full preset), `Mapped/Text` (one group),
  `Mapped dark` (add and fill the Dark mode), or an arrow line targeting a
  Mapped variable such as `Alias/Neutral/900 -> Mapped/Text/heading`. Also
  handles rename, reset, and a dry-run preview.
- **Naming:** groups name what is painted (Surface, Border, Text, Icon).
  `default`, `secondary`, `tertiary` step down in prominence. `action` and the
  status names (error, success, warning, information) are the solid version;
  `-secondary` is the tinted version. `on-[surface]` is whatever sits on that
  surface. Icon mirrors Text.
- **Writes to:** Mapped, as references into Alias.

### figma-type-scale
Builds typography with one command: font variables, a responsive type scale
as number variables, then one text style per role bound to those variables.
- **Trigger:** `Typography` does everything. Optional fonts and settings follow
  it: `Typography heading Playfair body Lato`, `Typography base 18 ratio 1.333
  mobile 1.2`. Missing font variables are created with defaults (Inter for
  heading, Roboto for body, weights Light, Regular, Medium, Bold); existing ones
  are left alone. `reset Responsive` and `reset type styles` recalculate or
  rebind, and `dry run` previews.
- **Calculation:** base 16px, ratio 1.25 on Desktop and 1.2 on Mobile. Font
  size is base x ratio^step rounded to the nearest 4, floor of 12. Line height
  is the rounded size x 1.2 rounded to 4. Paragraph spacing is the rounded size
  x 0.5, or 0 for single-line styles.
- **Writes to:** Brand (Font family and Font weight), Responsive (number
  variables, Desktop and Mobile modes) and text styles bound to both.

### figma-spacing
Writes a fixed-preset spacing scale as number variables in Brand under a
Spacing group. The scale is the same every run.
- **Trigger:** `Spacing` or `Spacing scale` (whole group), `Spacing/<token>`
  (one or a few steps). Also handles reset, regenerate, and dry-run.
- **Writes to:** Brand, under Spacing.

### figma-radius
Writes a fixed-preset border-radius scale as number variables in Brand under a
Radius group (token x 4 = px, plus `full` at 9999).
- **Trigger:** `Radius` (whole group), `Radius/<token>`. Also handles reset and
  dry-run.
- **Writes to:** Brand, under Radius.

### figma-border-width
Writes a fixed-preset border-weight scale (0, 1, 2, 4 px) as number variables
in Brand under a Border width group (token x 4 = px).
- **Trigger:** `Border width` (whole group), `Border width/<token>`. Also
  handles reset and dry-run.
- **Writes to:** Brand, under Border width.

### figma-token-docs
Builds a page named Design Tokens that documents the whole system visually:
a How to use guide (a card per skill), Brand scales, Alias roles, Mapped Light vs Dark, contrast checks, text styles
in Desktop and Mobile, fonts and weights, spacing, radius and border width.
- **Trigger:** `Design Tokens`. Also handles dry-run.
- **How:** generated from the live variables and styles, and bound to them, so
  rerunning refreshes the page. Each section is its own top-level frame on the
  page. It only rebuilds frames it made itself.
- **Writes to:** the Design Tokens page. It never edits variables or styles.

### figma-starter
Runs the whole build in one line by calling the other skills in order: color
scales (brand colors plus `-default`), alias bridges (brand colors become
Primary, Secondary, Tertiary, Accent, then `-default`), Mapped and Mapped dark,
spacing, radius, border width, typography with the font pair, and the Design
Tokens page.
- **Trigger:** `/figma-starter Name:#HEX [Name:#HEX ...] [heading <font>] [body <font>]`
  (one to four brand colors). Also handles dry-run.
- **How:** it contains no script of its own; it invokes each skill, so it
  stays in sync with them.

## Conventions

- Variable group and role names are used exactly as typed, apart from stripped
  parenthetical notes.
- Mapped variable names inside a group are lowercase with hyphens.
- A single-line typed command is the whole request and the go-ahead. Run it and
  write to Figma without asking for confirmation first. The scripts are safe to
  repeat. Stop only for the reasons each skill lists under "When to ask".
- A `dry run` or `preview` added to any command reports what would happen and
  writes nothing.

## Typical build order

1. `figma-color-scale` for each brand and neutral color (fills Brand).
2. `figma-alias-bridge` to map Brand groups into Alias roles.
3. `figma-mapped-roles` to build the usage tier on top of Alias.
4. `figma-spacing`, `figma-radius`, `figma-border-width` and `figma-type-scale`
   for the non-color primitives.
5. `figma-token-docs` to build the Design Tokens page (rerun when tokens change).

## Requirements

- These skills write through the Figma Plugin API, run in the open file. With
  the Figma Console MCP that tool is `figma_execute`, reaching Figma through
  the Desktop Bridge plugin in Figma Desktop.
- Figma tools are often deferred (connected but not loaded). Not seeing them in
  the tool list is not a reason to stop. Load them with a tool search such as
  "figma execute".
- Creating variables from hex strings cannot produce a reference, so those
  tools are not used for the Alias and Mapped tiers.
