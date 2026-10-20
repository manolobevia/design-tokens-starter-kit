"""The website's color demo (site/src/scripts/scale.ts) must match figma-color-scale exactly."""
import json
import re
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / ".claude/skills/figma-color-scale/scripts/color_scale.py"
SCALE_TS = ROOT / "site/src/scripts/scale.ts"
COLORS = ["Purple:#5C3FC4", "Gray:#6B7280", "Teal:#0F766E", "Coral:#E4572E", "Black:#000000", "White:#FFFFFF", "Mid:#808080"]


def node_major():
    node = shutil.which("node")
    if not node:
        return 0
    out = subprocess.run([node, "-v"], capture_output=True, text=True).stdout
    m = re.match(r"v(\d+)", out)
    return int(m.group(1)) if m else 0


@unittest.skipUnless(node_major() >= 22, "needs Node 22.6+ to run TypeScript directly")
class SiteScaleMatchesSkill(unittest.TestCase):
    def test_scales_match(self):
        js = (
            f"import {{ scale }} from {json.dumps(str(SCALE_TS))};"
            f"console.log(JSON.stringify({json.dumps([c.split(':')[1] for c in COLORS])}.map((h) => scale(h).map((s) => s.hex))));"
        )
        mine = json.loads(subprocess.run(
            ["node", "--experimental-strip-types", "--input-type=module", "-e", js],
            capture_output=True, text=True, check=True).stdout)
        for color, got in zip(COLORS, mine):
            out = subprocess.run(["python3", "-I", str(SCRIPT), color], capture_output=True, text=True, check=True).stdout
            want = [s["hex"] for s in json.loads(out)[0]["steps"]]
            self.assertEqual(got, want, color)


if __name__ == "__main__":
    unittest.main()
