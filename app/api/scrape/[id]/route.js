// app/api/py/status/[id]/route.js
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RUN_URL = process.env.PY_BACK_SCRAPE_URL?.trim();

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function statusBase(url) {
  if (!url) return null;
  return url.replace(/\/run\/?$/i, "");
}

export async function GET(_req, { params }) {
  const id = params?.id;
  if (!id) return json({ ok: false, error: "Missing task id" }, 400);

  if (!RUN_URL)
    return json({ ok: false, error: "PY_BACK_SCRAPE_URL not set" }, 501);

  const BASE = statusBase(RUN_URL);
  if (!BASE)
    return json({ ok: false, error: "Invalid PY_BACK_SCRAPE_URL" }, 501);

  const url = `${BASE}/status/${encodeURIComponent(id)}`;

  try {
    const r = await fetch(url, { cache: "no-store" });
    const up = await r.json().catch(() => null);
    if (!r.ok) {
      return json(
        {
          ok: false,
          error: "upstream_error",
          upstreamStatus: r.status,
          detail: up,
        },
        502
      );
    }
    return json({ ok: true, received: up });
  } catch (e) {
    return json(
      { ok: false, error: "scraper_unreachable", detail: String(e) },
      503
    );
  }
}
