#!/usr/bin/env python3
"""Turn a figma-tokens/1 export into CSS, DTCG JSON and Tailwind v4 files.

Usage:
    python build_tokens.py <saved-result.json> <out-dir> [--formats css,json,tailwind]

<saved-result.json> is the file the host saved for the read_tokens.js result
(the full tool response, or the bare payload). Standard library only.

Naming: --<collection>-<path>, lowercase, spaces and slashes become dashes, and a
trailing " Default" is dropped (Brand/Plum/500 Default -> --brand-plum-500).
Aliases stay references: var(--brand-plum-500) in CSS, {brand.plum.500} in DTCG.
"""
import json
import re
import sys
from pathlib import Path

WEIGHTS = {"thin": 100, "extra light": 200, "extralight": 200, "light": 300, "regular": 400,
           "normal": 400, "medium": 500, "semi bold": 600, "semibold": 600, "bold": 700,
           "extra bold": 800, "extrabold": 800, "black": 900}


def load(path):
    data = json.loads(Path(path).read_text())
    if isinstance(data, dict) and "result" in data and isinstance(data["result"], dict):
        data = data["result"]
    if data.get("format") != "figma-tokens/1":
        raise SystemExit("This is not a figma-tokens/1 export. Run scripts/read_tokens.js first.")
    return data


def slug(s):
    s = re.sub(r"\s+default$", "", s.strip(), flags=re.I)
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def tok_slug(cname, vname):
    return "-".join([slug(cname)] + [slug(p) for p in vname.split("/")])


def dotted(cname, vname):
    return ".".join([slug(cname)] + [slug(p) for p in vname.split("/")])


def find_alias(ref, cols):
    """'Brand/Plum/500 Default' -> (collection dict, variable dict)."""
    best = None
    for c in cols:
        if ref.startswith(c["name"] + "/") and (best is None or len(c["name"]) > len(best["name"])):
            best = c
    if not best:
        return None, None
    name = ref[len(best["name"]) + 1:]
    for v in best["variables"]:
        if v["n"] == name:
            return best, v
    return best, None


def ordered(variables):
    """Keep groups together in first-seen order, and run numeric scales 950 -> 50.

    Figma does not guarantee variable order, so the output is sorted to stay tidy and stable.
    """
    groups, order = {}, []
    for v in variables:
        g = v["n"].rsplit("/", 1)[0] if "/" in v["n"] else ""
        if g not in groups:
            groups[g] = []
            order.append(g)
        groups[g].append(v)
    out = []
    for g in order:
        items = groups[g]
        leaf = lambda v: v["n"].rsplit("/", 1)[-1]
        if all(re.match(r"\d+", leaf(v)) for v in items):
            items = sorted(items, key=lambda v: -int(re.match(r"\d+", leaf(v)).group()))
        out += items
    return out


def mode_kind(name):
    n = name.lower()
    if n == "dark":
        return "dark"
    if n == "mobile":
        return "mobile"
    return "other"


def css_value(c, v, val, cols):
    if isinstance(val, dict) and "$" in val:
        ac, av = find_alias(val["$"], cols)
        return "var(--%s)" % tok_slug(ac["name"], av["n"]) if ac and av else "initial"
    if v["t"] == "COLOR":
        return val.lower()
    if v["t"] == "FLOAT":
        num = int(val) if float(val).is_integer() else round(val, 4)
        return "%spx" % num
    if v["t"] == "STRING":
        if v["n"].lower().startswith("font weight/"):
            return str(WEIGHTS.get(str(val).lower(), val))
        if v["n"].lower().startswith("font family/"):
            return '"%s", sans-serif' % val
        return '"%s"' % val
    return str(val)


def build_css(data):
    cols = data["collections"]
    lines = ["/* Generated from the Figma file \"%s\" by figma-export-tokens. Do not edit by hand. */" % data["file"], ""]
    root, dark, mobile, other = [], [], [], {}
    for c in cols:
        kinds = [mode_kind(m) for m in c["modes"]]
        root.append("  /* %s */" % c["name"])
        for v in ordered(c["variables"]):
            name = "--" + tok_slug(c["name"], v["n"])
            first = css_value(c, v, v["v"][0], cols)
            root.append("  %s: %s;" % (name, first))
            for i in range(1, len(c["modes"])):
                val = css_value(c, v, v["v"][i], cols)
                if val == first:
                    continue
                line = "%s: %s;" % (name, val)
                if kinds[i] == "dark":
                    dark.append(line)
                elif kinds[i] == "mobile":
                    mobile.append(line)
                else:
                    other.setdefault(c["modes"][i], []).append(line)
    lines.append(":root {")
    lines += root
    lines.append("}")
    if dark:
        lines += ["", "/* Dark mode: set data-theme=\"dark\" on a parent, or follow the system setting. */",
                  ":root[data-theme=\"dark\"] {"] + ["  " + l for l in dark] + ["}", "",
                  "@media (prefers-color-scheme: dark) {", "  :root:not([data-theme=\"light\"]) {"] + \
                 ["    " + l for l in dark] + ["  }", "}"]
    if mobile:
        lines += ["", "/* Mobile type scale */", "@media (max-width: 767px) {", "  :root {"] + \
                 ["    " + l for l in mobile] + ["  }", "}"]
    for mname, ls in other.items():
        lines += ["", "[data-mode=\"%s\"] {" % slug(mname)] + ["  " + l for l in ls] + ["}"]
    return "\n".join(lines) + "\n"


