// app/api/querysets/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import SavedQueriesSet from "@/models/SavedQueriesSet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req) {
  try {
    await connectDB();
    const userId = await getCurrentUserId(req);
    if (!userId)
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );

    const url = new URL(req.url);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50", 10),
      200
    );
    const skip = Math.max(parseInt(url.searchParams.get("skip") || "0", 10), 0);

    const data = await SavedQueriesSet.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({ ok: true, data, meta: { skip, limit } });
  } catch (e) {
    console.error("[querysets:GET]", e);
    return NextResponse.json(
      { ok: false, error: e.message || String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const userId = await getCurrentUserId(req);
    if (!userId)
      return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401 });

    const body = await req.json().catch(() => ({}));
    const { id, name = "Search", queries = [] } = body;

    if (!Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json({ ok:false, error:"queries[] required" }, { status:400 });
    }

    let doc;
    if (id) {
      doc = await SavedQueriesSet.findOneAndUpdate(
        { _id: id, userId },
        { $set: { name, queries } },
        { new: true }
      );
      if (!doc) return NextResponse.json({ ok:false, error:"not found" }, { status:404 });
    } else {
      doc = await SavedQueriesSet.create({ userId, name, queries }); // <— ici
    }

    return NextResponse.json({ ok:true, id: doc._id, data: doc });
  } catch (e) {
    console.error("[querysets:POST]", e);
    return NextResponse.json({ ok:false, error: e.message || String(e) }, { status:500 });
  }
}
