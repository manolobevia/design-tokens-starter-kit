---
skill: "figma-export-tokens"
title: "Tokens as code for developers"
line: "Export tokens"
writes: "CSS, W3C JSON and a Tailwind v4 theme files in your project"
order: 11
core: false
guideOrder: 12
does: "Turns your Figma variables into files a developer can import. References stay references."
see: "tokens.css, tokens.tokens.json and tailwind.theme.css in a tokens folder. Nothing is written to Figma."
needs: ""
tweaks:
  - { line: "Export tokens css", result: "Only the CSS. json and tailwind work too, and can be combined." }
  - { line: "Export tokens to src/styles", result: "Write to another folder." }
  - { line: "Rebuild, do not edit", result: "The files are generated. Run it again after tokens change." }
---
