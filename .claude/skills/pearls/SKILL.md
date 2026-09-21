---
name: pearls
description: Pearl — the user's supplementary White Book, a searchable real-text study-notes site at maxweiss10.github.io/pearls. Turns anything — chalktalk/slide photos, screenshots, paper or article URLs, YouTube videos, blocks of text, quick facts — into clean clinical-reference entries organized by medical sub-discipline. Understands free-form requests, no fixed syntax ("put these images together as-is", "make this text into a visual", "turn this video into a concise guide", "move X to cardiology", "fix the pressors entry"). Use for /pearls, /pearl, "add a pearl", "add to my study notes", "push the draft", or any request to capture, edit, reorganize, or regenerate study-note entries.
argument-hint: <anything — images, URL, text, or an instruction in plain words>
---

You are working on **Pearl**, the user's supplementary White Book: UCSF-specific and rotation-acquired knowledge that is NOT already in the MGH White Book. Every entry is REAL TEXT (selectable, searchable, highlightable) — never a screenshot, never a rendered PNG — unless the user explicitly asks for the image itself.

**Repo root**: in a cloud/claude.ai Code session it's the checkout root (your cwd); on the Mac it's `/Users/home_mrw/Documents/Desktop/Claude Projects/study-notes-web` (clone of `maxweiss10/pearls`). Paths below are repo-relative.
**Live site**: https://maxweiss10.github.io/pearls/ (rebuilds ~30–60 s after a push to main).

## 0 · The contract: draft → preview → approve → publish

**Never commit to `main` without the user's explicit go-ahead.** The default flow for every add or edit:

1. Build the entry (or edit) on the throwaway `draft` branch.
2. Push `draft` and send the user a **preview link** — it renders in the real site instantly, no rebuild wait.
3. Iterate on feedback (amend + force-push `draft`, same link, they just reload).
4. On an explicit yes — "push", "post", "yes", "ship", "looks good", "👍" — publish to `main` (§7).

Exceptions: if the user pre-approves in the same message ("just post it, skip the preview"), skip the draft branch — commit directly on main (`git checkout main && git pull --rebase origin main`, write the files, scoped add, commit, push). Deletes skip the draft branch but REQUIRE their own confirmation (§1). If a session opens with "push the draft" / "publish it", that's §7 on the existing remote `origin/draft` — don't rebuild anything. To EDIT a draft made in an earlier session: `git fetch origin && git checkout -B draft origin/draft` (never reset it onto origin/main — that discards the pending entry), then amend + force-push as usual.

## 1 · Understand the request — plain words, no fixed grammar

Interpret intent from whatever the user says. When they don't specify a format, figure out what they probably want, build that, and say what you chose in the preview message — the preview step is the safety net, so don't interrogate them up front.

