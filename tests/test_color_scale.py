"""Tests for the color math in figma-color-scale. Run: python3 -m unittest discover tests"""
import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / ".claude/skills/figma-color-scale/scripts/color_scale.py"
spec = importlib.util.spec_from_file_location("color_scale", SCRIPT)
cs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cs)

# The reference result printed in figma-color-scale/SKILL.md for Purple:#5C3FC4.
PURPLE = {
    "950": "#090614", "900": "#120D27", "800": "#25194E", "700": "#372676", "600": "#4A329D",
    "500 Default": "#5C3FC4", "400": "#7D65D0", "300": "#9D8CDC", "200": "#BEB2E7", "100": "#DED9F3", "50": "#EFECF9",
}


def hexes(result):
    return {s["step"]: s["hex"] for s in result["steps"]}


class ScaleMath(unittest.TestCase):
    def test_purple_matches_the_documented_reference(self):
        name, hx = cs.parse("Purple:#5C3FC4")
        self.assertEqual(hexes(cs.scale(name, hx)), PURPLE)

    def test_steps_are_ordered_950_to_50_and_500_is_the_base(self):
        r = cs.scale(*cs.parse("Teal:#1A8647"))
        self.assertEqual([s["step"] for s in r["steps"]], ["950", "900", "800", "700", "600", "500 Default", "400", "300", "200", "100", "50"])
        self.assertEqual(hexes(r)["500 Default"], "#1A8647")

    def test_dark_steps_get_darker_and_light_steps_lighter(self):
        r = cs.scale(*cs.parse("Red:#DC2626"))
        lum = [sum(int(s["hex"][i:i + 2], 16) for i in (1, 3, 5)) for s in r["steps"]]
        self.assertEqual(lum, sorted(lum), "the scale must run dark to light")

    def test_variable_names_use_the_color_name(self):
        r = cs.scale(*cs.parse("Plum:#3B1A53"))
        self.assertEqual(r["steps"][0]["variable"], "Plum/950")
        self.assertEqual(r["steps"][5]["variable"], "Plum/500 Default")


class Parsing(unittest.TestCase):
    def test_accepted_forms(self):
        for text in ("Purple:#5C3FC4", "Purple:5C3FC4", "Purple=#5C3FC4", "  Purple : #5c3fc4  "):
            self.assertEqual(cs.parse(text), ("Purple", "5C3FC4"), text)

    def test_three_digit_hex_expands(self):
        self.assertEqual(cs.parse("Gray:#abc"), ("Gray", "AABBCC"))

    def test_name_is_capitalised(self):
        self.assertEqual(cs.parse("vermilion:#ed5d57")[0], "Vermilion")

    def test_rejects_unreadable_input(self):
        with self.assertRaises(ValueError):
            cs.parse("Purple")


class Presets(unittest.TestCase):
    def run_cli(self, *args):
        out = subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stderr)
        return json.loads(out.stdout)

    def test_default_preset_is_five_scales_plus_foundation(self):
        names = [r["name"] for r in self.run_cli("-default")]
        self.assertEqual(names, ["Red", "Blue", "Orange", "Green", "Gray", "Foundation"])

    def test_foundation_is_white_and_black_not_a_scale(self):
        r = self.run_cli("Foundation")[0]
        self.assertEqual({s["variable"]: s["hex"] for s in r["steps"]}, {"Foundation/White": "#FFFFFF", "Foundation/Black": "#000000"})

    def test_a_typed_color_wins_over_the_preset_one(self):
        reds = [r for r in self.run_cli("Red:#FF0000", "-default") if r["name"] == "Red"]
        self.assertEqual(len(reds), 1)
        self.assertEqual(reds[0]["base"], "#FF0000")


if __name__ == "__main__":
    unittest.main()
