import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserOffer from "@/models/UserOffer";

export async function PATCH(req) {
  try {
    await connectDB();
    const { userId = "default", offerId, status } = await req.json();
    if (!offerId || !status) {
      return NextResponse.json({ ok: false, error: "offerId and status are required" }, { status: 400 });
    }
    const r = await UserOffer.updateOne(
      { userId, offerId },
      { $set: { status, updatedAt: new Date() } }
    );
    if (r.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: "UserOffer not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[status] error:", e);
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
