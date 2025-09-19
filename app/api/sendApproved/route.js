// app/api/sendApproved/route.js
export async function POST(req) {
  try {
    const { items } = await req.json();
    if (!Array.isArray(items)) {
      return new Response(JSON.stringify({ ok: false, error: "items must be array" }), { status: 400 });
    }

    // ✅ ENVOYER TOUT: pas de mapping, pas de sanitize destructif
    const payload = items.filter(x => x && typeof x === "object");

    const target = process.env.SEND_TARGET;
    if (!target) {
      // Dev mode: pas de webhook → on confirme juste la réception
      return new Response(JSON.stringify({ ok: true, count: payload.length, forwarded: false }), { status: 200 });
    }

    // Timeout soft
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 15000);

    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // on forward tel quel
      body: JSON.stringify({ items: payload }),
      signal: ac.signal,
    }).catch(e => ({ ok: false, status: 0, json: async () => ({ error: e.message }) }));

    clearTimeout(to);

    if (!res || !res.ok) {
      let err = "webhook failed";
      try { const j = await res.json(); err = j?.error || err; } catch {}
      return new Response(JSON.stringify({ ok: false, error: err }), { status: 502 });
    }

    const upstream = await res.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: true, count: payload.length, forwarded: true, upstream }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message || "invalid payload" }), { status: 400 });
  }
}