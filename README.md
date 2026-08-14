# Pearl — study notes

Searchable notebook of clinical pearls at **https://maxweiss10.github.io/pearl-study-notes/**.

Every entry is **real text** in a shared design system — selectable, highlightable, Ctrl-F-able, instant-searchable — not a screenshot. The site is fully static: no API keys, no worker, no cost.

## How entries get added

The `/pearl` skill in Claude Code (in `.claude/skills/pearl/`, also installed at `~/.claude/skills/`) does everything in-session:

- **photo of a chalktalk/slide** → recreated as a polished real-text entry (default)
- **`raw` + photo(s)** → original photo(s) inserted, auto-titled and tagged
- **multiple photos** → separate entries, one merged entry, or a raw stack
- **paper URL (± your takeaway)** → text entry with source link
- **plain text** → quick text pearl
- **"fix the X entry"** → edits the fragment directly

The skill writes a fragment + manifest row, commits, and pushes; Pages redeploys in ~1 min. Works from a phone via a claude.ai/code session on this repo.

## Structure

```
index.html      shell: header, search, chips
pearl.css       design system (light + dark) + site styles
app.js          loads manifest + fragments, instant search with highlighting
manifest.json   entry metadata, newest first
entries/        one HTML fragment per entry (real text)
entries/img/    photos for raw entries
```

Fragments use only `pearl.css` classes (`.sec`, `.strip`, `table.cmp`, `.dose`, `.warn`, `.good`, …) so every entry stays consistent and theme-aware. Authoring rules live in the skill.

## History

- **v1-v2** (Apr-Jul 2026): capture app + Cloudflare Worker (billed Anthropic API) rendering entries to PNGs pasted into a Google Doc — [archive doc](https://docs.google.com/document/d/1N8egmcK1GHmA6VPiwi2uGR71VcNt8Ve-M-tMkczFMjc/edit). Code in git history.
- **v3** (Aug 2026): this — static real-text notebook + `/pearl` skill. All 12 doc entries migrated.
