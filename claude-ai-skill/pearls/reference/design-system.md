# Pearl design system — entry authoring doctrine

<!-- MIRROR: this file is section 4 of .claude/skills/pearls/SKILL.md, verbatim.
     That file is canonical. Do not edit this copy by hand — edit section 4 there
     and re-run tools/sync_doctrine.py, which rewrites this file and the zip.
     tools/check_doctrine_drift.py fails CI if they diverge. -->

## 4 · Design the entry — clinical reference register, real text always

The register is Sanford Guide / Pocket Medicine, not slides. Typography, alignment, and position carry ALL hierarchy.

**Squint test:** blurred to 6px, three things survive — the entry title, the section landmarks, and the red. Nothing else. If you cannot count the sections at a squint, the entry has no mid-level structure: add landmarks, never add colour.

**Grayscale print test:** if the hierarchy collapses printed in grayscale, redo it.

### 4.1 Declare a form

Every entry declares exactly one on the root div:

```html
<div class="pearl form-ladder e-oip">
```

| Content | Form | Visual signature |
|---|---|---|
| Ordered escalation — step n+1 is what you do when n fails | `form-ladder` | continuous left spine, hanging numerals |
| Stages or positions; order matters and an axis may repeat | `form-stage` | banded, small-caps stage label per band |
| Terms that each carry the SAME labelled slots | `form-slots` | hanging term column, fixed slots |
| Two real axes, cells are values | `form-matrix` | zebra table, wide measure |
| Branching decision with exits | `form-branch` | boxes + labelled arrow pills |
| Letter-anchored memory device, ≤4 rows | `form-mnemonic` | large type, heavy whitespace |
| Code or term → description, uniform and long | `form-directory` | monospace left column |
| One source, one claim | `form-takeaway` | large claim, lots of air |
| An image entry | `form-figure` | photo + teaching caption |

`.duo` (side-by-side halves) and `table.cmp` are modifiers usable inside any form, not forms themselves.

**Two entries of different forms must be distinguishable at a squint.** A second entry on a similar topic does NOT inherit the first one's form unless the content genuinely has that shape. `knee-exam` is `form-stage` because position is the axis and Standing recurs; `shoulder-exam` is `form-slots` because every stage carries the same Inspection / Palpation / ROM / Strength labels. They must not look alike.

### 4.2 Separator grammar — ONE mark, ONE job

| Relationship | Mark | Notes |
|---|---|---|
| lead → its detail; criterion → value | `:` | **the default joint** |
| 2 peer alternatives | `or`, or a comma | write the word |
| **3+ peer alternatives** | **no mark — `.peers` grid** | they become cells |
| sequence, causation, titration | `→` | state change only |
| qualifier bound to the preceding token | no mark — `.mut` parens or `.aside` | it attaches, it does not separate |
| trailing caveat | `.fn` footnote | it leaves the line |
| null / not applicable | `.nil` | never a dash in running text |
| citation fields | `.cite` fielded spans | spacing separates |
| numeric range | `–` en dash | ranges ONLY, never a gloss |
| true aside or reversal | `—` em dash | rare; aim for ≤1 per entry |
| `·` middot | **BANNED in entry bodies** | site chrome only (the meta line) |

**The em dash is no longer the default joint.** The old rule — "use the em dash everywhere a lead meets its detail; never a colon" — is what made every line in every entry the same shape. Its force now comes from scarcity.

**Budget (the linter enforces this):**
- No line carries more than two separator types.
- An entry with ≥8 polysemous separators (middot, em dash) uses ≥2 distinct marks. A monoculture means one mark is doing several jobs. The arrow does not count: it means exactly one thing by construction, so a titration column full of `start → target` is one mark doing one job.
- 3+ peers never run in on one line. **Two exceptions:** a menu bound to a single verb ("give fluid, blood product, pressors") is prose and takes commas; and ≤3 tight values inside a table cell or flow-sheet box may stay compact as `.peers tight`.
- **A null inside a matrix cell, under a column header, keeps its bare `–`.** The column is the axis, so nothing is ambiguous. `ibd-flare-pain` is right and must not be changed.

