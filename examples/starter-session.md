# Starter session

The fast way, one line for everything:

```
/figma-starter Plum:#3B1A53 Periwinkle:#8E7FAE heading "Moneta Sans" body Lato
```

Or paste each line below into Claude Code, one at a time or several together.

## 1. Brand colors
```
/figma-color-scale Purple:#5C3FC4
/figma-color-scale -default
```

`-default` adds Red, Blue, Orange, Green, Gray and Foundation (White and Black).

## 2. Alias roles
```
/figma-alias-bridge -default
Brand/Purple -> Alias/Primary (Purple)
```

`-default` bridges Gray → Neutral, Red → Error, Green → Success, Orange → Warning, Blue → Information, Foundation → Foundation. Brand roles such as Primary are yours to add, as in the last line.

## 3. Mapped usage
```
Mapped
Mapped dark
Alias/Neutral/900 -> Mapped/Text/heading
```

## 4. Spacing and typography
```
Spacing
Typography
Typography heading Playfair body Lato
Typography base 18 ratio 1.333 mobile 1.2
```

## 5. Radius, border width, elevation and the Design Tokens page
```
Radius
Border width
Elevation
Design Tokens
```

## 6. Export for developers
```
Export tokens
```

## Variations
```
Mapped/Text dry run
Spacing/4
reset type styles
reset Spacing
```

## Expected result
- Brand: `Purple/950` … `Purple/50`, `Spacing/*`, font family and weight
- Alias: `Primary/950` … `Primary/50`, each with Light and Dark values
- Mapped: `Surface/*`, `Border/*`, `Text/*`, `Icon/*`, all referencing Alias
- Responsive: font size, line height, paragraph spacing in Desktop and Mobile
