export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Offer from "@/models/Offer"; 
import UserOffer from "@/models/UserOffer"; 
import { getCurrentUserId } from "@/lib/auth";

import mongoose from 'mongoose';

function normalizeOffersPayload(p) {
  if (!p) return [];
  if (Array.isArray(p)) return p;
  if (p.Offer) return [p.Offer];
  if (Array.isArray(p.offers)) return p.offers;
  if (Array.isArray(p.data?.offers)) return p.data.offers;
  return [p];
}

export async function POST(req) {
  try {
    await connectDB();

    console.log('[DB]', mongoose.connection.host, mongoose.connection.name);

    const body = await req.json().catch(() => ({}));
    const userId = await getCurrentUserId(req);
      if (!userId || userId === "default") {
        return NextResponse.json({ ok:false, error:"Not authenticated" }, { status:401 });
      }

    const offers = normalizeOffersPayload(body);
    if (!offers.length) return NextResponse.json({ ok:false, reason:"empty payload" }, { status:400 });

    const offerOps = offers.map((o) => {
      const _id = o.expectedName || `${o.company}|${o.offer}`;
      return {
        updateOne: {
          filter: { _id },
          update: {
            $setOnInsert: { _id, source: "webhook" },
            $set: {
              userId,
              offer: o.offer,
              title: o.offer,
              company: o.company,
              description: o.description,
              location: o.location ?? "",
              postedAt: o.postedAt,
              url: Array.isArray(o.url) ? o.url : (o.url ? [o.url] : []),
              tasks: Array.isArray(o.tasks) ? o.tasks : [],
              mathingScore: o.mathingScore ?? {},
              offersSkill: o.offersSkill ?? { tech: [], soft: [] },
              track: o.track, cv: o.cv, cvInfos: o.cvInfos ?? [],
              tags: o.offersSkill?.tech ?? [],
            },
          },
          upsert: true,
        },
      };
    });
    if (offerOps.length) await Offer.bulkWrite(offerOps, { ordered: false });

    for (const o of offers) {
      const offerId = o.expectedName || `${o.company}|${o.offer}`;
      const snapshot = {
        ...o,
        url: Array.isArray(o.url) ? o.url : (o.url ? [o.url] : []),
        tasks: Array.isArray(o.tasks) ? o.tasks : [],
      };

      const r1 = await UserOffer.updateOne(
        { _id: userId, "offers.offerId": offerId },
        {
          $set: {
            "offers.$.status": "unread",
            "offers.$.snapshot": snapshot,
            "offers.$.updatedAt": new Date(),
          },
        }
      );

      if (r1.matchedCount === 0) {
        await UserOffer.updateOne(
          { _id: userId },
          {
            $setOnInsert: { _id: userId, userId },
            $push: {
              offers: {
                offerId,
                status: "unread",
                snapshot,
                updatedAt: new Date(),
              },
            },
          },
          { upsert: true }
        );
      }
    }

    return NextResponse.json({ ok: true, userId, received: offers.length });
  } catch (e) {
    console.error("[getOffers:POST] error:", e);
    return NextResponse.json({ ok:false, error: e.message || String(e) }, { status:500 });
  }
}



export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "unread";

    const userId = await getCurrentUserId(req);
      if (!userId || userId === "default") {
          return NextResponse.json({ ok:false, error:"Not authenticated" }, { status:401 });
        }

    const doc = await UserOffer.findById(userId, { offers: 1 }).lean();

    if (!doc || !Array.isArray(doc.offers) || doc.offers.length === 0) {
      return NextResponse.json({ ok: true, data: [] });
    }

    const filtered = doc.offers
      .filter(x => (status ? x.status === status : true))
      .sort((a, b) => (new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)));

    const data = filtered.map(x => {
      const o = { ...(x.snapshot || {}) };

      if (!Array.isArray(o.tasks)) o.tasks = [];
      if (typeof o.url === "string") o.url = [o.url];
      if (!Array.isArray(o.url)) o.url = [];
      if (!o.offer && o.title) o.offer = o.title;

      o.offerId = x.offerId;
      o.status = x.status;
      o.updatedAt = x.updatedAt || x.createdAt;

      return o;
    });

    return NextResponse.json({ ok: true, data, meta: { total: filtered.length, status } });
  } catch (e) {
    console.error("[getOffers:GET] error:", e);
    return NextResponse.json({ ok:false, error: e.message || String(e) }, { status:500 });
  }
}


// export async function GET(req) {
//   try {
//     await connectDB();
//     // const url = new URL(req.url);
//     // const userId = url.searchParams.get("userId") || "default";
//     const userId = await getCurrentUserId(req);

//     const doc = await UserOffer.findById(userId).lean();
//     const data = (doc?.offers || [])
//       .filter(x => x.status === "unread")
//       .map(x => {
//         const o = { ...(x.snapshot || {}) };
//         if (!Array.isArray(o.tasks)) o.tasks = [];
//         if (typeof o.url === "string") o.url = [o.url];
//         if (!Array.isArray(o.url)) o.url = [];
//         if (!o.offer && o.title) o.offer = o.title;
//         return o;
//       });

//     return NextResponse.json({ ok: true, data });
//   } catch (e) {
//     console.error("[getOffers:GET] error:", e);
//     return NextResponse.json({ ok:false, error: e.message || String(e) }, { status:500 });
//   }
// }