# Guide: Install (draft v2)

Written for: designers who use Claude Code and have never used GitHub.
Based on `README.md` Setup, `install.sh` and `docs/figma-console-setup.md`.

Decisions made:
- The Guide offers **two install options** side by side (below), not one.
- The Desktop Bridge plugin steps now live in the repo: `docs/figma-console-setup.md`.
- **Windows is not supported for now.** Say so once, plainly, before the steps.

## Before you start (what you need)
1. **Claude Code**: where you type your lines.
2. **Figma Desktop**: the desktop app, not the browser.
3. **Node.js 18 or newer**: needed by the Figma connection. Check with `node --version`.
4. A **Figma file** to build in.
5. macOS or Linux. Windows is not supported for now.

## Part 1: Connect Claude Code to Figma (one time)
Follows `docs/figma-console-setup.md`:
1. Create a Figma personal access token named `Figma Console MCP` with the four scopes
   (File content read, File versions read, Variables read, Comments read and write).
   Warn: it is shown once; treat it like a password.
2. Add the server in a terminal (`claude mcp add figma-console ...`), then restart Claude Code.
3. In Figma Desktop: Plugins → Development → Import plugin from manifest →
   `~/.figma-console-mcp/plugin/manifest.json` (this file appears after the server has run once),
   then run the plugin in your file.
4. Test: type `Check Figma status`.

## Part 2: Get the skills (two options)

### Option A: Ask Claude Code to do it
1. On the project's GitHub page, choose Code, then Download ZIP, and unzip it.
2. Open the unzipped folder in Claude Code.
3. Type: "Run ./install.sh to install the skills."
4. Restart Claude Code.
Why offer it: no terminal needed. Caveat: not yet tested end to end; test before publishing.

### Option B: Use the terminal
1. Download and unzip the project, as in Option A.
2. In a terminal, go to the unzipped folder and run `./install.sh`
   (`./install.sh --check` first shows what would change and copies nothing).
3. Restart Claude Code.
Why offer it: it is the documented route and shows exactly what happens. It never deletes anything.

Or, for one project only: open the folder in Claude Code; the skills load from `.claude/skills/`.

## Part 3: Every time you work
1. Open your Figma file in Figma Desktop and run the Desktop Bridge plugin.
2. In Claude Code, type a line such as `Spacing`.
3. Check the Variables panel. Each tier should show references, not hex values.

## Optional: faster runs
Script server: `python3 ~/.claude/skills/figma-starter/scripts/serve_scripts.py` (localhost:9231,
read-only). Put under "Faster runs" at the end of the Guide, not in the beginner path.

## Still to verify before this ships
- Option A end to end: that Claude Code runs `./install.sh` from that prompt without extra steps.
- The manifest path and the plugin menu wording, against a fresh install (copied from the upstream README).
- The token scopes against Figma's current token screen.
- Whether the macOS "unzip" step leaves `install.sh` executable; if not, the command is `bash install.sh`.

## Screenshots to capture
1. Download ZIP button on GitHub
2. Figma token creation screen with the four scopes (blur the token)
3. Plugins → Development → Import plugin from manifest
4. Desktop Bridge plugin running in a file
5. `Check Figma status` result in Claude Code
6. Terminal running `./install.sh` with the new / up to date report
7. First line typed (`Spacing`) and the resulting Variables panel
8. `/` menu showing the installed `figma-*` skills
