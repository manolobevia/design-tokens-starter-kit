# Design Tokens Starter Kit

Type one short line, get real **Figma variables and text styles** written to your open file. Five Claude Code skills build a complete token system: color, aliases, usage roles, spacing and typography.

## How the tokens fit together

```
Brand  →  Alias  →  Mapped        Responsive
raw       roles     usage          type scale
values    (Primary) (Text/heading) (Desktop / Mobile)
```

Every Alias variable references a Brand variable. Every Mapped variable references an Alias variable. Nothing downstream holds a copied hex.

## The skills

| Skill | You type | It writes |
|---|---|---|
| `figma-color-scale` | `Purple:#5C3FC4` | An 11-step scale (950 to 50) in **Brand** |
| `figma-alias-bridge` | `Brand/Purple -> Alias/Primary (Purple)` | **Alias** group referencing Brand, with Light and Dark |
| `figma-mapped-roles` | `Mapped` | **Mapped** Surface, Border, Text and Icon variables referencing Alias |
| `figma-spacing` | `Spacing` | 4px-unit spacing scale in **Brand** |
| `figma-type-scale` | `Typography` | **Responsive** size variables plus text styles |

Add `dry run` to any line to preview without writing.

## Build order

Run the skills in this order, because each tier references the one before it:

1. **`figma-color-scale`**: your brand and neutral colors, or `-default` for the system colors. Fills Brand.
2. **`figma-alias-bridge`**: map Brand groups into Alias roles, with Light and Dark values.
3. **`figma-mapped-roles`**: build the usage tier on top of Alias.
4. **`figma-spacing`** and **`figma-type-scale`**: the non-color primitives. These don't depend on the color steps, so run them any time after step 1.

## Parameters

Every skill reads one typed line. These are all the forms each one accepts.

**Any skill:** add `dry run` or `preview` to report what would happen and write nothing.

### `figma-color-scale`

| Type | Result |
|---|---|
| `Purple:#5C3FC4` | Scale `Purple/950` to `Purple/50`. The hex is the 500 Default |
| `Name=#HEX`, `Name:HEX`, `Name:#ABC` | Also accepted (with or without `#`, 3 or 6 digits) |
| Several colors | One per line, or separated by spaces or commas |
| `-default` | Red (error), Blue (information), Orange (warning), Green (success), Gray, plus Foundation |
| `Foundation` | Only `Foundation/White` and `Foundation/Black` |

`-default` can be combined with your own colors. A color you type wins over the preset one of the same name. All colors go in the `Brand` collection.

### `figma-alias-bridge`

| Type | Result |
|---|---|
| `Brand/Purple -> Alias/Primary` | Every `Purple` step becomes a reference in `Primary` |
| `... Alias/Primary (Purple)` | Text in parentheses is a note and is dropped from the name |
| Arrow | `->`, `→`, `=>` or the word `to` |
| Several lines | One bridge per line. Running again repoints, never duplicates |
| `-default` | Five bridges: Gray → Neutral, Red → Error, Green → Success, Orange → Warning, Blue → Information |

`-default` does not create Primary, Secondary and so on. Add those yourself, in the same message: `-default` plus `Brand/Purple -> Alias/Primary`. A line you type replaces the default for the same role. If a Brand group is missing, the skill names it and does not guess.

### `figma-mapped-roles`

| Type | Result |
|---|---|
| `Mapped` | Full preset: Surface, Border, Text, Icon (Light mode) |
| `Mapped/Text`, `Mapped/Icon` | Only those groups. Combine several in one message |
| `Mapped dark` | Add the Dark mode and fill it for everything that exists |
| `Mapped/Text dark` | Create the group and add Dark in one run |
| `Alias/Neutral/900 -> Mapped/Text/heading` | Point one variable at one Alias variable |
| `... -> Mapped/Text/action (dark)` | Same, for Dark only. `(light)` also works |
| `rename Surface/sucess to Surface/success` | Rename in place, bindings stay connected |
| `reset Mapped/Text` | Put hand-changed variables back to the preset |

