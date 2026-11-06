#!/usr/bin/env python3
"""Stamp CSS/JS links in every page with a content hash (?v=xxxxxxxx).

Static assets are cached by browsers for a day (see vercel.json), so after
editing styles.css, main.js or consent.js run this from the repo root:

    python3 tools/version-assets.py

and commit the updated HTML. Visitors then fetch the new files immediately.
"""
import hashlib
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ["assets/css/styles.css", "assets/js/main.js", "assets/js/consent.js"]


def main():
    hashes = {a: hashlib.md5((ROOT / a).read_bytes()).hexdigest()[:8] for a in ASSETS}
    for page in ROOT.glob("*.html"):
        text = original = page.read_text(encoding="utf-8")
        for asset, digest in hashes.items():
            text = re.sub(r'(["/])' + re.escape(asset) + r'(\?v=[0-9a-f]+)?"',
                          r"\1" + asset + "?v=" + digest + '"', text)
        if text != original:
            page.write_text(text, encoding="utf-8")
            print("updated", page.name)
    print(hashes)


if __name__ == "__main__":
    main()
