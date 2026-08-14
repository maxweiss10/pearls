# Pearl skill for claude.ai (normal Claude)

`pearls-skill.zip` uploads into claude.ai so regular Claude — phone or web — can write Pearl entries.

**Install:** claude.ai → Settings → enable **code execution / file creation** → **Customize → Skills → Add** → upload `pearls-skill.zip`.

**What it does:** produces the finished `entries/{id}.html` fragment plus its `manifest.json` row, with copy-paste instructions for committing via GitHub's web UI. It cannot commit for you — the claude.ai GitHub connector is read-only. Add `maxweiss10/pearl-study-notes` as a connector source so it can read current sections and match house style.

**Compare:** Claude Code (Mac) and claude.ai/code run `.claude/skills/pearls/`, which writes and pushes in one step.

**Editing:** source of truth for the site's design doctrine is `.claude/skills/pearls/SKILL.md`. When that changes, mirror the relevant parts into `claude-ai-skill/pearls/reference/design-system.md` and re-zip:

    cd claude-ai-skill && rm -f pearls-skill.zip && zip -q -r pearls-skill.zip pearls
