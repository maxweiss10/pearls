/* pearl-mcp — remote MCP server that lets claude.ai chat publish Pearl entries.
 *
 * Tools: pearl_status · stage_pearl · publish_pearl · discard_pearl
 * Transport: MCP streamable HTTP (stateless JSON responses) at /{PATH_KEY}/mcp
 * Auth: the unguessable PATH_KEY path segment (lives only in the claude.ai
 *       connector config) + a fine-grained GitHub PAT (contents RW on
 *       maxweiss10/pearls only) stored as the GITHUB_TOKEN secret.
 *
 * Same contract as every other Pearl lane: stage → draft branch + preview
 * link; nothing touches main until an explicit publish.
 */

const REPO = 'maxweiss10/pearls';
const SITE = 'https://maxweiss10.github.io/pearls/';
const WORKER = 'https://pearl-mcp.maxweiss10.workers.dev';

/* ---------- GitHub API ---------- */

async function gh(env, method, path, body) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'pearl-mcp',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404) return { _status: 404 };
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data && data.message ? data.message : `HTTP ${res.status}`;
    throw new Error(`GitHub ${method} ${path}: ${msg}`);
  }
  return data;
}

function b64decodeUtf8(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function getDraft(env) {
  const ref = await gh(env, 'GET', '/git/ref/heads/draft');
  if (ref._status === 404) return null;
  const commit = await gh(env, 'GET', `/git/commits/${ref.object.sha}`);
  return { sha: ref.object.sha, message: commit.message };
}

const idFromMessage = (m) => ((m || '').match(/\[([a-z0-9-]+)\]\s*$/) || [])[1] || null;

/* ---------- tools ---------- */

async function toolStatus(env, a) {
  /* wait_for_photo: block server-side until Max's paste lands (up to ~22 s),
     so one assistant turn can hand over the link AND pick the photo up. */
  let waited = false;
  if (a && a.wait_for_photo) {
    const deadline = Date.now() + 22000;
    for (;;) {
      const probe = await gh(env, 'GET', '/contents/entries%2Fimg%2Finbox?ref=main');
      if (Array.isArray(probe) && probe.length) break;
      if (Date.now() > deadline) { waited = true; break; }
      await new Promise((r) => setTimeout(r, 2500));
    }
  }
  const [draft, manifest, inbox] = await Promise.all([
    getDraft(env),
    gh(env, 'GET', '/contents/manifest.json?ref=main'),
    gh(env, 'GET', '/contents/entries%2Fimg%2Finbox?ref=main'),
  ]);
  const man = JSON.parse(b64decodeUtf8(manifest.content));
  const photos = Array.isArray(inbox) ? inbox.map((f) => f.name) : [];
  return {
    pending_draft: draft ? { title: draft.message, preview: idFromMessage(draft.message) ? `${SITE}#draft=${idFromMessage(draft.message)}` : null } : null,
    sections: man.sections,
    entry_ids: man.entries.map((e) => e.id),
    inbox_photos: photos,
    drop_page: env.DROP_KEY ? `${WORKER}/${env.DROP_KEY}/drop` : null,
    drop_page_note: 'Give Max this link ONLY when an entry needs the actual image. He pastes (or snaps) there; the photo lands in inbox_photos within seconds.',
    timed_out_waiting: waited && !photos.length ? true : undefined,
  };
}

async function toolStage(env, a) {
  const errs = [];
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(a.id || '')) errs.push('bad id (YYYY-MM-DD-slug)');
  for (const k of ['title', 'section', 'date', 'keywords', 'html'])
    if (!String(a[k] || '').trim()) errs.push(`missing ${k}`);
  const html = String(a.html || '').trim();
  if (!html.includes('class="pearl')) errs.push('html lacks the pearl root div');
  if (html.length > 20000) errs.push('html over 20KB — split the entry');
  if (/<script|<iframe|javascript:|\bon\w+\s*=/i.test(html)) errs.push('scripts/handlers not allowed');
  if (errs.length) throw new Error('validation: ' + errs.join('; '));

  const prev = await getDraft(env);
  const mainRef = await gh(env, 'GET', '/git/ref/heads/main');
  const mainCommit = await gh(env, 'GET', `/git/commits/${mainRef.object.sha}`);

  const manifestFile = await gh(env, 'GET', '/contents/manifest.json?ref=main');
  const man = JSON.parse(b64decodeUtf8(manifestFile.content));
  man.entries = man.entries.filter((e) => e.id !== a.id);
  const row = { id: a.id, title: a.title, date: a.date, section: a.section, keywords: a.keywords };
  if (a.source) row.source = a.source;
  man.entries.unshift(row);
  if (!man.sections.includes(a.section)) man.sections.push(a.section);

  const tree = [
    { path: `entries/${a.id}.html`, mode: '100644', type: 'blob', content: html + '\n' },
    { path: 'manifest.json', mode: '100644', type: 'blob', content: JSON.stringify(man, null, 2) },
  ];

  /* Wire up images automatically: whatever the fragment references but doesn't
     already exist gets filled, in order, from the photos waiting in the inbox.
     No flag to forget — a fragment can never ship pointing at a missing file. */
  const referenced = [...html.matchAll(/src="entries\/img\/([^"\/]+)"/g)].map((m) => m[1]);
  let imageCount = 0;
  let inboxRemaining = [];
  const imagesUsed = [];
  if (referenced.length) {
    const [existingRaw, inboxRaw] = await Promise.all([
      gh(env, 'GET', '/contents/entries%2Fimg?ref=main'),
      gh(env, 'GET', '/contents/entries%2Fimg%2Finbox?ref=main'),
    ]);
    const existing = new Set((Array.isArray(existingRaw) ? existingRaw : []).map((f) => f.name));
    const missing = referenced.filter((n) => !existing.has(n));
    const inbox = (Array.isArray(inboxRaw) ? inboxRaw : []).sort((x, y) => x.name.localeCompare(y.name));

    if (missing.length > inbox.length) {
      const short = missing.length - inbox.length;
      throw new Error(
        `the entry references ${missing.length} image(s) that aren't in the repo yet and only ${inbox.length} are waiting in the inbox — ` +
        `ask Max to paste ${short} more at the drop page (pearl_status → drop_page), then call stage_pearl again. ` +
        `Nothing was staged, so no broken preview.`
      );
    }
    missing.forEach((name, i) => {
      const src = inbox[i];
      imageCount++;
      imagesUsed.push(`${src.name} → ${name}`);
      tree.push({ path: `entries/img/${name}`, mode: '100644', type: 'blob', sha: src.sha });
      tree.push({ path: src.path, mode: '100644', type: 'blob', sha: null }); /* clear from inbox */
    });
    inboxRemaining = inbox.slice(missing.length).map((f) => f.name);
  }

  const newTree = await gh(env, 'POST', '/git/trees', { base_tree: mainCommit.tree.sha, tree });
  const commit = await gh(env, 'POST', '/git/commits', {
    message: `Pearl: ${a.title} (chat) [${a.id}]`,
    tree: newTree.sha,
    parents: [mainRef.object.sha],
  });

  const patch = await fetch(`https://api.github.com/repos/${REPO}/git/refs/heads/draft`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'user-agent': 'pearl-mcp', 'content-type': 'application/json' },
    body: JSON.stringify({ sha: commit.sha, force: true }),
  });
  if (!patch.ok) {
    await gh(env, 'POST', '/git/refs', { ref: 'refs/heads/draft', sha: commit.sha });
  }

  return {
    staged: a.title,
    preview: `${SITE}#draft=${a.id}`,
    images_attached: imageCount,
    images_used: imagesUsed.length ? imagesUsed : undefined,
    inbox_left_over: inboxRemaining.length ? inboxRemaining : undefined,
    images_note: imageCount ? 'Inbox photos are claimed by this draft and clear from the inbox when it publishes. If Max pasted these for a DIFFERENT entry, discard and re-stage.' : undefined,
    replaced_pending_draft: prev && idFromMessage(prev.message) !== a.id ? prev.message : null,
    next: 'Show Max the preview link. Publish ONLY after he explicitly approves (push/yes/ship).',
  };
}

