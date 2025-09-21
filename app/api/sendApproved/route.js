// app/api/sendApproved/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const webhookRaw = process.env.SEND_WEBHOOK_URL || '';
const webhook = webhookRaw.trim();

console.log("webRaw&trim", webhookRaw, webhook)

function safeParse(text) {
  try { return JSON.parse(text); } catch { return text; }
}

export async function POST(req) {
  try {
    // 1) Parse body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('sendApproved: invalid JSON:', e);
      return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }
    const items = Array.isArray(body?.items) ? body.items : [];

    // 2) Check env
    const webhook = process.env.SEND_WEBHOOK_URL;
    if (!webhook) {
      console.warn('sendApproved: SEND_WEBHOOK_URL is not set');
      return Response.json({ ok: true, count: items.length, forwarded: null }, { status: 200 });
    }

    // 3) Emit webhook with strong diagnostics
    let forwarded;
    try {
      const fetchwebh = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // tip: add your auth header here if needed
        body: JSON.stringify({ items }),
        cache: 'no-store',
      });
      const bodyText = await fetchwebh.text();
      forwarded = { ok: fetchwebh.ok, status: fetchwebh.status, body: safeParse(bodyText) };
      if (!fetchwebh.ok) console.error('sendApproved: webhook non-2xx', forwarded);
    } catch (e) {
      const cause = e?.cause || {};
      console.error('sendApproved: fetch to webhook failed:', {
        name: e?.name,
        message: e?.message,
        code: cause.code,        // e.g. ENOTFOUND, ECONNREFUSED
        errno: cause.errno,
        syscall: cause.syscall,
        hostname: cause.hostname,
      });
      return Response.json(
        { ok: false, step: 'fetch', error: e?.message || String(e), code: cause.code, host: cause.hostname },
        { status: 502 }
      );
    }

    return Response.json({ ok: true, count: items.length, forwarded }, { status: 200 });
  } catch (e) {
    console.error('sendApproved: fatal error:', e);
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ ok: true, msg: 'sendApproved is alive' });
}

