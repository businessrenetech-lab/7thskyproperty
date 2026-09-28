/**
 * Phase 1 — the admin↔provider conversation, proven in BOTH directions.
 * Needs the API on :50001.  Run: node scripts/e2e/portalConversation.js
 *
 * What was wrong, measured before this was written: every `channel: 'portal'`
 * row in the codebase was `direction: 'inbound'`. A contractor could write to the
 * operations desk and could not be answered in the portal — staff replied by
 * phone or WhatsApp and the thread died. The provider's own thread was matched by
 * `client_name = business_name`, a string, so a rename orphaned it; and a
 * provider's work-order actions were filed under the CLIENT's name, so of 13
 * portal rows, 0 could be traced to a provider.
 *
 * This proves: a provider writes, the desk sees it waiting, the desk replies, the
 * provider reads the reply, and the thread stops showing as unanswered.
 *
 * Fixtures are messages, which cannot be deleted (the comm log is an audit
 * record). They are stamped and reported rather than silently left.
 */
const { login, req, ok, finish, STAMP } = require('./httpHarness');

let providerId = null;
let providerName = null;
let portalToken = null;

const viaToken = (path) => `/api/public/wt-portal/${portalToken}${path}`;

async function setup() {
  console.log('\n-- A provider with a portal --');
  /*
   * The directory fires half a dozen concurrent queries. Run back-to-back with
   * the other e2e suites it intermittently answered HTTP 200 with an empty
   * provider list — reliable in isolation, empty under load. A bounded retry
   * distinguishes that from a genuine outage instead of reporting a mystery, and
   * the failure still says what came back.
   */
  let list = [];
  let dir = null;
  for (let attempt = 1; attempt <= 3 && !list.length; attempt += 1) {
    dir = await req('GET', '/api/wt-providers/directory?limit=100');
    list = dir.body?.providers || [];
    if (!list.length && attempt < 3) await new Promise((r) => setTimeout(r, 400));
  }
  ok(list.length > 0, 'providers exist',
    list.length ? `${list.length}` : `HTTP ${dir?.status} keys=${Object.keys(dir?.body || {}).join(',')}`);
  if (!list.length) return false;

  const prov = list[0];
  providerId = prov.id;
  providerName = prov.business_name;

  const link = await req('POST', `/api/wt-ops/portal/provider/${providerId}/link`, { body: {} });
  const b = link.body?.data || link.body || {};
  portalToken = b.token || b.portal_token
    || (typeof b.url === 'string' ? b.url.split('/').pop() : null);
  ok(!!portalToken, 'a portal token is issued for them', portalToken ? providerName : JSON.stringify(b).slice(0, 120));
  return !!portalToken;
}

async function providerWrites() {
  console.log('\n-- The provider writes in --');
  const send = await req('POST', viaToken('/message'), {
    noAuth: true,
    body: { subject: `E2E ${STAMP}`, body: `Can you confirm the access arrangements? ${STAMP}` },
  });
  ok(send.status === 200, 'the provider can send a message', `HTTP ${send.status} ${send.body?.error || ''}`);

  // It must be attributable to the PROVIDER, which is what failed before.
  const threads = await req('GET', '/api/wt-ops/portal-threads');
  ok(threads.status === 200, 'the desk can list portal threads', `HTTP ${threads.status}`);
  const mine = (threads.body?.data || []).find((t) => Number(t.provider_id) === Number(providerId));
  ok(!!mine, 'the thread is keyed to the PROVIDER, not to a name string',
    mine ? `provider_id ${mine.provider_id}` : 'not found by provider_id');
  ok(mine?.party_type === 'provider', 'and is marked as a provider thread', mine?.party_type);
  ok(Number(mine?.unanswered) >= 1, 'it shows as waiting for an answer', String(mine?.unanswered));
  ok(Number(threads.body?.summary?.waiting) >= 1, 'the desk summary counts it as waiting',
    `${threads.body?.summary?.waiting} waiting / ${threads.body?.summary?.threads} threads`);

  // The whole message, not a truncated preview.
  const thread = await req('GET', `/api/wt-ops/portal-threads/provider/${providerId}`);
  ok(thread.status === 200, 'the desk can open the conversation', `HTTP ${thread.status}`);
  const rows = thread.body?.data || [];
  const sent = rows.find((r) => String(r.body || '').includes(STAMP));
  ok(!!sent, 'the message is in the thread');
  ok(sent?.direction === 'inbound', 'it reads as inbound', sent?.direction);
  ok(String(sent?.body || '').includes('access arrangements'), 'the full text is kept, not a 500-char preview');
}

