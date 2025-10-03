// app/api/schedule/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Schedule from "@/models/Schedule";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();
    const userId = await getCurrentUserId(req); // vérifie que ça marche sans session
    const list = await Schedule.find({ userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ ok: true, data: list });
  } catch (err) {
    console.error("[GET /api/schedule] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const userId = await getCurrentUserId(req);

    const body = await req.json().catch(() => ({}));
    console.log("[POST /api/schedule] body:", body);

    const { name, cron, queries = [], meta = {}, active } = body;

    if (!cron || typeof cron !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid 'cron' (string required)" },
        { status: 400 }
      );
    }
    if (!Array.isArray(queries)) {
      return NextResponse.json(
        { ok: false, error: "'queries' must be an array" },
        { status: 400 }
      );
    }

    const doc = await Schedule.create({
      userId,
      name: name || "Search",
      cron,
      queries,
      meta,
      active: active !== undefined ? !!active : true,
    });

    return NextResponse.json({ ok: true, data: doc });
  } catch (err) {
    console.error("[POST /api/schedule] Error:", err);
    // Si c’est un ValidationError mongoose, renvoie 400
    if (err?.name === "ValidationError") {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
