#!/usr/bin/env python3
"""Gate for the Pearl entry style guide (.claude/skills/pearls/SKILL.md section 4).

Prose a model can drift from is not a style guide; this is what makes it a gate.
Run from the repo root:  python3 tools/lint_entries.py [--warnings-as-errors]

ERRORs fail CI. WARNs are reported and do not.
"""
import html
import json
import os
import re
import sys

ENTRIES, MANIFEST = "entries", "manifest.json"
MAX_BYTES = 8192
FORMS = {"form-ladder", "form-stage", "form-slots", "form-matrix",
         "form-branch", "form-mnemonic", "form-directory", "form-takeaway",
         "form-figure"}
# Marks that are structural content rather than separators: an arrow inside a
# flow sheet IS the diagram, and an en dash inside 3-10 IS the number.
MIDDOT, EMDASH, ENDASH, ARROW = "·", "—", "–", "→"

errors, warns = [], []


def err(f, m):
    errors.append(f"{f}: {m}")


def warn(f, m):
    warns.append(f"{f}: {m}")


def strip_style(s):
    return re.sub(r"<style.*?</style>", "", s, flags=re.S)


def text_of(s):
    """Visible text: scoped CSS gone, tags gone, entities DECODED.

    Decoding matters: an em dash written &#8212; is still an em dash, and a
    grep for the literal character silently passes it.
    """
    return html.unescape(re.sub(r"<[^>]+>", " ", strip_style(s)))


def lint_entry(path):
    f = os.path.basename(path)
    raw = open(path, encoding="utf-8").read()
    body, txt = strip_style(raw), text_of(raw)

    # --- worker validation, mirrored so it fails here first ---
    root = re.match(r'\s*<div class="pearl([^"]*)"', raw)
    if not root:
        err(f, 'root element must be <div class="pearl ...">')
        return
    if re.search(r"<script|<iframe|javascript:|\bon\w+\s*=", raw, re.I):
        err(f, "scripts, iframes or inline handlers are not allowed")
    if re.search(r"<(html|head|body)\b", raw, re.I):
        err(f, "fragment must not contain <html>/<head>/<body>")
    n = len(raw.encode())
    if n > MAX_BYTES:
        err(f, f"{n} bytes, over the {MAX_BYTES} limit — split the entry")

    # --- 4.1 declared form ---
    declared = set(root.group(1).split()) & FORMS
    if not declared:
        err(f, "no form class on the root div (SKILL.md 4.1)")
    elif len(declared) > 1:
        err(f, f"more than one form class: {sorted(declared)}")
    form = next(iter(declared), None)

    # --- 4.2 separator grammar ---
    if MIDDOT in txt:
        err(f, f"{txt.count(MIDDOT)} middot(s) in the body — retired (SKILL.md 4.2)")

    for line in body.split("\n"):
        lt = html.unescape(re.sub(r"<[^>]+>", " ", line))
        kinds = [k for k, ch in (("middot", MIDDOT), ("em dash", EMDASH),
                                 ("colon", None), ("arrow", ARROW))
                 if (ch and ch in lt) or (k == "colon" and re.search(r"\w: ", lt))]
        if len(kinds) > 2:
            warn(f, f"{len(kinds)} separator types on one line ({', '.join(kinds)}): "
                    f"{lt.strip()[:70]}")

    # Only the polysemous marks count. The arrow means exactly one thing in this
    # grammar, so nine of them in a titration column is one mark doing one job.
    counts = {"middot": txt.count(MIDDOT), "em dash": txt.count(EMDASH)}
    live = {k: v for k, v in counts.items() if v}
    if sum(live.values()) >= 8 and len(live) == 1:
        warn(f, f"{sum(live.values())} separators, all '{list(live)[0]}' — one mark "
                f"doing several jobs (SKILL.md 4.2 budget)")

    # --- 4.2 run-in peers ---
    for line in body.split("\n"):
        lt = html.unescape(re.sub(r"<[^>]+>", " ", line))
        if lt.count(MIDDOT) >= 2:
            warn(f, f"run-in list of {lt.count(MIDDOT)+1} peers — use .peers or .acts: "
                    f"{lt.strip()[:70]}")

    # --- 4.3 footnote markers must not fuse to the preceding word ---
    for m in re.finditer(r'<sup class="fn">([^<]*)', body):
        if not re.match(r"[\s  ]", html.unescape(m.group(1))):
            err(f, "footnote marker needs a leading thin space (&#8201;) or the "
                   "search index fuses it to the previous word (SKILL.md 4.3)")
            break

    # --- 4.8 alt text is the search index ---
    for m in re.finditer(r"<img[^>]*>", raw):
        tag = m.group(0)
        alt = re.search(r'alt="([^"]*)"', tag)
        if not alt or not alt.group(1).strip():
            err(f, "image with no alt text — alt IS the search index (SKILL.md 4.8)")
        elif len(alt.group(1)) < 80 or re.match(
                r"^(photo|image|picture|screenshot|diagram|chart)\b",
                alt.group(1).strip(), re.I):
            warn(f, f'lazy alt text ({len(alt.group(1))} chars): '
                    f'"{alt.group(1)[:50]}"')
    if re.search(r"<img", raw) and "figcap" not in raw:
        warn(f, "figure with no .figcap teaching caption (SKILL.md 4.8)")

    # --- 4.9 scoped styles: prefixed, layout only ---
    for st in re.findall(r"<style.*?</style>", raw, flags=re.S):
        short = re.search(r'class="pearl[^"]*\s(e-[a-z0-9]+)"', raw)
        pre = short.group(1) if short else None
        for sel in re.findall(r"(^|\})\s*([^{}@]+)\{", st):
            s2 = sel[1].strip()
            if not s2 or s2.startswith("/*"):
                continue
            if pre and f".{pre}" not in s2:
                err(f, f"scoped selector not prefixed .{pre}: {s2[:50]}")
        if form != "form-branch":   # the flow-sheet exception owns its palette
            for prop in re.findall(r"(?:^|[;{])\s*(color|background|background-color)\s*:", st):
                err(f, f"scoped style sets '{prop}' — layout only, never colour "
                       f"(SKILL.md 4.9)")
                break