| Intent (any phrasing) | Action |
|---|---|
| Photo(s) of a chalktalk / slide / whiteboard / handout | **Redesign** into a reference entry (default) |
| "use these exact images", "as-is", "don't redesign", "just put them together" | **Raw** — insert photo(s) untouched (stacked if several), still auto-title/tag/section. Needs image bytes — see §2. |
| "keep the diagram", "include the actual image" alongside written notes | **Figure** — real-text entry with the source image embedded where it belongs. Needs image bytes — see §2. |
| Several images, combine-vs-separate unclear | One AskUserQuestion: separate entries / one merged redesign / one raw stack |
| "make this text/block into an entry" | **Text** entry |
| Paper or article URL (± their takeaway) | **Paper** entry — takeaway used VERBATIM as body if given; else 3 short lines (Main finding / Design / Takeaway); source link |
| YouTube link, "make this video a concise guide" | **Video** entry — transcript (§2) → distill hard; source link |
| A quick fact or mnemonic in a sentence | Small **text pearl** |
| "fix / retitle / regenerate / move to <section> [entry]" | **Edit** `entries/*.html` and/or `manifest.json` on the draft branch — ids and filenames stay stable; preview shows the edited version |
| "push / publish / yes / ship it" (a draft is pending) | **Publish** — §7 |
| "add a resource / add [site] to my resources" | **Resource** — append `{title, url, desc, icon}` to `resources.json` (repo root, an ordered array rendered by the site's Resources tab). `icon` is ALWAYS included: one emoji that fits the resource (📦 Box, 📅 calendar, 📖 manual, 🫀 CVD calculator…), shown next to the link. No draft branch: restate exactly what will be added in one line, then commit straight to main (`Pearl: resource — {title}`); it is a link row, instantly `git revert`-able. Same flow to edit or remove a resource row (removal still gets a one-line confirm naming the row). Icons render from bundled Noto Emoji SVGs (`icons/emoji/emoji_u<hex>.svg`, U+FE0F dropped) so they look the same on hospital Windows PCs — for a NEW emoji also add its SVG: `curl -sL https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/emoji_u<hex>.svg -o icons/emoji/emoji_u<hex>.svg` (otherwise the site falls back to the jsDelivr copy, then plain text). |
| "delete / remove [entry]" | **Delete — confirmation REQUIRED first.** Name exactly what will be removed (title · section · date), note it stays recoverable in git history, get an explicit yes via AskUserQuestion. Only after the yes: delete `entries/{id}.html` and any `entries/img/{id}-*.jpg`, remove the manifest row (and the section from `sections[]` if now empty), then `git checkout main && git pull --rebase origin main`, commit `Pearl: delete {TITLE}`, push. Never delete on an ambiguous reference — resolve which entry first. |

Legacy keywords (`raw`, `each`, `merge`, `merge-raw`, `paper`) still work but are never required. If the request is genuinely ambiguous, ask ONE short question; otherwise proceed to a preview.

**Split rule — check BEFORE writing anything.** A dense multi-panel source (a compiled reference sheet, a whole lecture, anything ≳10 panels) is never one entry. Split it into 2–4 entries by topic, tell the user the split in the preview message, and preview them together (`#draft=id1,id2`). Hard ceiling: no fragment over ~8 KB — the biggest good entry in the repo is ~6 KB. If honoring a source in full would blow past that, split or trim; never grind out a mega-entry.

## 2 · Gather content

**Images — where the bytes are decides what's possible:**
- **Local Mac session**: attachments are files on disk. HEIC → `sips -s format png "<f>" --out /tmp/pearl-N.png`. For raw/figure entries: `sips -s format jpeg -Z 1600 "<f>" --out entries/img/{id}-N.jpg` (numbered in display order).
- **Cloud session — a chat-uploaded image is vision-only: NO file on disk, no way to get its bytes.** Redesign/text entries work perfectly (vision reading is all you need). For **raw or figure** requests, use the **photo inbox** — don't ask permission, just send the link in your FIRST reply:

  > I can see the photo but a cloud session can't touch its file — drop it here and I'll take it from there: **https://github.com/maxweiss10/pearls/issues/new?title=photos** (attach the image(s), Submit). Watching for it now — or say "redesign" and I'll build it as real text instead.

  Submitting that issue triggers the `pearl-inbox` Action (the issue title must start with `photos` — the prefilled link handles that): it downloads the attachments, normalizes them to ≤1600 px JPEG, commits them to `entries/img/inbox/` on main (~30-60 s), and closes the issue. Meanwhile YOU poll. The inbox is always emptied when photos get wired into an entry, so **any file in it is an unconsumed delivery** — poll for non-empty, which stays correct across retries and intervening fetches:

  ```bash
  for i in $(seq 1 16); do
    git fetch -q origin main
    [ -n "$(git ls-tree -r --name-only origin/main entries/img/inbox/ 2>/dev/null)" ] && break
    sleep 15
  done; true
  ```

  When files land: rebuild/rebase the draft on the new origin/main (§6; `git rebase origin/main draft` if the draft already exists), then `git mv` each inbox file to `entries/img/{id}-N.jpg` — one mv per file, numbered in display order; the mv both places the photos AND clears the inbox in the same commit (if the entry uses fewer photos than delivered, `git rm` the extras so the inbox ends empty). Build the entry, preview as usual. If nothing lands in ~4 min, proceed with whatever else you can and tell the user to say "check again" after they submit — the poll above re-run works as-is. More photos for the same batch = a new comment with attachments on the same issue (even closed); editing an old issue body does nothing. Never pretend to embed an image you don't have bytes for.
- **Never hunt the web for the source image** (reverse-searching a watermark, scraping the site it came from) unless the user explicitly gave that URL or asks you to. The inbox is the byte-path.
- **Conversion tools**, in order of availability: `sips` (macOS) → `magick`/`convert` (ImageMagick) → `python3 -c "from PIL import Image; ..."`. Inbox files are already normalized — use them as-is. Otherwise, if no converter exists and the file is already a web-ready JPEG/PNG ≤ ~1600 px, use it as-is.
- Read every image with vision regardless. Note every drug, dose, category, arrow, label.

**URLs** → WebFetch: paper title, the one key finding, must-remember methods (n, design, endpoint).

**YouTube**, try in order: ① open the video in the in-app browser, expand description → "Show transcript", then get_page_text; ② `yt-dlp --skip-download --write-auto-subs -o /tmp/pearl-vid "<url>"` if yt-dlp exists; ③ WebFetch the watch page for title + description; ④ ask the user to paste the transcript. Distill hard: a 20-minute video should become ONE screenful of high-yield content.

**Never invent clinical content.** Compress and abbreviate like a resident would, but every fact must come from the source (or the user).

## 3 · Metadata

- **Title**: 2-6 words, medical terminology ("ICU Pressors & Inotropes").
- **id**: `YYYY-MM-DD-slug` (today + 2-4 word kebab slug) → file `entries/{id}.html`.
- **Section**: pick from `manifest.json → sections` (medical sub-disciplines, White-Book style). If none fits, CREATE one at discipline level (e.g. "Pulmonology", "Infectious Diseases", "GI & Hepatology", "Heme/Onc", "Neurology", "Outpatient & Prevention", "Procedures", "UCSF Systems & Epic") and insert it at a sensible position in the sections array. No near-duplicates, no over-narrow sections.
- **Keywords**: 8-15 flat lowercase comma-separated tokens — drugs (generic + brand), diagnoses (full + abbrev), core concepts, distinctive context, plus one source-type token (`chalktalk`/`slide`/`paper`/`photo`/`note`/`video`). No doses, no sentence fragments. Keywords live in the manifest ONLY — the site indexes them for search but never displays them.

## 4 · Design the entry — the White Book register

**Every entry should look like a page torn out of the MGH Housestaff Manual.** That is the whole brief. When in doubt, open the book (`~/Documents/UCSF/Resources/White book OG.pdf`, or maxweiss10.github.io/whitebook) and copy what it does.

The values below were sampled at 200 dpi from the book itself — Geriatrics & Palliative Care / Pain Management, printed pp. 153–154. They already live in `pearl.css`; you write markup, not CSS.

| | |
|---|---|
| Body font | **Arial Narrow** (Bold, Italic) — condensed is why the book fits so much |
| Section bar | `#D9D9D9`, bold, small-caps |
| Table header | `#000` background, `#FFF` bold, centred |
| Table rows | alternating `#FFFFFF` / `#F2F2F2`, 1px black grid all round |
| Links | `#0432FF`, underlined |
| Emphasis | **bold** — the book has no red and no glyphs |

### 4.1 The vocabulary

```html
<div class="pearl e-{short}">
  <div class="wbhead"><span class="spec">Chapter</span><span class="topic">Topic</span></div>
  <div class="wbbar">Section Name <span class="cite">(<a href="…">source</a>)</span></div>
  <ul><li><b>Lead</b>: detail</li></ul>
  <div class="tblwrap"><table class="wbt">…</table></div>
  <div class="wbbox"><b class="t">Boxed aside</b> …</div>
  <div class="wbfoot">Source line</div>
</div>
```

- **`.wbhead`** — the running header, bold chapter left, topic right. **Optional**: only for entries that really come from a named chapter. Don't invent one; the site already prints the title and section above.
- **`.wbbar`** — the one landmark, and the reason the book's pages scan. Title Case (`font-variant: small-caps` does the rest). Every entry has at least one. `.cite` inside it takes the blue source link, exactly where the book puts them.
- **`<ul>`** — nests disc → circle → square on its own. Lead with a bold term.
- **`table.wbt`** — always inside `.tblwrap` so it scrolls on a phone instead of crushing. `td.c` centres, `td.d` centres and bolds (doses), `td.n` stops wrapping, `td.band` is a black full-width sub-group row.
- **`.wbbox`** — the book's bordered step-lists and caveats. `.wbbox.right` floats it.
- **`.wbcap`** — teaching caption under a figure. **`.wbfoot`** — the italic centred source line above a rule, the way the book closes a page.

### 4.2 Separators — copy the book

The book's joint is the **colon**: `Definition: T ≥100.4`, `Studies: BCx x2+ sites`, `Adverse effects: rare at sub-anesthetic dosing`. Then **semicolons between groups** and **commas within** one. That is the entire grammar.

- `:` lead → detail. **Never an em dash for this.**
- `;` between peer groups · `,` within a group
- `→` state change, titration, "this leads to that"
- `–` numeric ranges only
- `<u>…</u>` for a sub-term the book would underline
- **`·` middot: never.** It was doing seven jobs at once and is the main thing that made these entries unscannable.

### 4.3 Emphasis and colour

**Bold is the only emphasis.** The White Book has no red anywhere — its cautions are bold, sometimes caps (`AVOID in renal disease`). `.warn` still exists and still marks danger semantically, but it now renders bold black. Do not type a `⚠`, a `★`, or any other glyph.

**Never write a `@media (prefers-color-scheme: dark)` block.** The site is `color-scheme: light only`, so the page stays white while your block fires — that shipped near-black text on a near-black box at 1.15:1 contrast, invisible on every dark-mode phone.

### 4.4 Images

Real text is the default, but an explicit ask ("use the image itself", "as-is", "keep the diagram") overrides it — honour it, don't quietly redesign anyway.

An image entry keeps its image untouched and gains a **`.wbcap`** caption: a bold title plus bullets that decode the figure and name its own colours and arrows.

**Alt text and caption are different texts.** Alt text IS the search index — it linearizes every drug, dose, arrow and label, and the same terms go in the keywords. The caption is written to be read. Never make one a copy of the other, and never shorten the alt to match.

### 4.5 Flow sheets — the one exception

When the source is itself a flowchart the user made or asked for, recreate it faithfully as real-text HTML — boxes, labelled arrow pills, dashed grouping bands, and the source's own semantic exit colouring (tinted outcome boxes allowed **here only**, scoped vars, arrows via CSS, never images). Do **not** flatten it into rows, and do not repaint it White Book grey: a decision tree's green and red exits are load-bearing. Give it a `.wbbar` heading and let it inherit the book's font. References: `entries/2026-08-09-pleural-effusion.html`, `entries/2026-08-09-beta-lactam-ladder.html`.

### 4.6 Hard rules

Root `<div class="pearl e-{short}">`; real text only; no scripts, iframes, handlers or external resources; no `<html>/<head>/<body>`; no title at the top (the site renders it); no rotated text; no fixed pixel widths on containers; fragment ≤ ~8 KB (split rule, §1).

**Scoped `<style>` should now almost never be needed** — the register is global. If a layout genuinely isn't covered, prefix every selector `.e-{short}` and set layout only, never colour (flow sheets excepted).

### 4.7 Section metadata — exact string

`section` MUST be the raw string: `Renal & Electrolytes`, never `Renal &amp; Electrolytes`. The worker compares sections by exact string and the site renders them as a text node, so an escaped value silently forks a duplicate section that renders literally as "RENAL &AMP; ELECTROLYTES" with no discipline accent, sorted below Papers. This shipped to production once. Match an existing entry in `manifest.json → sections` verbatim.

### 4.8 Worked example — before and after

`opioid-pruritus`, step 3 notes. One middot string doing three different jobs:

```
BEFORE  Side effects with pain relief → rotate with dose reduction · side
        effects without pain relief → rotate IV opioid, no reduction ·
        morphine is the histamine offender, prefer hydromorphone/fentanyl

AFTER   Side effects <u>with</u> pain relief → rotate with dose reduction.
        Side effects <u>without</u> pain relief → rotate IV opioid, no
        reduction. Morphine is the histamine offender, prefer
        hydromorphone/fentanyl
```

`abcde`, Circulation / Intervene. Four separator systems flattened into one line, rebuilt as a cell in a `.wbt` with the book's own colon-then-semicolon grammar:

```
BEFORE  EKG · reliable access · labs: POCT glucose, CBC, BMP, LFT, lactate,
        coags (blood cultures, troponin, d-dimer, type & screen) · fluid /
        blood product / pressors / inotropes / antibiotics

AFTER   EKG; reliable access; labs: POCT glucose, CBC, BMP, LFT, lactate,
        coags <i>(blood cultures, troponin, d-dimer, type & screen)</i>;
        fluid / blood product / pressors / inotropes / antibiotics
```

## 5 · Manifest

Prepend to `manifest.json → entries` (valid JSON, newest first):
```json
{ "id": "…", "title": "…", "date": "YYYY-MM-DD", "section": "…", "keywords": "…", "source": "https://… (papers/videos only)" }
```
If the section is new, add it to the `sections` array in a sensible position.

## 6 · Draft + preview

All entry files (fragment, manifest edit, images) go in ONE commit on the `draft` branch. **Never `git add -A` / `git add .`** — the tree may hold unrelated work; stage only the paths Pearl owns.

```bash
git fetch origin
# safety: a local `draft` with commits origin/draft doesn't have = unpushed pearl → surface it, don't reset over it
git rev-parse -q --verify draft && git log --oneline origin/draft..draft
git checkout -B draft origin/main    # if checkout fails on dirty unrelated files: git stash push -u, retry, pop after §7
# …write entries/{id}.html, edit manifest.json, add entries/img/… — then:
git add entries/ manifest.json && git commit -m "Pearl: {TITLE}" && git push -f origin draft
```

If `git ls-remote origin draft` shows a leftover draft from an earlier request that was never published, say in the preview message that it was replaced (name it from its commit message).

Then send the preview — short, so the link is the star:

> **{TITLE}** — {Section}{, one line on any judgment call you made}
> Preview: https://maxweiss10.github.io/pearls/#draft={id}
> Reply **push** to publish, or tell me what to change.

Multiple entries from one source: comma-join ids in one link (`#draft=id1,id2`). The preview renders from the draft branch through the live site — it's ready seconds after the push, no Pages rebuild. **Iterating**: edit the files, then `git add entries/ manifest.json && git commit --amend --no-edit && git push -f origin draft` — same link, they reload. Keep the draft to a single commit whenever you can.

**If the push is rejected** (offline, no creds — esp. in a cloud sandbox, which evaporates): paste the complete fragment HTML and the manifest row into the chat as the durable copy, tell the user to hand that text to a later session, and touch nothing on main.

## 7 · Publish — only after the user's explicit yes

`origin/draft` is the source of truth — it is what every preview rendered. Sanity-check `git log -1 --format=%s origin/draft` matches the pearl being approved (if not, stop and ask), then:

```bash
git fetch origin
git checkout main && git pull --rebase origin main
git cherry-pick $(git merge-base origin/main origin/draft)..origin/draft
git push origin main
git push origin --delete draft; git branch -D draft
```

The range form publishes every draft commit even if the single-commit rule slipped. If the cherry-pick conflicts on `manifest.json` (main moved since the draft), keep BOTH changes with the newest entry first, `git add manifest.json` and `git cherry-pick --continue`.

## 7.5 · The site is a 3-tab home base with ONE search bar (Aug 30, 2026)

`index.html` has tabs: **Pearls** (the notes), **Resources** (rendered from `resources.json`), **Schedule** (live iframe of maxweiss10.github.io/intern-year-schedule — never copy that site's files into this repo; the iframe keeps its backend intact). The sticky bar at the top of the Pearls tab is the one all-encompassing search — plain language over the full White Book PDF + pearls + resources (index = `whitebook-index.json`, rebuilt by `tools/build_whitebook_index.py` if whitebook.pdf ever changes; alias map `WB_ALIAS` in app.js). A live query swaps the notes list for grouped results; Esc or clearing swaps back. There is deliberately NO pearls-only search — Cmd-F covers literal lookups on the notes page; do not reintroduce a palette. Site-level changes (tabs, app.js, css) canNOT be previewed via `#draft=` — preview those with a local `python3 -m http.server` walkthrough instead, and still get an explicit go-ahead before pushing to main. Entry work is untouched by all of this.

## 8 · Report

One line per entry: title + `https://maxweiss10.github.io/pearls/#{id}` (mention the ~1 min rebuild). For edits, say exactly what changed.

## 9 · Where this file lives

This file (`.claude/skills/pearls/SKILL.md` in the repo) is canonical. On the Mac, `~/.claude/skills/pearls` is a **symlink** here — never copy over it. The only other copy is the claude.ai chat fallback (`claude-ai-skill/`, see its README) — it drifts by design and only needs its doctrine refreshed occasionally.
