import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.N8N_BASE_URL;
  if (!base) {
    return NextResponse.json(
      { ok: false, error: "N8N_BASE_URL missing" },
      { status: 500 }
    );
  }

  const headers = {};
  const u = process.env.N8N_BASIC_AUTH_USER;
  const p = process.env.N8N_BASIC_AUTH_PASSWORD;
  if (u && p) {
    headers["Authorization"] =
      "Basic " + Buffer.from(`${u}:${p}`).toString("base64");
  }

  const paths = ["/healthz", "/rest/healthz"];
  for (const path of paths) {
    try {
      const r = await fetch(`${base}${path}`, { headers, cache: "no-store" });
      if (r.ok) {
        let data = null;
        try {
          data = await r.json();
        } catch {}
        return NextResponse.json({ ok: true, path, data });
      }
    } catch (_) {}
  }

  return NextResponse.json({ ok: false }, { status: 503 });
}
