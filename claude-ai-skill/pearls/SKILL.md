---
name: pearls
description: Add or edit entries in Max's Pearl clinical study-notes site. Turns chalktalk photos, slides, papers, videos, or text into ready-to-commit reference HTML plus its manifest row.
---

# Pearl — study notes (claude.ai edition)

**Pearl** is Max's supplementary White Book: UCSF-specific and rotation-acquired knowledge that is NOT already in the MGH White Book. Live at https://maxweiss10.github.io/pearl-study-notes/ (repo `maxweiss10/pearl-study-notes`).

Every entry is REAL TEXT — selectable, searchable, highlightable. Never a screenshot of text, never a rendered PNG of a recreated diagram.

## What this skill does here

claude.ai cannot commit to GitHub (the GitHub connector is read-only). So this skill **produces the exact files to drop in**, and hands over copy-paste-ready instructions:

1. An **entry fragment** → becomes `entries/{id}.html`
2. A **manifest row** → gets pasted into `manifest.json`
3. **Delivery instructions** (§6)

Create both as downloadable files when file creation is available; otherwise print them in fenced code blocks.

If the GitHub connector is enabled and `maxweiss10/pearl-study-notes` is added, READ `manifest.json` first for current sections and entry ids, and read a recent entry (e.g. `entries/2026-07-18-icu-pressors.html`) to match house style. If it isn't connected, ask Max to paste the current `sections` array — or proceed and flag that the section list is unverified.

## 1 · Read the request — plain words, no fixed grammar

| Intent (any phrasing) | Action |
|---|---|
| Photo(s) of a chalktalk / slide / whiteboard / handout | **Redesign** into a reference entry (default) |
| "use these exact images", "as-is", "just put them together" | **Raw** — Max uploads photos to `entries/img/` himself; fragment is stacked `<img class="photo">` tags with detailed alt text |
| Several images, combine-vs-separate unclear | Ask once: separate entries / one merged / one raw stack |
| A block of text, or "make this into an entry" | **Text** entry |
| Paper or article URL (± his takeaway) | **Paper** entry — his takeaway VERBATIM as body if given; else 3 short lines (Main finding / Design / Takeaway) + `source` |
| YouTube link | **Video** entry — distill hard to ONE screenful + `source` |
| A quick fact or mnemonic | Small **text pearl** |
| "fix / retitle / regenerate / move [entry]" | Output the corrected full file for that id — filename and id stay stable |
| "delete / remove [entry]" | **Confirm first.** Name what will be removed (title · section · date), note it stays recoverable in git history, and get an explicit yes. Then give delete instructions (§6c). Never act on an ambiguous reference. |

**Never invent clinical content.** Compress and abbreviate like a resident, but every fact must come from the source or from Max.

## 2 · Metadata

- **Title** — 2-6 words, medical terminology ("ICU Pressors & Inotropes")
- **id** — `YYYY-MM-DD-slug` (today's date + 2-4 word kebab slug) → file `entries/{id}.html`
- **Section** — pick an existing one from `manifest.json`. Current set: Cross-Cover & Acute Care · Critical Care · Cardiology · Pulmonology · Renal & Electrolytes · Infectious Diseases · Endocrine & Obesity · MSK & Sports · Inpatient Essentials. If none fits, create ONE at discipline level (Neurology, GI & Hepatology, Heme/Onc, Outpatient & Prevention, Procedures, UCSF Systems & Epic) and say where it goes in the `sections` array.
- **Keywords** — 8-15 flat lowercase comma-separated tokens: drugs (generic + brand), diagnoses (full + abbrev), core concepts, distinctive context, plus one source-type token (`chalktalk`/`slide`/`paper`/`photo`/`note`/`video`). No doses, no sentence fragments. They're search-index only; the site never displays them.

## 3 · Design the entry

**Read `reference/design-system.md` before writing any fragment.** It carries the full doctrine: the strict color budget (grayscale + oxblood red for clinical danger/escalation only), scan anatomy, the base classes, structure patterns, and the flow-sheet exception. Follow it exactly — the site's CSS supplies all styling, so fragments are almost pure semantic markup.

Non-negotiables: root `<div class="pearl e-{short}">`; real text only; no scripts, iframes, external resources, `<html>/<head>/<body>`, or entry title at top; wrap tables in `<div class="tblwrap">`; scoped `<style>` only when the base classes genuinely can't express the layout, every selector prefixed `.e-{short}`, layout properties only — never colors (flow sheets excepted).

## 4 · Output the entry file

Give the complete file contents for `entries/{id}.html` — nothing else in that file.

## 5 · Output the manifest row

```json
{
  "id": "…",
  "title": "…",
  "date": "YYYY-MM-DD",
  "section": "…",
  "keywords": "…",
  "source": "https://…   ← papers/videos only, omit otherwise"
}
```

State plainly: paste it as the **first object inside the `entries` array** (newest first), and add a comma after it. If a new section is needed, say exactly where to insert it in `sections`.

## 6 · Delivery — how Max lands it

**a. Adding an entry (phone or desktop, no git):**
1. Open https://github.com/maxweiss10/pearl-study-notes
2. `entries/` → **Add file → Create new file** → name it `{id}.html` → paste the fragment
3. Back to root → click `manifest.json` → pencil icon → paste the row as the first item in `entries`
4. **Commit changes** on both (message: `Pearl: {TITLE}`)
5. Site rebuilds in ~1 minute at https://maxweiss10.github.io/pearl-study-notes/#{id}

**b. Raw photo entries:** upload the images to `entries/img/` as `{id}-1.jpg`, `{id}-2.jpg` … (Add file → Upload files) before committing the fragment.

**c. Deleting (only after confirmation):** open `entries/{id}.html` → trash icon → commit; then edit `manifest.json` and remove that object (and the section from `sections` if it's now empty).

**d. Faster path, when he's at his Mac:** Claude Code has the full `/pearls` skill and does all of this — write, commit, push — in one step. Mention this only if he asks; don't push it.

## 7 · Report

One line per entry: title, section, and the anchor URL `https://maxweiss10.github.io/pearl-study-notes/#{id}`. For edits or deletes, say exactly what changed.
