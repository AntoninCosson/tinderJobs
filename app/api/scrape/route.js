// app/api/py/scrape/route.js
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PY_URL = process.env.PY_BACK_SCRAPE_URL;
const SCRAPER_TOKEN = process.env.SCRAPER_TOKEN || "";

function json(data, init) {
  return NextResponse.json(data, init);
}
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function POST(req) {
  const userId = await getCurrentUserId(req);
  if (!userId)
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });

  if (!PY_URL) {
    return json(
      { ok: false, error: "PY_BACK_SCRAPE_URL not set" },
      { status: 501 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const {
    queries = [],
    items: inputItems = [],
    options = {},
    scheduleId,
  } = body || {};

  const wantSync = Boolean(options?.sync);

  if (
    (!Array.isArray(queries) || queries.length === 0) &&
    (!Array.isArray(inputItems) || inputItems.length === 0)
  ) {
    return json(
      { ok: false, error: "queries[] or items[] required" },
      { status: 400 }
    );
  }
  const now = Date.now();
  const items =
    Array.isArray(inputItems) && inputItems.length
      ? inputItems
      : queries.map((q, idx) => ({
          expectedName: `${(q?.query || "search").slice(0, 40)}-${idx}-${now}`,
          url: q?.url || null,
          payload: q,
        }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let r;
  try {
    r = await fetch(PY_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(SCRAPER_TOKEN ? { authorization: `Bearer ${SCRAPER_TOKEN}` } : {}),
        "x-user-id": String(userId),
        ...(scheduleId ? { "x-schedule-id": String(scheduleId) } : {}),
        ...(wantSync ? { "x-sync": "1" } : {}), 
      },
      body: JSON.stringify({
        source: options?.source || "ui-tindrrjobs",
        query: options?.querySetName || queries[0]?.query || "",
        items,
        // scheduleId
        ...(wantSync ? { meta: { sync: true } } : {}),
      }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (e) {
    clearTimeout(timeout);
    return json(
      { ok: false, error: "scraper_unreachable", detail: String(e) },
      { status: 503 }
    );
  }
  clearTimeout(timeout);

  const d = await safeJson(r);
  if (!r.ok || d?.ok === false) {
    return json(
      {
        ok: false,
        error: d?.error || "PY scrape failed",
        upstreamStatus: r.status,
        detail: d ?? null,
      },
      { status: 502 }
    );
  }

  return json({ ok: true, count: d?.count ?? 0, received: d });
}
