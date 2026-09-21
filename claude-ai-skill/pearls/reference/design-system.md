# Pearl design system — the White Book register

<!-- MIRROR: this file is section 4 of .claude/skills/pearls/SKILL.md, verbatim.
     That file is canonical. Edit section 4 there, then re-run
     tools/sync_doctrine.py, which rewrites this file and the zip. -->

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