async function toolPublish(env) {
  const draft = await getDraft(env);
  if (!draft) throw new Error('no pending draft — stage_pearl first');
  const id = idFromMessage(draft.message);
  await gh(env, 'POST', '/merges', { base: 'main', head: draft.sha, commit_message: draft.message });
  await gh(env, 'DELETE', '/git/refs/heads/draft');
  return {
    published: draft.message,
    live: id ? `${SITE}#${id}` : SITE,
    note: 'Pages rebuilds in ~1 min.',
  };
}

async function toolDiscard(env) {
  const draft = await getDraft(env);
  if (!draft) return { discarded: null, note: 'no pending draft' };
  await gh(env, 'DELETE', '/git/refs/heads/draft');
  return { discarded: draft.message };
}

/* ---------- MCP plumbing (streamable HTTP, stateless) ---------- */

const TOOLS = [
  {
    name: 'pearl_status',
    description: 'Current state of the Pearl site repo: pending draft (if any), the section list, existing entry ids, any photos waiting in the inbox, and drop_page (the paste link for photos). Call before staging. Set wait_for_photo:true right after giving Max the drop_page link — the call then blocks until his paste arrives (up to ~22 s), so you can hand over the link and pick the photo up in the SAME turn instead of asking him to report back. If it returns timed_out_waiting, just call again.',
    inputSchema: { type: 'object', properties: { wait_for_photo: { type: 'boolean' } } },
  },
  {
    name: 'stage_pearl',
    description: 'Stage one Pearl entry on the draft branch and get back a preview link. Replaces any pending draft. NEVER publishes — the entry goes live only via publish_pearl after Max explicitly approves the preview. Images are wired automatically: just reference entries/img/{id}-1.jpg (…-2.jpg, in display order) in the html, and any file not already in the repo is filled from the photos Max pasted at the drop page (pearl_status → drop_page) and cleared from the inbox. If not enough photos are waiting, staging fails with a clear message and nothing is published — so a preview can never show a broken image. use_inbox_photos is legacy and ignored.',
    inputSchema: {
      type: 'object',
      required: ['id', 'title', 'date', 'section', 'keywords', 'html'],
      properties: {
        id: { type: 'string', description: 'YYYY-MM-DD-slug' },
        title: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        section: { type: 'string' },
        keywords: { type: 'string', description: 'flat lowercase comma-separated' },
        source: { type: 'string', description: 'papers/videos only' },
        html: { type: 'string', description: 'the entry fragment; root <div class="pearl e-{short}">' },
        use_inbox_photos: { type: 'boolean' },
      },
    },
  },
  {
    name: 'publish_pearl',
    description: 'Publish the pending draft to the live site. Call ONLY after Max has seen the preview and explicitly said push/yes/ship — never on your own judgment.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'discard_pearl',
    description: 'Delete the pending draft without publishing.',
    inputSchema: { type: 'object', properties: {} },
  },
];

