"""The Mapped preset passes WCAG AA with the default colors. Run: python3 -m unittest discover tests

Reads the PRESET block of figma-mapped-roles/scripts/mapped_roles.js (through node), resolves every variable
to a color from the figma-color-scale default scales, and checks the pairs the Contrast checks frame uses.
"""
import importlib.util
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SKILLS = Path(__file__).resolve().parent.parent / ".claude/skills"
spec = importlib.util.spec_from_file_location("color_scale", SKILLS / "figma-color-scale/scripts/color_scale.py")
cs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cs)

ROLES = ["error", "success", "warning", "information"]
# Primary is the user's color; these cover a mid-tone and a very dark brand color.
PRIMARIES = {"Purple": "#5C3FC4", "Plum": "#3B1A53"}
NEUTRAL = "Gray"
ALIAS_OF_BRAND = {"Neutral": "Gray", "Error": "Red", "Success": "Green", "Warning": "Orange", "Information": "Blue"}


def load_preset():
    js = (SKILLS / "figma-mapped-roles/scripts/mapped_roles.js").read_text()
    block = js[js.index("// ---- PRESET ----"):js.index("// ---- END PRESET ----")]
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / "p.js"
        f.write_text(block + "\nconsole.log(JSON.stringify({PRESET, KEEP}));")
        out = subprocess.run(["node", str(f)], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def build_alias(primary_hex):
    """Alias variable name -> hex, from the default scales (Primary uses the given color)."""
    alias = {}
    scales = {"Primary": cs.scale("Primary", cs.parse("X:" + primary_hex)[1])}
    for line in cs.DEFAULT_COLORS:
        name, hx = cs.parse(line)
        scales[name] = cs.scale(name, hx)
    for role, brand in {**ALIAS_OF_BRAND, "Primary": "Primary"}.items():
        for s in scales[brand]["steps"]:
            alias[f"{role}/{s['step'].split()[0]}"] = s["hex"]
    for name, hx in cs.FOUNDATION:
        alias[f"Foundation/{name}"] = hx
    return alias


def mirror(ref):
    group, leaf = ref.rsplit("/", 1)
    if leaf == "White":
        return group + "/Black"
    if leaf == "Black":
        return group + "/White"
    n = int(leaf)
    return ref if n == 500 else f"{group}/{1000 - n}"


def resolve(preset, keep, alias):
    """'Group/name' -> {'light': hex, 'dark': hex}, following the preset's dark rules."""
    out = {}
    for group, rows in preset.items():
        for name, light, dark, _use in rows:
            d = light if dark == keep else mirror(light) if dark is None else dark
            out[f"{group}/{name}"] = {"light": alias[light], "dark": alias[d]}
    return out


def luminance(hx):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (int(hx[i:i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def ratio(a, b):
    la, lb = luminance(a), luminance(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def pairs():
    content = ["heading", "subheading", "body", "body-secondary", "caption", "label", "helper",
               "action", "action-hover", "action-pressed", *ROLES]
    out = []
    for bg in ("default", "page"):
        for t in content:
            out.append((f"Text/{t}", f"Surface/{bg}", 4.5))
            out.append((f"Icon/{t}", f"Surface/{bg}", 3))
    on = {"on-action": ["action", "action-hover", "action-pressed"],
          "on-action-secondary": ["action-secondary", "action-secondary-hover"],
          "on-selected": ["selected"], "on-inverse": ["inverse"], "on-inverse-secondary": ["inverse"]}
    for r in ROLES:
        on["on-" + r] = [r]
        on["on-" + r + "-secondary"] = [r + "-secondary"]
    for fg, bgs in on.items():
        for bg in bgs:
            out.append((f"Text/{fg}", f"Surface/{bg}", 4.5))
            out.append((f"Icon/{fg}", f"Surface/{bg}", 3))
    for b in ["default", "action", "action-hover", "action-pressed", "focus", "selected", *ROLES]:
        out.append((f"Border/{b}", "Surface/default", 3))
    return out


@unittest.skipUnless(shutil.which("node"), "node is not installed")
class MappedPresetContrast(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        data = load_preset()
        cls.preset, cls.keep = data["PRESET"], data["KEEP"]

    def failures(self, primary_hex, only=None):
        values = resolve(self.preset, self.keep, build_alias(primary_hex))
        bad = []
        for fg, bg, minimum in pairs():
            if fg not in values or bg not in values:  # Icon leaves out the type-only names
                continue
            for mode in ("light", "dark"):
                r = ratio(values[fg][mode], values[bg][mode])
                if r < minimum and (only is None or only(fg, bg)):
                    bad.append(f"{mode} {fg} on {bg} {r:.2f}:1 (needs {minimum})")
        return bad

    def test_status_and_neutral_pairs_pass_whatever_the_brand_color(self):
        # These do not depend on Primary, so a very dark brand color must not break them.
        primary_only = ("action", "on-action", "focus", "selected", "on-selected")
        only = lambda fg, bg: not fg.split("/")[1].startswith(primary_only)
        self.assertEqual(self.failures(PRIMARIES["Plum"], only=only), [])

    def test_every_pair_passes_with_a_mid_tone_primary(self):
        self.assertEqual(self.failures(PRIMARIES["Purple"]), [])

    def test_success_and_warning_regressions(self):
        # White on Success/500 (3.30:1), Success/600 text on the page (4.34:1) and Warning/500 as a border (2.80:1)
        # were the three failures of the previous preset.
        values = resolve(self.preset, self.keep, build_alias(PRIMARIES["Purple"]))
        for mode in ("light", "dark"):
            self.assertGreaterEqual(ratio(values["Text/on-success"][mode], values["Surface/success"][mode]), 4.5)
        self.assertGreaterEqual(ratio(values["Text/success"]["light"], values["Surface/page"]["light"]), 4.5)
        self.assertGreaterEqual(ratio(values["Border/warning"]["light"], values["Surface/default"]["light"]), 3)


if __name__ == "__main__":
    unittest.main()