async function deskReplies() {
  console.log('\n-- The desk replies — the direction that did not exist --');

  const reply = await req('POST', `/api/wt-ops/portal-threads/provider/${providerId}/reply`, {
    body: { subject: `Re: E2E ${STAMP}`, body: `Access is via the rear gate, key with the guard. ${STAMP}` },
  });
  ok(reply.status === 201, 'the desk can reply into the portal', `HTTP ${reply.status} ${reply.body?.error || ''}`);
  ok(!!reply.body?.data?.author, 'the reply records who sent it', reply.body?.data?.author);

  // Opening the thread marks the inbound message read, so it stops waiting.
  const threads = await req('GET', '/api/wt-ops/portal-threads');
  const mine = (threads.body?.data || []).find((t) => Number(t.provider_id) === Number(providerId));
  ok(Number(mine?.unanswered) === 0, 'the thread no longer shows as waiting', String(mine?.unanswered));
  ok(mine?.last_direction === 'outbound', 'the last word is the desk\'s', mine?.last_direction);

  // And the reply must actually be an OUTBOUND portal row — the thing that could
  // not be written before.
  const thread = await req('GET', `/api/wt-ops/portal-threads/provider/${providerId}`);
  const out = (thread.body?.data || []).filter((r) => r.direction === 'outbound' && String(r.body || '').includes(STAMP));
  ok(out.length === 1, 'exactly one outbound reply exists', String(out.length));
  ok(out[0]?.read_by_party_at == null, 'and the provider has not read it yet');
}

async function providerReads() {
  console.log('\n-- The provider sees the reply --');

  const dossier = await req('GET', `/api/public/wt-portal/${portalToken}`, { noAuth: true });
  ok(dossier.status === 200, 'the portal opens', `HTTP ${dossier.status}`);
  const msgs = dossier.body?.messages || [];

  const theirs = msgs.find((m) => m.direction === 'inbound' && String(m.body || m.summary || '').includes(STAMP));
  ok(!!theirs, 'their own message is in their thread');

  const fromDesk = msgs.find((m) => m.direction === 'outbound' && String(m.body || m.summary || '').includes(STAMP));
  ok(!!fromDesk, 'AND the desk\'s reply is there — the thread is two-way');
  ok(!!fromDesk?.author, 'the reply says who it came from', fromDesk?.author);
  ok(String(fromDesk?.body || '').includes('rear gate'), 'with the full text');

  // Opening the portal is what marks a reply read.
  const after = await req('GET', `/api/wt-ops/portal-threads/provider/${providerId}`);
  const out = (after.body?.data || []).filter((r) => r.direction === 'outbound' && String(r.body || '').includes(STAMP));
  ok(out[0]?.read_by_party_at != null, 'and the desk can now see it was read',
    out[0]?.read_by_party_at || 'still unread');
}

async function guards() {
  console.log('\n-- The refusals --');
  const empty = await req('POST', `/api/wt-ops/portal-threads/provider/${providerId}/reply`, { body: { body: '   ' } });
  ok(empty.status === 400, 'an empty reply is refused', `HTTP ${empty.status}`);

  const tooLong = await req('POST', `/api/wt-ops/portal-threads/provider/${providerId}/reply`, {
    body: { body: 'x'.repeat(4100) },
  });
  ok(tooLong.status === 400, 'an over-long reply is refused', `HTTP ${tooLong.status}`);

  const ghost = await req('POST', '/api/wt-ops/portal-threads/provider/99999999/reply', { body: { body: 'hello' } });
  ok(ghost.status === 404, 'replying to a provider that does not exist is refused', `HTTP ${ghost.status}`);

  const noAuth = await req('GET', '/api/wt-ops/portal-threads', { noAuth: true });
  ok([401, 403].includes(noAuth.status), 'the desk view needs authentication', `HTTP ${noAuth.status}`);
}

async function report() {
  console.log('\n-- Fixtures --');
  const thread = await req('GET', `/api/wt-ops/portal-threads/provider/${providerId}`);
  const mine = (thread.body?.data || []).filter((r) => String(r.body || r.summary || '').includes(STAMP));
  ok(mine.length >= 2, 'this run left its messages on the record', `${mine.length} row(s)`);
  console.log('  NOTE: comm-log rows are an AUDIT record and have no delete endpoint, so this');
  console.log(`  suite's messages stay on ${providerName}'s thread, stamped ${STAMP}. That is`);
  console.log('  deliberate — a conversation you can erase is not evidence.');
}

(async () => {
  console.log(`\n===== PORTAL CONVERSATION E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  if (!(await setup())) { ok(false, 'could not set up a provider portal'); return finish(); }
  await providerWrites();
  await deskReplies();
  await providerReads();
  await guards();
  await report();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.stack); finish(); });