async function callTool(env, name, args) {
  if (!env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN secret is not configured yet — Max needs to run: npx wrangler secret put GITHUB_TOKEN (from worker/pearl-mcp in the pearls repo)');
  switch (name) {
    case 'pearl_status': return toolStatus(env, args || {});
    case 'stage_pearl': return toolStage(env, args || {});
    case 'publish_pearl': return toolPublish(env);
    case 'discard_pearl': return toolDiscard(env);
    default: throw new Error(`unknown tool: ${name}`);
  }
}

async function handleRpc(env, msg) {
  const { id, method, params } = msg || {};
  if (id === undefined || id === null) return null; // notification — no response body
  const reply = (result) => ({ jsonrpc: '2.0', id, result });
  const fail = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

  try {
    switch (method) {
      case 'initialize':
        return reply({
          protocolVersion: '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'pearl-publisher', version: '1.0.0' },
        });
      case 'ping':
        return reply({});
      case 'tools/list':
        return reply({ tools: TOOLS });
      case 'tools/call': {
        try {
          const result = await callTool(env, params && params.name, params && params.arguments);
          return reply({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
        } catch (e) {
          return reply({ content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true });
        }
      }
      default:
        return fail(-32601, `method not found: ${method}`);
    }
  } catch (e) {
    return fail(-32603, e.message);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* Paste target: GET serves the drop page, POST accepts images → inbox on main. */
    if (env.DROP_KEY && url.pathname === `/${env.DROP_KEY}/drop`) {
      if (request.method === 'GET') {
        return new Response(DROP_PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
      }
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '86400',
        }});
      }
      if (request.method === 'POST') return handleDrop(request, env);
      return new Response('method not allowed', { status: 405 });
    }

    if (!env.PATH_KEY || url.pathname !== `/${env.PATH_KEY}/mcp`) {
      return new Response('not found', { status: 404 });
    }
    if (request.method !== 'POST') {
      return new Response('MCP endpoint — POST JSON-RPC here', { status: 405, headers: { allow: 'POST' } });
    }
    let msg;
    try { msg = await request.json(); } catch {
      return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }, { status: 400 });
    }
    if (Array.isArray(msg)) {
      const replies = (await Promise.all(msg.map((m) => handleRpc(env, m)))).filter(Boolean);
      return replies.length ? Response.json(replies) : new Response(null, { status: 202 });
    }
    const res = await handleRpc(env, msg);
    if (!res) return new Response(null, { status: 202 });
    return respond(res, request);
  },
};

