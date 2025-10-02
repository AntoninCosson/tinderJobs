// app/api/schedules/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import Schedule from "@/models/Schedule";

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

    const data = await Schedule.find({ userId }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("[schedules:GET]", e);
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
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );

    const body = await req.json().catch(() => ({}));
    const { name = "Search", cron, queries = [], active = true } = body;

    if (!cron)
      return NextResponse.json(
        { ok: false, error: "cron required" },
        { status: 400 }
      );
    if (!Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json(
        { ok: false, error: "queries[] required" },
        { status: 400 }
      );
    }

    const doc = await Schedule.create({ userId, name, cron, queries, active });
    return NextResponse.json({ ok: true, id: doc._id, data: doc });
  } catch (e) {
    console.error("[schedules:POST]", e);
    return NextResponse.json(
      { ok: false, error: e.message || String(e) },
      { status: 500 }
    );
  }
}
