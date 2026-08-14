# Pearl design system — entry authoring doctrine

The register is **Sanford Guide / Pocket Medicine**, not slides. Typography, alignment, and position carry ALL hierarchy.

**Two tests govern every entry:**
- **Grayscale print test** — if the hierarchy would collapse printed in grayscale, redo it. Hierarchy must be structural, not chromatic.
- **Squint test** — blurred, only the entry title and red cautions should survive.

The site stylesheet (`pearl.css`) supplies all styling. Fragments are semantic markup using the classes below.

---

## Color budget (strict)

- **Grayscale by default.** Muted blue belongs to links only — never inside entries.
- **Red (`.warn`, deep oxblood) is reserved EXCLUSIVELY for clinical danger AND escalation actions** — toxicity, contraindication, do-not-miss, "call RT", "call RICU", "escalate to a carbapenem". The whole class gets red; never split it between red and bold black. Nothing else is colored, so when something is red it lands.
- **No** filled bars/panels/pills/badges/coins/tiles, shadows, rounded boxes, per-entry palettes, or decorative glyphs/emoji (no ⚠ ★ ☾ — red text IS the caution marker). No green for benefits — position after the drug already implies "notes".

## Scan anatomy — every row the same fixed slots

So the eye can drop straight down a column:

- drug/lead name in `<b>` · attributes plain or `.mut`/`.mech` · dose in `.dose` (tabular figures, units verbatim) · **cautions LAST, in `.warn`**
- **ordered items:** markers as `<b class="mk">1.</b>` / `<b class="mk">A.</b>` at text size — the site hangs them in a left gutter so wrapped lines align under the text, never under the marker
- **separator convention:** lead **—** details, with `·` between items inside the details
  `<b>Norepinephrine</b> <span class="brand">(Levophed)</span> — α &gt; β`
  Use the em dash everywhere a lead meets its detail. Never a colon.
- **conditional/parenthetical asides** in `.mut` (renders italic gray) — e.g. "(blood cultures, troponin, d-dimer, type & screen)"
- receptor notation is plain text: `α > β`, `V₁ receptor` — no chips

## Base classes

| Class | Use |
|---|---|
| `.sec` (+`.later`) | entry subsection label, small caps |
| `.caps` | inline small-caps lead |
| `.strip` | one flowing line |
| `.lab` | bold lead-in |
| `.mut` / `.mech` / `.note` / `.brand` | gray secondary; `.mut`+`.mech`+`.note` render italic |
| `.row2` | two-column scan row; add `.rule` for the column divider, `.full` to span both; stacks on phones with `.mlab` slot labels |
| `.colhead2` | small-caps column headers with hairline |
| `.duo` | two side-by-side halves |
| `table.cmp` | hairline table (small-caps `th`, no zebra) — always wrap in `.tblwrap` |
| `.dose` `.warn` `.drug` `.code` `.eyebrow` `.ptext` `.photo` `.mk` | inline primitives |

Site CSS variables available if a scoped style truly needs them: `--ink --gray --lab --line --rowline --red --page`.

## Structure by content

- **Ordered escalation / sequence** → `.colhead2` + numbered `.row2.rule` rows
- **Algorithm** → Assess | Intervene `.row2.rule` columns
- **Agent comparison** → `.cmp` table; Pro | Con as plain headers (position carries meaning, not color)
- **Exam flow** → numbered `.sec` stages, or `.caps` position leads in strips
- **Mnemonic** → bold key letters at text size in aligned `.row2` rows
- **Directory** (dot phrases, numbers) → `.code` | description grid rows
- **Paper / video** → `.eyebrow` source label + bold takeaway in `.ptext`
- **Raw photos** → stacked `<img class="photo">` with detailed searchable alt text

## Flow sheets — the one exception

When the source is itself a flowchart/diagram Max made or asks for, **recreate the sheet faithfully as real-text HTML** — boxes, labeled arrow pills, dashed grouping bands, and the source's own semantic exit coloring. Tinted outcome boxes are allowed HERE only; use scoped vars with dark-mode variants; draw arrows with CSS lines and glyphs, never images. Do NOT flatten it into rows.

Pattern references in the repo: `entries/2026-08-09-pleural-effusion.html`, `entries/2026-08-09-beta-lactam-ladder.html`.

## Density

Maximize signal per screen: inline flow lines beat bullet lists, merge related facts, no decorative padding, no empty boxes. A genuinely huge multi-topic source becomes two entries.

---

## Worked example

```html
<div class="pearl e-afr">
  <div class="sec">Rate control</div>
  <div class="colhead2"><span>Drug / dose</span><span>Notes</span></div>
  <div class="row2 rule">
    <div><b class="mk">1.</b> <b>Metoprolol</b> — <span class="mech">β₁ selective</span><br><span class="dose">2.5–5 mg IV q5min</span></div>
    <div>Preferred if ischemia<br><span class="warn">Avoid in decompensated HF</span></div>
  </div>
  <div class="row2 rule">
    <div><b class="mk">2.</b> <b>Diltiazem</b> — <span class="mech">non-dihydropyridine CCB</span><br><span class="dose">0.25 mg/kg IV</span></div>
    <div>Faster onset<br><span class="warn">Avoid in HFrEF</span></div>
  </div>
  <div class="strip"><b>Digoxin</b> — adds control without dropping BP <span class="mut">(sick, hypotensive patients)</span></div>
</div>
```
