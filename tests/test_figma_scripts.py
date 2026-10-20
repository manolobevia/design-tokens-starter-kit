"""Runs the Figma scripts against an in-memory fake of the Plugin API (tests/figma_harness.js).
Run: python3 -m unittest discover tests
"""
import importlib.util
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILLS = ROOT / ".claude/skills"
HARNESS = Path(__file__).resolve().parent / "figma_harness.js"


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


serve = load("serve_scripts", SKILLS / "figma-starter/scripts/serve_scripts.py")
cs = load("color_scale", SKILLS / "figma-color-scale/scripts/color_scale.py")


def script(skill, name, cfg=None):
    return serve.apply_config((SKILLS / skill / "scripts" / name).read_text(), cfg or {})


def run(steps, file="Test file"):
    """steps: JS source strings, run in order against one fake file. Returns the harness output."""
    with tempfile.TemporaryDirectory() as tmp:
        paths = []
        for i, src in enumerate(steps):
            p = Path(tmp) / f"step{i}.js"
            p.write_text(src)
            paths.append({"path": str(p)})
        spec = Path(tmp) / "spec.json"
        spec.write_text(json.dumps({"file": file, "steps": paths}))
        r = subprocess.run(["node", str(HARNESS), str(spec)], capture_output=True, text=True)
        if r.returncode:
            raise AssertionError(r.stderr)
        return json.loads(r.stdout)


def values(out, collection, prefix, mode=None):
    rows = [v for v in out["variables"] if v["collection"] == collection and v["name"].startswith(prefix)]
    return {v["name"]: (v["values"][mode] if mode else next(iter(v["values"].values()))) for v in rows}


def brand_setup(colors):
    """JS that creates the Brand collection from {Name: {step: hex}} the way figma-color-scale does."""
    rows = [[f"{n}/{step}", hx] for n, steps in colors.items() for step, hx in steps.items()]
    return f"""
const rgb = (h) => ({{ r: parseInt(h.slice(1,3),16)/255, g: parseInt(h.slice(3,5),16)/255, b: parseInt(h.slice(5,7),16)/255, a: 1 }});
const col = figma.variables.createVariableCollection("Brand");
for (const [n, h] of {json.dumps(rows)}) {{ const v = figma.variables.createVariable(n, col, "COLOR"); v.setValueForMode(col.modes[0].modeId, rgb(h)); }}
return "brand";
"""


def default_brand(primary="#5C3FC4"):
    out = {}
    for line in [f"Purple:{primary}", *cs.DEFAULT_COLORS]:
        name, hx = cs.parse(line)
        out[name] = {s["step"]: s["hex"] for s in cs.scale(name, hx)["steps"]}
    out["Foundation"] = {"White": "#FFFFFF", "Black": "#000000"}
    return out


def has_node():
    return shutil.which("node") is not None


class ConfigInjection(unittest.TestCase):
    def test_override_replaces_the_constant_and_keeps_the_rest(self):
        src = script("figma-spacing", "spacing_scale.js", {"DRY_RUN": True, "EXPECT_FILE": "My file"})
        self.assertIn("let DRY_RUN = false;", src)
        self.assertIn("DRY_RUN = true;", src)
        self.assertIn('EXPECT_FILE = "My file";', src)
        self.assertIn("let REQUEST = {", src)  # untouched constants stay, only the keyword changes

    def test_unknown_name_is_refused(self):
        with self.assertRaises(ValueError) as e:
            script("figma-spacing", "spacing_scale.js", {"DRYRUN": True})
        self.assertIn("DRYRUN", str(e.exception))

    def test_every_script_still_parses_after_an_override(self):
        if not has_node():
            self.skipTest("node is not installed")
        for js in sorted(SKILLS.glob("figma-*/scripts/*.js")):
            names = serve.NAME.findall(serve.BLOCK.search(js.read_text()).group(2))
            cfg = {"DRY_RUN": True} if "DRY_RUN" in names else {names[0]: None}
            src = serve.apply_config(js.read_text(), cfg)
            with tempfile.TemporaryDirectory() as tmp:
                f = Path(tmp) / "w.js"
                f.write_text("(async()=>{\n" + src + "\n})")
                r = subprocess.run(["node", "--check", str(f)], capture_output=True, text=True)
                self.assertEqual(r.returncode, 0, f"{js.name}: {r.stderr}")


