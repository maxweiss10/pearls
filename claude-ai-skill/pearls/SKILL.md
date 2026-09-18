---
name: pearls
description: Add or edit entries in Max's Pearl clinical study-notes site (maxweiss10.github.io/pearls) straight from chat. Turns chalktalk photos, slides, papers, videos, or text into reference entries — redesigned as real text by default, or using the photos themselves when asked ("as-is", "keep the diagram") — and publishes them via one tap-to-publish link with a preview-before-live step. Use for "add a pearl", "add to my study notes", or any request to capture, edit, or fix a study-note entry — and for the site's Resources tab ("add X to my resources" is a link row via edit_resources, never a pearl entry).
---

# Pearl — study notes (claude.ai chat edition)

**Pearl** is Max's supplementary White Book: UCSF-specific and rotation-acquired knowledge that is NOT already in the MGH White Book. Live at https://maxweiss10.github.io/pearls/ (repo `maxweiss10/pearls`).

Every entry is REAL TEXT — selectable, searchable, highlightable. Never a screenshot of text, never a rendered PNG of a recreated diagram. The one override: when Max explicitly asks for the image itself (§3a).

## How publishing works from chat — two lanes

**Lane 1 — Pearl Publisher connector (preferred, zero-leave).** If the tools `pearl_status` / `stage_pearl` / `publish_pearl` / `discard_pearl` are available in this chat, everything happens right here:

1. `pearl_status` first — current sections, existing ids (avoid collisions), pending draft, inbox photos, `drop_page`. (Skip the §0 web fetches; status is fresher.) One call covers everything; don't re-poll it between steps unless you're waiting on a photo.
2. Build the entry, then `stage_pearl` — it stages the draft branch and returns the **preview link**. Give Max that link.
3. On his EXPLICIT approval (push/yes/ship/👍) → `publish_pearl`, then give the live URL. Never call it unprompted — staging is yours, publishing is his. `discard_pearl` if he drops it.
   - **Pre-approved in the same breath** — applies to adds AND edits ("just post it", "add and push", "fix that typo and push", "no preview needed") → do the whole thing in one turn and report the live link. He already gave the yes; don't ask twice.
   - **Editing an existing entry** ("fix the typo in X", "retitle that", "move it to Cardiology", "rewrite the second half"). Two shapes, and they cost different amounts — don't overpay:
     - **Metadata only** (title, section, keywords, date — body unchanged): call `edit_pearl` with just the id and the changed fields. **No `get_pearl`, no preview** — there is nothing to look at. State the change from the tool's `edited`/`was` fields and put the ask on one line: *"Retitled to X and moved to Cardiology — say push."* Pre-approved → publish in the same turn.
     - **Body change**: `get_pearl` first so you edit the real current text (never retype an entry from memory), then `edit_pearl` with the new `html`, then a preview link — that one is worth a look. If the edit adds an image, the drop-page + `wait_for_photo` flow in step 4 applies unchanged; image wiring is automatic here too.
     Either way the id and filename stay put, so existing links keep working, and the live entry is untouched until he approves.
   - **Deleting an entry**: `delete_pearl` is the one destructive tool — it hits the live site immediately, no draft, no preview.
     - **First, disambiguate.** "Remove/delete/get rid of that" can mean *delete the whole entry* or *cut something out of it* — those are `delete_pearl` and `edit_pearl` and they are not close. If the wording could go either way, ask which in one short line before doing anything.
     - Once it's clear which entry: name it back to him (title · section · date), note it stays recoverable in git history, get an explicit yes, then call it with `expect_title` set to that exact title (a mismatch aborts). If he pre-authorized ("delete X, don't ask"), still name it in your reply — but delete in that same turn rather than asking again.
     - Never delete on an ambiguous reference — resolve which entry first with `pearl_status`. You DO have this tool; never send him to GitHub to delete by hand.
     - Expect one approval tap from the connector on this tool only. That is deliberate, not a bug — don't apologize for it or route around it.
   - **Don't make him open the preview when there's nothing to judge.** For a raw image + caption, or a one-line text pearl, describe it in a clause and put the ask on one line: *"Preview: <link> — or just say push."* Reserve "have a look before you decide" for redesigns, splits, and anything where your judgment shaped the content.
