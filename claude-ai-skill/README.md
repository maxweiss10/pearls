# Pearl skill for claude.ai (normal Claude)

`pearls-skill.zip` uploads into claude.ai so regular Claude — phone or web — can write Pearl entries.

**Install:** claude.ai → Settings → enable **code execution / file creation** → **Customize → Skills → Add** → upload `pearls-skill.zip`.

**Re-install after a change:** Settings → **Skills** → `pearls` → **⋮ → Replace** → upload the rebuilt zip → **Upload and replace**. Re-zipping the folder here does nothing on its own — the account keeps serving whatever was last uploaded, which is how the installed copy went stale pointing at `pearl-study-notes`.

**What it does:** produces the finished `entries/{id}.html` fragment plus its `manifest.json` row — and, when Max asks for the image itself (raw stack or one figure inside a text entry), the images renamed to `entries/img/{id}-N.jpg` ready to drag into GitHub — with copy-paste instructions for committing via GitHub's web UI. It cannot commit for you — the claude.ai GitHub connector is read-only. It is told to say so in its first reply, before doing the work. Add `maxweiss10/pearls` as a connector source so it can read current sections and match house style.

**Use this only when you can't use a Code session.** The `.claude/skills/pearls/` copy in this repo writes, commits, and pushes in one step, and it loads anywhere the repo is checked out: Claude Code on the Mac, **and claude.ai → Code tab → select `maxweiss10/pearls` → works on phone**. That last one is the intended phone workflow; this zip is the fallback for plain chat.

**Editing:** source of truth for the site's design doctrine is `.claude/skills/pearls/SKILL.md`. When that changes, mirror the relevant parts into `claude-ai-skill/pearls/reference/design-system.md` and re-zip:

    cd claude-ai-skill && rm -f pearls-skill.zip && zip -q -r pearls-skill.zip pearls
