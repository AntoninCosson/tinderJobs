// app/api/schedules/[id]/run/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import Schedule from "@/models/Schedule";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req, { params }) {
  try {
    await connectDB();
    const userId = await getCurrentUserId(req);
    if (!userId)
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );

    const { id } = params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });
    }

    const doc = await Schedule.findOne({ _id: id, userId }).lean();
    if (!doc)
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 }
      );

    const target = process.env.PY_SCRAPE_URL; // p.ex. "https://py-back.example.com/run" à mettre dans .env
    if (!target) {
      return NextResponse.json(
        { ok: false, error: "PY_SCRAPE_URL not set" },
        { status: 500 }
      );
    }

    const payload = {
      userId: String(userId),
      scheduleId: String(doc._id),
      cron: doc.cron,
      queries: doc.queries, // ← direct dans la commande bash côté py
    };

    const r = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const d = await r.json().catch(() => ({}));
    if (!r.ok || d?.ok === false) {
      return NextResponse.json(
        { ok: false, error: d?.error || `backend failed (${r.status})` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, started: true, received: d });
  } catch (e) {
    console.error("[schedule:run:POST]", e);
    return NextResponse.json(
      { ok: false, error: e.message || String(e) },
      { status: 500 }
    );
  }
}
