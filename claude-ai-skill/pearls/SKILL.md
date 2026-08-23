---
name: pearls
description: Pearl — Max's supplementary White Book, a searchable real-text study-notes site at maxweiss10.github.io/pearls. Turns anything — chalktalk/slide photos, screenshots, paper or article URLs, YouTube videos, blocks of text, quick facts — into clean clinical-reference entries organized by medical sub-discipline. Understands free-form requests, no fixed syntax ("put these images together as-is", "make this text into a visual", "turn this video into a concise guide", "move X to cardiology", "fix the pressors entry"). Use for /pearls, /pearl, "add a pearl", "add to my study notes", or any request to capture, edit, reorganize, or regenerate study-note entries.
---

# Pearl — study notes (chat edition)

**Pearl** is Max's supplementary White Book: UCSF-specific and rotation-acquired knowledge that is NOT already in the MGH White Book. Live at https://maxweiss10.github.io/pearls/ · repo `maxweiss10/pearls` · branch `main`.

Every entry is REAL TEXT — selectable, searchable, highlightable. Never a screenshot of text, never a rendered PNG of a recreated diagram.

## 0 · Capability check — do this FIRST, silently

Look at your available tools for a **GitHub connector** (tool names containing `push_files`, `create_or_update_file`, `get_file_contents` — possibly namespaced, e.g. `github:push_files`).

**If those tools are present → you commit directly.** Full parity with a Code session: write, commit, push, report the live URL. Do not mention pasting. Do not hand over files. Just do the work and land it.

**If they are absent → degraded mode.** Say this once, up front, then carry on without waiting for an answer:

> Heads up: the GitHub connector isn't on in this chat, so I can't commit — I'll hand you the files to paste. To have it posted automatically, either enable the GitHub connector here, or start this from the **Code** tab with `maxweiss10/pearls` selected (works on phone too).

Say it BEFORE doing the work, never after. Max's recurring complaint is doing several rounds of edits and only then learning nothing was posted. He may answer "just give me the files" — fine, continue — but he decides that up front.

## 1 · Read the request — plain words, no fixed grammar

| Intent (any phrasing) | Action |
|---|---|
| Photo(s) of a chalktalk / slide / whiteboard / handout | **Redesign** into a reference entry (default) |
| "use these exact images", "as-is", "just put them together" | **Raw** — stacked `<img class="photo">` with detailed alt text (see §6c for the image caveat) |
| Several images, combine-vs-separate unclear | Ask once: separate entries / one merged / one raw stack |
| A block of text, or "make this into an entry" | **Text** entry |
| Paper or article URL (± his takeaway) | **Paper** entry — his takeaway VERBATIM as body if given; else 3 short lines (Main finding / Design / Takeaway) + `source` |
| YouTube link | **Video** entry — distill hard to ONE screenful + `source` |
| A quick fact or mnemonic | Small **text pearl** |
| "fix / retitle / regenerate / move [entry]" | **Edit in place** — fetch the current file, rewrite it, push. id and filename stay stable |
| "delete / remove [entry]" | **Confirm first.** Name what will be removed (title · section · date), note it stays recoverable in git history, get an explicit yes. Only then delete. Never act on an ambiguous reference. |

**Never invent clinical content.** Compress and abbreviate like a resident, but every fact must come from the source or from Max.

## 2 · Read the repo before writing

With the GitHub connector available, always read current state first — never guess:

- `manifest.json` → the live `sections` array and existing entry ids (avoid id collisions)
- a recent entry, e.g. `entries/2026-08-22-adhf-decongestion-gdmt.html` or `entries/2026-07-18-icu-pressors.html` → match house style

Without the connector, ask Max to paste the current `sections` array, or proceed and flag that the section list is unverified.

## 3 · Metadata

