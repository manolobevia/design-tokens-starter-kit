# Copy outline

Written for: Figma designers who use Claude Code and are not comfortable with GitHub.
Tone: confident, lightly funny, no developer jargon. Typed lines are short sentences, not code.
Product name everywhere: **Design Token Skills**. "Figma" and "Claude Code" are named
plainly in titles and body copy but are not part of the domain or wordmark.

Reusable source copy is cited as README line numbers.

## Home (/)

**1. Hero**
- Headline (draft): "Type one line. Watch Figma fill with tokens."
- Supporting: Free, open-source Claude Code skills that write real variables and text styles
  into your Figma file (`README.md:5`).
- Visual: typed line `/figma-starter Plum:#3B1A53 Periwinkle:#8E7FAE heading "Moneta Sans" body Lato`
  beside the variables it produces; 11 ramp steps stagger in; page glow takes the color.
- Buttons: Get started (to `/guide#install`), GitHub (secondary).

**2. The problem** (removed: the hero goes straight into How it works)

**3. How it works, three steps**
1. Install the skills.
2. Type a short line.
3. See the variables written to your Figma file.

**4. The skills**
- Five core cards named by outcome, each with its demo (see `skills.md`): color scale,
  alias roles, light and dark usage, spacing, responsive type.
- "More skills" row: radius, border width, motion, Design Tokens page, contrast fix,
  export as code, and the one-line starter.
- One idea carried across the cards: every tier points at the one before it, so changing a
  brand color updates everything (`README.md:29`).

**5. Benefits**
- Faster setup · consistent naming · a structure that scales · no code required · free and open source.

**6. Who it is for**
- Figma designers who use Claude Code and do not want to learn GitHub or scripting.

**7. FAQ**
- Do I need Claude Code? Yes. Do I need GitHub? Not to use it (Guide shows how).
- Will it overwrite my variables? Rerunning is safe and skips what exists; hand-tuned
  Mapped values are kept unless you `reset`; `dry run` previews any line. Verify per skill
  before the final wording.
- Is it free? Yes, MIT licensed.

**8. Closing CTA and footer**
- Get started, GitHub, MIT license, "Made by whatthefux.studio" linking to https://whatthefux.studio/
  (pending the open question).

## Guide (/guide)

1. **Before you start** – Claude Code, Figma Desktop, the Figma Console MCP and its Desktop
   Bridge plugin, a Figma file. Jargon explained in one line each.
2. **Install** – see `install-steps.md`. Most design attention goes here.
3. **The mental model** – diagram: Brand (raw) → Alias (roles) → Mapped (usage), plus
   Responsive for type (`README.md:21-29`). Why tiers exist; why references, not hex.
4. **Build your system in order** – one section per skill, same template: what it does, what
   to type, what you will see in Figma, common tweaks. Start with "the one-line way"
   (`figma-starter`), then the skills one by one in the order in `skills.md`.
5. **Cheat sheet** – one screen: the exact line for each skill (`README.md:33-46`) plus
   `dry run` and `-h`.
6. **Troubleshooting** – Figma not connected (skill names what is missing and writes nothing),
   font not found in Figma, Dark mode not filled (`Mapped dark`), failing contrast
   (`Contrast fix`), skills not showing after install (restart Claude Code).
7. **Next steps** – GitHub for contributors, feedback channel (open question).

## Page titles and meta (Phase 5 input)
- Home: "Design Token Skills: Figma design tokens from one line in Claude Code"
- Guide: "Designer's Guide: build Figma design tokens with Claude Code"