### 4.3 Footnotes

Trailing caveats and parenthetical lab panels leave the row:

```html
<div>labs<sup class="fn">&#8201;1</sup></div>
...
<ol class="notes">
  <li>POCT glucose, CBC, BMP, LFT, lactate, coags
      <span class="mut">(blood cultures, troponin, d-dimer, type &amp; screen)</span></li>
</ol>
```

`.notes` closes the section it belongs to, numbered from 1 per section.

**Search-critical:** the marker MUST carry a leading thin space, `&#8201;`. `app.js` builds its index from the rendered text; without the space `TOF<sup>2</sup>` indexes as `tof2` and the 3-character query "TOF" stops matching. The linter fails the build on this.

### 4.4 Sidenotes

`.aside` renders in the right margin at ≥1420px and folds inline under its own line below that. It is the home for `.mut` parentheticals, `.mech` mechanisms, and `.brand` names that would otherwise clutter a scan row.

**Only for parentheticals of roughly four words or more.** A one- to three-word gloss belongs inline as `.mut`: in the margin, "(ACL)" ends up 200px from "Lachman" and reads worse than the parenthesis it replaced. Asides do not float inside a `.row2` cell (the right margin there is the next column) or inside a wide form (there is no margin) — in both cases they stay inline, which is correct.

### 4.5 Colour budget (strict)

- Grayscale by default. Muted blue is for links only, never inside entries.
- Red (`.warn`, deep oxblood) is EXCLUSIVELY clinical danger and escalation — toxicity, contraindication, do-not-miss, "call RT", "call RICU", "escalate to a carbapenem". The whole clause gets red; never split it between red and bold.
- `--sec-accent` may carry discipline as a 2px card edge, but **never as the only carrier** — the section header names it and the meta line repeats it.
- No filled bars/pills/badges/coins/tiles, no shadows, no rounded boxes, no per-entry palettes, no emoji, no `★`. **Do not type a `⚠`:** `.warn` supplies its own from CSS, and typing one doubles it.
- **Never write a `@media (prefers-color-scheme: dark)` block.** The site is `color-scheme: light only`, so the page stays white while your block fires — that shipped near-black text on a near-black box at 1.15:1 contrast, invisible on every dark-mode phone.

### 4.6 Base primitives (`pearl.css`)

`.sec` landmark (+`.later`) · `.peers` peer grid (`.tight`, `.wide`) · `.acts` action rows · `.slots` labelled slots (`.sk`/`.sv`) · `.term` hanging term row (`.tn`) · `.branch`/`.br`/`.cond`/`.arr` two-branch · `.fn`+`.notes` footnotes · `.aside` sidenote · `.nil` null · `.cite` citation fields · `.figcap` figure caption · `.drow` directory row · `.fnote` · `.legend` · `.caps` · `.strip` · `.lab` · `.mut` `.mech` `.note` `.brand` · `.row2` (`.rule`, `.full`, `.mlab` phone slot labels) · `.colhead2` · `.duo` · `table.cmp` in `.tblwrap` · `.dose` `.warn` `.drug` `.code` `.eyebrow` `.ptext` `.photo`

Ordered items: markers as `<b class="mk">1.</b>` / `<b class="mk">A.</b>` at text size, placed inside a `.row2` cell or a `.strip` line — the site hangs them in a left gutter so wrapped lines align under the text, never under the marker. No coins or tiles. In `form-ladder`, wrap the numbered rows in `<div class="steps">` to get the spine.

### 4.7 Width per form

Set by the form class, never by a fixed pixel width on a container. `form-matrix`, `form-branch` and `form-directory` get `--w-wide` (1100px); everything else gets `--w-scan` (880px); `form-takeaway` gets `--w-text` (72ch).

### 4.8 Figures

An image entry gets `form-figure` and a `.figcap` teaching caption: a bold title plus numbered steps that decode the figure and name its own colours and arrows.

**Alt text and caption are DIFFERENT texts with different jobs.** Alt text IS the search index: it linearizes every drug, dose, arrow and label, and the same terms go in the keywords. The caption is written to be read. Never make one a copy of the other, and never shorten the alt to match the caption.

