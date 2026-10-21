# Visual direction (locked for Phase 2, from the approved website plan)

Dark, technical and approachable, with interactions in the spirit of tailwindcss.com: each
feature gets a short explanation beside a demo. A designer should feel at home, not in
developer docs.

## Color
- Near-black background with a slight tint, off-white text, neutral gray scale for surfaces and borders.
- Color comes almost entirely from the demos; the 11-step ramps are the stars.
- One accent for links and buttons, taken from a ramp so it belongs to the system.
- Site tokens follow Brand → Alias → Mapped, with a Light and Dark Mapped mode.

## Type
| Use | Font |
|---|---|
| Headlines, wordmark | Cal Sans (one weight, Regular) |
| Body | Geist Sans |
| Typed lines, code | Geist Mono |

All on Google Fonts. First pick; licenses to be confirmed at build time.

## Interaction
- Hero: line types itself, 11 ramp steps generate staggered, ambient glow follows the color.
- Scroll-triggered demos: spacing steps grow, type scale flexes Desktop/Mobile, alias arrows
  draw themselves, Mapped tokens flip Light/Dark.
- Scroll-driven reveals between sections.
- A live demo is used only where it produces the same output as the real skill; otherwise a
  scripted or recorded animation.

## Guardrails
- Everything respects `prefers-reduced-motion` with a static fallback.
- Text keeps AA contrast over any animated color.
- Layout works at phone width.

## Identity
Wordmark only: "Design Token Skills" in the headline font. The ramp may recur as a motif.

## Stack (Phase 2)
Astro, plain CSS custom properties, CSS animations, GitHub Pages via GitHub Actions. Site at
the domain root, in `site/`.

## Still open
- [ ] designtokenskills.com registered with auto-renew (availability unchecked; fallback .dev / .design)
- [ ] Font licenses confirmed; final font choice after the first build
- [ ] Analytics (plan doc marks this answered; the chosen option is not recorded there. Confirm: Plausible, GoatCounter or none)
- [ ] Feedback channel: GitHub issues only, or newsletter/form
- [ ] "Made by Manolo Bevia" footer line (recommended)
- [ ] argibi.com: redirect or stay parked
- [ ] CONTRIBUTING file (none exists; MIT license does)
- [ ] Screenshots of the skills running in Figma (only `docs/design-tokens-contents.png` exists)
