# Skills inventory

Source of truth: `.claude/skills/*/SKILL.md` and `README.md:33-46`. Twelve skills exist. The
website plan assumed five. Proposal: Home shows the five core skills as demo cards and a
"More skills" row for the rest; the Guide covers all twelve in build order.

Every skill: a typed line is the whole request and the go-ahead; `dry run` previews and
writes nothing; `-h` prints usage. All need Figma Desktop, the Figma Console MCP and its
Desktop Bridge plugin.

| # | Skill | Outcome-style name | You type | Writes | Home | Demo idea |
|---|---|---|---|---|---|---|
| 1 | `figma-color-scale` | An 11-step color scale from one hex | `Purple:#5C3FC4` | 11 COLOR variables (950 to 50) in Brand; `-default` adds Red, Blue, Orange, Green, Gray and Foundation | Core card | Type name and hex, 11 steps appear |
| 2 | `figma-alias-bridge` | Roles that follow your colors | `Brand/Purple -> Alias/Primary (Purple)` | Alias group of references into Brand, never a copied hex; `-default` runs six bridges | Core card | Arrow draws itself into linked variables |
| 3 | `figma-mapped-roles` | Light and Dark usage tokens | `Mapped`, `Mapped dark` | Mapped Surface, Border, Text, Icon referencing Alias, Light and Dark | Core card | Light/Dark flip (doubles as the site's own proof) |
| 4 | `figma-spacing` | A spacing scale on a 4px grid | `Spacing` | NUMBER variables in Brand/Spacing (`Spacing/4` = 16px) | Core card | Steps grow in sequence |
| 5 | `figma-type-scale` | A responsive type scale with text styles | `Typography` | Font variables in Brand, Desktop/Mobile size variables in Responsive, text styles bound to both | Core card | Desktop/Mobile toggle |
| 6 | `figma-radius` | A border radius scale | `Border radius` | NUMBER variables in Brand/Border radius (`2` = 8px, `full` = 9999) | More | none |
| 7 | `figma-border-width` | A border weight scale | `Border width` | NUMBER variables in Brand/Border width (0, 1, 2, 4px) | More | none |
| 8 | `figma-motion` | Durations and easing curves | `Motion` | Native TIMING (250ms to 2500ms, Default 1000ms) and EASING variables in Brand | More | none |
| 9 | `figma-token-docs` | A Design Tokens page that documents it all | `Design Tokens` | A page with one frame per section, bound to live variables | More (image exists) | Contents frame screenshot |
| 10 | `figma-contrast-fix` | Accessibility fixes for failing pairs | `Contrast fix`, `Contrast fix apply` | Preview frame; on apply, retargets Mapped variables (references only) | More | Failing row beside passing fix |
| 11 | `figma-export-tokens` | Tokens as code for developers | `Export tokens` | `tokens.css`, `tokens.tokens.json`, `tailwind.theme.css` in `./tokens`; nothing to Figma | More | none |
| 12 | `figma-starter` | The whole system from one line | `/figma-starter Plum:#3B1A53 Periwinkle:#8E7FAE heading "Moneta Sans" body Lato` | Runs 1 to 9 in order; 1 to 4 brand colors become Primary, Secondary, Tertiary, Accent | Hero | Hero demo |

## Guide order (build order, `README.md:50-60`)

1. Color scale → 2. Alias bridge → 3. Mapped roles (each tier references the one before).
2. Spacing, radius, border width, motion, type scale (any time after step 1).
3. Design Tokens page (last, rerun when tokens change).
4. Contrast fix (when the page shows failures; preview first).
5. Export tokens (rerun when tokens change).
6. Starter is the shortcut to all of it, shown first in the Guide as "the one-line way".

## Facts the copy must get right

- Alias and Mapped hold references. A copied hex where a reference belongs is a failure.
- `-default` for aliases covers Neutral, Error, Success, Warning, Information, Foundation. It
  never creates Primary, Secondary and so on; the user types those.
- `figma-contrast-fix` is the one skill where preview and apply are separate requests.
- Fonts must exist in the user's Figma account; Google Fonts do.
- Rerunning is safe: existing steps are skipped, hand-tuned Mapped values are kept unless `reset`.
