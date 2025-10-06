// app/api/alreadySent/route.js
import { connectDB } from "@/lib/db";
import AlreadySent from "@/models/AlreadySent";
import { NextResponse } from 'next/server';
import { getCurrentUserId } from "@/lib/auth";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

function mergeById(oldArr = [], newArr = []) {
  const byId = new Map(oldArr.map(x => [x.id, x]));
  for (const it of newArr) byId.set(it.id, { ...byId.get(it.id), ...it });
  return Array.from(byId.values());
}

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ ok:false, error:"Not authenticated" }, { status:401 });  
  const doc = await AlreadySent.findOne({ userId }).lean();
  return NextResponse.json({
    ok: true,
    data: doc ?? { userId, accepted: [], rejected: [] },
  });
}


export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const userId = await getCurrentUserId(req);
    if (!userId) return NextResponse.json({ ok:false, error:"Not authenticated" }, { status:401 });
    
    const accepted = Array.isArray(body.accepted) ? body.accepted : [];
    const rejected = Array.isArray(body.rejected) ? body.rejected : [];

    const existing = (await AlreadySent.findOne({ userId }).lean()) || {
      userId, accepted: [], rejected: [],
    };

    const next = {
      userId,
      accepted: mergeById(existing.accepted, accepted),
      rejected: mergeById(existing.rejected, rejected),
    };

    const saved = await AlreadySent.findOneAndUpdate(
      { userId },
      { $set: next },
      { upsert: true, new: true }
    ).lean();

    console.log("[alreadySent] upserted:", {
      collection: AlreadySent.collection.collectionName,
      _id: saved?._id?.toString?.(),
      userId: saved?.userId,
      acceptedCount: saved?.accepted?.length ?? 0,
      rejectedCount: saved?.rejected?.length ?? 0,
    });
    

    return Response.json({ ok: true, data: saved });
  } catch (err) {
    console.error("[alreadySent] POST error:", err);
    return Response.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}