@unittest.skipUnless(has_node(), "node is not installed")
class PrimitiveScales(unittest.TestCase):
    def test_spacing_is_the_documented_scale_and_runs_twice_without_duplicates(self):
        s = script("figma-spacing", "spacing_scale.js")
        out = run([s, s])
        got = values(out, "Brand", "Spacing/")
        self.assertEqual(got, {f"Spacing/{t}": px for t, px in [
            ("0", 0), ("0-25", 1), ("0-5", 2), ("1", 4), ("2", 8), ("3", 12), ("4", 16), ("5", 20),
            ("6", 24), ("8", 32), ("10", 40), ("12", 48), ("16", 64), ("20", 80), ("24", 96)]})
        self.assertEqual(out["results"][0]["variables"]["created"], 15)
        self.assertEqual(out["results"][1]["variables"]["created"], 0)
        self.assertEqual(out["results"][1]["variables"]["unchanged"], 15)

    def test_token_times_four_is_the_pixel_value(self):
        for skill, name, group in [("figma-spacing", "spacing_scale.js", "Spacing/"),
                                   ("figma-radius", "radius_scale.js", "Border radius/"),
                                   ("figma-border-width", "border_width_scale.js", "Border width/")]:
            out = run([script(skill, name)])
            for n, px in values(out, "Brand", group).items():
                token = n[len(group):]
                if token == "full":
                    self.assertEqual(px, 9999)
                else:
                    self.assertEqual(px, float(token.replace("-", ".")) * 4, n)

    def test_radius_and_border_width_have_their_presets(self):
        out = run([script("figma-radius", "radius_scale.js"), script("figma-border-width", "border_width_scale.js")])
        self.assertEqual(sorted(values(out, "Brand", "Border radius/").values()), [0, 2, 4, 8, 12, 16, 24, 9999])
        self.assertEqual(sorted(values(out, "Brand", "Border width/").values()), [0, 1, 2, 4])
        scopes = {v["name"].split("/")[0]: v["scopes"] for v in out["variables"]}
        self.assertEqual(scopes["Border radius"], ["CORNER_RADIUS"])
        self.assertEqual(scopes["Border width"], ["STROKE_FLOAT"])

    def test_motion_durations_are_stored_in_seconds(self):
        out = run([script("figma-motion", "motion_scale.js")])
        dur = values(out, "Brand", "Motion/Duration/")
        self.assertEqual(dur, {"Motion/Duration/XFast": 0.25, "Motion/Duration/Fast": 0.5, "Motion/Duration/Default": 1,
                               "Motion/Duration/Slow": 1.5, "Motion/Duration/XSlow": 2.5})
        standard = values(out, "Brand", "Motion/Easing/Standard")["Motion/Easing/Standard"]
        self.assertEqual(standard["easingFunctionCubicBezier"], {"x1": 0.2, "y1": 0, "x2": 0, "y2": 1})

    def test_wrong_file_guard_writes_nothing(self):
        out = run([script("figma-spacing", "spacing_scale.js", {"EXPECT_FILE": "Another file"})], file="Test file")
        self.assertEqual(out["results"][0]["status"], "error")
        self.assertEqual(out["variables"], [])


