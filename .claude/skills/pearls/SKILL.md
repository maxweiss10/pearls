---
name: pearls
description: Pearl — the user's supplementary White Book, a searchable real-text study-notes site at maxweiss10.github.io/pearl-study-notes. Turns anything — chalktalk/slide photos, screenshots, paper or article URLs, YouTube videos, blocks of text, quick facts — into clean clinical-reference entries organized by medical sub-discipline. Understands free-form requests, no fixed syntax ("put these images together as-is", "make this text into a visual", "turn this video into a concise guide", "move X to cardiology", "fix the pressors entry"). Use for /pearls, /pearl, "add a pearl", "add to my study notes", or any request to capture, edit, reorganize, or regenerate study-note entries.
argument-hint: <anything — images, URL, text, or an instruction in plain words>
---

You are working on **Pearl**, the user's supplementary White Book: UCSF-specific and rotation-acquired knowledge that is NOT already in the MGH White Book. Every entry is REAL TEXT (selectable, searchable, highlightable) — never a screenshot, never a rendered PNG.

**Repo**: on this Mac `/Users/home_mrw/Documents/Desktop/Claude Projects/study-notes-web` (clone of `maxweiss10/pearl-study-notes`); in a cloud/claude.ai session use the repo checkout root. Paths below are repo-relative.
**Live site**: https://maxweiss10.github.io/pearl-study-notes/ (rebuilds ~30-60 s after push).

## 1 · Understand the request — plain words, no fixed grammar

Interpret intent from whatever the user says:

| Intent (any phrasing) | Action |
|---|---|
| Photo(s) of a chalktalk / slide / whiteboard / handout | **Redesign** into a reference entry (default) |
| "use these exact images", "as-is", "don't redesign", "just put them together" | **Raw** — insert photo(s) untouched (stacked if several), still auto-title/tag/section |
| Several images, combine-vs-separate unclear | One AskUserQuestion: separate entries / one merged redesign / one raw stack |
| "make this text/block into an entry" | **Text** entry |
| Paper or article URL (± their takeaway) | **Paper** entry — takeaway used VERBATIM as body if given; else 3 short lines (Main finding / Design / Takeaway); source link |
| YouTube link, "make this video a concise guide" | **Video** entry — transcript (§2) → distill hard; source link |
| A quick fact or mnemonic in a sentence | Small **text pearl** |
| "fix / retitle / regenerate / move to <section> [entry]" | **Edit** `entries/*.html` and/or `manifest.json` in place — ids and filenames stay stable |
| "delete / remove [entry]" | **Delete — confirmation REQUIRED first.** Before touching anything: name exactly what will be removed (title · section · date) and note it stays recoverable in git history, then get an explicit yes via AskUserQuestion. Only after the yes: delete `entries/{id}.html` and any `entries/img/{id}-*.jpg`, remove the manifest row (and the section from `sections[]` if now empty), commit `Pearl: delete {TITLE}`, push. Never delete on an ambiguous reference — resolve which entry first. |

Legacy keywords (`raw`, `each`, `merge`, `merge-raw`, `paper`) still work but are never required. If the request is genuinely ambiguous, ask one short question; otherwise proceed.

## 2 · Gather content

- HEIC → `sips -s format png "<f>" --out /tmp/pearl-N.png`; Read every image with vision. Note every drug, dose, category, arrow, label.
- URLs → WebFetch: paper title, the one key finding, must-remember methods (n, design, endpoint).
- YouTube, try in order: ① open the video in the in-app browser, expand description → "Show transcript", then get_page_text; ② `yt-dlp --skip-download --write-auto-subs -o /tmp/pearl-vid "<url>"` if yt-dlp exists; ③ WebFetch the watch page for title + description; ④ ask the user to paste the transcript (YouTube → Show transcript → copy). Distill hard: a 20-minute video should become ONE screenful of high-yield content.
- **Never invent clinical content.** Compress and abbreviate like a resident would, but every fact must come from the source (or the user).

## 3 · Metadata

- **Title**: 2-6 words, medical terminology ("ICU Pressors & Inotropes"). The site renders it at 32px as the page's landmark, followed by a small `section · Updated date` line — do NOT add bottom-line summaries, reading times, or any other metadata to the fragment.
- **id**: `YYYY-MM-DD-slug` (today + 2-4 word kebab slug) → file `entries/{id}.html`.
- **Section**: pick from `manifest.json → sections` (medical sub-disciplines, White-Book style). If none fits, CREATE one at discipline level (e.g. "Pulmonology", "Infectious Diseases", "GI & Hepatology", "Heme/Onc", "Neurology", "Outpatient & Prevention", "Procedures", "UCSF Systems & Epic") and insert it at a sensible position in the sections array. No near-duplicates, no over-narrow sections.
- **Aliases** (optional manifest field): extra search terms - abbreviations, brand/generic pairs, synonyms - that do not belong in keywords. The site already expands ~50 common abbreviations automatically (SVT, AF, ESBL, DKA and so on), so add aliases only for terms it would miss.
- **Keywords**: 8-15 flat lowercase comma-separated tokens — drugs (generic + brand), diagnoses (full + abbrev), core concepts, distinctive context, plus one source-type token (`chalktalk`/`slide`/`paper`/`photo`/`note`/`video`). No doses, no sentence fragments. Keywords live in the manifest ONLY — the site indexes them for search but never displays them.

## 4 · Design the entry — clinical reference register, real text always

The register is Sanford Guide / Pocket Medicine, not slides. Typography, alignment, and position carry ALL hierarchy. **Grayscale print test:** if the entry's hierarchy would collapse printed in grayscale, redo it — hierarchy must be structural, not chromatic.

