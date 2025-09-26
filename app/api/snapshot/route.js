// app/api/offer/snapshot/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/db";
import UserOffer from "@/models/UserOffer";

export async function PATCH(req) {
  try {
    const { userId = "default", offerId, snapshot } = await req.json();
    if (!offerId || !snapshot) {
      return Response.json({ ok:false, error:"offerId and snapshot required" }, { status:400 });
    }
    await connectDB();
    const r = await UserOffer.updateOne(
      { _id: userId },
      {
        $set: {
          "offers.$[elem].snapshot": snapshot,
          "offers.$[elem].updatedAt": new Date(),
        },
      },
      { arrayFilters: [{ "elem.offerId": offerId }] }
    );
    return Response.json({ ok:true, matched:r.matchedCount, modified:r.modifiedCount });
  } catch (e) {
    console.error("snapshot PATCH error:", e);
    return Response.json({ ok:false, error:String(e) }, { status:500 });
  }
}