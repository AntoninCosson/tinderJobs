// app/api/py/scrape/route.js
import { NextResponse } from "next/server";
import { getCurrentUserId, getCurrentUserEmailFromDB } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RAW = (process.env.PY_BACK_SCRAPE_URL || "").trim();
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
  const email = await getCurrentUserEmailFromDB(userId);
  if (!userId)
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });

  if (!RAW) {
    return json(
      { ok: false, error: "PY_BACK_SCRAPE_URL not set" },
      { status: 501 }
    );
  }

  let target;
  try {
    target = new URL(RAW);
  } catch {
    return json({ ok:false, error:"PY_BACK_SCRAPE_URL invalid" }, { status:500 });
  }
  if (!target.pathname || target.pathname === "/") target.pathname = "/run-cli";


  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { queries = [], options = {}, scheduleId, } = body || {};

  if (!Array.isArray(queries) || queries.length === 0) {
    return json(
      { ok: false, error: "queries[] required" },
      { status: 400 }
    );
  }
  const now = Date.now();


  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let r;
  try {
    r = await fetch(target.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(SCRAPER_TOKEN ? { authorization: `Bearer ${SCRAPER_TOKEN}` } : {}),
        "x-user-id": String(userId),
        ...(email ? { "x-user-email": email } : {}), 
        ...(scheduleId ? { "x-schedule-id": String(scheduleId) } : {}),
      },
      body: JSON.stringify({ queries, options }),
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

  return json({ ok: true, sent: d?.sent ?? 0, received: d });
}
