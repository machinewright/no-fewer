#!/usr/bin/env bash
# Builds itch/no-fewer-web.zip for itch.io's HTML5 upload: index.html at the root, only what the game loads.
set -euo pipefail
cd "$(dirname "$0")/.."
source ~/.nvm/nvm.sh >/dev/null 2>&1 || true
node --test test/ >/dev/null || { echo "tests fail" >&2; exit 1; }
rm -f itch/no-fewer-web.zip
zip -qr itch/no-fewer-web.zip index.html style.css game.js src fonts LICENSE
unzip -l itch/no-fewer-web.zip | tail -1
