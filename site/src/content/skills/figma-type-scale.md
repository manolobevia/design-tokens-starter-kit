---
skill: "figma-type-scale"
title: "A responsive type scale with text styles"
line: "Typography"
writes: "Font variables, Desktop and Mobile sizes, and text styles bound to them"
order: 5
core: true
guideOrder: 9
does: "Builds typography in one run: font family and weight variables, a type scale with Desktop and Mobile modes, and one text style per role."
see: "Font variables in Brand, a Responsive collection with Desktop and Mobile modes, and text styles bound to both."
needs: ""
tweaks:
  - { line: "Typography heading Playfair body Lato", result: "Your own fonts. Either one can be given alone. Defaults are Inter and Roboto." }
  - { line: "Typography base 18 ratio 1.333 mobile 1.2", result: "Change the base size and the Desktop and Mobile ratios. Settings are not stored, so repeat them on later runs." }
  - { line: "reset Responsive", result: "Recalculate the size variables." }
  - { line: "reset type styles", result: "Rebind hand-changed styles to the preset." }
---