def main():
    if not os.path.isdir(ENTRIES):
        print("run from the repo root", file=sys.stderr)
        return 2
    man = json.load(open(MANIFEST, encoding="utf-8"))

    # --- manifest integrity (the escaped-section bug shipped to production) ---
    for s in man["sections"]:
        if html.unescape(s) != s:
            err(MANIFEST, f"HTML-escaped section {s!r} — renders literally and forks "
                          f"a duplicate section (SKILL.md 4.11)")
    seen = {}
    for e in man["entries"]:
        if html.unescape(e["section"]) != e["section"]:
            err(MANIFEST, f"{e['id']}: HTML-escaped section {e['section']!r}")
        if e["section"] not in man["sections"]:
            err(MANIFEST, f"{e['id']}: section {e['section']!r} not in sections[]")
        if e["id"] in seen:
            err(MANIFEST, f"duplicate id {e['id']}")
        seen[e["id"]] = e
        if not os.path.exists(f"{ENTRIES}/{e['id']}.html"):
            err(MANIFEST, f"{e['id']}: no entry file")
    for fn in sorted(os.listdir(ENTRIES)):
        if fn.endswith(".html") and fn[:-5] not in seen:
            err(MANIFEST, f"{fn} has no manifest row")

    paths = sorted(f"{ENTRIES}/{f}" for f in os.listdir(ENTRIES) if f.endswith(".html"))
    for p in paths:
        lint_entry(p)

    # --- site level: is the site still one shape? ---
    used = {}
    for p in paths:
        m = re.search(r'class="pearl\s+(form-[a-z]+)', open(p, encoding="utf-8").read())
        if m:
            used[m.group(1)] = used.get(m.group(1), 0) + 1
    if len(used) < 3:
        err("site", f"only {len(used)} structural form(s) in use {sorted(used)} — "
                    f"the uniformity this guide exists to prevent")
    top = max(used.values()) / max(sum(used.values()), 1) if used else 0
    if top > 0.5:
        warn("site", f"{top:.0%} of entries use one form — check the content really "
                     f"has that shape")
    colons = [e["title"] for e in man["entries"] if re.match(r"^[^:]{2,30}: ", e["title"])]
    if len(colons) / max(len(man["entries"]), 1) > 0.4:
        warn("site", f"{len(colons)}/{len(man['entries'])} titles are 'X: Y' "
                     f"subtitles — a tell when it becomes the default")

    for w in warns:
        print(f"WARN   {w}")
    for e in errors:
        print(f"ERROR  {e}")
    print(f"\n{len(paths)} entries · {len(errors)} errors · {len(warns)} warnings")
    if errors:
        return 1
    if warns and "--warnings-as-errors" in sys.argv:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
