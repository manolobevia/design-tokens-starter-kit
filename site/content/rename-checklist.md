# Rename checklist: to "Design Token Skills"

Status: nothing below has been applied. Checked with a case-insensitive grep for
"design token kit", "token kit" and "design-tokens-starter-kit".

The current name is "Figma Design Tokens Starter Kit" (not "Design Token Kit"). The plan doc
should say so.

## In the repo (safe, can be done any time)
| File | Line | Now | Change to |
|---|---|---|---|
| `README.md` | 1 | `# Figma Design Tokens Starter Kit` | `# Design Token Skills` |
| `README.md` | 5 | "Twelve Claude Code skills build..." | keep; add link to the site once live |

No other file contains the old name: not `CLAUDE.md`, `examples/`, `tests/`, `install.sh`,
`.github/` or `LICENSE`. `LICENSE:3` ("manolobevia") is the author handle; leave it.

## Outward-facing (needs your go-ahead; do together)
| Item | Now | Change to | Effect |
|---|---|---|---|
| GitHub repo slug | `manolobevia/design-tokens-starter-kit` | e.g. `manolobevia/design-token-skills` | Old clone URLs redirect, but links should be updated |
| `README.md` line 3 | CI badge URL with the old slug (twice) | new slug | Badge breaks until updated |
| Git remote `origin` | `git@github.com:manolobevia/design-tokens-starter-kit.git` | new slug | `git remote set-url origin ...` |
| Local folder | `~/Desktop/design-tokens-starter-kit` | optional | Moving it changes the Claude Code project path and its memory |

## Elsewhere
- LinkedIn posts or other pages linking to the old repo URL.
- The site's GitHub link and Pages settings should use the final slug, so rename the repo
  before Phase 6.
