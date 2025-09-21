// app/api/sendApproved/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
      const fw = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // tip: add your auth header here if needed
        body: JSON.stringify({ items }),
        cache: 'no-store',
      });
      const bodyText = await fw.text();
      forwarded = { ok: fw.ok, status: fw.status, body: safeParse(bodyText) };
      if (!fw.ok) console.error('sendApproved: webhook non-2xx', forwarded);
    } catch (e) {
      console.error('sendApproved: fetch to webhook failed:', e?.name, e?.message);
      return Response.json(
        { ok: false, step: 'fetch', error: e?.message || String(e) },
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






// // app/api/sendApproved/route.js
// export const dynamic = "force-dynamic"; // évite tout static rendering/caching

// function safeParse(text) {
//   try { return JSON.parse(text); } catch { return text; }
// }

// export async function POST(req) {
//   try {
//     const { items = [] } = await req.json().catch(() => ({ items: [] }));

//     // Optionnel : forward vers un webhook si présent en env
//     const webhook = process.env.SEND_WEBHOOK_URL; // mets ta valeur dans .env.local si besoin
//     let forwarded = null;

//     if (webhook) {
//       const fw = await fetch(webhook, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ items }),
//       });
//       const bodyText = await fw.text(); // on lit le texte brut pour ne pas re-crasher si pas du JSON
//       forwarded = { ok: fw.ok, status: fw.status, body: safeParse(bodyText) };

//       if (!fw.ok) {
//         console.error("webhook failed:", forwarded);
//         // On **n’échoue pas** volontairement ici pour garder ton UX souple,
//         // mais tu peux retourner une 502 si tu veux bloquer l’envoi tant que le webhook échoue.
//       }
//     }

//     return Response.json({ ok: true, count: items.length, forwarded });
//   } catch (e) {
//     console.error("sendApproved error:", e);
//     return Response.json(
//       { ok: false, error: e?.message || String(e) },
//       { status: 500 }
//     );
//   }
// }

// // pratique pour tester vite fait depuis le navigateur
// export async function GET() {
//   return Response.json({ ok: true, msg: "sendApproved is alive" });
// }