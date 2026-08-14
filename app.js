/* Pearl — command-palette search over section-grouped notes, with a collapsible
   sidebar (counts, recently added), per-note subsection TOC, scroll-spy and
   keyboard navigation. */
(function () {
  'use strict';

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const TYPE_TOKENS = ['chalktalk', 'slide', 'paper', 'photo', 'note', 'video'];

  /* Lexical medical abbreviations → expansions. Purely terminological. */
  const SYNONYMS = {
    svt: 'supraventricular tachycardia', vt: 'ventricular tachycardia',
    af: 'atrial fibrillation', afib: 'atrial fibrillation', aflutter: 'atrial flutter',
    hf: 'heart failure', hfref: 'heart failure reduced ejection fraction', chf: 'heart failure',
    mi: 'myocardial infarction', acs: 'acute coronary syndrome', cad: 'coronary artery disease',
    htn: 'hypertension', dm: 'diabetes mellitus', dka: 'diabetic ketoacidosis',
    ckd: 'chronic kidney disease', aki: 'acute kidney injury', esrd: 'end stage renal disease',
    copd: 'chronic obstructive pulmonary disease', pe: 'pulmonary embolism', dvt: 'deep vein thrombosis',
    ards: 'acute respiratory distress syndrome', osa: 'obstructive sleep apnea',
    uti: 'urinary tract infection', cap: 'community acquired pneumonia', hap: 'hospital acquired pneumonia',
    esbl: 'extended spectrum beta lactamase', mrsa: 'methicillin resistant staphylococcus aureus',
    gib: 'gastrointestinal bleed', gi: 'gastrointestinal', ams: 'altered mental status',
    icu: 'intensive care unit', micu: 'medical intensive care unit', ed: 'emergency department',
    cva: 'stroke cerebrovascular accident', tia: 'transient ischemic attack',
    oa: 'osteoarthritis', ra: 'rheumatoid arthritis', acl: 'anterior cruciate ligament',
    mcl: 'medial collateral ligament', lcl: 'lateral collateral ligament', pcl: 'posterior cruciate ligament',
    glp1: 'glp-1 semaglutide tirzepatide', bmi: 'body mass index',
    gcs: 'glasgow coma scale', tof: 'train of four', pris: 'propofol infusion syndrome',
    nsaid: 'nsaids ibuprofen ketorolac', ppi: 'proton pump inhibitor',
    bl: 'beta lactam', bli: 'beta lactamase inhibitor', abx: 'antibiotics',
    ldh: 'lactate dehydrogenase', bnp: 'brain natriuretic peptide',
    cxr: 'chest x-ray', ekg: 'electrocardiogram ecg', ecg: 'electrocardiogram ekg'
  };

  const $list = document.getElementById('list');
  const $q = document.getElementById('q');
  const $chips = document.getElementById('chips');
  const $count = document.getElementById('count');
  const $empty = document.getElementById('empty');
  const $toc = document.getElementById('toc');
  const $tocm = document.getElementById('tocm');
  const $tocmList = document.getElementById('tocm-list');
  const $keys = document.getElementById('keys');
  const $pal = document.getElementById('pal');

  let entries = [];
  let sectionHeads = [];
  let ordered = [];

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem('pearl.' + key)) || fallback; }
    catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem('pearl.' + key, JSON.stringify(val)); } catch (e) {}
  }
  let recentAdded = [];
  let collapsed = load('collapsed', []);

  function fmtDate(iso) {
    const p = iso.split('-').map(Number);
    return MONTHS[p[1] - 1] + ' ' + p[2] + ', ' + p[0];
  }
  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------- cards ---------- */
  function buildCard(meta, fragmentHtml) {
    const card = document.createElement('article');
    card.className = 'card';
    card.id = meta.id;

    const header = document.createElement('header');
    const h2 = document.createElement('h2');
    const a = document.createElement('a');
    a.href = '#' + meta.id;
    a.textContent = meta.title;
    h2.appendChild(a);
    header.appendChild(h2);
    card.appendChild(header);

    const metaEl = document.createElement('div');
    metaEl.className = 'meta';
    metaEl.innerHTML =
      '<span>' + esc(meta.section || '') + '</span>' +
      '<span class="sep">·</span>' +
      '<time datetime="' + meta.date + '">Updated ' + fmtDate(meta.date) + '</time>';
    card.appendChild(metaEl);

    if (meta.source) {
      const src = document.createElement('p');
      src.className = 'src';
      const sa = document.createElement('a');
      sa.href = meta.source;
      sa.target = '_blank';
      sa.rel = 'noopener';
      sa.textContent = meta.source.replace(/^https?:\/\//, '');
      src.append('Source: ', sa);
      card.appendChild(src);
    }

    const body = document.createElement('div');
    body.className = 'body';
    body.innerHTML = fragmentHtml;
    body.querySelectorAll('table').forEach(function (t) {
      if (t.closest('.tblwrap')) return;
      const w = document.createElement('div');
      w.className = 'tblwrap';
      t.parentNode.insertBefore(w, t);
      w.appendChild(t);
    });
    card.appendChild(body);
    return { card: card, bodyEl: body, titleEl: a };
  }

  function highlight(root, terms) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      if (node.parentNode && node.parentNode.nodeName === 'STYLE') return;
      const text = node.nodeValue;
      const lower = text.toLowerCase();
      const hits = [];
      terms.forEach(function (t) {
        let i = 0;
        while ((i = lower.indexOf(t, i)) !== -1) { hits.push([i, i + t.length]); i += 1; }
      });
      if (!hits.length) return;
      hits.sort(function (a, b) { return a[0] - b[0]; });
      const merged = [];
      hits.forEach(function (h) {
        const last = merged[merged.length - 1];
        if (last && h[0] <= last[1]) last[1] = Math.max(last[1], h[1]);
        else merged.push(h.slice());
      });
      const frag = document.createDocumentFragment();
      let pos = 0;
      merged.forEach(function (se) {
        if (se[0] > pos) frag.appendChild(document.createTextNode(text.slice(pos, se[0])));
        const mark = document.createElement('mark');
        mark.textContent = text.slice(se[0], se[1]);
        frag.appendChild(mark);
        pos = se[1];
      });
      if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  /* ---------- matching (word-boundary for short tokens; whole expansion) ---------- */
  function hit(t, hay) {
    if (t.length > 3) return hay.indexOf(t) !== -1;
    const safe = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^a-z0-9])' + safe + '([^a-z0-9]|$)').test(hay);
  }
  function matches(term, hay) {
    if (hit(term, hay)) return true;
    const phrase = SYNONYMS[term];
    if (!phrase) return false;
    if (hay.indexOf(phrase) !== -1) return true;
    return phrase.split(/\s+/).every(function (w) { return hit(w, hay); });
  }
  function expandedTerms(terms) {
    const out = terms.slice();
    terms.forEach(function (t) {
      if (SYNONYMS[t]) out.push.apply(out, SYNONYMS[t].split(/\s+/).filter(function (w) { return w.length > 3; }));
    });
    return out.filter(function (t, i, a) { return a.indexOf(t) === i; });
  }

  /* ---------- chip filter (inline card filtering) ---------- */
  function applyFilter() {
    const q = $q.dataset.chip || '';
    let shown = 0;
    entries.forEach(function (e) {
      const match = !q || matches(q, e.haystack);
      e.card.hidden = !match;
      if (match) shown++;
    });
    sectionHeads.forEach(function (s) {
      s.el.hidden = !s.entries.some(function (e) { return !e.card.hidden; });
    });
    $count.textContent = q ? shown + ' / ' + entries.length + ' notes' : entries.length + ' notes';
    $empty.hidden = shown !== 0;
    document.querySelectorAll('.chip').forEach(function (c) {
      c.classList.toggle('on', c.dataset.kw === q);
    });
    onScroll();
  }

  function buildChips(metas) {
    const freq = Object.create(null);
    metas.forEach(function (m) {
      m.keywords.split(',').forEach(function (k) {
        k = k.trim().toLowerCase();
        if (k) freq[k] = (freq[k] || 0) + 1;
      });
    });
    TYPE_TOKENS.filter(function (t) { return freq[t]; }).forEach(function (kw) {
      const b = document.createElement('button');
      b.className = 'chip';
      b.type = 'button';
      b.dataset.kw = kw;
      b.textContent = kw;
      b.addEventListener('click', function () {
        $q.dataset.chip = ($q.dataset.chip === kw) ? '' : kw;
        applyFilter();
      });
      $chips.appendChild(b);
    });
  }

  /* ---------- command palette ---------- */
  let palResults = [];
  let palIndex = 0;
  let lastJump = null;

  function scoreEntry(e, terms) {
    const q = terms.join(' ');
    let total = 0;
    for (let i = 0; i < terms.length; i++) {
      const t = terms[i];
      let s = 0;
      if (matches(t, e.titleLower)) {
        s = e.titleLower.indexOf(t) === 0 ? 500 : 300;
      } else if (matches(t, e.headingsLower)) s = 200;
      else if (matches(t, e.keysLower)) s = 150;
      else if (matches(t, e.bodyLower)) s = 100;
      if (!s) return 0; /* every term must match somewhere */
      total += s;
    }
    if (e.titleLower === q) total += 1000;
    return total;
  }

  function snippetFor(e, terms) {
    const all = expandedTerms(terms);
    let best = -1;
    for (let i = 0; i < all.length; i++) {
      const p = e.bodyLower.indexOf(all[i]);
      if (p !== -1 && (best === -1 || p < best)) best = p;
    }
    if (best === -1) return e.bodyText.slice(0, 110) + (e.bodyText.length > 110 ? '…' : '');
    const start = Math.max(0, best - 45);
    let s = e.bodyText.slice(start, best + 80);
    if (start > 0) s = '…' + s.replace(/^\S*\s/, '');
    if (best + 80 < e.bodyText.length) s = s.replace(/\s\S*$/, '') + '…';
    return s;
  }

  function closePal() {
    $pal.hidden = true;
    $pal.innerHTML = '';
    palResults = [];
    palIndex = 0;
  }

  function clearJumpHighlight() {
    if (lastJump) { lastJump.bodyEl.innerHTML = lastJump.originalBody; lastJump = null; }
  }

  function openResult(i) {
    const r = palResults[i];
    if (!r) return;
    const terms = $q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    closePal();
    $q.value = '';
    $q.blur();
    clearJumpHighlight();
    r.entry.card.hidden = false;
    /* instant, per spec — smooth scrollIntoView is also unreliable in Chrome here */
    r.entry.card.scrollIntoView({ block: 'start', behavior: 'instant' });
    if (terms.length) {
      highlight(r.entry.bodyEl, expandedTerms(terms));
      lastJump = r.entry;
    }
    activeId = r.entry.meta.id; /* anchor j/k immediately, before the spy ticks */
  }

  function renderPal() {
    const q = $q.value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    if (!terms.length) { closePal(); return; }

    palResults = entries
      .map(function (e) { return { entry: e, score: scoreEntry(e, terms) }; })
      .filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 8);
    palIndex = 0;

    $pal.innerHTML = '';
    if (!palResults.length) {
      const none = document.createElement('div');
      none.className = 'pal-none';
      none.textContent = 'No matches — try a broader term or an abbreviation (e.g. “esbl”, “afib”).';
      $pal.appendChild(none);
    } else {
      const marks = expandedTerms(terms);
      palResults.forEach(function (r, i) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pal-item' + (i === 0 ? ' on' : '');
        btn.setAttribute('role', 'option');

        const row = document.createElement('div');
        row.className = 'pal-t';
        const title = document.createElement('span');
        title.className = 'pal-title';
        title.textContent = r.entry.meta.title;
        highlight(title, marks);
        const sec = document.createElement('span');
        sec.className = 'pal-sec';
        sec.textContent = r.entry.meta.section;
        row.appendChild(title);
        row.appendChild(sec);
        btn.appendChild(row);

        const snip = document.createElement('div');
        snip.className = 'pal-snip';
        snip.textContent = snippetFor(r.entry, terms);
        highlight(snip, marks);
        btn.appendChild(snip);

        btn.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        btn.addEventListener('click', function () { openResult(i); });
        btn.addEventListener('mousemove', function () { if (palIndex !== i) setPalIndex(i, true); });
        $pal.appendChild(btn);
      });
      const hint = document.createElement('div');
      hint.className = 'pal-hint';
      hint.innerHTML = '<span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span>';
      $pal.appendChild(hint);
    }
    $pal.hidden = false;
  }

  function setPalIndex(i, noScroll) {
    palIndex = i;
    const items = $pal.querySelectorAll('.pal-item');
    items.forEach(function (el, j) { el.classList.toggle('on', j === i); });
    if (!noScroll && items[i]) items[i].scrollIntoView({ block: 'nearest' });
  }

  let debounceTimer = null;
  $q.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(renderPal, 60);
  });
  $q.addEventListener('focus', function () { if ($q.value.trim()) renderPal(); });
  $q.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowDown' && !$pal.hidden) { ev.preventDefault(); setPalIndex(Math.min(palResults.length - 1, palIndex + 1)); }
    else if (ev.key === 'ArrowUp' && !$pal.hidden) { ev.preventDefault(); setPalIndex(Math.max(0, palIndex - 1)); }
    else if (ev.key === 'Enter') {
      ev.preventDefault();
      if ($pal.hidden && $q.value.trim()) renderPal();
      openResult(palIndex);
    } else if (ev.key === 'Escape') {
      ev.stopPropagation();
      if (!$pal.hidden) closePal();
      else { $q.value = ''; $q.blur(); clearJumpHighlight(); }
    }
  });
  document.addEventListener('click', function (ev) {
    if (!$pal.hidden && !$pal.contains(ev.target) && ev.target !== $q) closePal();
  });

  /* ---------- sidebar ---------- */
  function listHtml(ids) {
    const byId = {};
    entries.forEach(function (e) { byId[e.meta.id] = e.meta; });
    return ids.map(function (id) {
      return byId[id] ? '<li><a href="#' + id + '">' + esc(byId[id].title) + '</a></li>' : '';
    }).join('');
  }

  function tocHtml() {
    let h = '';
    if (recentAdded.length) {
      h += '<p class="toc-title">Recently added</p><ul class="toc-recent">' + listHtml(recentAdded) + '</ul>';
    }
    h += '<p class="toc-title">Contents</p>';
    ordered.forEach(function (s) {
      if (!s.metas.length) return;
      const isClosed = collapsed.indexOf(s.name) !== -1;
      h += '<div class="toc-sec' + (isClosed ? ' closed' : '') + '" data-sec="' + esc(s.name) + '">' +
           '<button class="toc-sec-link" type="button" data-toggle="' + esc(s.name) + '" aria-expanded="' + (!isClosed) + '">' +
             '<span class="caret" aria-hidden="true">▾</span>' + esc(s.name) +
             '<span class="toc-n">' + s.metas.length + '</span>' +
           '</button><ul>';
      s.metas.forEach(function (m) {
        h += '<li data-id="' + m.id + '"><a href="#' + m.id + '">' + esc(m.title) + '</a></li>';
      });
      h += '</ul></div>';
    });
    return h;
  }

  function wireToc(root) {
    root.querySelectorAll('[data-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const name = btn.dataset.toggle;
        const box = btn.closest('.toc-sec');
        const nowClosed = !box.classList.contains('closed');
        box.classList.toggle('closed', nowClosed);
        btn.setAttribute('aria-expanded', String(!nowClosed));
        const i = collapsed.indexOf(name);
        if (nowClosed && i === -1) collapsed.push(name);
        if (!nowClosed && i !== -1) collapsed.splice(i, 1);
        save('collapsed', collapsed);
      });
    });
  }

  function renderToc() {
    const html = tocHtml();
    if ($toc) { $toc.innerHTML = html; wireToc($toc); }
    if ($tocmList) { $tocmList.innerHTML = html; wireToc($tocmList); }
    updateSpy();
  }

  /* ---------- scroll-spy ---------- */
  let spyTicking = false;
  let activeId = null;

  function updateSpy() {
    spyTicking = false;
    let cur = null;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.card.hidden) continue;
      if (e.card.getBoundingClientRect().top <= 140) cur = e;
    }

    document.querySelectorAll('#toc a.active').forEach(function (a) { a.classList.remove('active'); });
    document.querySelectorAll('#toc .subs').forEach(function (s) { s.remove(); });
    if (!cur) { activeId = null; return; }

    const li = $toc && $toc.querySelector('li[data-id="' + cur.meta.id + '"]');
    if (li) {
      const link = li.querySelector('a');
      if (link) link.classList.add('active');
      const secs = cur.bodyEl.querySelectorAll('.sec');
      if (secs.length > 1) {
        const ul = document.createElement('ul');
        ul.className = 'subs';
        let lastPassed = -1;
        secs.forEach(function (s, i) {
          if (!s.id) s.id = cur.meta.id + '-s' + i;
          if (s.getBoundingClientRect().top <= 160) lastPassed = i;
          const item = document.createElement('li');
          const a = document.createElement('a');
          a.href = '#' + s.id;
          a.textContent = s.textContent;
          item.appendChild(a);
          ul.appendChild(item);
        });
        const links = ul.querySelectorAll('a');
        if (lastPassed >= 0 && links[lastPassed]) links[lastPassed].classList.add('active');
        li.appendChild(ul);
      }
    }

    activeId = cur.meta.id;
  }

  function onScroll() {
    if (!spyTicking) { spyTicking = true; requestAnimationFrame(updateSpy); }
  }

  /* ---------- keyboard ---------- */
  function visibleCards() {
    return entries.filter(function (e) { return !e.card.hidden; });
  }
  function jump(delta) {
    const vis = visibleCards();
    if (!vis.length) return;
    let idx = vis.findIndex(function (e) { return e.meta.id === activeId; });
    if (idx === -1) idx = 0;
    else idx = Math.min(vis.length - 1, Math.max(0, idx + delta));
    vis[idx].card.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  let gPending = false;
  document.addEventListener('keydown', function (ev) {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (ev.key === 'Escape') {
      if ($keys && $keys.open) $keys.close();
      if ($tocm && $tocm.open) $tocm.open = false;
      return;
    }
    if (typing || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === '/') { ev.preventDefault(); $q.focus(); return; }
    if (ev.key === '?') { ev.preventDefault(); if ($keys) ($keys.open ? $keys.close() : $keys.showModal()); return; }
    if (ev.key === 'j') { ev.preventDefault(); jump(1); return; }
    if (ev.key === 'k') { ev.preventDefault(); jump(-1); return; }
    if (ev.key === 'g') { gPending = true; setTimeout(function () { gPending = false; }, 700); return; }
    if (ev.key === 'h' && gPending) { gPending = false; window.scrollTo({ top: 0 }); }
  });

  /* ---------- init ---------- */
  function init(manifest, fragMap) {
    const metas = manifest.entries;
    const names = (manifest.sections || []).slice();
    metas.forEach(function (m) {
      if (names.indexOf(m.section) === -1) names.push(m.section || 'Unsorted');
    });
    ordered = names.map(function (name) {
      return { name: name, metas: metas.filter(function (m) { return (m.section || 'Unsorted') === name; }) };
    });

    recentAdded = metas.slice()
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; })
      .slice(0, 3)
      .map(function (m) { return m.id; });

    $list.innerHTML = '';
    ordered.forEach(function (s) {
      if (!s.metas.length) return;
      const head = document.createElement('h2');
      head.className = 'sechead';
      head.id = 'sec-' + slugify(s.name);
      head.dataset.sec = slugify(s.name);
      head.append(s.name);
      $list.appendChild(head);
      const rec = { name: s.name, el: head, entries: [] };
      sectionHeads.push(rec);

      s.metas.forEach(function (meta) {
        const built = buildCard(meta, fragMap[meta.id]);
        $list.appendChild(built.card);
        const alts = Array.prototype.map.call(built.bodyEl.querySelectorAll('img[alt]'), function (im) { return im.alt; }).join(' ');
        /* text for search/snippets: clone minus <style>, so scoped CSS never leaks in */
        const clone = built.bodyEl.cloneNode(true);
        clone.querySelectorAll('style').forEach(function (st) { st.remove(); });
        const bodyText = ((clone.textContent || '') + ' ' + alts).replace(/\s+/g, ' ').trim();
        const headings = Array.prototype.map.call(built.bodyEl.querySelectorAll('.sec,.caps'), function (x) { return x.textContent; }).join(' ');
        const e = {
          meta: meta,
          card: built.card,
          bodyEl: built.bodyEl,
          titleEl: built.titleEl,
          originalBody: built.bodyEl.innerHTML,
          titleLower: meta.title.toLowerCase(),
          headingsLower: headings.toLowerCase(),
          keysLower: (meta.keywords + ' ' + (meta.aliases || '') + ' ' + meta.section).toLowerCase(),
          bodyText: bodyText,
          bodyLower: bodyText.toLowerCase(),
          haystack: (meta.title + ' ' + meta.section + ' ' + meta.keywords + ' ' + (meta.aliases || '') + ' ' + bodyText).toLowerCase()
        };
        entries.push(e);
        rec.entries.push(e);
      });
    });

    buildChips(metas);
    renderToc();
    applyFilter();

    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }
    updateSpy();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  if ($tocm && $tocmList) {
    $tocmList.addEventListener('click', function (ev) {
      if (ev.target.closest('a[href^="#"]')) $tocm.open = false;
    });
    document.addEventListener('click', function (ev) {
      if ($tocm.open && !$tocm.contains(ev.target)) $tocm.open = false;
    });
  }
  if ($keys) {
    $keys.addEventListener('click', function (ev) { if (ev.target === $keys) $keys.close(); });
  }
  const $clear = document.getElementById('clearfilter');
  if ($clear) $clear.addEventListener('click', function () { $q.dataset.chip = ''; applyFilter(); });

  fetch('manifest.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (manifest) {
      return Promise.all(
        manifest.entries.map(function (m) {
          return fetch('entries/' + m.id + '.html')
            .then(function (r) { if (!r.ok) throw new Error(m.id); return r.text(); })
            .catch(function () { return '<p class="ptext mut">This note failed to load.</p>'; })
            .then(function (html) { return [m.id, html]; });
        })
      ).then(function (pairs) {
        const fragMap = {};
        pairs.forEach(function (p) { fragMap[p[0]] = p[1]; });
        init(manifest, fragMap);
      });
    })
    .catch(function () {
      $list.innerHTML = '<p class="empty">Could not load manifest.json — are you offline?</p>';
    });
})();
