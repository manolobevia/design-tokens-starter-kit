---
name: figma-starter
description: Build the whole token system in one line from your brand colors and fonts: colors, aliases, Light/Dark usage, spacing, radius, borders, type and the page. Use for /figma-starter.
---

# Figma starter

Build the complete design token system in the open Figma file from one typed line: your brand colors and your font pair. It runs the other skills in order, so it never drifts from them.

**The deliverable is the finished system in Figma and the Design Tokens page.** A list in chat is only the receipt.

## Help

If the user types `-h`, `-help` or `help` with this skill, print the usage below as a code block and stop. Do not run any skill or write anything.

```
/figma-starter  usage
Builds the whole token system in one go: brand colors, system colors, aliases,
Light and Dark usage, spacing, radius, border width, elevation, typography and the Design Tokens page.

  /figma-starter Plum:#3B1A53 Periwinkle:#8E7FAE heading "Moneta Sans" body Lato

  Name:#HEX             A brand color. The first is Primary, then Secondary, Tertiary, Accent (1 to 4)
  heading <font>        The heading font family. Default: Inter
  body <font>           The body font family. Default: Roboto
  dry run               Show the plan and write nothing

Quote a font name that has spaces: heading "Moneta Sans".
Safe to repeat: every step skips what already exists.
```

## The input

One line: one to four brand colors, then optionally the fonts.

| The user types | What it means |
|---|---|
| `Plum:#3B1A53` | A brand color. In order they become Primary, Secondary, Tertiary and Accent |
| `heading "Moneta Sans"`, `body Lato` | The heading and body font families. Defaults are Inter and Roboto |
| "dry run" or "preview" | Print the plan below with the real arguments and write nothing |

Example: `/figma-starter Plum:#3B1A53 Periwinkle:#8E7FAE heading "Moneta Sans" body Lato`.

A message in this form is the whole request and the go-ahead. Run it without asking for confirmation first, because every skill it calls is safe to repeat. The only reasons to stop are listed under "When to ask".

## The plan

Run these in order with the Skill tool, passing the arguments shown. Fill the placeholders from the user's line. Each skill reports what it did; keep each report to one line for the final summary.

| # | Skill | Arguments |
|---|---|---|
| 1 | `figma-color-scale` | the user's brand colors as `Name:#HEX` lines, then `-default` |
| 2 | `figma-alias-bridge` | `Brand/<color 1> -> Alias/Primary`, `Brand/<color 2> -> Alias/Secondary`, and so on for colors 3 (Tertiary) and 4 (Accent), then `-default` |
| 3 | `figma-mapped-roles` | `Mapped`, then `Mapped dark` |
| 4 | `figma-spacing` | `Spacing` |
| 5 | `figma-radius` | `Radius` |
| 6 | `figma-border-width` | `Border width` |
| 6b | `figma-elevation` | `Elevation` |
| 7 | `figma-type-scale` | `Typography heading <heading font> body <body font>` (leave a font out if the user did not name it) |
| 8 | `figma-token-docs` | `Design Tokens` |

Notes:
- The color names the user types are used as typed, so `Plum:#3B1A53` makes `Brand/Plum`. The role names (Primary, Secondary, Tertiary, Accent) are fixed by position.
- `-default` adds Red, Blue, Orange, Green, Gray and Foundation, and bridges Neutral (always Gray), Error, Success, Warning, Information and Foundation.
- Steps 4 to 7 do not depend on the colors, but run them in this order so the report reads top to bottom.
- Step 8 builds the page last, because it reads everything the earlier steps wrote.

## Dry run

For `dry run` or `preview`, print the eight steps as a table with the real arguments filled in, list the Brand groups and Alias roles that would result, and say nothing was written. Do not call the other skills.

## Final report

After step 8, reply briefly:

- The result in one line per tier: Brand colors written, Alias roles, Mapped variables (Light and Dark), spacing, radius, border width, fonts and text styles.
- Anything a step skipped or kept because it already existed.
- The contrast summary from the Design Tokens page (for example "Light: 51 of 54 pairs pass") and the pairs that do not pass.
- Anything the page revealed that the user may want to fix, such as a font that lacks a weight.
- That the Design Tokens page is in the file, and where to find it.

Keep to what the steps reported. Do not add design advice unless asked.

## When to ask

- The line has no brand color, or a color cannot be read as `Name:#HEX`, or there are more than four.
- A step fails. Stop there, say which step failed and why, say what was already written, and say that sending the same line again is safe: finished steps are skipped.
- Figma Desktop or the Desktop Bridge plugin is not running, or no connected tool can run Plugin API code. Say plainly that nothing was built and name what is missing.
- The open file is not the one the user means. Say which file is open and ask them to bring the right one to the front.
