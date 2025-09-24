// app/api/sendApproved/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/db";
import AlreadySent from "@/models/AlreadySent";

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function POST(req) {
  // ----- 1) Parse body (robuste) -----
  let body;
  try {
    body = await req.json();
  } catch (e) {
    console.error("sendApproved: invalid JSON:", e);
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  // Support historique {accepted, rejected} ; et/ou {items} pour le forward webhook
  const { accepted = [], rejected = [], items: rawItems } = body || {};
  const acc = Array.isArray(accepted) ? accepted : [];
  const rej = Array.isArray(rejected) ? rejected : [];
  const items = Array.isArray(rawItems) ? rawItems : [...acc, ...rej];

  // ----- 2) Écriture DB (inchangée fonctionnellement) -----
  let mongo = { insertedAccepted: 0, insertedRejected: 0 };
  try {
    await connectDB();
    const doc = await AlreadySent.findOne({}).lean();

    const existingIds = new Set([
      ...(doc?.accepted?.map((x) => x.id) || []),
      ...(doc?.rejected?.map((x) => x.id) || []),
    ]);

    const incoming = [...acc, ...rej];
    const incomingIds = new Set(incoming.map((x) => x?.id).filter(Boolean));

    // Si un des IDs existe déjà, DB fait foi et on court-circuite (comportement d’origine)
    for (const id of incomingIds) {
      if (existingIds.has(id)) {
        return Response.json({
          ok: true,
          note: "DB wins: at least one offer already exists",
          skippedIds: [...incomingIds].filter((i) => existingIds.has(i)),
          count: items.length,
          forwarded: null, // rien envoyé côté webhook dans ce cas
        });
      }
    }

    const uniqById = (arr) =>
      Object.values(
        (arr || []).reduce((m, it) => {
          const k = it?.id;
          if (k) m[k] = it;
          return m;
        }, {})
      );

    const accUniq = uniqById(acc);
    const rejUniq = uniqById(rej);

    const accIds = new Set(accUniq.map((i) => i?.id).filter(Boolean));
    const rejExclusive = rejUniq.filter((i) => i?.id && !accIds.has(i.id));

    const idsToPull = [
      ...new Set(
        [...accUniq, ...rejExclusive].map((i) => i?.id).filter(Boolean)
      ),
    ];

    if (idsToPull.length) {
      await AlreadySent.updateOne(
        {},
        {
          $pull: {
            accepted: { id: { $in: idsToPull } },
            rejected: { id: { $in: idsToPull } },
          },
        },
        { upsert: true }
      );
    }

    const ops = {};
    if (accUniq.length) ops.accepted = { $each: accUniq };
    if (rejExclusive.length) ops.rejected = { $each: rejExclusive };

    if (Object.keys(ops).length) {
      const res = await AlreadySent.updateOne({}, { $push: ops }, { upsert: true });
      mongo.insertedAccepted = accUniq.length;
      mongo.insertedRejected = rejExclusive.length;
      mongo.upserted = !!res.upsertedCount;
      mongo.modified = res.modifiedCount;
    }
  } catch (e) {
    console.error("sendApproved: DB error:", e?.name, e?.message);
    return Response.json(
      { ok: false, step: "db", error: e?.message || String(e) },
      { status: 500 }
    );
  }

  // ----- 3) Webhook optionnel avec diagnostics (nouvelle fonctionnalité) -----
  const webhook = process.env.SEND_WEBHOOK_URL;

  // Si pas de webhook configuré : on renvoie quand même OK avec info neutre
  if (!webhook) {
    console.warn("sendApproved: SEND_WEBHOOK_URL is not set");
    return Response.json(
      { ok: true, mongo, count: items.length, forwarded: null },
      { status: 200 }
    );
  }

  // Émission du webhook (POST JSON), avec gestion d’erreurs verbeuse
  try {
    const fetchwebh = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // TODO: ajoute ici un header d’auth si nécessaire, ex:
        // "Authorization": `Bearer ${process.env.SEND_WEBHOOK_TOKEN}`
      },
      body: JSON.stringify({ items }),
      cache: "no-store",
    });

    const bodyText = await fetchwebh.text();
    const forwarded = {
      ok: fetchwebh.ok,
      status: fetchwebh.status,
      body: safeParse(bodyText),
    };

    if (!fetchwebh.ok) {
      console.error("sendApproved: webhook non-2xx", forwarded);
      return Response.json(
        { ok: false, step: "fetch", mongo, count: items.length, forwarded },
        { status: 502 }
      );
    }

    // Succès complet (DB + Webhook)
    return Response.json(
      { ok: true, mongo, count: items.length, forwarded },
      { status: 200 }
    );
  } catch (e) {
    const cause = e?.cause || {};
    console.error("sendApproved: fetch to webhook failed:", {
      name: e?.name,
      message: e?.message,
      code: cause.code,
      errno: cause.errno,
      syscall: cause.syscall,
      hostname: cause.hostname,
    });
    return Response.json(
      {
        ok: false,
        step: "fetch",
        mongo,
        count: items.length,
        error: e?.message || String(e),
        code: cause.code,
        host: cause.hostname,
      },
      { status: 502 }
    );
  }
}

