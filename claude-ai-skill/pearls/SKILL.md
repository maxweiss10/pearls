---
name: pearls
description: Add or edit entries in Max's Pearl clinical study-notes site (maxweiss10.github.io/pearls) straight from chat. Turns chalktalk photos, slides, papers, videos, or text into reference entries — redesigned as real text by default, or using the photos themselves when asked ("as-is", "keep the diagram") — and publishes them via one tap-to-publish link with a preview-before-live step. Use for "add a pearl", "add to my study notes", or any request to capture, edit, or fix a study-note entry.
---

# Pearl — study notes (claude.ai chat edition)

**Pearl** is Max's supplementary White Book: UCSF-specific and rotation-acquired knowledge that is NOT already in the MGH White Book. Live at https://maxweiss10.github.io/pearls/ (repo `maxweiss10/pearls`).

Every entry is REAL TEXT — selectable, searchable, highlightable. Never a screenshot of text, never a rendered PNG of a recreated diagram. The one override: when Max explicitly asks for the image itself (§3a).

## How publishing works from chat — two lanes

**Lane 1 — Pearl Publisher connector (preferred, zero-leave).** If the tools `pearl_status` / `stage_pearl` / `publish_pearl` / `discard_pearl` are available in this chat, everything happens right here:

1. `pearl_status` first — current sections, existing ids (avoid collisions), pending draft, inbox photos. (Skip the §0 web fetches; status is fresher.)
2. Build the entry, then `stage_pearl` — it stages the draft branch and returns the **preview link**. Give Max that link.
3. On his EXPLICIT approval of the preview (push/yes/ship) → `publish_pearl`. Never call it unprompted — staging is yours, publishing is his. `discard_pearl` if he drops it.
4. Photos (raw/figure entries only): chat can't transmit image bytes, so Max delivers them separately — but it's one paste, not a file hunt. Give him the `drop_page` URL from `pearl_status` (never hardcode it; it carries a secret key and this repo is public) with one line: **"paste the screenshot there (⌘V) — or tap it on your phone to snap the photo"**. Then re-call `pearl_status` until `inbox_photos` is non-empty (a few seconds; if he says he's done and it's still empty, ask him to check the page said "saved"). Then `stage_pearl` with `use_inbox_photos: true`, referencing `entries/img/{id}-N.jpg` in filename order in the fragment. Ask for the photo BEFORE writing the entry so he can paste while you work.

   Suggest once, the first time in a conversation: bookmarking the drop page (or Add to Home Screen on iPhone) makes it a one-tap habit.

**Lane 2 — publish-by-issue (fallback when the connector is unavailable).** Build the entry, hand Max one prefilled issue link (§4-5). He taps Submit; the `pearl-publish` Action stages the draft and comments the preview link; he replies **push** on the issue (or **discard**). Nothing goes live without the push.

**One draft at a time** in both lanes. A new stage/issue replaces the pending draft — for a split source, publish entry 1 before staging entry 2, and say so plainly.

## 0 · Read the site first — Lane 2 only (Lane 1 uses pearl_status instead)

Before building anything, web-fetch these raw URLs (public, always current):

- `https://raw.githubusercontent.com/maxweiss10/pearls/main/manifest.json` — current sections, existing ids (avoid collisions), keyword style
- a recent entry for house-style calibration, e.g. `https://raw.githubusercontent.com/maxweiss10/pearls/main/entries/2026-07-18-icu-pressors.html`
- for **edits**: the current fragment at `https://raw.githubusercontent.com/maxweiss10/pearls/main/entries/{id}.html`

If web fetch is unavailable, proceed with the fallback section list in §2 and say the section list is unverified.

## 1 · Read the request — plain words, no fixed grammar

| Intent (any phrasing) | Action |
|---|---|
| Photo(s) of a chalktalk / slide / whiteboard / handout | **Redesign** into a reference entry (default) |
| "use these exact images", "as-is", "don't redesign", "just put them together" | **Raw** — the entry IS the photos: stacked `<img class="photo">` with detailed alt text (§3a) |
| "keep the diagram", "include the actual image" alongside written notes | **Figure** — real-text entry with the source image embedded where it belongs (§3a) |
| Several images, combine-vs-separate unclear | Ask once: separate entries / one merged / one raw stack |
| A block of text, or "make this into an entry" | **Text** entry |
| Paper or article URL (± his takeaway) | **Paper** entry — his takeaway VERBATIM as body if given; else 3 short lines (Main finding / Design / Takeaway) + `source` |
| YouTube link | **Video** entry — distill hard to ONE screenful + `source` |
| A quick fact or mnemonic | Small **text pearl** |
| "fix / retitle / regenerate / move [entry]" | **Edit** — fetch the current fragment (§0), apply the change, re-issue with the SAME id (§4); id and filename stay stable |
| "delete / remove [entry]" | **Confirm first.** Name what will be removed (title · section · date), note it stays recoverable in git history, get an explicit yes — then give the delete steps in §6. Never act on an ambiguous reference. |

**Split rule:** a dense multi-panel source (compiled reference sheet, whole lecture) is never one entry — split into 2-4 by topic, hard ceiling ~8 KB of HTML each, published sequentially (one draft at a time, above).

**Never invent clinical content.** Compress and abbreviate like a resident, but every fact must come from the source or from Max.