/* Reply the way the official MCP SDK servers do: SSE-framed when the client
   accepts text/event-stream, plain JSON otherwise; session id on initialize. */
function respond(res, request) {
  const wantsSse = (request.headers.get('accept') || '').includes('text/event-stream');
  const headers = { 'mcp-session-id': crypto.randomUUID() };
  if (!wantsSse) return Response.json(res, { headers });
  return new Response(`event: message\ndata: ${JSON.stringify(res)}\n\n`, {
    status: 200,
    headers: { ...headers, 'content-type': 'text/event-stream', 'cache-control': 'no-store' },
  });
}


/* ---------- paste target ---------- */

async function handleDrop(request, env) {
  if (!env.GITHUB_TOKEN) return Response.json({ error: 'server not configured' }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'bad request' }, { status: 400 }); }
  const images = Array.isArray(body && body.images) ? body.images.slice(0, 10) : [];
  if (!images.length) return Response.json({ error: 'no images' }, { status: 400 });

  /* base64 → blob on the repo */
  const shas = [];
  for (const img of images) {
    const b64 = String(img.b64 || '').split(',').pop();
    if (!b64 || b64.length > 12_000_000) return Response.json({ error: 'image too large' }, { status: 413 });
    const blob = await gh(env, 'POST', '/git/blobs', { content: b64, encoding: 'base64' });
    shas.push(blob.sha);
  }

  /* commit them into entries/img/inbox/ on main, numbering after whatever is there */
  for (let attempt = 0; attempt < 3; attempt++) {
    const inbox = await gh(env, 'GET', '/contents/entries%2Fimg%2Finbox?ref=main');
    let n = Array.isArray(inbox) ? inbox.length : 0;
    const ref = await gh(env, 'GET', '/git/ref/heads/main');
    const commitObj = await gh(env, 'GET', `/git/commits/${ref.object.sha}`);
    const stamp = String(Date.now()).slice(-6);
    const paths = shas.map((sha) => {
      n++;
      return { path: `entries/img/inbox/drop${stamp}-${n}.jpg`, mode: '100644', type: 'blob', sha };
    });
    const tree = await gh(env, 'POST', '/git/trees', { base_tree: commitObj.tree.sha, tree: paths });
    const commit = await gh(env, 'POST', '/git/commits', {
      message: `Pearl inbox: ${paths.length} photo${paths.length > 1 ? 's' : ''} pasted`,
      tree: tree.sha,
      parents: [ref.object.sha],
    });
    const patch = await fetch(`https://api.github.com/repos/${REPO}/git/refs/heads/main`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'user-agent': 'pearl-mcp', 'content-type': 'application/json' },
      body: JSON.stringify({ sha: commit.sha }),
    });
    if (patch.ok) return Response.json({ saved: paths.map((p) => p.path) });
  }
  return Response.json({ error: 'repo busy — try again' }, { status: 503 });
}

