---
skill: "figma-mapped-roles"
title: "Light and Dark usage tokens"
line: "Mapped"
writes: "Surface, Border, Text and Icon variables referencing Alias, in Light and Dark"
order: 3
core: true
guideOrder: 4
does: "Builds the usage tier, the one you actually apply to layers: Surface, Border, Text and Icon, each pointing at an Alias variable."
see: "A Mapped collection with Light mode. Add Dark and it fills the same variables with mirrored steps."
needs: "Alias roles first (run the alias bridge, including Foundation)."
tweaks:
  - { line: "Mapped/Text", result: "Build one group only. Also Mapped/Icon, Mapped/Surface, Mapped/Border." }
  - { line: "Mapped dark", result: "Adds the Dark mode and fills it." }
  - { line: "Alias/Neutral/900 -> Mapped/Text/heading", result: "Point one variable at one Alias variable." }
  - { line: "reset Mapped/Text", result: "Put hand-changed variables back to the preset. Hand-tuned values are kept otherwise." }
---