## 2 · Metadata

- **Title** — 2-6 words, medical terminology ("ICU Pressors & Inotropes")
- **id** — `YYYY-MM-DD-slug` (today's date + 2-4 word kebab slug) → becomes `entries/{id}.html`
- **Section** — pick an existing one from the fetched manifest. Fallback list (as of 8/2026): Cross-Cover & Acute Care · Critical Care · Cardiology · Pulmonology · Renal & Electrolytes · Infectious Diseases · Endocrine & Obesity · MSK & Sports · Inpatient Essentials. If none fits, create ONE at discipline level (Neurology, GI & Hepatology, Heme/Onc, Outpatient & Prevention, Procedures, UCSF Systems & Epic).
- **Keywords** — 8-15 flat lowercase comma-separated tokens: drugs (generic + brand), diagnoses (full + abbrev), core concepts, distinctive context, plus one source-type token (`chalktalk`/`slide`/`paper`/`photo`/`note`/`video`). No doses, no sentence fragments. Search-index only; never displayed.

## 3 · Design the entry

**Read `reference/design-system.md` before writing any fragment.** It carries the full doctrine: the strict color budget (grayscale + oxblood red for clinical danger/escalation only), scan anatomy, the base classes, structure patterns, and the flow-sheet exception. Follow it exactly — the site's CSS supplies all styling, so fragments are almost pure semantic markup.

Non-negotiables: root `<div class="pearl e-{short}">`; real text only; no scripts, iframes, external resources, `<html>/<head>/<body>`, or entry title at top; wrap tables in `<div class="tblwrap">`; scoped `<style>` only when the base classes genuinely can't express the layout, every selector prefixed `.e-{short}`, layout properties only — never colors (flow sheets excepted).

## 3a · Using the actual image — when Max asks for it explicitly

The default is real text; an image of text is dead weight, unsearchable and unhighlightable. **An explicit ask overrides that default.** "Use the image itself", "as-is", "don't redesign", "keep the diagram" — honor it. Don't argue, don't quietly redesign anyway. Two shapes:

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

- **Photos travel out-of-band.** Lane 1: the `drop_page` paste target + `use_inbox_photos` (see the lanes section) — one ⌘V, no file picker. Lane 2: tell Max to attach the photo(s) with 📎 in the pearl issue composer (paste works there too), **in display order**, then Submit. The Action downloads them, resizes to ≤1600 px JPEG, and commits them as `entries/img/{id}-1.jpg`, `-2`, … in attachment order — so write exactly those paths in the fragment's `src` attributes.
- **Alt text does the searching.** The pixels contribute nothing to the site index — the alt text carries every drug, dose, arrow, and label in a sentence or two. Never "photo of whiteboard". Push the same terms into the keywords.
- **Flag once, then proceed.** If the image is mostly typed text, say in one line that the alt text will be doing the searching — then build it exactly as asked. Don't re-litigate.
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

The Action validates (id format, required fields, pearl root div, ≤20 KB, no scripts) and rejects if malformed — so get it right here. A pearl issue whose id already exists **replaces that entry on publish** — that's the edit path: same id, corrected fragment, done.

## 5 · Build the link — the deliverable

URL-encode with code execution:

```python
from urllib.parse import quote
url = ("https://github.com/maxweiss10/pearls/issues/new?title=" +
       quote(f"pearl: {TITLE}") + "&body=" + quote(BODY))
```

The title MUST keep the `pearl: ` prefix — it's the Action's trigger gate. Render the result as a markdown link, e.g. **[Tap to publish: {TITLE}](url)**. ALSO write the raw issue body out as a downloadable file `pearl-issue-body.md` (or print it in a fenced block if file creation is off), with one line: *"If the link opens with an empty body — the GitHub app sometimes drops the prefill — paste this file's contents into the body."* If the encoded URL exceeds ~7,500 characters, skip the body prefill: give `https://github.com/maxweiss10/pearls/issues/new?title=pearl%3A%20{TITLE-encoded}` plus the body to paste.

Then tell Max what happens, once, briefly:

1. Submit → ~45 s → the issue gets a comment with the **preview link** (rendered in the real site, not live).
2. Happy → reply **push** on the issue → live link comes back, issue closes.
3. Changes → ask here in chat → a fresh link (same id) replaces the draft. Or reply **discard** to drop it.
4. Photos attached to the issue become the entry's images automatically.

## 6 · Fallbacks and deletes

**Deletes** (only after his explicit confirm — §1): there is no issue lane for deletion. Web edit: open `entries/{id}.html` in the repo → trash icon → commit; then edit `manifest.json` → remove that entry's object (and its section from `sections` if now empty). Or a Code-tab session does it in one ask.

**If the issue lane fails** (Action run red, no comment appears): fall back to hand-paste — create `entries/{id}.html` via Add file, paste the manifest row as the first item of `entries`, commit both — and tell Max the `pearl-publish` Action needs a look from a Code session.

A **Code**-tab session on `maxweiss10/pearls` (phone or desktop) remains the richer lane: same preview flow plus direct git, image-inbox polling, and iteration without new issues.

## 7 · Report

One line per entry: title, section, and the eventual live URL `https://maxweiss10.github.io/pearls/#{id}`. For edits or deletes, say exactly what changed.