# font size / line height / paragraph spacing, from the table in figma-type-scale/SKILL.md
TYPE_TABLE = {
    "Display/Default": ((76, 92, 40), (56, 68, 28)), "Heading/H1": ((60, 72, 32), (48, 56, 24)),
    "Heading/H2": ((48, 56, 24), (40, 48, 20)), "Heading/H3": ((40, 48, 20), (32, 40, 16)),
    "Heading/H4": ((32, 40, 16), (28, 32, 16)), "Heading/H5": ((24, 28, 12), (24, 28, 12)),
    "Heading/H6": ((20, 24, 12), (20, 24, 12)), "Body/Large": ((20, 24, 12), (20, 24, 12)),
    "Body/Default": ((16, 20, 8), (16, 20, 8)), "Body/Small": ((14, 20, 8), (14, 20, 8)),
    "Label/Large": ((16, 20, 0), (16, 20, 0)), "Label/Default": ((14, 16, 0), (14, 16, 0)),
    "Label/Small": ((12, 16, 0), (12, 16, 0)), "Caption/Default": ((12, 16, 8), (12, 16, 8)),
    "Overline/Default": ((12, 16, 0), (12, 16, 0)),
}
TYPE_REQUEST = {"variables": True, "styles": True, "groups": ["all"], "overwrite": {"variables": False, "styles": False},
                "fontDefaults": True, "fonts": []}