export async function GET() {
  return Response.json({ ok: true, msg: "sendApproved is alive" });
}




// // app/api/sendApproved/route.js
// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// import { connectDB } from "@/lib/db";
// import AlreadySent from "@/models/AlreadySent";

// function safeParse(text) {
//   try {
//     return JSON.parse(text);
//   } catch {
//     return text;
//   }
// }

// export async function POST(req) {
//   let body;
//   try {
//     body = await req.json();
//   } catch {
//     return Response.json(
//       { ok: false, error: "Invalid JSON body" },
//       { status: 400 }
//     );
//   }

//   const { accepted = [], rejected = [] } = body || {};
//   const acc = Array.isArray(accepted) ? accepted : [];
//   const rej = Array.isArray(rejected) ? rejected : [];

//   let mongo = { insertedAccepted: 0, insertedRejected: 0 };
//   try {
//     await connectDB();
//     const doc = await AlreadySent.findOne({}).lean();

//     const existingIds = new Set([
//       ...(doc?.accepted?.map((x) => x.id) || []),
//       ...(doc?.rejected?.map((x) => x.id) || []),
//     ]);

//     const incoming = [...acc, ...rej];
//     const incomingIds = new Set(incoming.map((x) => x.id).filter(Boolean));

//     for (const id of incomingIds) {
//       if (existingIds.has(id)) {
//         return Response.json({
//           ok: true,
//           note: "DB wins: at least one offer already exists",
//           skippedIds: [...incomingIds].filter((i) => existingIds.has(i)),
//         });
//       }
//     }

//     const uniqById = (arr) =>
//       Object.values(arr.reduce((m, it) => (it?.id ? (m[it.id] = it) : m), {}));

//     const accUniq = uniqById(acc);
//     const rejUniq = uniqById(rej);

//     const accIds = new Set(accUniq.map((i) => i.id).filter(Boolean));
//     const rejExclusive = rejUniq.filter((i) => !accIds.has(i.id));

//     const idsToPull = [
//       ...new Set([...accUniq, ...rejExclusive].map((i) => i.id).filter(Boolean)),
//     ];

//     if (idsToPull.length) {
//       await AlreadySent.updateOne(
//         {},
//         {
//           $pull: {
//             accepted: { id: { $in: idsToPull } },
//             rejected: { id: { $in: idsToPull } },
//           },
//         },
//         { upsert: true }
//       );
//     }

//     const ops = {};
//     if (accUniq.length) ops.accepted = { $each: accUniq };
//     if (rejExclusive.length) ops.rejected = { $each: rejExclusive };

//     if (Object.keys(ops).length) {
//       const res = await AlreadySent.updateOne({}, { $push: ops }, { upsert: true });
//       mongo.insertedAccepted = accUniq.length;
//       mongo.insertedRejected = rejExclusive.length;
//       mongo.upserted = !!res.upsertedCount;
//       mongo.modified = res.modifiedCount;
//     }
//   } catch (e) {
//     console.error("sendApproved: DB error:", e?.name, e?.message);
//     return Response.json(
//       { ok: false, step: "db", error: e?.message || String(e) },
//       { status: 500 }
//     );
//   }

//   return Response.json({ ok: true, mongo }, { status: 200 });
// }

// export async function GET() {
//   return Response.json({ ok: true, msg: "sendApproved is alive" });
// }

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
