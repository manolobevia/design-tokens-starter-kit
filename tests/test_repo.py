"""Repo checks: every skill is well formed and every Figma script parses. Run: python3 -m unittest discover tests"""
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SKILLS = Path(__file__).resolve().parent.parent / ".claude/skills"
MAX_DESCRIPTION = 200


def skill_dirs():
    return sorted(p for p in SKILLS.glob("figma-*") if p.is_dir())


def front_matter(path):
    text = path.read_text()
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    pairs = re.findall(r"^(\w+):\s*(.*)$", m.group(1), re.M) if m else []
    return {k: v.strip().strip("\"'") for k, v in pairs}  # a quoted value is valid YAML


class SkillFiles(unittest.TestCase):
    def test_there_are_skills(self):
        self.assertTrue(skill_dirs())

    def test_every_skill_has_front_matter_matching_its_folder(self):
        for d in skill_dirs():
            fm = front_matter(d / "SKILL.md")
            self.assertEqual(fm.get("name"), d.name, f"{d.name}: name must equal the folder name")
            self.assertTrue(fm.get("description"), f"{d.name}: missing description")

    def test_descriptions_stay_under_the_limit(self):
        for d in skill_dirs():
            desc = front_matter(d / "SKILL.md").get("description", "")
            self.assertLessEqual(len(desc), MAX_DESCRIPTION, f"{d.name}: description is {len(desc)} characters")


@unittest.skipUnless(shutil.which("node"), "node is not installed")
class FigmaScripts(unittest.TestCase):
    def test_every_script_parses(self):
        # The scripts run inside an async function in Figma, so top-level await and return are legal there.
        for d in skill_dirs():
            for js in sorted((d / "scripts").glob("*.js")):
                with tempfile.TemporaryDirectory() as tmp:
                    wrapped = Path(tmp) / "wrapped.js"
                    wrapped.write_text("(async()=>{\n" + js.read_text() + "\n})")
                    r = subprocess.run(["node", "--check", str(wrapped)], capture_output=True, text=True)
                    self.assertEqual(r.returncode, 0, f"{js.relative_to(SKILLS.parent.parent)}: {r.stderr.strip()}")


if __name__ == "__main__":
    unittest.main()
