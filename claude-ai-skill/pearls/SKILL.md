---
name: pearls
description: Add or edit entries in Max's Pearl clinical study-notes site. Turns chalktalk photos, slides, papers, videos, or text into ready-to-commit reference HTML plus its manifest row — redesigned as real text by default, or using the photos themselves when asked ("as-is", "keep the diagram").
---

# Pearl — study notes (claude.ai edition)

**Pearl** is Max's supplementary White Book: UCSF-specific and rotation-acquired knowledge that is NOT already in the MGH White Book. Live at https://maxweiss10.github.io/pearls/ (repo `maxweiss10/pearls`).

Every entry is REAL TEXT — selectable, searchable, highlightable. Never a screenshot of text, never a rendered PNG of a recreated diagram.

## What this skill does here

**Say this FIRST, before doing any work** — one line, then carry on without waiting for an answer:

> Heads up: in a normal chat I can't commit — I'll hand you the files to paste. To have it posted automatically instead, start this from the **Code** tab with the `maxweiss10/pearls` repo selected (works on phone too) and re-send.

Do NOT save this for the end. Max's recurring complaint is doing several rounds of edits and only then learning nothing was posted. He may well answer "just give me the files" — fine, continue — but he decides that up front, not after the work.

A **Code**-tab session with the repo attached loads `.claude/skills/pearls/` from the repo itself and writes + commits + pushes in one step. That is the real `/pearls`. This file is the degraded fallback for plain chat, where there is no git checkout (the GitHub connector is read-only).

So here this skill **produces the exact files to drop in**, and hands over copy-paste-ready instructions:

1. An **entry fragment** → becomes `entries/{id}.html`
2. A **manifest row** → gets pasted into `manifest.json`
3. Any **images** the entry uses, renamed to `entries/img/{id}-N.jpg` (§3a)
4. **Delivery instructions** (§6)

Create both as downloadable files when file creation is available; otherwise print them in fenced code blocks.

If the GitHub connector is enabled and `maxweiss10/pearls` is added, READ `manifest.json` first for current sections and entry ids, and read a recent entry (e.g. `entries/2026-07-18-icu-pressors.html`) to match house style. If it isn't connected, ask Max to paste the current `sections` array — or proceed and flag that the section list is unverified.

## 1 · Read the request — plain words, no fixed grammar

| Intent (any phrasing) | Action |
|---|---|
| Photo(s) of a chalktalk / slide / whiteboard / handout | **Redesign** into a reference entry (default) |
| "use these exact images", "as-is", "don't redesign", "just put them together" | **Raw** — the entry IS the photos: stacked `<img class="photo">` with detailed alt text (§3a) |
| "keep the diagram", "include the actual image", "use the image itself" alongside written notes | **Figure** — real-text entry with the source image embedded where it belongs (§3a) |
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

## 3a · Using the actual image — when Max asks for it explicitly

The default is real text; an image of text is dead weight, unsearchable and unhighlightable. **An explicit ask overrides that default.** "Use the image itself", "as-is", "don't redesign", "keep the diagram", "just include the photo" — honor it. Don't argue it, and don't quietly redesign anyway. Two shapes:

**Raw entry** — the photos ARE the entry, nothing else in the fragment:

```html
<div class="pearl e-{short}">
  <img class="photo" src="entries/img/{id}-1.jpg" alt="…">
  <img class="photo" src="entries/img/{id}-2.jpg" alt="…">
</div>
```

**Figure inside a text entry** — everything written stays real text, and the image sits at the point it belongs. Right when the source is a hand-drawn diagram, an ECG or imaging strip, or a chart that markup can't reproduce honestly:

```html
<div class="sec">Original diagram</div>
<img class="photo" src="entries/img/{id}-1.jpg" alt="…">
<div class="note">Chalktalk, Parnassus 8/2026</div>
```

Rules for both:

- **Alt text does the searching.** The pixels contribute nothing to the site index, so the alt text carries the content — every drug, dose, arrow, and label, in a sentence or two. Never "photo of whiteboard". Push the same terms into the manifest keywords.
- **Naming is fixed:** `entries/img/{id}-1.jpg`, `-2`, `-3` … in display order, same `{id}` as the entry file.
- **Hand him the files ready to upload.** If file creation is available, write the images out already renamed and downsized (JPEG, long edge ~1600 px) as downloads — then uploading is drag-and-drop with no renaming. If they can't be written out, give the rename mapping explicitly ("whiteboard photo → `{id}-1.jpg`, drug table → `{id}-2.jpg`") against what he actually sent, in order.
- **Flag once, then proceed.** If the image is mostly typed text (a slide, a screenshot of a paragraph), say in one line that it won't be searchable and the alt text is doing the work — then build it exactly as asked. Don't re-litigate.
- Photo entries still get a real title, section, and keywords. The raw path skips the redesign, not the metadata.

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
1. Open https://github.com/maxweiss10/pearls
2. `entries/` → **Add file → Create new file** → name it `{id}.html` → paste the fragment
3. Back to root → click `manifest.json` → pencil icon → paste the row as the first item in `entries`
4. **Commit changes** on both (message: `Pearl: {TITLE}`)
5. Site rebuilds in ~1 minute at https://maxweiss10.github.io/pearls/#{id}

**b. Entries with images (raw or figure):** in the repo open `entries/img/` → **Add file → Upload files** → drop in `{id}-1.jpg`, `{id}-2.jpg` … (already named correctly if they came back as downloads) → commit. Do this before the fragment, or the entry shows broken images until the images land.

**c. Deleting (only after confirmation):** open `entries/{id}.html` → trash icon → commit; then edit `manifest.json` and remove that object (and the section from `sections` if it's now empty).

**d. The path that skips all of the above:** a **Code**-tab session with `maxweiss10/pearls` selected — on phone or desktop — or Claude Code on his Mac. Both run the repo's own `/pearls` and write, commit, and push in one step. This was already flagged up top; repeat it here in one line so the manual steps always end with the alternative in view.

## 7 · Report

One line per entry: title, section, and the anchor URL `https://maxweiss10.github.io/pearls/#{id}`. For edits or deletes, say exactly what changed.
