#!/usr/bin/env bash
# Install the figma-* skills from this repo into Claude Code's global skills folder,
# so they work in every project, not only in this one.
#
#   ./install.sh            copy every skill to ~/.claude/skills (new and changed ones)
#   ./install.sh --check    show what would change and copy nothing
#   ./install.sh --target DIR   use another folder (for example a project's .claude/skills)
#
# It only copies. It never deletes anything, including skills it does not know about.
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)/.claude/skills"
TARGET="$HOME/.claude/skills"
CHECK=0
while [ $# -gt 0 ]; do
  case "$1" in
    --check) CHECK=1 ;;
    --target) shift; TARGET="${1:?--target needs a folder}" ;;
    -h|--help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1 (try --help)" >&2; exit 2 ;;
  esac
  shift
done

[ -d "$SRC" ] || { echo "No skills found at $SRC" >&2; exit 1; }
mkdir -p "$TARGET"

new=0; changed=0; same=0
for dir in "$SRC"/figma-*/; do
  name="$(basename "$dir")"
  dest="$TARGET/$name"
  if [ ! -d "$dest" ]; then
    status="new"; new=$((new + 1))
  elif diff -rq -x .DS_Store "$dir" "$dest" >/dev/null 2>&1; then
    status="up to date"; same=$((same + 1)); printf '  %-22s %s\n' "$name" "$status"; continue
  else
    status="changed"; changed=$((changed + 1))
  fi
  printf '  %-22s %s\n' "$name" "$status"
  if [ "$CHECK" -eq 0 ]; then
    mkdir -p "$dest"
    cp -R "$dir." "$dest/"
  fi
done

echo
if [ "$CHECK" -eq 1 ]; then
  echo "Check only, nothing copied: $new new, $changed changed, $same up to date."
  [ $((new + changed)) -eq 0 ] || echo "Run ./install.sh to update $TARGET."
else
  echo "Installed to $TARGET: $new new, $changed updated, $same already up to date."
  echo "Restart Claude Code (or open a new session) so it picks up the changes."
fi