def dtcg_type(v):
    n = v["n"].lower()
    if v["t"] == "COLOR":
        return "color"
    if v["t"] == "FLOAT":
        return "dimension"
    if n.startswith("font family/"):
        return "fontFamily"
    if n.startswith("font weight/"):
        return "fontWeight"
    return "string"


def dtcg_value(v, val, cols):
    if isinstance(val, dict) and "$" in val:
        ac, av = find_alias(val["$"], cols)
        return "{%s}" % dotted(ac["name"], av["n"]) if ac and av else None
    if v["t"] == "COLOR":
        return val.lower()
    if v["t"] == "FLOAT":
        return "%spx" % (int(val) if float(val).is_integer() else round(val, 4))
    if v["n"].lower().startswith("font weight/"):
        return WEIGHTS.get(str(val).lower(), val)
    return val


def build_dtcg(data):
    cols = data["collections"]
    root = {"$description": "Generated from the Figma file \"%s\" by figma-export-tokens. First mode is the $value; other modes are under $extensions.figma.modes." % data["file"]}
    for c in cols:
        for v in ordered(c["variables"]):
            node = root
            parts = [slug(c["name"])] + [slug(p) for p in v["n"].split("/")]
            for p in parts[:-1]:
                node = node.setdefault(p, {})
            tok = {"$type": dtcg_type(v), "$value": dtcg_value(v, v["v"][0], cols)}
            modes = {}
            for i in range(1, len(c["modes"])):
                mv = dtcg_value(v, v["v"][i], cols)
                if mv != tok["$value"]:
                    modes[c["modes"][i]] = mv
            ext = {"collection": c["name"], "firstMode": c["modes"][0]}
            if modes:
                ext["modes"] = modes
            tok["$extensions"] = {"figma": ext}
            node[parts[-1]] = tok
    return json.dumps(root, indent=2, ensure_ascii=False) + "\n"


def build_tailwind(data):
    """Tailwind v4: a @theme inline block that points at the CSS variables in tokens.css."""
    cols = data["collections"]
    by = {c["name"].lower(): c for c in cols}
    lines = ["/* Generated from the Figma file \"%s\" by figma-export-tokens. Import tokens.css first. */" % data["file"],
             "@theme inline {"]

    def ref(c, v):
        return "var(--%s)" % tok_slug(c["name"], v["n"])

    for cname in ("alias", "mapped"):
        c = by.get(cname)
        if not c:
            continue
        lines.append("  /* %s colors */" % c["name"])
        for v in ordered(c["variables"]):
            if v["t"] == "COLOR":
                lines.append("  --color-%s: %s;" % ("-".join(slug(p) for p in v["n"].split("/")), ref(c, v)))
    b = by.get("brand")
    if b:
        groups = [("spacing/", "spacing"), ("radius/", "radius"), ("font family/", "font"), ("font weight/", "font-weight")]
        for prefix, ns in groups:
            vs = [v for v in b["variables"] if v["n"].lower().startswith(prefix)]
            if vs:
                lines.append("  /* %s */" % ns)
            for v in vs:
                lines.append("  --%s-%s: %s;" % (ns, slug(v["n"].split("/", 1)[1]), ref(b, v)))
    lines.append("}")
    return "\n".join(lines) + "\n"


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    formats = {"css", "json", "tailwind"}
    for a in argv:
        if a.startswith("--formats="):
            formats = set(a.split("=", 1)[1].split(","))
    if len(args) < 2:
        print(__doc__)
        return 1
    data = load(args[0])
    out = Path(args[1])
    out.mkdir(parents=True, exist_ok=True)
    written = []
    if "css" in formats:
        (out / "tokens.css").write_text(build_css(data)); written.append("tokens.css")
    if "json" in formats:
        (out / "tokens.tokens.json").write_text(build_dtcg(data)); written.append("tokens.tokens.json")
    if "tailwind" in formats:
        (out / "tailwind.theme.css").write_text(build_tailwind(data)); written.append("tailwind.theme.css")
    total = sum(len(c["variables"]) for c in data["collections"])
    print(json.dumps({"file": data["file"], "collections": data.get("counts"), "variables": total,
                      "written": [str(out / w) for w in written]}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
