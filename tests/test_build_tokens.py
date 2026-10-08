"""Tests for the code export converter (figma-export-tokens). Run: python3 -m unittest discover tests"""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / ".claude/skills/figma-export-tokens/scripts/build_tokens.py"
spec = importlib.util.spec_from_file_location("build_tokens", SCRIPT)
bt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bt)


def bezier(x1, y1, x2, y2):
    return {"type": "CUSTOM_CUBIC_BEZIER", "easingFunctionCubicBezier": {"x1": x1, "y1": y1, "x2": x2, "y2": y2}}


DATA = {
    "format": "figma-tokens/1", "file": "Test",
    "collections": [
        {"name": "Brand", "modes": ["Mode 1"], "variables": [
            # deliberately out of order: the converter must sort scales 950 -> 50
            {"n": "Plum/50", "t": "COLOR", "v": ["#EBE8EE"]},
            {"n": "Plum/500 Default", "t": "COLOR", "v": ["#3B1A53"]},
            {"n": "Plum/950", "t": "COLOR", "v": ["#060308"]},
            {"n": "Spacing/4", "t": "FLOAT", "v": [16]},
            {"n": "Font family/Body", "t": "STRING", "v": ["Lato"]},
            {"n": "Font weight/Bold", "t": "STRING", "v": ["Bold"]},
            # Figma stores a TIMING variable in seconds
            {"n": "Motion/Duration/Default", "t": "TIMING", "v": [1]},
            {"n": "Motion/Duration/XFast", "t": "TIMING", "v": [0.25]},
            {"n": "Motion/Easing/Standard", "t": "EASING", "v": [bezier(0.20000000298023224, 0, 0, 1)]},
            {"n": "Motion/Easing/Linear", "t": "EASING", "v": [bezier(0, 0, 1, 1)]},
        ]},
        {"name": "Alias", "modes": ["Mode 1"], "variables": [
            {"n": "Primary/500 Default", "t": "COLOR", "v": [{"$": "Brand/Plum/500 Default"}]},
        ]},
        {"name": "Mapped", "modes": ["Light", "Dark"], "variables": [
            {"n": "Surface/page", "t": "COLOR", "v": [{"$": "Alias/Primary/500 Default"}, "#0B0B0D"]},
            {"n": "Surface/action", "t": "COLOR", "v": [{"$": "Alias/Primary/500 Default"}, {"$": "Alias/Primary/500 Default"}]},
        ]},
        {"name": "Responsive", "modes": ["Desktop", "Mobile"], "variables": [
            {"n": "Heading/H1/Font size", "t": "FLOAT", "v": [60, 48]},
        ]},
    ],
}


class Css(unittest.TestCase):
    css = bt.build_css(DATA)

    def test_names_drop_default_and_use_dashes(self):
        self.assertIn("--brand-plum-500: #3b1a53;", self.css)
        self.assertIn("--alias-primary-500: var(--brand-plum-500);", self.css)

    def test_references_stay_references(self):
        self.assertIn("--mapped-surface-page: var(--alias-primary-500);", self.css)

    def test_scales_run_950_to_50(self):
        order = [self.css.index("--brand-plum-" + s + ":") for s in ("950", "500", "50")]
        self.assertEqual(order, sorted(order))

    def test_dark_values_only_where_they_differ(self):
        dark = self.css.split(':root[data-theme="dark"]')[1].split("}")[0]
        self.assertIn("--mapped-surface-page: #0b0b0d;", dark)
        self.assertNotIn("surface-action", dark)

    def test_mobile_values_go_in_a_media_query(self):
        self.assertIn("@media (max-width: 767px)", self.css)
        self.assertIn("--responsive-heading-h1-font-size: 48px;", self.css)

    def test_numbers_fonts_and_weights(self):
        self.assertIn("--brand-spacing-4: 16px;", self.css)
        self.assertIn('--brand-font-family-body: "Lato", sans-serif;', self.css)
        self.assertIn("--brand-font-weight-bold: 700;", self.css)

    def test_timing_is_stored_in_seconds_and_exported_in_milliseconds(self):
        self.assertIn("--brand-motion-duration-default: 1000ms;", self.css)
        self.assertIn("--brand-motion-duration-xfast: 250ms;", self.css)

    def test_easing_is_a_cubic_bezier_and_linear_is_linear(self):
        self.assertIn("--brand-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);", self.css)
        self.assertIn("--brand-motion-easing-linear: linear;", self.css)


class Dtcg(unittest.TestCase):
    tree = json.loads(bt.build_dtcg(DATA))

    def test_alias_is_a_reference_and_modes_are_kept(self):
        tok = self.tree["mapped"]["surface"]["page"]
        self.assertEqual(tok["$value"], "{alias.primary.500}")
        self.assertEqual(tok["$extensions"]["figma"]["modes"], {"Dark": "#0b0b0d"})

    def test_motion_types(self):
        m = self.tree["brand"]["motion"]
        self.assertEqual((m["duration"]["default"]["$type"], m["duration"]["default"]["$value"]), ("duration", "1000ms"))
        self.assertEqual((m["easing"]["standard"]["$type"], m["easing"]["standard"]["$value"]), ("cubicBezier", [0.2, 0, 0, 1]))


class Tailwind(unittest.TestCase):
    def test_theme_points_at_the_css_variables(self):
        tw = bt.build_tailwind(DATA)
        self.assertIn("@theme inline", tw)
        self.assertIn("--color-primary-500: var(--alias-primary-500);", tw)
        self.assertIn("--ease-standard: var(--brand-motion-easing-standard);", tw)

    def test_a_file_that_is_not_an_export_is_refused(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "x.json"
            p.write_text(json.dumps({"hello": "world"}))
            with self.assertRaises(SystemExit):
                bt.load(p)


if __name__ == "__main__":
    unittest.main()
