// app/api/status/route.js
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserOffer from "@/models/UserOffer";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = await getCurrentUserId(req);
    if (!userId) return NextResponse.json({ ok:false, error:"Not authenticated" }, { status:401 });
    

    const doc = await UserOffer.findById(userId).lean();
    const offers = Array.isArray(doc?.offers) ? doc.offers : [];
    const by = (s) => offers.filter(o => o.status === s).map(o => o.snapshot);

    const data = {
      queued:   by("queued"),
      rejected: by("rejected"),
      sent:     by("sent"),
      unread:   by("unread"),
      accepted: by("accepted"),
    };

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("[/api/status] GET error:", e);
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await connectDB();
    const { offerId, offerIds, status } = await req.json();
    const userId = await getCurrentUserId(req);
    if (!userId) return NextResponse.json({ ok:false, error:"Not authenticated" }, { status:401 });
        
    console.log("[/api/status] payload:", { userId, offerId, offerIds, status });

    if (offerId === "*") {
      const r = await UserOffer.updateOne(
        { _id: userId },
        { $set: { "offers.$[].status":"unread", "offers.$[].updatedAt": new Date() } }
      );
      return NextResponse.json({ ok: true, reset: r.modifiedCount });
    }

    if (Array.isArray(offerIds) && offerIds.length) {
      const r = await UserOffer.updateOne(
        { _id: userId },
        { $set: { "offers.$[o].status": status, "offers.$[o].updatedAt": new Date() } },
        { arrayFilters: [{ "o.offerId": { $in: offerIds } }] }
      );
      return NextResponse.json({ ok: true, matched: r.matchedCount, modified: r.modifiedCount });
    }

    if (!offerId || !status) {
      return NextResponse.json({ ok:false, error:"offerId & status required" }, { status:400 });
    }

    const r = await UserOffer.updateOne(
      { _id: userId, "offers.offerId": offerId },
      { $set: { "offers.$.status": status, "offers.$.updatedAt": new Date() } }
    );
    if (r.matchedCount === 0) {
      return NextResponse.json({ ok:false, error:"Offer not found for this user" }, { status:404 });
    }
    return NextResponse.json({ ok:true, matched:r.matchedCount, modified:r.modifiedCount });
  } catch (e) {
    console.error("[/api/status] PATCH error:", e);
    return NextResponse.json({ ok:false, error: e.message || String(e) }, { status:500 });
  }
}