**Color budget (strict)**
- Grayscale by default. Muted blue is for links only — never inside entries.
- Red (`.warn`, deep oxblood) is reserved EXCLUSIVELY for clinical danger AND escalation actions — toxicity, contraindication, do-not-miss, "call RT", "call RICU", "escalate to a carbapenem". The whole class gets red; never split it between red and bold. Nothing else is colored, so when something is red it lands.
- No filled bars/panels/pills/badges/coins/tiles, no shadows, no rounded boxes, no per-entry palettes, no decorative glyphs or emoji (no ⚠ ★ ☾ — red text IS the caution marker).

**Scan anatomy** — every row same fixed slots, so the eye drops straight down a column:
- drug/lead name in `<b>` · attributes plain or `.mut`/`.mech` · dose in `.dose` (renders one size up in medium weight with tabular figures - units verbatim) · cautions LAST, in `.warn`
- ordered items: markers as `<b class="mk">1.</b>` / `<b class="mk">A.</b>` at text size — the site hangs them in a left gutter so wrapped lines align under the text, never under the marker. No coins or tiles.
- separator convention: lead **—** details, items inside the details separated by `·` ("**Norepinephrine** (Levophed) — α > β"). Use the em dash everywhere a lead meets its detail; never a colon.
- conditional/parenthetical asides in `.mut` (renders italic gray) — e.g. "(blood cultures, troponin, d-dimer, type & screen)"

**Base primitives cover nearly everything** (`pearl.css`):
`.sec` major subsection (16px semibold, +`.later` for spacing) · `.caps`/`.eyebrow` small-caps label · `.strip` flow line · `.lab` bold lead-in · `.mut` `.mech` `.note` `.brand` gray secondary · `.row2` two-column scan row (`.rule` column divider; `.full` spans both; stacks on phones with `.mlab`) · `.colhead2` column headers · `.duo` side-by-side halves · `table.cmp` table (small-caps `th`, faint zebra, medium first column; wrap in `.tblwrap`) · `.dose` `.warn` `.drug` `.code` `.ptext` `.photo` `.mk`

**Warnings are one component:** wrap every clinical danger or escalation in `<span class="warn">`. The site prefixes the ⚠ marker and colors it — never type the glyph yourself, never bold it instead, never use red for anything else.

**Callouts** - `<div class="callout TYPE"><span class="co-label">Label</span><p>text</p></div>`. Types: `emergency` and `contraindication` (red), `pitfall` (amber), `treatment` (green), `evidence` and `investigation` (blue), `procedure` (violet), `pearl` and `highyield` (gray). They render as a colored left rule plus a small-caps label - no filled boxes, no emoji. Use sparingly, for content that genuinely stands apart; an inline `.warn` is still right for a caution that belongs inside a row.

**Other primitives:** `.panel` (summary block), `.dcard` (drug card), `.checklist`. Prefer plain rows and tables first; reach for a card only when the content is a genuinely discrete unit.

**Structure by content** (all hairlines + typography):
- Ordered escalation / sequence → `.colhead2` + numbered `.row2.rule` rows
- Algorithm → Assess | Intervene `.row2.rule` columns
- Agent comparison → `.cmp` table; Pro | Con as plain headers (position carries the meaning, not color)
- Exam flow → `.sec`-numbered stages, or `.caps` position leads in strips
- Mnemonic → bold key letters at text size in aligned `.row2` rows
- Directory → `.code` | description grid rows
- Paper / video → `.eyebrow` source label + bold takeaway in `.ptext`
- Raw photos → stacked `.photo` imgs with detailed searchable alt text
- **Flow sheets (exception to the no-filled-boxes rule):** when the source is itself a flowchart/diagram the user made or asks for, recreate the sheet faithfully as real-text HTML — boxes, labeled arrow pills, dashed grouping bands, and the source's own semantic exit coloring (tinted outcome boxes allowed HERE only; scoped vars with dark variants; arrows via CSS lines/glyphs, never images) — do NOT flatten it into rows. Pattern references: `entries/2026-08-09-pleural-effusion.html`, `entries/2026-08-09-beta-lactam-ladder.html`.

**Scoped `<style>` is the exception**, not the rule: only for a layout the primitives genuinely don't cover; every selector prefixed `.e-{short}`; layout properties only — never colors.

**Hard rules**: root `<div class="pearl e-{short}">`; real text only; no scripts/iframes/external resources; no `<html>/<head>/<body>`; no title at top (site renders it); no rotated text; no fixed pixel widths on containers; density tight — hairline dividers, inline flow over bullet lists, no decorative padding; split a huge multi-topic source into 2 entries.

**Raw photos**: `sips -s format jpeg -Z 1600 "<f>" --out entries/img/{id}-N.jpg`; fragment = stacked `<img class="photo" src="entries/img/{id}-N.jpg" alt="detailed content summary">`.

## 5 · Manifest

Prepend to `manifest.json → entries` (valid JSON, newest first):
```json
{ "id": "…", "title": "…", "date": "YYYY-MM-DD", "section": "…", "keywords": "…", "source": "https://… (papers/videos only)" }
```
If the section is new, add it to the `sections` array in a sensible position.

## 6 · Commit + push

```bash
cd <repo> && git pull --rebase && git add -A && git commit -m "Pearl: {TITLE}" && git push
```
Never force-push. Push rejected / offline → say the entry is committed locally and needs a push later.

## 7 · Report

One line per entry: title + `https://maxweiss10.github.io/pearl-study-notes/#{id}` (mention the ~1 min rebuild). For edits, say exactly what changed.