### 4.9 Hard rules

Root `<div class="pearl form-{name} e-{short}">`; real text only; no scripts, iframes, handlers or external resources; no `<html>/<head>/<body>`; no title at the top (the site renders it); no rotated text; no fixed pixel widths on containers; density tight; fragment ≤ ~8 KB (split rule, §1).

**Scoped `<style>` is the exception, not the rule:** only for a layout the primitives genuinely do not cover, every selector prefixed `.e-{short}`, **layout properties only — never colour.**

**Flow-sheet exception:** when the source is itself a flowchart the user made or asked for, recreate it faithfully as real-text HTML — boxes, labelled arrow pills, dashed grouping bands, and the source's own semantic exit colouring (tinted outcome boxes allowed HERE only, scoped vars, arrows via CSS lines/glyphs, never images). Do NOT flatten it into rows. That is `form-branch`, and it is the one form whose scoped style may set colour. References: `entries/2026-08-09-pleural-effusion.html`, `entries/2026-08-09-beta-lactam-ladder.html`.

**Images in entries** — real text is the default, but an explicit ask ("use the image itself", "as-is", "keep the diagram") overrides it: honour it, do not quietly redesign anyway (bytes permitting, §2). If the image is mostly typed text, say so in one line and build it as asked anyway.

### 4.10 Worked before / after, from this site

**`abcde`, Circulation / Intervene** — four separator systems and three nesting levels flattened into one 190-character line:

```
BEFORE  EKG · reliable access · labs: POCT glucose, CBC, BMP, LFT, lactate,
        coags (blood cultures, troponin, d-dimer, type & screen) · fluid /
        blood product / pressors / inotropes / antibiotics

AFTER   <div class="acts">
          <div>EKG</div><div>reliable access</div>
          <div>labs<sup class="fn">&#8201;1</sup></div>
        </div>
        <span class="lab">Give</span>
        <div class="peers"><span>fluid</span><span>blood product</span>
          <span>pressors</span><span>inotropes</span><span>antibiotics</span></div>
```

**`opioid-pruritus`, step 3 Notes** — a two-branch decision compressed into a middot string, with an unrelated fact appended:

```
BEFORE  Side effects with pain relief → rotate with dose reduction · side
        effects without pain relief → rotate IV opioid, no reduction ·
        morphine is the histamine offender, prefer hydromorphone/fentanyl

AFTER   <div class="branch">
          <div class="br"><span class="cond">With pain relief</span>
            <span class="arr">→</span><span>rotate <b>with</b> dose reduction</span></div>
          <div class="br"><span class="cond">Without pain relief</span>
            <span class="arr">→</span><span>rotate IV opioid, <b>no</b> reduction</span></div>
        </div>
        <p class="sub">Morphine is the histamine offender: prefer
        hydromorphone or fentanyl.</p>
```

**`icu-sedation`, Monitoring** — six items on one line that were never peers: two trials, three depth-of-sedation modalities, and a complication.

```
BEFORE  Monitoring — ACURASYS – mortality · ROSE · V/V – sedated ·
        TOF – "train of four" · BIS · ICU myopathy

AFTER   .lab "Monitoring" + .acts rows, one item per line with its gloss in
        .mut, and ICU myopathy pulled out onto its own .warn line — it is a
        complication, not something you monitor with.
```

**`electrolyte-repletion`** — four different KINDS of fact `<br>`-stacked inside one cell became named slots repeated identically for every electrolyte: **Target · Rule · Route · Caution · PO · IV**. The eye now drops down a column instead of re-parsing each cell.

### 4.11 Section metadata — exact string

`section` MUST be the raw string: `Renal & Electrolytes`, never `Renal &amp; Electrolytes`. The worker compares sections by exact string and the site renders them as a text node, so an escaped value silently forks a duplicate section that renders literally as "RENAL &AMP; ELECTROLYTES" with no discipline accent, sorted below Papers. This shipped to production. Match an existing entry in `manifest.json → sections` verbatim; the linter fails the build on it.