Hand-tuned values are kept on later runs unless you `reset` or use an arrow line.

### `figma-spacing`

| Type | Result |
|---|---|
| `Spacing` or `Spacing scale` | The whole scale |
| `Spacing/4` | One step. Several can share a message |
| `reset Spacing`, `regenerate the spacing scale` | Overwrite hand-changed values |

Token = number of 4px units: `Spacing/4` is 16px. Steps: `0` (0px), `0-25` (1px), `0-5` (2px), `1` (4), `2` (8), `3` (12), `4` (16), `5` (20), `6` (24), `8` (32), `10` (40), `12` (48), `16` (64), `20` (80), `24` (96).

### `figma-type-scale`

| Type | Result |
|---|---|
| `Typography` | Variables, then text styles |
| `Responsive` or `Type scale` | Variables only (Desktop and Mobile modes) |
| `Responsive/Heading` | One variable group |
| `Type styles`, `Type styles/Body` | Text styles only, or one group |
| `Brand/Font family/Body = Roboto` | Set the body font (`Heading` works too) |
| `reset Responsive`, `reset type styles` | Recalculate or rebind to the preset |

Settings can follow `Typography` in any order. Anything omitted keeps its default:

| Setting | Default | Meaning |
|---|---|---|
| `base 18` | 16 | Body size in px |
| `ratio 1.333` | 1.25 | Desktop scale ratio. Names work too (`Perfect Fourth`) |
| `mobile 1.2` | 1.2 | Mobile scale ratio |
| `line height 1.2` | 1.2 | Line height multiplier |
| `body line height 1.5` | 1.2 | Line height for Body and Caption only |
| `spacing 0.5` | 0.5 | Paragraph spacing multiplier |
| `body spacing 1` | 0.5 | Paragraph spacing for Body and Caption only |
| `grid 4` | 4 | Sizes round to a multiple of this |

Example: `Typography base 18 ratio 1.333 mobile 1.2`. Settings are not stored, so repeat them on later runs.

## Setup

You need: [Claude Code](https://claude.com/claude-code), Figma Desktop, and the [Figma Console MCP](https://github.com/southleft/figma-console-mcp) with its Desktop Bridge plugin running.

1. Clone this repo and open the folder in Claude Code. The skills in `.claude/skills/` load automatically.
2. Open your Figma file in Figma Desktop and start the Desktop Bridge plugin.
3. Run a skill (see below).

To use the skills in other projects, copy the folders in `.claude/skills/` to `~/.claude/skills/`.

## Running a skill

Two ways, same result:

| Way | Example | When to use |
|---|---|---|
| **Type the line** | `Spacing` | Fastest. Claude matches the line to the right skill |
| **Slash command** | `/figma-spacing` | Forces that skill. Safer for short lines like `Mapped` or `Responsive` |

Parameters go after the skill name:

```
/figma-color-scale Purple:#5C3FC4
/figma-alias-bridge Brand/Purple -> Alias/Primary (Purple)
/figma-mapped-roles Mapped/Text dark
/figma-spacing Spacing/4
/figma-type-scale Typography base 18 ratio 1.333 mobile 1.2
```

With no parameters, the skill does its default run (`/figma-spacing` writes the whole scale). Add `dry run` to preview. Type `/` to see the installed skills.

## Try it

Run these in order (more in [examples/starter-session.md](examples/starter-session.md)):

```
/figma-color-scale Purple:#5C3FC4
/figma-color-scale -default
/figma-alias-bridge -default
Mapped
Spacing
Typography
```

Check the Variables panel in Figma. Each tier should show references, not hex values.

## Good to know

- A typed line is the whole request. The skills do not ask for confirmation, and they are safe to repeat.
- If Figma is not connected, the skill says what is missing and writes nothing.
- Full rules per skill are in each `SKILL.md`. Project conventions are in [CLAUDE.md](CLAUDE.md).
