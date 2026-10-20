---
skill: "figma-alias-bridge"
title: "Roles that follow your colors"
line: "Brand/Purple -> Alias/Primary (Purple)"
writes: "Alias variables that reference Brand, never a copied hex"
order: 2
core: true
guideOrder: 3
does: "Links a whole Brand group to an Alias role, step for step. Each Alias variable is a reference to the matching Brand variable."
see: "An Alias group named Primary whose variables point at Purple/950 to Purple/50."
needs: "Brand scales to link from."
tweaks:
  - { line: "-default", result: "Six links: Gray to Neutral, Red to Error, Green to Success, Orange to Warning, Blue to Information, Foundation to Foundation." }
  - { line: "Primary and friends", result: "-default never creates Primary, Secondary and so on. Type those lines yourself, in the same message if you like." }
  - { line: "(Purple)", result: "Text in parentheses is a reminder and is dropped from the name." }
  - { line: "Run it again", result: "It repoints, never duplicates." }
---
