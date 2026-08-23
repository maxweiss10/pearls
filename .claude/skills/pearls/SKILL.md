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

## 4 · Design the entry — clinical reference register, real text always

The register is Sanford Guide / Pocket Medicine, not slides. Typography, alignment, and position carry ALL hierarchy. **Grayscale print test:** if the entry's hierarchy would collapse printed in grayscale, redo it — hierarchy must be structural, not chromatic. **Squint test:** blurred, only the entry title and the red cautions should survive.

**Color budget (strict)**
- Grayscale by default. Muted blue is for links only — never inside entries.
- Red (`.warn`, deep oxblood) is reserved EXCLUSIVELY for clinical danger AND escalation actions — toxicity, contraindication, do-not-miss, "call RT", "call RICU", "escalate to a carbapenem". The whole class gets red; never split it between red and bold. Nothing else is colored, so when something is red it lands.
- No filled bars/panels/pills/badges/coins/tiles, no shadows, no rounded boxes, no per-entry palettes, no decorative glyphs or emoji (no ⚠ ★ ☾ — red text IS the caution marker).

**Scan anatomy** — every row same fixed slots, so the eye drops straight down a column:
- drug/lead name in `<b>` · attributes plain or `.mut`/`.mech` · dose in `.dose` (tabular figures, units verbatim) · cautions LAST, in `.warn`
- ordered items: markers as `<b class="mk">1.</b>` / `<b class="mk">A.</b>` at text size — the site hangs them in a left gutter so wrapped lines align under the text, never under the marker. No coins or tiles.
- separator convention: lead **—** details, items inside the details separated by `·` ("**Norepinephrine** (Levophed) — α > β"). Use the em dash everywhere a lead meets its detail; never a colon.
- conditional/parenthetical asides in `.mut` (renders italic gray) — e.g. "(blood cultures, troponin, d-dimer, type & screen)"

**Base primitives cover nearly everything** (`pearl.css`):
`.sec` small-caps hairline section label (+`.later`) · `.caps` inline small-caps lead · `.strip` flow line · `.lab` bold lead-in · `.mut` `.mech` `.note` `.brand` gray secondary · `.row2` two-column hairline row (`.rule` adds a column divider; `.full` spans both; stacks automatically on phones with `.mlab` slot labels) · `.colhead2` small-caps column headers · `.duo` side-by-side halves · `table.cmp` hairline table (small-caps `th`, no zebra, wrap in `.tblwrap`) · `.dose` `.warn` `.drug` `.code` `.eyebrow` `.ptext` `.photo`

**Structure by content** (all hairlines + typography):
- Ordered escalation / sequence → `.colhead2` + numbered `.row2.rule` rows
- Algorithm → Assess | Intervene `.row2.rule` columns
- Agent comparison → `.cmp` table; Pro | Con as plain headers (position carries the meaning, not color)
- Exam flow → `.sec`-numbered stages, or `.caps` position leads in strips
- Mnemonic → bold key letters at text size in aligned `.row2` rows
- Directory → `.code` | description grid rows
- Paper / video → `.eyebrow` source label + bold takeaway in `.ptext`
- Raw photos → stacked `.photo` imgs with detailed searchable alt text
- **Flow sheets (exception to the no-filled-boxes rule):** when the source is itself a flowchart/diagram the user made or asks for, recreate the sheet faithfully as real-text HTML — boxes, labeled arrow pills, dashed grouping bands, and the source's own semantic exit coloring (tinted outcome boxes allowed HERE only; scoped vars; arrows via CSS lines/glyphs, never images) — do NOT flatten it into rows. Pattern references: `entries/2026-08-09-pleural-effusion.html`, `entries/2026-08-09-beta-lactam-ladder.html`.

**Scoped `<style>` is the exception**, not the rule: only for a layout the primitives genuinely don't cover; every selector prefixed `.e-{short}`; layout properties only — never colors.

**Hard rules**: root `<div class="pearl e-{short}">`; real text only; no scripts/iframes/external resources; no `<html>/<head>/<body>`; no title at top (site renders it); no rotated text; no fixed pixel widths on containers; density tight — hairline dividers, inline flow over bullet lists, no decorative padding; fragment ≤ ~8 KB (split rule, §1).

**Images in entries** — real text is the default, but an explicit ask ("use the image itself", "as-is", "keep the diagram") overrides it: honor it, don't quietly redesign anyway (bytes permitting — §2). Place a figure as `.sec` label + `<img class="photo">` + optional `.note` caption when the source is a diagram, tracing, or chart markup can't reproduce honestly. Alt text IS the search index for that content: every drug, dose, arrow, and label in a sentence or two, never "photo of whiteboard", and the same terms go in the keywords. If the image is mostly typed text, say so in one line and build it as asked anyway.

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

## 8 · Report

One line per entry: title + `https://maxweiss10.github.io/pearls/#{id}` (mention the ~1 min rebuild). For edits, say exactly what changed.

## 9 · Where this file lives

This file (`.claude/skills/pearls/SKILL.md` in the repo) is canonical. On the Mac, `~/.claude/skills/pearls` is a **symlink** here — never copy over it. The only other copy is the claude.ai chat fallback (`claude-ai-skill/`, see its README) — it drifts by design and only needs its doctrine refreshed occasionally.
