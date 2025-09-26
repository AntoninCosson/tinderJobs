// app/api/status/route.js
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserOffer from "@/models/UserOffer";

export async function PATCH(req) {
  try {
    await connectDB();
    const { userId = "default", offerId, status } = await req.json();
    console.log("[/api/status] payload:", { userId, offerId, status });

    if (!offerId || !status) {
      return NextResponse.json(
        { ok: false, error: "offerId & status required" },
        { status: 400 }
      );
    }

    if (offerId === "*") {
      const r = await UserOffer.updateOne(
        { _id: userId },
        {
          $set: {
            "offers.$[].status": "unread",
            "offers.$[].updatedAt": new Date(),
          },
        }
      );
      console.log("[/api/status] reset all →", r);
      return NextResponse.json({ ok: true, reset: r.modifiedCount });
    }

    const r = await UserOffer.updateOne(
      { _id: userId, "offers.offerId": offerId },
      { $set: { "offers.$.status": status, "offers.$.updatedAt": new Date() } }
    );
    console.log("[/api/status] updateOne:", r);

    if (r.matchedCount === 0) {
      return NextResponse.json(
        { ok: false, error: "Offer not found for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      matched: r.matchedCount,
      modified: r.modifiedCount,
    });
  } catch (e) {
    console.error("[/api/status] PATCH error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || String(e) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, via: "GET /api/status" });
}