- **Title** — 2-6 words, medical terminology ("ICU Pressors & Inotropes")
- **id** — `YYYY-MM-DD-slug` (today's date + 2-4 word kebab slug) → file `entries/{id}.html`
- **Section** — pick an existing one from the manifest you just read. If none fits, create ONE at discipline level (Neurology, GI & Hepatology, Heme/Onc, Outpatient & Prevention, Procedures, UCSF Systems & Epic) and insert it at a sensible position in `sections`. No near-duplicates, no over-narrow sections.
- **Keywords** — 8-15 flat lowercase comma-separated tokens: drugs (generic + brand), diagnoses (full + abbrev), core concepts, distinctive context, plus one source-type token (`chalktalk`/`slide`/`paper`/`photo`/`note`/`video`). No doses, no sentence fragments. Search-index only; the site never displays them.

## 4 · Design the entry

**Read `reference/design-system.md` before writing any fragment.** It carries the full doctrine: the strict color budget (grayscale + oxblood red for clinical danger/escalation only), scan anatomy, base classes, structure patterns, the flow-sheet exception, and a worked example. Follow it exactly — the site's CSS supplies all styling, so fragments are almost pure semantic markup.

Non-negotiables: root `<div class="pearl e-{short}">`; real text only; no scripts, iframes, external resources, `<html>/<head>/<body>`, or entry title at top; wrap tables in `<div class="tblwrap">`; scoped `<style>` only when the base classes genuinely can't express the layout, every selector prefixed `.e-{short}`, layout properties only — never colors (flow sheets excepted).

## 5 · Build the manifest update

The manifest row:

```json
{ "id": "…", "title": "…", "date": "YYYY-MM-DD", "section": "…", "keywords": "…", "source": "https://…" }
```

`source` is for papers and videos only — omit it otherwise.

To update the file: take the `manifest.json` you read in §2, **prepend** the row as the first object in `entries` (newest first), add the section to `sections` if new, and keep the whole thing valid JSON with the existing 2-space indentation. You are rewriting the complete file, so preserve every other entry byte-for-byte.

## 6 · Land it

### a. Primary path — commit directly (GitHub connector present)

One commit, both files, via `push_files`:

- **owner** `maxweiss10` · **repo** `pearls` · **branch** `main`
- **message** `Pearl: {TITLE}`
- **files**:
  - `entries/{id}.html` → the fragment
  - `manifest.json` → the full updated manifest from §5

For an **edit**, push just the changed file(s) the same way. For a **delete** (only after explicit confirmation), use the connector's `delete_file` on `entries/{id}.html`, then push the manifest with that row removed — and the section too if it is now empty.

Never force-push. Never push to any branch but `main`. If a push fails, say plainly that it did not land and hand over the file contents so nothing is lost.

### b. Fallback path — no connector

Produce the two files (downloadable when file creation is available, otherwise fenced code blocks) and give these steps:

1. Open https://github.com/maxweiss10/pearls
2. `entries/` → **Add file → Create new file** → name it `{id}.html` → paste the fragment
3. Root → `manifest.json` → pencil icon → paste the row first in `entries`
4. **Commit changes** on both (message `Pearl: {TITLE}`)
5. Rebuilds in ~1 min at https://maxweiss10.github.io/pearls/#{id}

### c. Raw photo entries — the one real gap

The GitHub connector writes **text**, so it cannot upload a JPEG. Binary image files must be added another way. For a raw entry:

- Write and push the fragment and manifest row as normal, referencing `entries/img/{id}-1.jpg`, `{id}-2.jpg`, …
- Then tell Max the images still need uploading: github.com → `entries/img/` → **Add file → Upload files**, named exactly as referenced. Until then the entry renders with broken images.
- Say this **before** building a raw entry, so he can choose a Code session instead — there the photos are resized and committed automatically.

This does not affect redesigned entries, which are the default and are pure text.

## 7 · Report

One line per entry: title, section, and the anchor URL `https://maxweiss10.github.io/pearls/#{id}`, noting the ~1 min rebuild. For edits or deletes, say exactly what changed. If anything did not land, lead with that.
