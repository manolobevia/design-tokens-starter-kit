---
name: figma-export-tokens
description: Export the file's variables as code for developers: CSS custom properties with Light/Dark and mobile, W3C design tokens JSON, and a Tailwind v4 theme. Use for Export tokens, optionally to a folder.
---

# Figma export tokens

Turn the Figma variables into files a developer can import: CSS custom properties, W3C design tokens JSON and a Tailwind v4 theme. References stay references, so `Mapped` points at `Alias`, which points at `Brand`, exactly like in Figma.

**The deliverable is the files in the project.** A summary in chat is only the receipt.

## Help

If the user types `-h`, `-help` or `help` with this skill, print the usage below as a code block and stop. Do not load Figma tools, run a script or write anything.

```
/figma-export-tokens  usage
Writes the variables of the open Figma file as code files.

  Export tokens                 tokens.css, tokens.tokens.json and tailwind.theme.css in ./tokens
  Export tokens css             Only the CSS file (also: json, tailwind; several can be combined)
  Export tokens to src/styles   Write to another folder

Files:
  tokens.css           CSS custom properties. Dark mode under :root[data-theme="dark"] and
                       prefers-color-scheme, mobile type scale under max-width 767px
  tokens.tokens.json   W3C design tokens (DTCG). Aliases are {references}; other modes under
                       $extensions.figma.modes
  tailwind.theme.css   Tailwind v4 @theme inline block that points at the CSS variables

Files are overwritten on every run: they are generated, do not edit them by hand.
```

## The input

| The user types | What it means |
|---|---|
| `Export tokens` | Write all three files to `tokens/` in the project folder |
| `Export tokens css`, `json`, `tailwind` | Only those files. Several can be combined: `Export tokens css json` |
| `Export tokens to src/styles` | Write to that folder instead of `tokens/` |

A message in this form is the whole request and the go-ahead. Run it without asking for confirmation first. The only reasons to stop are listed under "When to ask".

## Step 1: Get the tools

Figma tools are often deferred, meaning connected but not loaded. Load them with a tool search such as "figma execute". The script needs a tool that runs Figma Plugin API JavaScript in the open file. With the Figma Console MCP that is `figma_execute`.

Do not use the server's own `figma_export_tokens` tool for this. It reads its own snapshot of the file, which can be out of date (it can miss collections created after the plugin connected), so it can export a partial system without warning. This skill reads the live variables itself.

## Step 2: Read the variables from Figma

Read `scripts/read_tokens.js` and send its full contents as the code, changing only the CONFIG block at the top. Set the tool's timeout to 20000 ms. Set `EXPECT_FILE` to the user's design system file name when you know it.

The script returns every collection, mode and variable. It pads its result on purpose so the host saves it to a file instead of printing 400 variables into the chat. The tool then reports that the output exceeded the limit and **was saved to a file; that is the expected result.** Take the file path from that message. If the result comes back inline with no saved file, the padding did not work: raise `PAD_TO` and run it again.

## Step 3: Write the files

Run the converter with the saved path and the output folder (relative to the project folder, `tokens` by default):

```bash
python3 scripts/build_tokens.py "<saved file path>" "<output folder>" --formats=css,json,tailwind
```

`--formats` takes any of `css`, `json`, `tailwind`. The converter uses only the Python standard library and prints what it wrote. If a target file already exists it is overwritten, because the files are generated.

### What the files contain

- **Names.** `--<collection>-<path>`, lowercase, with spaces and slashes as dashes and a trailing "Default" dropped: `Brand/Plum/500 Default` is `--brand-plum-500`, `Mapped/Surface/page` is `--mapped-surface-page`.
- **Values.** Colors as hex, numbers as `px`, font families quoted with a `sans-serif` fallback, font weights as numbers (Light 300, Regular 400, Medium 500, Bold 700).
- **References kept.** `--alias-primary-500: var(--brand-plum-500);` in CSS and `{brand.plum.500}` in JSON.
- **Modes.** The first mode is the default. A mode named Dark is written under `:root[data-theme="dark"]` and `@media (prefers-color-scheme: dark)`; a mode named Mobile under `@media (max-width: 767px)`. Only values that differ are repeated. Any other mode goes under `[data-mode="<name>"]`.
- **Order.** Scales run from 950 to 50 and groups stay together, whatever order Figma returned them in.
- **Motion.** `TIMING` variables become `200ms` and `EASING` variables become `cubic-bezier(...)` (and DTCG `duration` and `cubicBezier` types); in Tailwind the easings become `ease-*` theme values.
- **Tailwind.** Alias and Mapped colors become `--color-<role>-<step>` and `--color-<group>-<name>` (for example `bg-surface-page`), and spacing, radius, fonts and weights are mapped to the matching theme namespaces. Brand scales are left out because Alias already carries them.

## Step 4: Report

Reply briefly:

- Which files were written and where, with the variable count per collection.
- How to use them. For CSS: `@import "./tokens/tokens.css";`, and `data-theme="dark"` on `<html>` for Dark. For Tailwind v4: import `tailwindcss`, then `tokens.css`, then `tailwind.theme.css`.
- That the files are generated and should be committed or rebuilt, not edited by hand.

Do not add front-end advice unless asked.

## When to ask

- The open Figma file is not the one the user means (`EXPECT_FILE` stops the script). Say which file is open and ask them to bring the right one to the front.
- There are no variables in the file. Say so and suggest `/figma-starter`.
- After a tool search, nothing connected can run Plugin API code, or the call fails because Figma Desktop or the Desktop Bridge plugin is not running. Say plainly that nothing was exported and name what is missing.
- The target folder already holds files with these names that are not generated (no "Generated from the Figma file" first line). Ask before overwriting them.
