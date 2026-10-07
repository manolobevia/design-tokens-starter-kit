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

## Setup

You need: [Claude Code](https://claude.com/claude-code), Figma Desktop, and the [Figma Console MCP](https://github.com/southleft/figma-console-mcp) with its Desktop Bridge plugin running.

1. Clone this repo and open the folder in Claude Code. The skills in `.claude/skills/` load automatically.
2. Open your Figma file in Figma Desktop and start the Desktop Bridge plugin.
3. Type a line from the table above in Claude Code.

To use the skills in other projects, copy the folders in `.claude/skills/` to `~/.claude/skills/`.

## Try it

Run these in order (more in [examples/starter-session.md](examples/starter-session.md)):

```
Purple:#5C3FC4
Gray:#6B7280
Brand/Purple -> Alias/Primary (Purple)
Brand/Gray -> Alias/Neutral (Gray)
Mapped
Spacing
Typography
```

Check the Variables panel in Figma. Each tier should show references, not hex values.

## Good to know

- A typed line is the whole request. The skills do not ask for confirmation, and they are safe to repeat.
- If Figma is not connected, the skill says what is missing and writes nothing.
- Full rules per skill are in each `SKILL.md`. Project conventions are in [CLAUDE.md](CLAUDE.md).
