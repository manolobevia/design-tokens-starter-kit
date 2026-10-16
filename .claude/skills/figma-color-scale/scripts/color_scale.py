#!/usr/bin/env python3
"""Build an 11-step color scale from one base color.

Usage:
    python color_scale.py "Purple:#5C3FC4" ["Teal:#1A8647" ...]
    python color_scale.py --table "Purple:#5C3FC4"
    python color_scale.py -default            # Red, Blue, Orange, Green, Gray + Foundation
    python color_scale.py Foundation          # White and Black only
    python color_scale.py Foundation White:#FAFAF7 Black:#0B0B0D   # your own white and/or black
    python color_scale.py Foundation/White:#FAFAF7                 # same, one color, one argument

The base color is the 500 step. Every other step is the base color at a
given opacity, flattened over pure black (darker steps) or pure white
(lighter steps). Output is JSON by default, ordered 950 -> 50, which is
the order the variables should be created in Figma.
"""
import json
import re
import sys

BLACK = (0, 0, 0)
WHITE = (255, 255, 255)

# (step, opacity of the base color, surface underneath)
STEPS = [
    ("950", 0.10, BLACK),
    ("900", 0.20, BLACK),
    ("800", 0.40, BLACK),
    ("700", 0.60, BLACK),
    ("600", 0.80, BLACK),
    ("500 Default", 1.00, None),
    ("400", 0.80, WHITE),
    ("300", 0.60, WHITE),
    ("200", 0.40, WHITE),
    ("100", 0.20, WHITE),
    ("50", 0.10, WHITE),
]

# -default preset: status colors and a neutral grey, each a full scale.
DEFAULT_COLORS = [
    "Red:#DC2626",     # error
    "Blue:#2563EB",    # information
    "Orange:#F97316",  # warning
    "Green:#16A34A",   # success
    "Gray:#6B7280",    # neutral
]

# Foundation: single variables, not scales.
FOUNDATION = [("White", "#FFFFFF"), ("Black", "#000000")]

PATTERN = re.compile(r"^\s*(.+?)\s*[:=]\s*#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\s*$")


def parse(arg):
    m = PATTERN.match(arg)
    if not m:
        raise ValueError(
            f"Could not read '{arg}'. Expected Name:#RRGGBB, for example Purple:#5C3FC4"
        )
    name, hx = m.group(1).strip(), m.group(2)
    if len(hx) == 3:
        hx = "".join(c * 2 for c in hx)
    name = name[0].upper() + name[1:]
    return name, hx.upper()


def to_rgb(hx):
    return tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4))


def flatten(rgb, opacity, surface):
    if surface is None:
        return rgb
    return tuple(int(c * opacity + s * (1 - opacity) + 0.5) for c, s in zip(rgb, surface))


def scale(name, hx):
    rgb = to_rgb(hx)
    steps = []
    for step, opacity, surface in STEPS:
        out = flatten(rgb, opacity, surface)
        steps.append({
            "variable": f"{name}/{step}",
            "step": step,
            "opacity": f"{int(opacity * 100)}%",
            "surface": "none" if surface is None else ("black" if surface == BLACK else "white"),
            "hex": "#" + "".join(f"{c:02X}" for c in out),
        })
    return {"name": name, "base": f"#{hx}", "steps": steps}


def foundation(overrides=None):
    """White and Black as single variables. overrides = {"White": "FAFAF7"} replaces a default."""
    overrides = overrides or {}
    steps = [{"variable": f"Foundation/{n}", "step": n, "hex": "#" + overrides.get(n, hx.lstrip("#")).upper()}
             for n, hx in FOUNDATION]
    return {"name": "Foundation", "base": None, "steps": steps}


FOUNDATION_LINE = re.compile(
    r"(?:^|\s|/)(white|black)\s*[:=]\s*#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])", re.I)


def foundation_overrides(text):
    """Pick White/Black hexes out of 'Foundation White:#FAFAF7 Black:#0B0B0D' or 'Foundation/White:#FAFAF7'."""
    out = {}
    for name, hx in FOUNDATION_LINE.findall(text):
        if len(hx) == 3:
            hx = "".join(c * 2 for c in hx)
        out[name.capitalize()] = hx.upper()
    return out


def table(result):
    if result["base"] is None:
        lines = [result["name"], "", "| Variable | Hex |", "|---|---|"]
        lines += [f"| {s['variable']} | {s['hex']} |" for s in result["steps"]]
        return "\n".join(lines)
    lines = [f"{result['name']} (base {result['base']})", "",
             "| Variable | Opacity | Surface | Hex |", "|---|---|---|---|"]
    for s in result["steps"]:
        lines.append(f"| {s['variable']} | {s['opacity']} | {s['surface']} | {s['hex']} |")
    return "\n".join(lines)


def main(argv):
    as_table = "--table" in argv
    args = [a for a in argv if a != "--table"]
    if not args:
        print(__doc__)
        return 1
    results, seen = [], set()
    try:
        scales, found, presets = [], None, []
        i = 0
        while i < len(args):
            a = args[i]
            key = a.strip().lower()
            if key in ("-default", "--default"):
                presets.append("default")
            elif key == "foundation" or key.startswith(("foundation ", "foundation/")):
                found = found or {}
                found.update(foundation_overrides(a))
                # "Foundation White:#FAFAF7 Black:#0B0B0D" arrives as separate arguments: take the ones that follow
                while key == "foundation" and i + 1 < len(args) and args[i + 1].strip().lower().startswith(("white", "black")):
                    i += 1
                    ov = foundation_overrides(args[i])
                    if not ov:
                        raise ValueError(f"Could not read '{args[i]}'. Expected White:#RRGGBB or Black:#RRGGBB after Foundation")
                    found.update(ov)
                if key != "foundation" and not foundation_overrides(a):
                    raise ValueError(f"Could not read '{a}'. Expected Foundation/White:#RRGGBB or Foundation/Black:#RRGGBB")
            else:
                scales.append(scale(*parse(a)))
            i += 1
        items = scales[:]
        if found is not None:
            items.append(foundation(found))
        if presets:  # the preset fills only what the user did not type
            items += [scale(*parse(c)) for c in DEFAULT_COLORS] + [foundation()]
        for r in items:
            if r["name"] not in seen:  # explicit colors typed win over the preset
                seen.add(r["name"])
                results.append(r)
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 2
    if as_table:
        print("\n\n".join(table(r) for r in results))
    else:
        print(json.dumps(results, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
