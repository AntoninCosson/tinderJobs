// app/api/py/scrape/route.js
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(req) {
  const userId = await getCurrentUserId(req);
  if (!userId || userId === "default") {
    return NextResponse.json({ ok:false, error:"Not authenticated" }, { status:401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { queries = [], options = {} } = body;




    // A virer quand py sera déployé
    if (!process.env.PY_BACK_SCRAPE_URL) {
      return NextResponse.json({ ok:true, dev:true, count: 0, echo: { userId: String(userId), queries, options } });
    }
    // 

    

    if (!Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json({ ok:false, error:"queries[] required" }, { status:400 });
    }

    const r = await fetch(process.env.PY_BACK_SCRAPE_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": String(userId) },
      body: JSON.stringify({
        userId: String(userId),
        queries,
        options,
        // scheduleId: ...    // si un jour tu veux déclencher depuis un schedule
      }),
    });

    console.log("r:", r)

    const d = await r.json().catch(() => ({}));
    if (!r.ok || d?.ok === false) {
      return NextResponse.json({ ok:false, error: d?.error || "PY scrape failed" }, { status:502 });
    }

    return NextResponse.json({ ok:true, count: d.count ?? 0, received: d });
  } catch (e) {
    return NextResponse.json({ ok:false, error: e.message || "Proxy error" }, { status:500 });
  }
}