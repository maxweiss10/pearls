---
name: pearls
description: Add or edit entries in Max's Pearl clinical study-notes site. Turns chalktalk photos, slides, papers, videos, or text into ready-to-commit reference HTML plus its manifest row — redesigned as real text by default, or using the photos themselves when asked ("as-is", "keep the diagram").
---

# Pearl — study notes (claude.ai edition)

**Pearl** is Max's supplementary White Book: UCSF-specific and rotation-acquired knowledge that is NOT already in the MGH White Book. Live at https://maxweiss10.github.io/pearls/ (repo `maxweiss10/pearls`).

Every entry is REAL TEXT — selectable, searchable, highlightable. Never a screenshot of text, never a rendered PNG of a recreated diagram.

## What this skill does here

Plain chat can't push to git — but the repo publishes from GitHub issues. So this skill builds the complete entry, then hands Max **one link**: a prefilled issue. He taps it, taps **Submit**, and the repo's `pearl-publish` Action stages the entry on a draft branch and comments back a preview link (`…/pearls/#draft={id}`) within ~a minute. He replies **push** on the issue to publish, or **discard** to drop it. Nothing goes live without the push.

The deliverable of every request here is that link (§6). No paste-into-GitHub steps unless the link path fails.

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
- **Photos travel on the same issue.** Tell Max: attach the photo(s) to the pearl issue before submitting (📎 in the issue composer, in display order). The Action downloads them, resizes to ≤1600 px JPEG, and commits them as `entries/img/{id}-1.jpg`, `-2`, … in attachment order — so write exactly those paths in the fragment's `src` attributes.
- **Flag once, then proceed.** If the image is mostly typed text (a slide, a screenshot of a paragraph), say in one line that it won't be searchable and the alt text is doing the work — then build it exactly as asked. Don't re-litigate.
- Photo entries still get a real title, section, and keywords. The raw path skips the redesign, not the metadata.

## 4 · Compose the issue body

One body carries everything — the manifest row in an HTML comment, the fragment in a fenced block:

    <!--pearl
    {"id":"…","title":"…","date":"YYYY-MM-DD","section":"…","keywords":"…","source":"only for papers/videos"}
    -->

    ```html
    <div class="pearl e-{short}">
    …the entry…
    </div>
    ```

The Action validates (id format, required fields, pearl root div, ≤20 KB, no scripts) and rejects with an error annotation if malformed — so get it right here. Re-submitting a pearl issue with the same id replaces the pending draft AND replaces the entry on publish (that's the edit path too).

## 5 · Build the link

With code execution, URL-encode the pieces (python: `urllib.parse.quote`) into:

`https://github.com/maxweiss10/pearls/issues/new?title=pearl%3A%20{TITLE-encoded}&body={body-encoded}`

Render it as a markdown link — **"Tap to publish: {TITLE}"**. ALSO write the raw issue body out as a downloadable file `pearl-issue-body.md` (or print it in a fenced block if file creation is off) with one line: *"If the link opens with an empty body (the GitHub app sometimes drops it), paste this file's contents into the body."* If the encoded URL exceeds ~7,500 characters, skip the prefill: give the bare link `https://github.com/maxweiss10/pearls/issues/new?title=pearl%3A%20{TITLE-encoded}` plus the body to paste.

## 6 · What happens after Submit — tell Max this once

1. ~45 s later the issue gets a comment with the **preview link** — the entry rendered in the real site, not live yet.
2. Happy → reply **push** on the issue → published, live link comes back, issue closes.
3. Not happy → tell Claude what to change here in chat → a fresh link (same id) replaces the draft — or reply **discard** to drop it.
4. Photos attached to the issue become the entry's images automatically (§3a).

**Deletes** (only after his explicit confirm): no issue lane — give the two-step web edit: open `entries/{id}.html` → trash → commit; edit `manifest.json` → remove the row. Or point at a Code session.

**If the issue lane fails** (Action red, no comment): fall back to hand-paste — `entries/{id}.html` via Add file, manifest row as first item of `entries`, commit both — and say the Action needs a look.

A **Code**-tab session on `maxweiss10/pearls` (phone or desktop) remains the richer lane: same preview flow plus direct git, image inbox polling, and instant iteration without new issues.

## 7 · Report

One line per entry: title, section, and the anchor URL `https://maxweiss10.github.io/pearls/#{id}`. For edits or deletes, say exactly what changed.
