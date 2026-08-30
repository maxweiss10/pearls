#!/usr/bin/env python3
"""Build whitebook-index.json for Pearl's White Book search tab.

Extracts per-page text and the bookmark outline from whitebook.pdf, cleans the
outline titles (drops filename artifacts like "A25_..._2025_CS_CVR"), and emits
one compact JSON the site loads lazily when the White Book tab opens.
"""
import json, re, sys
from pypdf import PdfReader

SRC = sys.argv[1] if len(sys.argv) > 1 else 'wb/whitebook.pdf'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'whitebook-index.json'

r = PdfReader(SRC)
npages = len(r.pages)

# ---- outline ----------------------------------------------------------------
def clean_title(t):
    t = t.replace('\x00', ' ').strip()
    t = re.sub(r'[^\x20-\x7e]', '', t)                         # stray glyphs / bullets
    t = re.sub(r'\.pdf$', '', t, flags=re.I)
    t = re.sub(r'^[A-Za-z]{1,2}\d+[a-z]?[_ ]+', '', t)          # A25_ / B3_ prefix
    t = re.sub(r'^\d+\s+', '', t)                              # "4 combined..." root
    t = re.sub(r'[_ ](20\d\d)([_ ][A-Za-z]{2,6})*$', '', t)    # _2025_CS_CVR tail
    t = re.sub(r'\s*\([^)]*\d{4}[;:][^)]*\)', '', t)           # inline citations "(EASL: J Hepatol 2018;69:406)"
    t = re.sub(r'( [A-Z]{1,4})* CVR$', '', t)                  # author-initials tails "... CS CVR"
    t = t.replace('_', ' ').replace('^0', '&')
    t = re.sub(r'\s+20\d\d(\s+[A-Za-z]{1,6})?$', '', t)      # leftover "... 2025 ZA" tails
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def good_subhead(t):
    """Depth-3 bookmarks include content lines; keep only clean heading-like ones."""
    if not t or len(t) > 60: return False
    if not t[0].isalpha(): return False
    if ';' in t or '(' in t: return False
    return True

CHAPTER_FIX = {
    'Nephrology Section': 'Nephrology',
    'Hematology Section': 'Hematology',
    'Geriatrics and Palliative Care Section': 'Geriatrics & Palliative Care',
    'Endocrine Section (1)': 'Endocrinology',
    'AllergyandImmunologySection': 'Allergy & Immunology',
    'Neurology Section': 'Neurology',
    'Primary Care Section (1)': 'Primary Care',
    'Procedure Section': 'Procedures',
    'Pulmonary and Critical Care': 'Pulmonary & Critical Care',
}

rows = []          # flat outline: depth, title, page (1-based)
def walk(items, depth=0):
    for it in items:
        if isinstance(it, list):
            walk(it, depth + 1)
        else:
            try:
                pg = r.get_destination_page_number(it) + 1
            except Exception:
                pg = None
            rows.append((depth, clean_title(it.title), pg))

walk(r.outline)

# depth 1 = chapters ("Cardiology"), depth 2 = topics, depth 3 = subheads.
outline = []
chapter = None
topic_i = None
for depth, title, pg in rows:
    if pg is None or not title:
        continue
    if depth == 1:
        chapter = CHAPTER_FIX.get(title, title)
    elif depth == 2 and chapter:
        outline.append({'t': title, 'c': chapter, 'p': pg})
        topic_i = len(outline) - 1
    elif depth == 3 and topic_i is not None:
        parent = outline[topic_i]
        if title.lower() != parent['t'].lower() and good_subhead(title):
            outline.append({'t': title, 'c': chapter, 'p': pg, 'in': parent['t']})

# ---- page text --------------------------------------------------------------
pages = []
for i, page in enumerate(r.pages):
    try:
        txt = page.extract_text() or ''
    except Exception:
        txt = ''
    txt = txt.replace('\x00', ' ')
    txt = re.sub(r'\s+', ' ', txt).strip()
    # rejoin letter-spaced headers: "M A N A G E M E N T" -> "MANAGEMENT"
    txt = re.sub(r'(?:(?<=^)|(?<= ))(?:[A-Za-z] ){2,}[A-Za-z](?= |$)',
                 lambda m: m.group(0).replace(' ', ''), txt)
    pages.append(txt)

index = {'built': '2026-08-29', 'pages': npages, 'outline': outline, 'text': pages}
with open(OUT, 'w') as f:
    json.dump(index, f, ensure_ascii=False, separators=(',', ':'))

import os
print(f'pages={npages} outline_rows={len(outline)} '
      f'json={os.path.getsize(OUT)/1e6:.2f}MB '
      f'empty_pages={sum(1 for t in pages if len(t) < 40)}')
for o in outline[:8]:
    print(' ', o)