const DROP_PAGE = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Pearl — drop a photo</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Pearl Drop">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%231a3a5c'/><circle cx='50' cy='54' r='26' fill='%23fff'/><circle cx='42' cy='46' r='9' fill='%23dfe6ee'/></svg>">
<style>
*{box-sizing:border-box}
body{margin:0;padding:20px;font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  color:#171A1F;background:#fff;-webkit-text-size-adjust:100%}
.wrap{max-width:560px;margin:0 auto}
h1{font-size:19px;margin:0 0 2px;letter-spacing:-.01em}
.sub{color:#5C6672;font-size:13px;margin:0 0 18px}
#zone{border:2px dashed #C9CFD6;border-radius:12px;padding:34px 20px;text-align:center;
  background:#FAFBFC;transition:border-color .15s,background .15s;cursor:pointer}
#zone.hot{border-color:#1a3a5c;background:#F2F6FA}
#zone b{display:block;font-size:16px;margin-bottom:4px}
#zone span{color:#5C6672;font-size:13px}
.btn{display:inline-block;margin-top:14px;padding:12px 20px;border:0;border-radius:9px;
  background:#171A1F;color:#fff;font:inherit;font-weight:600;font-size:15px;cursor:pointer}
.btn:active{opacity:.85}
.btn.alt{background:#fff;color:#171A1F;border:1px solid #C9CFD6;margin-left:8px}
@media (max-width:420px){.btn,.btn.alt{display:block;width:100%;margin:10px 0 0}}
#log{margin-top:18px}
.item{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid #EBEDF0;font-size:14px}
.item img{width:44px;height:44px;object-fit:cover;border-radius:6px;background:#EBEDF0;flex:none}
.ok{color:#1F6B45;font-weight:600}.err{color:#A61B1B;font-weight:600}.pend{color:#5C6672}
.done{margin-top:18px;padding:13px 15px;border-left:3px solid #171A1F;background:#FAFBFC;
  border-radius:0 8px 8px 0;font-size:14px;display:none}
.done.show{display:block}
input[type=file]{display:none}
</style></head><body>
<div class="wrap">
  <h1>Drop a photo into Pearl</h1>
  <p class="sub">Paste it, drag it, or take one. Claude is already waiting for it — no need to go back and tell it.</p>

  <div id="zone">
    <b id="hdr">Paste here &nbsp;<kbd>⌘V</kbd></b>
    <span>or drag an image in</span>
    <div>
      <button class="btn" id="clip" type="button">Paste from clipboard</button>
      <button class="btn alt" id="pick" type="button">Photo / Camera</button>
    </div>
  </div>
  <input type="file" id="file" accept="image/*" multiple>

  <div id="log"></div>
  <div class="done" id="done"><b>Saved.</b> Claude is picking it up right now — head back to the chat for your preview link.</div>
</div>
<script>
const zone=document.getElementById('zone'),log=document.getElementById('log'),
      fileIn=document.getElementById('file'),done=document.getElementById('done');

function row(name){const d=document.createElement('div');d.className='item';
  d.innerHTML='<img><span style="flex:1">'+name+'</span><span class="pend">saving…</span>';
  log.appendChild(d);return d;}

/* Resize to <=1600px and re-encode as JPEG: strips EXIF/GPS and keeps the repo small. */
function shrink(file){return new Promise((res,rej)=>{const fr=new FileReader();
  fr.onload=()=>{const im=new Image();
    im.onload=()=>{const s=Math.min(1,1600/Math.max(im.width,im.height));
      const c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      res({b64:c.toDataURL('image/jpeg',0.85),thumb:c.toDataURL('image/jpeg',0.4)});};
    im.onerror=rej;im.src=fr.result;};
  fr.onerror=rej;fr.readAsDataURL(file);});}

async function send(files){
  const list=[...files].filter(f=>f&&f.type.startsWith('image/')).slice(0,10);
  if(!list.length)return;
  const rows=list.map(f=>row(f.name||'pasted image'));
  try{
    const shrunk=await Promise.all(list.map(shrink));
    shrunk.forEach((s,i)=>{rows[i].querySelector('img').src=s.thumb;});
    const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({images:shrunk.map(s=>({b64:s.b64}))})});
    const j=await r.json();
    if(!r.ok)throw new Error(j.error||'upload failed');
    rows.forEach(x=>{x.lastElementChild.className='ok';x.lastElementChild.textContent='saved ✓';});
    done.classList.add('show');
  }catch(e){
    rows.forEach(x=>{x.lastElementChild.className='err';x.lastElementChild.textContent='failed';});
    alert('Upload failed: '+e.message);
  }
}

document.addEventListener('paste',e=>{const f=[...(e.clipboardData?.files||[])];
  if(f.length){e.preventDefault();send(f);}});

/* Read the clipboard directly. Once the browser has granted this origin
   clipboard-read, the auto-attempt on load means opening the link is the
   whole interaction — no keystroke at all. Falls back silently everywhere. */
async function fromClipboard(){
  if(!navigator.clipboard||!navigator.clipboard.read)return false;
  try{
    const items=await navigator.clipboard.read();
    const files=[];
    for(const it of items){
      const type=it.types.find(t=>t.startsWith('image/'));
      if(!type)continue;
      const blob=await it.getType(type);
      files.push(new File([blob],'clipboard.'+type.split('/')[1],{type}));
    }
    if(files.length){send(files);return true;}
  }catch(err){/* not granted / no gesture / empty — fine */}
  return false;
}
document.getElementById('clip').addEventListener('click',async e=>{e.stopPropagation();
  if(!await fromClipboard())alert('Nothing to paste — copy an image first, or use Photo / Camera.');});
zone.addEventListener('click',()=>fileIn.click());
document.getElementById('pick').addEventListener('click',e=>{e.stopPropagation();fileIn.click();});
/* zero-click path when permission is already granted */
navigator.permissions?.query({name:'clipboard-read'}).then(p=>{
  if(p.state==='granted')fromClipboard();
}).catch(()=>{});
fileIn.addEventListener('change',()=>{send(fileIn.files);fileIn.value='';});
['dragenter','dragover'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add('hot');}));
['dragleave','drop'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove('hot');}));
zone.addEventListener('drop',e=>send(e.dataTransfer.files));
</script></body></html>`;