4. Photos (raw/figure entries only) — **all in one turn, never make him report back**: chat can't transmit image bytes, so Max delivers them separately, but it is one paste. In a single message: give him the `drop_page` URL from `pearl_status` (never hardcode it — secret key, public repo) — *"paste it here (⌘V), I'll watch for it"* — then IMMEDIATELY call `pearl_status` with `wait_for_photo: true`. That call blocks until his paste lands (~22 s), so you keep working in the same turn: reference `entries/img/{id}-1.jpg` (`-2.jpg`, … display order) in the fragment, call `stage_pearl`, and hand back the preview link. He clicks one link and pastes; everything else is you. If `timed_out_waiting` comes back, call the waiting status once more before asking whether he got to it.

   **Wiring is automatic** — any referenced image not already in the repo is filled from his pasted photos in order and cleared from the inbox. If fewer are waiting than referenced, staging FAILS with a count and nothing is staged, so a preview can never show a broken image. Mention `images_used` only when more than one photo landed.

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
| "add [site/tool/link] to my resources" | **Resource** — a link row on the Resources tab, never an entry (§1a) |
| "fix / retitle / regenerate / move [entry]" | **Edit** — Lane 1: `get_pearl` → `edit_pearl` (id stays stable) → preview → publish. Lane 2: fetch the fragment (§0), apply the change, re-issue with the SAME id (§4) |
| "delete / remove [entry]" | **Confirm first.** Name what will be removed (title · section · date), note it stays recoverable in git history, get an explicit yes — then Lane 1: `delete_pearl` with `expect_title`. Lane 2 only: the manual steps in §6. Never act on an ambiguous reference. |

**Split rule:** a dense multi-panel source (compiled reference sheet, whole lecture) is never one entry — split into 2-4 by topic, hard ceiling ~8 KB of HTML each, published sequentially (one draft at a time, above).

**Never invent clinical content.** Compress and abbreviate like a resident, but every fact must come from the source or from Max.

## 1a · Resources tab — link rows, not entries

The site's Resources tab is a flat list of links (`resources.json`: `{title, url, desc, icon}`). "Add X to my resources" NEVER becomes a pearl entry — no id, no section, no fragment, no draft. Every row gets an `icon`: one emoji that fits the resource (📦 Box, 📅 calendar, 📖 manual, 🫀 CVD calculator…), shown next to the link — always pick one when adding.

- **Lane 1**: `edit_resources` (action `add` / `edit` / `remove`). It commits straight to main — no preview, because a link row is instantly git-revertable — so for adds and edits just restate the row in one line afterward: *"Added **UCSF Box** to Resources (MyAccess login) — live in ~1 min."* `remove` still needs his explicit yes first, naming the row. Current rows come back from `pearl_status`.
- **Lane 2** (connector unavailable): build the exact JSON row, then hand him `https://github.com/maxweiss10/pearls/edit/main/resources.json` with one line of paste instructions (comma after the previous `}`, new row before the closing `]`).
- The `desc` is one short line; note a login gate when there is one ("MyAccess login"). If the target is gated and Max gave no description, a plain honest desc beats a guessed one.

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

- **Photos travel out-of-band.** Lane 1: the `drop_page` paste target — one ⌘V, no file picker; wiring into the entry is automatic (see the lanes section). Lane 2: tell Max to attach the photo(s) with 📎 in the pearl issue composer (paste works there too), **in display order**, then Submit. The Action downloads them, resizes to ≤1600 px JPEG, and commits them as `entries/img/{id}-1.jpg`, `-2`, … in attachment order — so write exactly those paths in the fragment's `src` attributes.
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

**Deletes without the connector** (Lane 2 only — with the connector, use `delete_pearl`): open `entries/{id}.html` in the repo → trash icon → commit; then edit `manifest.json` → remove that entry's object (and its section from `sections` if now empty). Or a Code-tab session does it in one ask.

**If the issue lane fails** (Action run red, no comment appears): fall back to hand-paste — create `entries/{id}.html` via Add file, paste the manifest row as the first item of `entries`, commit both — and tell Max the `pearl-publish` Action needs a look from a Code session.

A **Code**-tab session on `maxweiss10/pearls` (phone or desktop) remains the richer lane: same preview flow plus direct git, image-inbox polling, and iteration without new issues.

## 7 · Report

One line per entry: title, section, and the eventual live URL `https://maxweiss10.github.io/pearls/#{id}`. For edits or deletes, say exactly what changed.