@unittest.skipUnless(has_node(), "node is not installed")
class TypeScale(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out = run([script("figma-type-scale", "type_scale.js", {"REQUEST": TYPE_REQUEST})])

    def test_sizes_match_the_documented_table_on_desktop_and_mobile(self):
        for style, (desktop, mobile) in TYPE_TABLE.items():
            for mode, want in (("Desktop", desktop), ("Mobile", mobile)):
                got = tuple(values(self.out, "Responsive", f"{style}/{p}", mode)[f"{style}/{p}"]
                            for p in ("Font size", "Line height", "Paragraph spacing"))
                self.assertEqual(got, want, f"{style} {mode}")

    def test_desktop_is_the_default_mode_and_mobile_exists(self):
        self.assertEqual(self.out["modes"]["Responsive"], ["Desktop", "Mobile"])

    def test_every_style_is_bound_to_five_variables_and_none_failed(self):
        styles = self.out["textStyles"]
        self.assertEqual(len(styles), 18)  # 15 roles plus a Strong twin of each of the 3 Body styles
        for s in styles:
            self.assertEqual(sorted(s["bound"]), ["fontFamily", "fontSize", "fontStyle", "lineHeight", "paragraphSpacing"], s["name"])
        self.assertEqual(self.out["results"][0]["styles"]["failed"], 0)

    def test_there_are_exactly_two_font_roles_with_the_default_fonts(self):
        fam = values(self.out, "Brand", "Font family/")
        self.assertEqual(fam, {"Font family/Heading": "Inter", "Font family/Body": "Roboto"})

    def test_named_fonts_win_over_the_defaults(self):
        req = dict(TYPE_REQUEST, fonts=[{"path": "Brand/Font family/Heading", "value": "Playfair"},
                                        {"path": "Brand/Font family/Body", "value": "Lato"}])
        out = run([script("figma-type-scale", "type_scale.js", {"REQUEST": req})])
        self.assertEqual(values(out, "Brand", "Font family/"), {"Font family/Heading": "Playfair", "Font family/Body": "Lato"})
        self.assertEqual(out["results"][0]["status"], "ok")

    def test_a_font_that_does_not_exist_is_refused(self):
        req = dict(TYPE_REQUEST, fonts=[{"path": "Brand/Font family/Body", "value": "Nopefont"}])
        out = run([script("figma-type-scale", "type_scale.js", {"REQUEST": req})])
        failed = [f for f in out["results"][0]["fonts"] if f["action"] == "failed"]
        self.assertTrue(failed and "not a font available" in failed[0]["error"])

    def test_a_second_run_changes_nothing(self):
        s = script("figma-type-scale", "type_scale.js", {"REQUEST": TYPE_REQUEST})
        again = run([s, s])["results"][1]
        self.assertEqual((again["variables"]["created"], again["variables"]["updated"], again["styles"]["created"]), (0, 0, 0))


@unittest.skipUnless(has_node(), "node is not installed")
class AliasAndMapped(unittest.TestCase):
    def test_alias_values_are_references_not_hex(self):
        bridge = script("figma-alias-bridge", "alias_bridge.js",
                        {"BRIDGES": [{"from": "Brand/Purple", "to": "Alias/Primary (Purple)"}]})
        out = run([brand_setup(default_brand()), bridge])
        primary = values(out, "Alias", "Primary/")
        self.assertEqual(len(primary), 11)
        self.assertEqual(primary["Primary/500 Default"], {"alias": "Brand/Purple/500 Default"})

    def test_neutral_only_accepts_gray(self):
        bridge = script("figma-alias-bridge", "alias_bridge.js", {"BRIDGES": [{"from": "Brand/Purple", "to": "Alias/Neutral"}]})
        out = run([brand_setup(default_brand()), bridge])
        self.assertEqual(out["results"][1]["results"][0]["status"], "error")
        self.assertEqual(values(out, "Alias", "Neutral/"), {})

    def test_mapped_is_all_references_with_light_and_dark(self):
        bridges = [{"from": "Brand/Purple", "to": "Alias/Primary"}, {"from": "Brand/Gray", "to": "Alias/Neutral"},
                   {"from": "Brand/Red", "to": "Alias/Error"}, {"from": "Brand/Green", "to": "Alias/Success"},
                   {"from": "Brand/Orange", "to": "Alias/Warning"}, {"from": "Brand/Blue", "to": "Alias/Information"},
                   {"from": "Brand/Foundation", "to": "Alias/Foundation"}]
        mapped_cfg = {"REQUEST": {"groups": ["all"], "dark": True, "reset": False, "retier": False, "lines": [], "renames": []}}
        out = run([brand_setup(default_brand()), script("figma-alias-bridge", "alias_bridge.js", {"BRIDGES": bridges}),
                   script("figma-mapped-roles", "mapped_roles.js", mapped_cfg)])
        res = out["results"][2]
        self.assertEqual((res["status"], res["missingSources"], res["contrast"]), ("ok", [], []))
        self.assertEqual(out["modes"]["Mapped"], ["Light", "Dark"])
        mapped = [v for v in out["variables"] if v["collection"] == "Mapped"]
        self.assertEqual(len(mapped), 95)
        for v in mapped:
            for mode, val in v["values"].items():
                self.assertIsInstance(val, dict, f"{v['name']} {mode} is not a reference")
                self.assertTrue(val["alias"].startswith("Alias/"), f"{v['name']} {mode} skips the Alias tier")

    def test_mapped_dark_mirrors_the_step_and_keeps_500(self):
        bridges = [{"from": "Brand/Gray", "to": "Alias/Neutral"}, {"from": "Brand/Purple", "to": "Alias/Primary"},
                   {"from": "Brand/Foundation", "to": "Alias/Foundation"}]
        cfg = {"REQUEST": {"groups": ["Text"], "dark": True, "reset": False, "retier": False, "lines": [], "renames": []}}
        out = run([brand_setup(default_brand()), script("figma-alias-bridge", "alias_bridge.js", {"BRIDGES": bridges}),
                   script("figma-mapped-roles", "mapped_roles.js", cfg)])
        heading = next(v for v in out["variables"] if v["name"] == "Text/heading" and v["collection"] == "Mapped")
        self.assertEqual(heading["values"], {"Light": {"alias": "Alias/Neutral/900"}, "Dark": {"alias": "Alias/Neutral/100"}})
        on_action = next(v for v in out["variables"] if v["name"] == "Text/on-action" and v["collection"] == "Mapped")
        self.assertEqual(on_action["values"]["Dark"], on_action["values"]["Light"])  # white stays white on the solid button


if __name__ == "__main__":
    unittest.main()
