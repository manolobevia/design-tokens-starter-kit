---
skill: "figma-contrast-fix"
title: "Accessibility fixes for failing pairs"
line: "Contrast fix"
writes: "A preview of failing text and border pairs, each with a passing fix"
order: 10
core: false
guideOrder: 11
does: "Finds Mapped text and border pairs that fail WCAG AA (4.5:1 for text, 3:1 for borders) in Light and Dark, and previews a passing fix for each."
see: "A Contrast fixes (preview) frame on the Design Tokens page. Nothing changes until you ask."
needs: "Mapped tokens and the Design Tokens page."
tweaks:
  - { line: "Contrast fix apply", result: "Apply every fix. It is a separate request from previewing, because a fix can be a brand decision." }
  - { line: "Contrast fix apply Text/action", result: "Apply the fix for one variable." }
  - { line: "Contrast fix apply dark", result: "Apply only the Dark mode." }
  - { line: "Not fixable", result: "If no single step passes, it says so and changes nothing: change the surface instead." }
---
