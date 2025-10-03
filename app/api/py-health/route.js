// app/api/py-health/route.js
import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.PY_BACK_SCRAPE_URL;
  if (!base) {
    return NextResponse.json({ ok: false, error: "PY_BACK_SCRAPE_URL missing" }, { status: 500 });
  }

  const headers = {};
  const token = process.env.SCRAPER_BEARER;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const paths = ["/health", "/healthz", "/"];
  for (const path of paths) {
    try {
      const r = await fetch(`${base}${path}`, { headers, cache: "no-store" });
      if (r.ok) {
        let data = null;
        try { data = await r.json(); } catch {}
        return NextResponse.json({ ok: true, path, data });
      }
    } catch (_) {}
  }
  return NextResponse.json({ ok: false }, { status: 503 });
}
