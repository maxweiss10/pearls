/* Pearl — section-grouped notes with ONE all-encompassing search bar (White Book
   sections + pages, pearls, resources) where the old pearls-only palette lived,
   plus a collapsible sidebar (counts, recently added), scroll-spy and keyboard
   navigation. Cmd-F covers literal in-page pearl lookups. */
(function () {
  'use strict';

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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
  const $count = document.getElementById('count');
  const $toc = document.getElementById('toc');
  const $tocm = document.getElementById('tocm');
  const $tocmList = document.getElementById('tocm-list');
  const $keys = document.getElementById('keys');

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

  /* ---------- synonym expansion (feeds snippets + highlight marks) ---------- */
  function expandedTerms(terms) {
    const out = terms.slice();
    terms.forEach(function (t) {
      if (SYNONYMS[t]) out.push.apply(out, SYNONYMS[t].split(/\s+/).filter(function (w) { return w.length > 3; }));
    });
    return out.filter(function (t, i, a) { return a.indexOf(t) === i; });
  }

  /* ---------- jump highlight + snippets (shared with the search results) ---------- */
  let lastJump = null;

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

  function clearJumpHighlight() {
    if (lastJump) { lastJump.bodyEl.innerHTML = lastJump.originalBody; lastJump = null; }
  }

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
      else if ($tocm && $tocm.open) $tocm.open = false;
      else if (document.body.classList.contains('searching')) { $wbq.value = ''; wbSearch(); }
      return;
    }
    if (typing || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === '/') {
      ev.preventDefault();
      if (activeTab !== 'notes') switchTab('notes');
      $wbq.focus();
      return;
    }
    if (ev.key === '?') { ev.preventDefault(); if ($keys) ($keys.open ? $keys.close() : $keys.showModal()); return; }
    if (document.body.classList.contains('searching')) return; /* j/k etc. act on the hidden notes list */
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
        const e = {
          meta: meta,
          card: built.card,
          bodyEl: built.bodyEl,
          titleEl: built.titleEl,
          originalBody: built.bodyEl.innerHTML,
          titleLower: meta.title.toLowerCase(),
          keysLower: (meta.keywords + ' ' + (meta.aliases || '') + ' ' + meta.section).toLowerCase(),
          bodyText: bodyText,
          bodyLower: bodyText.toLowerCase()
        };
        entries.push(e);
        rec.entries.push(e);
      });
    });

    renderToc();
    $count.textContent = entries.length + ' notes';

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
  /* ---------- unified search (White Book sections + pages, pearls, resources) ---------- */
  const WB_VIEWER = 'https://maxweiss10.github.io/whitebook/pdfjs/web/viewer.html?file=../../whitebook.pdf';
  const $tabNotes = document.getElementById('tab-notes');
  const $notesview = document.getElementById('notesview');
  const $notesbar = document.getElementById('notesbar');
  const $wbview = document.getElementById('wbview');
  const $wbq = document.getElementById('wbq');
  const $wbresults = document.getElementById('wbresults');

  /* words that carry no lookup signal in a clinical query */
  const WB_STOP = new Set(['a','an','the','of','for','to','in','on','at','and','or','vs','with','without',
    'how','what','when','where','why','do','does','should','can','i','my','me','is','are','it','about',
    'management','manage','managing','mgmt','treatment','treat','treating','therapy','therapies',
    'tips','tip','guide','guidelines','approach','review','overview','basics','workup','evaluation',
    'eval','ddx','differential','algorithm','protocol','pearls','note','notes','patient','patients','pt','pts']);

  /* plain language / lay phrasing → White Book vocabulary. Alternates >3 chars match as
     substrings (so stems like "hypertens" cover hypertension + hypertensive). */
  const WB_ALIAS = {
    'blood pressure': ['hypertens', 'htn', 'bp'],
    'high blood pressure': ['hypertens', 'htn'],
    'low blood pressure': ['hypotens', 'shock', 'pressor'],
    'blood sugar': ['glucose', 'hyperglycemia', 'diabetes', 'insulin'],
    'sugar': ['glucose', 'diabetes'],
    'low sodium': ['hyponatremia', 'sodium'], 'high sodium': ['hypernatremia', 'sodium'],
    'low potassium': ['hypokalemia', 'potassium'], 'high potassium': ['hyperkalemia', 'potassium'],
    'low calcium': ['hypocalcemia', 'calcium'], 'high calcium': ['hypercalcemia', 'calcium'],
    'low magnesium': ['hypomagnesemia', 'magnesium'], 'low phosphate': ['hypophosphatemia', 'phosphate'],
    'sodium': ['sodium', 'natremia'], 'potassium': ['potassium', 'kalemia'],
    'calcium': ['calcium', 'calcemia'], 'magnesium': ['magnesium', 'magnesemia'],
    'heart attack': ['myocardial infarction', 'acute coronary', 'stemi', 'nstemi'],
    'heart failure': ['heart failure', 'hfref', 'hfpef', 'cardiomyopathy', 'diuresis'],
    'chest pain': ['chest pain', 'angina', 'acute coronary'],
    'heart rhythm': ['arrhythmia', 'tachycardia', 'bradycardia', 'fibrillation'],
    'fast heart': ['tachycardia'], 'slow heart': ['bradycardia'],
    'blood clot': ['thrombosis', 'embolism', 'dvt', 'anticoagula'],
    'blood thinner': ['anticoagula', 'warfarin', 'heparin', 'doac', 'apixaban'],
    'kidney injury': ['acute kidney injury', 'aki', 'renal'],
    'kidney failure': ['renal failure', 'aki', 'ckd', 'dialysis'],
    'kidney': ['kidney', 'renal', 'nephro'],
    'liver failure': ['hepatic failure', 'cirrhosis', 'liver'],
    'liver': ['liver', 'hepat', 'cirrhosis'],
    'belly pain': ['abdominal pain'], 'stomach pain': ['abdominal pain', 'epigastric'],
    'tap belly': ['paracentesis'], 'belly tap': ['paracentesis'], 'fluid belly': ['ascites', 'paracentesis'],
    'tap': ['paracentesis', 'thoracentesis', 'lumbar puncture'], 'belly': ['abdom', 'ascites'],
    'afib': ['af', 'atrial fibrillation'], 'aflutter': ['afl', 'atrial flutter'], 'flutter': ['afl', 'atrial flutter'],
    'lung tap': ['thoracentesis'], 'fluid around lung': ['pleural effusion', 'thoracentesis'],
    'spinal tap': ['lumbar puncture'],
    'breathing': ['dyspnea', 'respiratory', 'hypoxem'], 'short of breath': ['dyspnea', 'respiratory distress'],
    'shortness of breath': ['dyspnea', 'respiratory distress'],
    'oxygen': ['oxygen', 'hypoxem', 'ventilation'],
    'blood infection': ['bacteremia', 'sepsis'], 'infection': ['infection', 'antibiotic', 'sepsis'],
    'antibiotics': ['antibiotic', 'antimicrobial', 'vancomycin', 'cefepime'],
    'lung infection': ['pneumonia'],
    'urine infection': ['urinary tract infection', 'pyelonephritis', 'cystitis'],
    'skin infection': ['cellulitis', 'abscess'],
    'confusion': ['delirium', 'altered mental status', 'encephalopathy'],
    'confused': ['delirium', 'altered mental status', 'encephalopathy'],
    'passing out': ['syncope'], 'fainting': ['syncope'], 'dizzy': ['dizziness', 'vertigo', 'presyncope'],
    'seizure': ['seizure', 'epilep', 'status epilepticus'],
    'stroke': ['stroke', 'ischemic', 'tpa', 'thrombectomy', 'cerebrovascular'],
    'bleeding': ['bleed', 'hemorrhage', 'transfus'],
    'gi bleed': ['gastrointestinal bleed', 'gib', 'hematochezia', 'melena'],
    'blood transfusion': ['transfus', 'prbc'],
    'low blood count': ['anemia'], 'low platelets': ['thrombocytopenia'],
    'alcohol': ['alcohol', 'ethanol', 'withdrawal', 'ciwa'],
    'drug overdose': ['overdose', 'toxicity', 'ingestion'],
    'pain control': ['analgesia', 'opioid', 'pain'], 'pain meds': ['analgesia', 'opioid'],
    'nausea': ['nausea', 'antiemetic', 'vomiting'],
    'constipation': ['constipation', 'bowel regimen'],
    'sleep': ['insomnia', 'sleep'],
    'anxiety': ['anxiety', 'benzodiazepine'],
    'blood gas': ['abg', 'vbg', 'acid-base', 'acidosis', 'alkalosis'],
    'acid base': ['acid-base', 'acidosis', 'alkalosis', 'anion gap'],
    'iv fluids': ['fluids', 'crystalloid', 'resuscitation', 'maintenance'],
    'fluids': ['fluids', 'crystalloid', 'volume'],
    'nutrition': ['nutrition', 'tube feed', 'tpn'],
    'steroids': ['steroid', 'prednisone', 'corticosteroid'],
    'diabetes': ['diabetes', 'insulin', 'hyperglycemia', 'dka'],
    'thyroid': ['thyroid', 'hypothyroid', 'hyperthyroid', 'levothyroxine'],
    'code': ['cardiac arrest', 'acls', 'resuscitation'],
    'dying': ['palliative', 'comfort', 'hospice', 'goals of care'],
    'end of life': ['palliative', 'comfort', 'hospice', 'goals of care'],
    'goals of care': ['goals of care', 'palliative', 'code status'],
    'pressors': ['pressor', 'norepinephrine', 'vasopress'],
    'sedation': ['sedation', 'propofol', 'dexmedetomidine', 'rass'],
    'ventilator': ['ventilat', 'intubat', 'ardsnet'],
    'intubation': ['intubat', 'airway', 'rapid sequence'],
    'fever': ['fever', 'febrile', 'pyrexia'],
    'rash': ['rash', 'dermat', 'drug eruption'],
    'gout': ['gout', 'colchicine', 'uric'],
    'clot in lung': ['pulmonary embolism'],
    'swollen leg': ['deep vein thrombosis', 'edema', 'cellulitis'],
    'transplant': ['transplant', 'immunosuppress'],
    'cancer': ['malignancy', 'oncolog', 'chemotherapy', 'tumor'],
    'chemo': ['chemotherapy', 'neutropeni'],
    'discharge': ['discharge', 'disposition'],
    'consult': ['consult'],
    'ekg': ['ekg', 'ecg', 'electrocardiogram'],
    'heparin drip': ['heparin'], 'insulin drip': ['insulin infusion', 'dka'],
    /* eponyms & scores (keys are normalized: no apostrophes, dashes → spaces) */
    'lights criteria': ['exudate', 'transudate', 'pleural'],
    'light criteria': ['lights criteria', 'exudate', 'transudate', 'pleural'],
    'wells': ['pulmonary embolism', 'deep vein'],
    'curb 65': ['pneumonia'], 'psi': ['pneumonia severity'],
    'meld': ['cirrhosis', 'liver'], 'child pugh': ['cirrhosis'],
    'ranson': ['pancreatitis'], 'centor': ['pharyngitis'],
    'chads': ['atrial fibrillation', 'stroke'], 'cha2ds2': ['atrial fibrillation', 'stroke'],
    'has bled': ['bleed', 'anticoagula'],
    'fena': ['fractional excretion', 'prerenal'], 'feurea': ['fractional excretion', 'urea'],
    'qsofa': ['sepsis'], 'sofa': ['sepsis'],
    'timi': ['acute coronary'], 'grace': ['acute coronary'],
    'nihss': ['stroke'], 'ciwa': ['alcohol withdrawal'], 'cows': ['opioid withdrawal'],
    'blatchford': ['gastrointestinal bleed'], 'rockall': ['gastrointestinal bleed'],
    'maddrey': ['alcoholic hepatitis'], 'lille': ['alcoholic hepatitis'],
    '4ts': ['heparin induced thrombocytopenia'], 'plasmic': ['ttp', 'thrombotic'],
    'berlin': ['acute respiratory distress'], 'kdigo': ['acute kidney injury'],
    'duke': ['endocarditis'], 'jones criteria': ['rheumatic fever'],
    'winters': ['metabolic acidosis', 'compensation'], 'padua': ['venous thromboembolism']
  };
  /* fold the palette's abbreviation map in as alternates too */
  Object.keys(SYNONYMS).forEach(function (k) {
    const alts = (WB_ALIAS[k] || []).slice();
    alts.push(SYNONYMS[k]);
    SYNONYMS[k].split(/\s+/).forEach(function (w) { if (w.length > 3 && alts.indexOf(w) === -1) alts.push(w); });
    WB_ALIAS[k] = alts;
  });

  let wbIndex = null, wbLow = null, wbTopicLow = null, wbTopics = null, wbLoadState = 0; /* 0 idle 1 loading 2 ready 3 failed */

  /* one normalization for query AND haystacks: curly/straight apostrophes stripped
     ("Light’s" → "lights"), dashes and slashes to spaces ("CURB-65" → "curb 65") */
  function wbNormalize(s) {
    return s.toLowerCase().replace(/['’]/g, '').replace(/[\/\-–—]+/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function wbEnsureIndex() {
    if (wbLoadState === 1 || wbLoadState === 2) return;
    wbLoadState = 1;
    wbStatus('Loading the White Book index — one-time, ~1.5 MB…');
    fetch('whitebook-index.json')
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (ix) {
        wbIndex = ix;
        wbLow = ix.text.map(wbNormalize);
        wbTopicLow = ix.outline.map(function (o) { return wbNormalize(o.t + ' ' + (o.in || '')); });
        wbTopics = ix.outline.filter(function (o) { return !o.in; });
        wbTopics.forEach(function (t) { t.nt = wbNormalize(t.t); });
        wbLoadState = 2;
        wbSearch();
      })
      .catch(function () {
        wbLoadState = 3;
        wbStatus('Couldn’t load the White Book index — check your connection and reload.');
      });
  }
  function wbStatus(msg) {
    $wbresults.innerHTML = '<p class="wb-status">' + esc(msg) + '</p>';
  }

  function wbHitTerm(alt, hay) {
    if (alt.length > 4) return hay.indexOf(alt) !== -1;      /* long terms are stems: substring */
    const safe = alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (alt.length === 4) return new RegExp('(^|[^a-z0-9])' + safe).test(hay); /* word-start: "rate" ≠ "incarcerated", "ards" → "ardsnet" */
    return new RegExp('(^|[^a-z0-9])' + safe + '([^a-z0-9]|$)').test(hay);     /* whole word: "af" ≠ "after" */
  }
  function wbMatchConcept(alts, hay) { /* → matched alternate or null */
    for (let i = 0; i < alts.length; i++) if (wbHitTerm(alts[i], hay)) return alts[i];
    return null;
  }
  function wbAltRegex(a, flags) {
    const safe = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^a-z0-9])' + safe + (a.length <= 3 ? '(?=[^a-z0-9]|$)' : ''), flags || '');
  }
  function wbCountAlt(a, hay, cap) { /* real occurrence counts — "HTN" twenty times must beat "HTN" once */
    cap = cap || 10;
    let c = 0;
    if (a.length > 4) { let p = 0; while (c < cap && (p = hay.indexOf(a, p)) !== -1) { c++; p += a.length; } return c; }
    const re = wbAltRegex(a, 'g');
    while (c < cap && re.exec(hay)) c++;
    return c;
  }
  function wbFirstPos(alts, hay) { /* earliest occurrence of any alternate, -1 if none */
    let best = -1;
    for (let i = 0; i < alts.length; i++) {
      const a = alts[i];
      let p;
      if (a.length > 4) p = hay.indexOf(a);
      else { const m = wbAltRegex(a).exec(hay); p = m ? m.index + m[1].length : -1; }
      if (p !== -1 && (best === -1 || p < best)) best = p;
    }
    return best;
  }
  /* qualified forms are different diseases — "portal hypertension" is not blood pressure */
  const WB_QUALIFIED = {
    hypertens: ['portal hypertens', 'pulmonary hypertens', 'portopulmonary hypertens', 'intracranial hypertens', 'intra abdominal hypertens'],
    htn: ['portal htn', 'pulmonary htn', 'portopulmonary htn', 'intracranial htn']
  };
  function wbCountAltNet(a, hay, cap) {
    let c = wbCountAlt(a, hay, cap);
    const quals = WB_QUALIFIED[a];
    if (c && quals) {
      for (let i = 0; i < quals.length; i++) c -= wbCountAlt(quals[i], hay, cap);
      if (c < 0) c = 0;
    }
    return c;
  }
  function wbMatchConceptNet(alts, hay) { /* → matched alternate with net count > 0, or null */
    for (let i = 0; i < alts.length; i++) if (wbCountAltNet(alts[i], hay, 1)) return alts[i];
    return null;
  }
  function wbConceptScore(alts, hay) { /* the user's own words (alts[0]) outrank alias expansions */
    const exact = wbCountAltNet(alts[0], hay, 10);
    let alias = 0;
    for (let i = 1; i < alts.length; i++) alias += wbCountAltNet(alts[i], hay, 10);
    return exact * 30 + alias * 8;
  }

  function wbConcepts(q) {
    /* stopwords + 1-char noise drop first, so "tap a belly" pairs as "tap belly"
       and "light's" never sheds a stray "s" concept */
    const toks = wbNormalize(q).split(' ')
      .filter(function (t) { return t.length > 1 && !WB_STOP.has(t); });
    const out = [];
    for (let i = 0; i < toks.length; i++) {
      const two = i + 1 < toks.length ? toks[i] + ' ' + toks[i + 1] : null;
      if (two && WB_ALIAS[two]) { out.push([two].concat(WB_ALIAS[two])); i++; continue; }
      const t = toks[i];
      out.push(WB_ALIAS[t] ? [t].concat(WB_ALIAS[t]) : [t]);
    }
    return out;
  }

  function wbTopicFor(page) { /* enclosing top-level topic for a page number */
    let best = null;
    for (let i = 0; i < wbTopics.length; i++) {
      if (wbTopics[i].p <= page) best = wbTopics[i]; else break;
    }
    return best;
  }

  function wbSnippet(pageIdx, alts) {
    const low = wbLow[pageIdx], txt = wbIndex.text[pageIdx];
    let best = -1;
    for (let i = 0; i < alts.length; i++) {
      const p = low.indexOf(alts[i]);
      if (p !== -1 && (best === -1 || p < best)) best = p;
    }
    if (best === -1) return txt.slice(0, 130) + '…';
    const start = Math.max(0, best - 55);
    let s = txt.slice(start, best + 110);
    if (start > 0) s = '…' + s.replace(/^\S*\s/, '');
    if (best + 110 < txt.length) s = s.replace(/\s\S*$/, '') + '…';
    return s;
  }

  function wbLink(page, term) {
    /* single word, possessive-s trimmed, so pdf.js find still hits "Light's" for "lights" */
    if (term) term = term.split(' ')[0];
    if (term && term.length > 4) term = term.replace(/s$/, '');
    return WB_VIEWER + '#page=' + page + (term ? '&search=' + encodeURIComponent(term) : '');
  }

  function wbGroup(title) {
    const p = document.createElement('p');
    p.className = 'toc-title';
    p.textContent = title;
    return p;
  }

  let resKicked = false;
  function wbSearch() {
    const q = $wbq.value.trim();
    syncSearch();
    if (!q) { $wbresults.innerHTML = ''; return; }
    if (!resKicked) { /* resources join the index lazily, on the first real query */
      resKicked = true;
      ensureResources().then(function () { if ($wbq.value.trim()) wbSearch(); }).catch(function () {});
    }
    if (wbLoadState !== 2) { wbEnsureIndex(); return; }

    let concepts = wbConcepts(q);
    if (!concepts.length) { wbStatus('Add a medical term — e.g. “blood pressure”, “hyponatremia”, “paracentesis”.'); return; }

    /* a concept that matches nowhere in the book would zero every page (a typo, a
       stray word) — drop it instead of returning nothing, as long as one survives */
    if (concepts.length > 1) {
      const alive = concepts.filter(function (alts) {
        for (let p = 0; p < wbLow.length; p++) if (wbMatchConcept(alts, wbLow[p])) return true;
        return false;
      });
      if (alive.length) concepts = alive;
    }

    /* phrases to reward when words sit together: the whole query, then each adjacent pair */
    const surface = concepts.map(function (a) { return a[0]; });
    const phrases = [];
    if (surface.length > 1) {
      phrases.push({ s: surface.join(' '), w: 220 });
      for (let i = 0; i + 1 < surface.length; i++) phrases.push({ s: surface[i] + ' ' + surface[i + 1], w: 90 });
    }

    const flat = [];
    concepts.forEach(function (a) { a.forEach(function (t) { if (t.length > 3 && flat.indexOf(t) === -1) flat.push(t); }); });
    /* display-highlight variants so “Light’s” still gets marked for query “lights” */
    const marks = flat.slice();
    flat.forEach(function (t) {
      if (/s( |$)/.test(t + ' ')) {
        marks.push(t.replace(/s(?= )|s$/, "'s"));
        marks.push(t.replace(/s(?= )|s$/, '’s'));
      }
    });

    /* topics: ≥1 concept in the section title; the rest may match the section's first page */
    const topicHits = [];
    wbIndex.outline.forEach(function (o, i) {
      const hay = wbTopicLow[i];
      const pageHay = wbLow[o.p - 1] || '';
      let score = 0, inTitle = 0;
      for (let c = 0; c < concepts.length; c++) {
        if (wbMatchConceptNet(concepts[c], hay)) { score += 150; inTitle++; }
        else if (wbMatchConceptNet(concepts[c], pageHay)) score += 40;
        else { score = 0; break; }
      }
      if (score && inTitle) {
        phrases.forEach(function (ph) { if (hay.indexOf(ph.s) !== -1) score += ph.w; });
        topicHits.push({ o: o, score: score + (o.in ? 0 : 40) });
      }
    });
    topicHits.sort(function (a, b) { return b.score - a.score || a.o.p - b.o.p; });
    const topTopics = topicHits.slice(0, 6);
    const topicPages = {};
    topTopics.forEach(function (h) { topicPages[h.o.p] = true; });

    /* pages: every concept must appear on the page; rank by capped term frequency */
    const pageHits = [];
    for (let p = 0; p < wbLow.length; p++) {
      const hay = wbLow[p];
      let score = 0, primary = null;
      for (let c = 0; c < concepts.length; c++) {
        const n = wbConceptScore(concepts[c], hay);
        if (!n) { score = 0; break; }
        score += n;
        if (!primary) primary = wbMatchConceptNet(concepts[c], hay);
      }
      if (score) {
        /* words sitting together beat words scattered across the page */
        phrases.forEach(function (ph) {
          let k = 0, at = 0;
          while (k < 3 && (at = hay.indexOf(ph.s, at)) !== -1) { k++; at += ph.s.length; }
          if (k) { score += ph.w * k; if (ph.s === surface.join(' ')) primary = ph.s; }
        });
        /* aboutness: a page inside a matching section, or opening on the term, is ABOUT it */
        const enc = wbTopicFor(p + 1);
        if (enc && enc.nt) {
          for (let c = 0; c < concepts.length; c++) {
            if (wbMatchConceptNet(concepts[c], enc.nt)) { score += 100; break; }
          }
        }
        let minP = Infinity, maxP = -1;
        for (let c = 0; c < concepts.length; c++) {
          const fp = wbFirstPos(concepts[c], hay);
          if (fp !== -1) { if (fp < minP) minP = fp; if (fp > maxP) maxP = fp; }
        }
        if (minP < 300) score += 60;                                 /* header zone */
        if (concepts.length > 1 && maxP - minP < 150) score += 80;   /* concepts near each other */
      }
      /* skip title/preface/contents pages (before the first section) and pages already shown as sections */
      if (score && !topicPages[p + 1] && wbTopics.length && p + 1 >= wbTopics[0].p) {
        pageHits.push({ p: p + 1, score: score, primary: primary });
      }
    }
    pageHits.sort(function (a, b) { return b.score - a.score || a.p - b.p; });
    const topPages = pageHits.slice(0, 8);

    /* pearls: every concept somewhere in the note (haystacks normalized like the book) */
    const pearlHits = [];
    entries.forEach(function (e) {
      if (!e.wbT) { e.wbT = wbNormalize(e.titleLower); e.wbK = wbNormalize(e.keysLower); e.wbB = wbNormalize(e.bodyLower); }
      let s = 0;
      for (let c = 0; c < concepts.length; c++) {
        const alts = concepts[c];
        if (wbMatchConceptNet(alts, e.wbT)) s += 300;
        else if (wbMatchConceptNet(alts, e.wbK)) s += 150;
        else if (wbMatchConceptNet(alts, e.wbB)) s += 80;
        else { s = 0; break; }
      }
      if (s) {
        phrases.forEach(function (ph) { if (e.wbT.indexOf(ph.s) !== -1 || e.wbB.indexOf(ph.s) !== -1) s += ph.w; });
        pearlHits.push({ e: e, score: s });
      }
    });
    pearlHits.sort(function (a, b) { return b.score - a.score; });
    const topPearls = pearlHits.slice(0, 5);

    /* resources: every concept in the row's title / desc / url */
    let resHits = [];
    if (resData) {
      resData.forEach(function (d) {
        let s = 0;
        for (let c = 0; c < concepts.length; c++) {
          const alts = concepts[c];
          if (wbMatchConceptNet(alts, d.nT)) s += 300;
          else if (wbMatchConceptNet(alts, d.nD)) s += 120;
          else if (wbMatchConceptNet(alts, d.nU)) s += 60;
          else { s = 0; break; }
        }
        if (s) {
          phrases.forEach(function (ph) { if (d.nT.indexOf(ph.s) !== -1 || d.nD.indexOf(ph.s) !== -1) s += ph.w; });
          resHits.push({ d: d, score: s });
        }
      });
      resHits.sort(function (a, b) { return b.score - a.score; });
      resHits = resHits.slice(0, 4);
    }

    /* render */
    $wbresults.innerHTML = '';
    if (!topTopics.length && !topPages.length && !topPearls.length && !resHits.length) {
      wbStatus('Nothing found for “' + q + '” — try a different word for it (or ask NotebookLM in Resources).');
      return;
    }

    if (topTopics.length) {
      $wbresults.appendChild(wbGroup('White Book — sections'));
      topTopics.forEach(function (h) {
        const a = document.createElement('a');
        a.className = 'wbr';
        a.href = wbLink(h.o.p, null);
        a.target = '_blank'; a.rel = 'noopener';
        a.innerHTML =
          '<span class="wbr-t">' + esc(h.o.t) + (h.o.in ? ' <span class="wbr-in">in ' + esc(h.o.in) + '</span>' : '') + '</span>' +
          '<span class="wbr-c">' + esc(h.o.c) + ' · p. ' + h.o.p + ' ↗</span>';
        $wbresults.appendChild(a);
      });
    }

    if (resHits.length) {
      $wbresults.appendChild(wbGroup('Resources'));
      resHits.forEach(function (h) {
        const res = h.d.res;
        const a = document.createElement('a');
        a.className = 'wbr';
        a.href = res.url;
        a.target = '_blank'; a.rel = 'noopener';
        a.innerHTML = '<span class="wbr-t">' + esc(res.title) + ' ↗</span>';
        if (res.desc) {
          const snip = document.createElement('span');
          snip.className = 'wbr-snip';
          snip.textContent = res.desc;
          highlight(snip, marks);
          a.appendChild(snip);
        }
        $wbresults.appendChild(a);
      });
    }

    if (topPages.length) {
      $wbresults.appendChild(wbGroup('White Book — pages'));
      topPages.forEach(function (h) {
        const topic = wbTopicFor(h.p);
        const a = document.createElement('a');
        a.className = 'wbr';
        a.href = wbLink(h.p, h.primary);
        a.target = '_blank'; a.rel = 'noopener';
        const where = topic ? esc(topic.t) + ' · ' + esc(topic.c) + ' · p. ' + h.p : 'p. ' + h.p;
        a.innerHTML = '<span class="wbr-t">' + where + ' ↗</span>';
        const snip = document.createElement('span');
        snip.className = 'wbr-snip';
        snip.textContent = wbSnippet(h.p - 1, flat);
        highlight(snip, marks);
        a.appendChild(snip);
        $wbresults.appendChild(a);
      });
    }

    if (topPearls.length) {
      $wbresults.appendChild(wbGroup('From your pearls'));
      topPearls.forEach(function (h) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'wbr';
        b.innerHTML =
          '<span class="wbr-t">' + esc(h.e.meta.title) + '</span>' +
          '<span class="wbr-c">' + esc(h.e.meta.section) + '</span>';
        const snip = document.createElement('span');
        snip.className = 'wbr-snip';
        snip.textContent = snippetFor(h.e, marks);
        highlight(snip, marks);
        b.appendChild(snip);
        b.addEventListener('click', function () {
          $wbq.value = '';
          wbSearch(); /* clears results and brings the notes view back */
          clearJumpHighlight();
          h.e.card.hidden = false;
          h.e.card.scrollIntoView({ block: 'start', behavior: 'instant' });
          highlight(h.e.bodyEl, marks);
          lastJump = h.e;
          activeId = h.e.meta.id;
        });
        $wbresults.appendChild(b);
      });
    }
  }

  /* ---------- home-base tabs (Pearls · Resources · Schedule) ---------- */
  const SCHED_URL = 'https://maxweiss10.github.io/intern-year-schedule/';
  const $schedview = document.getElementById('schedview');
  const $schedframe = document.getElementById('schedframe');
  const $resview = document.getElementById('resview');
  const $reslist = document.getElementById('reslist');

  const TABS = {
    notes: { btn: $tabNotes, views: [$notesview, $notesbar], hash: '' },
    schedule: { btn: document.getElementById('tab-schedule'), views: [$schedview], hash: '#schedule' },
    resources: { btn: document.getElementById('tab-resources'), views: [$resview], hash: '#resources' }
  };

  let resData = null, resPromise = null, resRendered = false;
  function ensureResources() { /* shared by the Resources tab AND the search bar */
    if (!resPromise) {
      resPromise = fetch('resources.json', { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
        .then(function (list) {
          resData = list.map(function (res) {
            return { res: res, nT: wbNormalize(res.title), nD: wbNormalize(res.desc || ''), nU: wbNormalize(res.url) };
          });
          return resData;
        });
    }
    return resPromise;
  }
  function renderResourcesTab() {
    ensureResources()
      .then(function (data) {
        if (resRendered) return;
        resRendered = true;
        $reslist.innerHTML = '';
        data.forEach(function (d) {
          const res = d.res;
          const a = document.createElement('a');
          a.className = 'wbr res-row';
          a.href = res.url;
          a.target = '_blank'; a.rel = 'noopener';
          a.innerHTML =
            '<span class="res-ico" aria-hidden="true">' + esc(res.icon || '🔗') + '</span>' +
            '<span class="res-body">' +
              '<span class="wbr-t">' + esc(res.title) + ' ↗</span>' +
              '<span class="wbr-c">' + esc(res.url.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</span>' +
              (res.desc ? '<span class="wbr-snip">' + esc(res.desc) + '</span>' : '') +
            '</span>';
          $reslist.appendChild(a);
        });
      })
      .catch(function () {
        $reslist.innerHTML = '<p class="wb-status">Couldn’t load resources.json — check your connection and reload.</p>';
      });
  }

  let activeTab = 'notes';
  function switchTab(which) {
    if (!TABS[which]) which = 'notes';
    activeTab = which;
    Object.keys(TABS).forEach(function (name) {
      const t = TABS[name];
      const on = name === which;
      if (t.btn) { t.btn.classList.toggle('on', on); t.btn.setAttribute('aria-selected', String(on)); }
      t.views.forEach(function (v) { if (v) v.hidden = !on; });
    });
    const hash = TABS[which].hash;
    if (hash && location.hash !== hash) history.replaceState(null, '', hash);
    else if (!hash && /^#(wb|schedule|resources)$/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    if (which === 'schedule' && $schedframe && !$schedframe.src) $schedframe.src = SCHED_URL;
    else if (which === 'resources') renderResourcesTab();
    syncSearch();
  }

  /* a live query swaps the notes list for the results panel; clearing swaps back */
  function syncSearch() {
    const on = activeTab === 'notes' && !!$wbq.value.trim();
    document.body.classList.toggle('searching', on);
    $wbview.hidden = !on;
    if (activeTab === 'notes') $notesview.hidden = on;
  }

  Object.keys(TABS).forEach(function (name) {
    if (TABS[name].btn) TABS[name].btn.addEventListener('click', function () { switchTab(name); });
  });
  let wbDebounce = null;
  $wbq.addEventListener('input', function () {
    clearTimeout(wbDebounce);
    wbDebounce = setTimeout(wbSearch, 90);
  });
  $wbq.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { ev.preventDefault(); wbSearch(); }
    else if (ev.key === 'Escape') { ev.stopPropagation(); $wbq.value = ''; wbSearch(); $wbq.blur(); }
  });
  const tabHash = location.hash.match(/^#(schedule|resources)$/);
  if (tabHash) switchTab(tabHash[1]);
  else if (location.hash === '#wb') { /* legacy Search-tab links land on the unified bar */
    history.replaceState(null, '', location.pathname + location.search);
    $wbq.focus();
  }

  /* ---------- draft preview (#draft=id1,id2 — fragments served from the draft branch) ---------- */
  const DRAFT_BASE = 'https://raw.githubusercontent.com/maxweiss10/pearls/draft/';
  const DRAFT_API = 'https://api.github.com/repos/maxweiss10/pearls/contents/';
  const DRAFT_GONE = new Error('draft not found');

  /* api.github.com reflects force-pushes immediately; raw.githubusercontent caches by path
     for ~5 min and ignores query strings, so it only serves as the rate-limit fallback. */
  function fetchDraftFile(path, asJson) {
    /* &cb= busts the API's 60-second shared cache so an amended draft shows on the very next reload */
    return fetch(DRAFT_API + path + '?ref=draft&cb=' + Date.now(), {
      headers: { Accept: 'application/vnd.github.raw+json' }, cache: 'no-store'
    })
      .then(function (r) {
        if (r.ok) return asJson ? r.json() : r.text();
        if (r.status === 404) throw DRAFT_GONE; /* authoritative: branch or file gone */
        throw new Error('api'); /* rate-limited or flaky → try raw */
      })
      .catch(function (e) {
        if (e === DRAFT_GONE) throw e;
        return fetch(DRAFT_BASE + path + '?t=' + Date.now(), { cache: 'no-store' })
          .then(function (r) { if (!r.ok) throw DRAFT_GONE; return asJson ? r.json() : r.text(); });
      });
  }

  function draftIdsFromHash() {
    const m = location.hash.match(/^#draft=([^&]+)/);
    if (!m) return null;
    let ids;
    try { ids = decodeURIComponent(m[1]).split(',').filter(Boolean); }
    catch (e) { return null; } /* mangled %-escape from a chat app → treat as no draft */
    return ids.length ? ids : null;
  }

  function initDraft(ids) {
    document.body.classList.add('drafting');
    document.title = 'Draft · Pearl';
    const bust = '?t=' + Date.now();
    fetchDraftFile('manifest.json', true)
      .then(function (manifest) {
        const metas = ids
          .map(function (id) {
            return manifest.entries.filter(function (e) { return e.id === id; })[0];
          })
          .filter(Boolean);
        if (!metas.length) throw new Error('ids not in draft manifest');
        return Promise.all(metas.map(function (m) {
          return fetchDraftFile('entries/' + m.id + '.html', false)
            .then(function (html) { return [m, html]; });
        }));
      })
      .then(function (pairs) {
        $list.innerHTML = '';
        const bar = document.createElement('div');
        bar.className = 'draftbar';
        bar.innerHTML = '<b>Draft preview</b> — not on the live site yet. ' +
          'Reply <span class="code">push</span> in the Claude session to publish. ' +
          '<a href="./">Live site →</a>';
        $list.appendChild(bar);
        pairs.forEach(function (p) {
          const built = buildCard(p[0], p[1]);
          /* self-link would swap #draft=… for #id and lose the preview on reload */
          built.titleEl.removeAttribute('href');
          /* draft images aren't on main yet — point relative srcs at the draft branch */
          built.bodyEl.querySelectorAll('img').forEach(function (im) {
            const src = im.getAttribute('src') || '';
            if (src && !/^(https?:)?\//i.test(src) && !/^data:/i.test(src)) {
              im.src = DRAFT_BASE + src + bust;
            }
          });
          $list.appendChild(built.card);
        });
        $count.textContent = pairs.length === 1 ? 'draft — 1 note' : 'draft — ' + pairs.length + ' notes';
      })
      .catch(function () {
        $list.innerHTML =
          '<p class="empty">No draft here — it may already be published, or was replaced by a newer one.</p>' +
          '<p class="empty"><a href="./">Go to the live site →</a></p>';
      });
  }

  /* entering, leaving, or switching drafts is a mode change — reload so the right path runs */
  window.addEventListener('hashchange', function () {
    if (draftIdsFromHash() || document.body.classList.contains('drafting')) location.reload();
  });

  const draftIds = draftIdsFromHash();
  if (draftIds) { initDraft(draftIds); return; }

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
