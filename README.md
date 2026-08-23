# Pearl — study notes

Searchable notebook of clinical pearls at **https://maxweiss10.github.io/pearls/**.

Every entry is **real text** in a shared design system — selectable, highlightable, Ctrl-F-able, instant-searchable — not a screenshot. The site is fully static: no API keys, no worker, no cost.

## How entries get added

The `/pearls` skill (`.claude/skills/pearls/SKILL.md`, loaded automatically in any Claude Code session on this repo — including **claude.ai → Code tab → `maxweiss10/pearls`, which works from a phone**) runs a draft-first flow:

1. Say what you want in plain words — photos, a paper URL, a block of text, "as-is", anything.
2. Claude builds the entry on a throwaway `draft` branch and replies with a **preview link** (`…/pearls/#draft=<id>`) that renders the draft inside the real site, instantly — nothing is live yet.
3. Reply with changes to iterate (same link, just reload), or **push** to publish. Only then does anything land on `main`.

Pages redeploys `main` in ~1 min. The preview needs no rebuild — `app.js` fetches draft fragments straight from the `draft` branch on raw.githubusercontent.com.

## Structure

```
index.html      shell: header, search, chips
pearl.css       design system + site styles (incl. draft-preview mode)
app.js          loads manifest + fragments, instant search, #draft= preview
manifest.json   entry metadata, newest first
entries/        one HTML fragment per entry (real text)
entries/img/    photos for raw/figure entries
claude-ai-skill/  fallback skill zip for plain claude.ai chat (can't push; see its README)
```

Fragments use only `pearl.css` classes (`.sec`, `.strip`, `table.cmp`, `.dose`, `.warn`, …) so every entry stays consistent. Authoring rules live in the skill.

## Skill copies

`.claude/skills/pearls/SKILL.md` in this repo is canonical. `~/.claude/skills/pearls` on the Mac is a symlink to it — no syncing. The claude.ai chat zip (`claude-ai-skill/`) is a separate, deliberately-different fallback.

## History

- **v1-v2** (Apr-Jul 2026): capture app + Cloudflare Worker (billed Anthropic API) rendering entries to PNGs pasted into a Google Doc — [archive doc](https://docs.google.com/document/d/1N8egmcK1GHmA6VPiwi2uGR71VcNt8Ve-M-tMkczFMjc/edit). Code in git history.
- **v3** (Aug 2026): static real-text notebook + `/pearls` skill. All 12 doc entries migrated.
- **v3.1** (Aug 2026): draft-branch preview flow — nothing publishes without an explicit "push".
