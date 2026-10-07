# Starter session

Paste each line into Claude Code, one at a time or several together.

## 1. Brand colors
```
Purple:#5C3FC4
-default
```

`-default` adds Red, Blue, Orange, Green, Gray and Foundation (White and Black).

## 2. Alias roles
```
Brand/Purple -> Alias/Primary (Purple)
Brand/Gray -> Alias/Neutral (Gray)
Brand/Red -> Alias/Error (Red)
Brand/Green -> Alias/Success (Green)
```

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
Typography base 18 ratio 1.333 mobile 1.2
Brand/Font family/Body = Roboto
```

## Variations
```
Mapped/Text dry run
Spacing/4
Type styles
reset Spacing
```

## Expected result
- Brand: `Purple/950` … `Purple/50`, `Spacing/*`, font family and weight
- Alias: `Primary/950` … `Primary/50`, each with Light and Dark values
- Mapped: `Surface/*`, `Border/*`, `Text/*`, `Icon/*`, all referencing Alias
- Responsive: font size, line height, paragraph spacing in Desktop and Mobile
