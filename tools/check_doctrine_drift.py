#!/usr/bin/env python3
"""Fail if the doctrine copies have diverged. Same idea as the IDMP mirror's
drift detection: the failure mode here is silent, so it needs a detector.

Checks, in order of how badly each one bit:
  1. design-system.md is section 4 of the canonical skill, verbatim
  2. the zip contains the current SKILL.md and design-system.md
  3. the chat skill and the worker both state the form-class contract
  4. pearl.css actually defines every form the doctrine names
"""
import hashlib
import os
import re
import sys
import zipfile

CANON = ".claude/skills/pearls/SKILL.md"
CHAT = "claude-ai-skill/pearls/SKILL.md"
MIRROR = "claude-ai-skill/pearls/reference/design-system.md"
ZIP = "claude-ai-skill/pearls-skill.zip"
WORKER = "worker/pearl-mcp/src/index.js"
CSS = "pearl.css"

FORMS = ["form-ladder", "form-stage", "form-slots", "form-matrix", "form-branch",
         "form-mnemonic", "form-directory", "form-takeaway", "form-figure"]

fails = []


def read(p):
    return open(p, encoding="utf-8").read()


def section4(text):
    return text[text.index("## 4 · Design the entry"):text.index("## 5 · Manifest")].rstrip() + "\n"


def main():
    canon = read(CANON)
    sec4 = section4(canon)

    # 1 — the verbatim mirror
    mirror = read(MIRROR)
    if sec4 not in mirror:
        fails.append(f"{MIRROR} is not section 4 of {CANON} verbatim — "
                     f"run tools/sync_doctrine.py")

    # 2 — the zip is what is on disk
    if not os.path.exists(ZIP):
        fails.append(f"{ZIP} missing — run tools/sync_doctrine.py")
    else:
        with zipfile.ZipFile(ZIP) as z:
            names = z.namelist()
            for disk, inzip in ((CHAT, "pearls/SKILL.md"),
                                (MIRROR, "pearls/reference/design-system.md")):
                if inzip not in names:
                    fails.append(f"{ZIP} has no {inzip}")
                    continue
                a = hashlib.sha256(z.read(inzip)).hexdigest()
                b = hashlib.sha256(open(disk, "rb").read()).hexdigest()
                if a != b:
                    fails.append(f"{ZIP}:{inzip} is stale vs {disk} — "
                                 f"run tools/sync_doctrine.py")

    # 3 — the contract is stated everywhere an entry can be authored
    chat, worker = read(CHAT), read(WORKER)
    for name, text in (("canonical skill", canon), ("chat skill", chat), ("worker", worker)):
        if "form-ladder" not in text:
            fails.append(f"{name} does not mention the form classes")
    if 'class="pearl form-{name} e-{short}"' not in chat:
        fails.append(f"{CHAT} still documents the old root div without a form class")
    for token in ("middot", "&#8201;"):
        if token not in worker:
            fails.append(f"{WORKER} does not enforce '{token}'")

    # 4 — every form the doctrine names is actually styled
    css = read(CSS)
    for f in FORMS:
        if f not in sec4:
            fails.append(f"section 4 does not list {f}")
        if f"pearl.{f}" not in css and f".{f} " not in css and f".{f}{{" not in css:
            fails.append(f"{CSS} defines no rules for .{f}")

    for f in fails:
        print(f"DRIFT  {f}")
    print(f"\n{len(fails)} drift issue(s) across 6 doctrine copies")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
