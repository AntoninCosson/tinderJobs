// app/api/sendApproved/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { connectDB } from '@/lib/db';
import AlreadySent from '@/models/AlreadySent';

function safeParse(text) { try { return JSON.parse(text); } catch { return text; } }

export async function POST(req) {
  let body;
  try { body = await req.json(); }
  catch { return Response.json({ ok:false, error:'Invalid JSON body' }, { status:400 }); }

  console.log("body:", body)

  const { accepted = [], rejected = [] } = body || {};
  // if (!userId) {
  //   return Response.json({ ok:false, error:'Missing userId' }, { status:400 });
  // }
  const acc = Array.isArray(accepted) ? accepted : [];
  const rej = Array.isArray(rejected) ? rejected : [];

  // 2) Save to Mongo (upsert + move entre listes)
  let mongo = { insertedAccepted: 0, insertedRejected: 0 };
  try {
    await connectDB();

    // on retire les doublons par id dans les listes entrantes (côté payload)
    const uniqById = (arr) => Object.values(
      arr.reduce((m, it) => (it?.id ? (m[it.id] = it) : m), {})
    );

    const accUniq = uniqById(acc);
    const rejUniq = uniqById(rej);
    const idsToPull = [...new Set([...accUniq, ...rejUniq].map(i => i.id).filter(Boolean))];

    // pull par id des deux listes (pour éviter doublons & gérer "move" entre accepted/rejected)
    if (idsToPull.length) {
      await AlreadySent.updateOne(
        // { userId },
        {
          $pull: {
            accepted: { id: { $in: idsToPull } },
            rejected: { id: { $in: idsToPull } },
          },
        },
        { upsert: true }
      );
    }

    // push dans chaque liste (si non vide)
    const ops = {};
    if (accUniq.length) ops.accepted = { $each: accUniq };
    if (rejUniq.length) ops.rejected = { $each: rejUniq };

    if (Object.keys(ops).length) {
      const res = await AlreadySent.updateOne(
        { userId },
        { $setOnInsert: { userId }, $push: ops },
        { upsert: true }
      );
      // simple metrics
      mongo.insertedAccepted = accUniq.length;
      mongo.insertedRejected = rejUniq.length;
      mongo.upserted = !!res.upsertedCount;
      mongo.modified = res.modifiedCount;
    }
  } catch (e) {
    console.error('sendApproved: DB error:', e?.name, e?.message);
    return Response.json({ ok:false, step:'db', error:e?.message || String(e) }, { status:500 });
  }

  // 3) Optional: forward au webhook
  const webhook = (process.env.SEND_WEBHOOK_URL || '').trim();
  if (!webhook) {
    return Response.json({ ok:true, count: items.length, forwarded: null });
  }

  let forwarded = null;
  if (webhook) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const fw = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, accepted: acc, rejected: rej }),
        cache: 'no-store',
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const bodyText = await fw.text();
      forwarded = { ok: fw.ok, status: fw.status, body: safeParse(bodyText) };
      if (!fw.ok) console.error('sendApproved: webhook non-2xx', forwarded);
    } catch (e) {
      const cause = e?.cause || {};
      console.error('sendApproved: fetch to webhook failed:', {
        name: e?.name, message: e?.message,
        code: cause.code, errno: cause.errno, syscall: cause.syscall, hostname: cause.hostname,
      });
      // On n’échoue pas la requête si le webhook rate : la DB est déjà à jour
      forwarded = { ok:false, error:e?.message || String(e) };
    }
  } else {
    console.warn('sendApproved: SEND_WEBHOOK_URL not set — skipping webhook');
  }

  return Response.json({ ok:true, mongo, forwarded }, { status:200 });
}

export async function GET() {
  return Response.json({ ok:true, msg:'sendApproved is alive' });
}

// try {
//   // 1) Parse body
//   let body;
//   try {
//     body = await req.json();
//   } catch (e) {
//     console.error('sendApproved: invalid JSON:', e);
//     return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
//   }
//   const items = Array.isArray(body?.items) ? body.items : [];

//   // 2) Check env
//   const webhook = process.env.SEND_WEBHOOK_URL;
//   if (!webhook) {
//     console.warn('sendApproved: SEND_WEBHOOK_URL is not set');
//     return Response.json({ ok: true, count: items.length, forwarded: null }, { status: 200 });
//   }

//   // 3) Emit webhook with strong diagnostics
//   let forwarded;
//   try {
//     const fetchwebh = await fetch(webhook, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       // auth header to add here
//       body: JSON.stringify({ items }),
//       cache: 'no-store',
//     });
//     const bodyText = await fetchwebh.text();
//     forwarded = { ok: fetchwebh.ok, status: fetchwebh.status, body: safeParse(bodyText) };
//     if (!fetchwebh.ok) console.error('sendApproved: webhook non-2xx', forwarded);
//   } catch (e) {
//     const cause = e?.cause || {};
//     console.error('sendApproved: fetch to webhook failed:', {
//       name: e?.name,
//       message: e?.message,
//       code: cause.code,
//       errno: cause.errno,
//       syscall: cause.syscall,
//       hostname: cause.hostname,
//     });
//     return Response.json(
//       { ok: false, step: 'fetch', error: e?.message || String(e), code: cause.code, host: cause.hostname },
//       { status: 502 }
//     );
//   }

//   return Response.json({ ok: true, count: items.length, forwarded }, { status: 200 });
// } catch (e) {
//   console.error('sendApproved: fatal error:', e);
//   return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
// }