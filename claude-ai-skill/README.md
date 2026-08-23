# Pearl skill for claude.ai (normal chat)

`pearls-skill.zip` uploads into claude.ai so regular Claude — phone or web, no Code session — can add Pearl entries. With the GitHub connector enabled it **commits and pushes on its own**, exactly like the Code-tab skill. Without it, it degrades to handing over files to paste.

## Setup (two parts — both needed for the automatic path)

### 1 · Add GitHub as a custom connector

claude.ai → **Settings → Connectors → Add custom connector**

- **URL:** `https://api.githubcopilot.com/mcp/`
- Sign in with GitHub when prompted and authorize access to `maxweiss10/pearls`.

This is GitHub's official remote MCP server — the same one a Code session uses — so it brings `push_files`, `create_or_update_file`, `get_file_contents`, and `delete_file` into chat. Custom connectors require a paid claude.ai plan.

Then make sure it is toggled **on for the chat** (the connectors control in the composer). A connector that is authenticated but toggled off for that chat is invisible to the skill, and it will fall back to paste mode.

### 2 · Upload the skill

claude.ai → **Settings → Capabilities → enable code execution / file creation**, then **Customize → Skills → Add** → upload `pearls-skill.zip`.

**Delete the old `pearls` skill first if one is already installed** — the previously uploaded copy pointed at the retired `pearl-study-notes` repo and will send you to a dead repository.

## What it does

Same intent-reading and same design doctrine as the Code skill: photos, slides, papers, YouTube, text, or a plain-words instruction go in; a real-text entry lands in the site.

1. Reads `manifest.json` and a recent entry from the repo for live sections and house style
2. Builds the `entries/{id}.html` fragment and the manifest row
3. Pushes both in one commit to `main` as `Pearl: {TITLE}`
4. Reports `https://maxweiss10.github.io/pearls/#{id}` (rebuilds ~1 min)

**One gap:** the GitHub connector writes text, so it cannot upload JPEGs. Redesigned entries — the default — are pure text and unaffected. Raw photo entries push their fragment fine but the images need a manual upload to `entries/img/`, so prefer a Code session for those. The skill says so up front rather than after the work.

## Which path to use

| | Code tab / Claude Code | This skill in chat |
|---|---|---|
| Commits + pushes | yes | yes, with the connector |
| Photo entries with images | automatic (resized, committed) | fragment only, manual image upload |
| Setup | none, repo is attached | connector + skill upload, once |

The Code tab remains the fuller path, especially for raw photos. This makes plain chat a real second option rather than a dead end.

## Editing

Source of truth for the site's design doctrine is `.claude/skills/pearls/SKILL.md` in this repo. When that changes, mirror the relevant parts into `claude-ai-skill/pearls/reference/design-system.md` and re-zip:

    cd claude-ai-skill && rm -f pearls-skill.zip && zip -q -r pearls-skill.zip pearls
