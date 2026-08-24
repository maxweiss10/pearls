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

async function toolStatus(env) {
  const [draft, manifest, inbox] = await Promise.all([
    getDraft(env),
    gh(env, 'GET', '/contents/manifest.json?ref=main'),
    gh(env, 'GET', '/contents/entries%2Fimg%2Finbox?ref=main'),
  ]);
  const man = JSON.parse(b64decodeUtf8(manifest.content));
  return {
    pending_draft: draft ? { title: draft.message, preview: idFromMessage(draft.message) ? `${SITE}#draft=${idFromMessage(draft.message)}` : null } : null,
    sections: man.sections,
    entry_ids: man.entries.map((e) => e.id),
    inbox_photos: Array.isArray(inbox) ? inbox.map((f) => f.name) : [],
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

  let imageCount = 0;
  if (a.use_inbox_photos) {
    const inbox = await gh(env, 'GET', '/contents/entries%2Fimg%2Finbox?ref=main');
    const files = (Array.isArray(inbox) ? inbox : []).sort((x, y) => x.name.localeCompare(y.name));
    for (const f of files) {
      imageCount++;
      const ext = (f.name.match(/\.\w+$/) || ['.jpg'])[0];
      tree.push({ path: `entries/img/${a.id}-${imageCount}${ext}`, mode: '100644', type: 'blob', sha: f.sha });
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null });
    }
    if (!imageCount) throw new Error('use_inbox_photos was set but the inbox is empty — have Max attach photo(s) to a new issue titled "photos" at https://github.com/maxweiss10/pearls/issues/new?title=photos, then retry');
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
    description: 'Current state of the Pearl site repo: pending draft (if any), the section list, existing entry ids, and any photos waiting in the inbox. Call before staging.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'stage_pearl',
    description: 'Stage one Pearl entry on the draft branch and get back a preview link. Replaces any pending draft. NEVER publishes — the entry goes live only via publish_pearl after Max explicitly approves the preview. Set use_inbox_photos when the entry embeds photos Max delivered via the photo inbox (an issue titled "photos"); they become entries/img/{id}-N.jpg in filename order, so reference exactly those paths in the html.',
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
    case 'pearl_status': return toolStatus(env);
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
