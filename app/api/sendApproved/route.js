// app/api/sendApproved/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/db";
import AlreadySent from "@/models/AlreadySent";
import UserOffer from "@/models/UserOffer";

function safeParse(text) {
  try { return JSON.parse(text); } catch { return text; }
}

function extractIdsFromForwardBody(body, fallbackIds = []) {
  if (!body) return [];
  if (Array.isArray(body) && body.every(x => typeof x === "string")) return body;

  const candidates = [
    body.receivedIds, body.ids, body.okIds, body.ackIds, body.acceptedIds, body.successIds
  ].find(arr => Array.isArray(arr));
  if (Array.isArray(candidates)) return candidates.filter(Boolean);

  if (body.results && typeof body.results === "object") {
    return Object.entries(body.results)
      .filter(([, v]) => v === true || v === "ok" || v === 200)
      .map(([k]) => k);
  }
  return [];
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    console.error("sendApproved: invalid JSON:", e);
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { accepted = [], rejected = [], items: rawItems, userId: rawUserId } = body || {};
  const userId = rawUserId || "default";

  const items = Array.isArray(rawItems) ? rawItems : [];
  const sentIds = items.map(i => i?.id).filter(Boolean);

  let mongo = { insertedAccepted: 0, insertedRejected: 0 };
  try {
    await connectDB();
    const doc = await AlreadySent.findOne({}).lean();

    const existingIds = new Set([
      ...(doc?.accepted?.map((x) => x.id) || []),
      ...(doc?.rejected?.map((x) => x.id) || []),
    ]);

    const incoming = [...(Array.isArray(accepted) ? accepted : []), ...(Array.isArray(rejected) ? rejected : [])];
    const incomingIds = new Set(incoming.map((x) => x?.id).filter(Boolean));

    for (const id of incomingIds) {
      if (existingIds.has(id)) {
        return Response.json({
          ok: true,
          note: "DB wins: at least one offer already exists",
          skippedIds: [...incomingIds].filter((i) => existingIds.has(i)),
          count: items.length,
          forwarded: null,
          receivedIds: [],
          failedIds: [...sentIds],
        });
      }
    }

    const uniqById = (arr) =>
      Object.values((arr || []).reduce((m, it) => {
        const k = it?.id; if (k) m[k] = it; return m;
      }, {}));

    const accUniq = uniqById(accepted);
    const rejUniq = uniqById(rejected);
    const accIds = new Set(accUniq.map((i) => i?.id).filter(Boolean));
    const rejExclusive = rejUniq.filter((i) => i?.id && !accIds.has(i.id));

    const idsToPull = [...new Set([...accUniq, ...rejExclusive].map((i) => i?.id).filter(Boolean))];

    if (idsToPull.length) {
      await AlreadySent.updateOne(
        {},
        { $pull: { accepted: { id: { $in: idsToPull } }, rejected: { id: { $in: idsToPull } } } },
        { upsert: true }
      );
    }

    const ops = {};
    if (accUniq.length) ops.accepted = { $each: accUniq };
    if (rejExclusive.length) ops.rejected = { $each: rejExclusive };

    if (Object.keys(ops).length) {
      const res = await AlreadySent.updateOne({}, { $push: ops }, { upsert: true });
      mongo.insertedAccepted = accUniq.length;
      mongo.insertedRejected = rejExclusive.length;
      mongo.upserted = !!res.upsertedCount;
      mongo.modified = res.modifiedCount;
    }
  } catch (e) {
    console.error("sendApproved: DB error:", e?.name, e?.message);
    return Response.json({ ok: false, step: "db", error: e?.message || String(e) }, { status: 500 });
  }

  const webhook = process.env.SEND_WEBHOOK_URL;
  if (!webhook) {
    console.warn("sendApproved: SEND_WEBHOOK_URL is not set");
    return Response.json({
      ok: true,
      mongo,
      count: items.length,
      forwarded: null,
      receivedIds: [],
      failedIds: sentIds,
    }, { status: 200 });
  }

    function toArray(x) {
        if (!x) return [];
        return Array.isArray(x) ? x : [x];
      }
      function str(x) {
        return (x == null ? "" : String(x));
      }
      function ensureCvName(snap) {
        const cvInfos = Array.isArray(snap?.cvInfos) ? snap.cvInfos : [];
        const pi = cvInfos?.[0]?.personal_info || {};
        const first = str(pi.firstName).trim();
        const last  = str(pi.lastName).trim();
        const full  = [first, last].filter(Boolean).join(" ").trim();
        return snap?.cv || (full || null);
      }
      function normalizeUrls(u) {
        const list = toArray(u)
          .map(str)
          .map(s => s.trim())
          .filter(Boolean);
        return list;
      }
      function normalizeTasks(arr) {
        return toArray(arr).map(str).map(s => s.trim()).filter(Boolean);
      }
     
      let forwardItems = items;
      try {
        await connectDB();
        const userDoc = await UserOffer.findById(userId, { offers: 1 }).lean();
        const byId = new Map((userDoc?.offers || []).map(o => [o.offerId, o]));
     
        forwardItems = sentIds.map(id => {
          const rec  = byId.get(id) || {};
          const snap = rec?.snapshot || {};
     
 
          const track        = snap.track ?? null;
          const cv           = ensureCvName(snap);
          const cvInfos      = Array.isArray(snap.cvInfos) ? snap.cvInfos : [];
          const company      = snap.company ?? snap.organisation ?? snap.org ?? null;
          const offer        = snap.offer ?? snap.title ?? null;
          const description  = snap.description ?? snap.summary ?? null;
          const location     = snap.location ?? snap.city ?? null;
          const postedAt     = snap.postedAt ?? null;
          const tasks        = normalizeTasks(snap.tasks);
          const mathingScore = snap.mathingScore ?? snap.matchingScore ?? null;
          const offersSkill  = snap.offersSkill ?? { tech: [], soft: [] };
          const missingStrong= Array.isArray(snap.missingStrong) ? snap.missingStrong : [];
          const url          = normalizeUrls(snap.url);
          const missingDoc   = !!snap.missingDoc;
          const expectedName = snap.expectedName ?? id;
     
          return {
            track,
            cv,
            cvInfos,
            company,
            offer,
            description,
            location,
            postedAt,
            tasks,
            mathingScore,
            offersSkill,
            missingStrong,
            url,
            missingDoc,
            expectedName,
            meta: {
              source: "webapp",
              userId,
              statusAtSend: rec?.status ?? null,
              sentAt: new Date().toISOString(),
              version: 1,
            },
          };
        });
      } catch (e) {
        console.warn("sendApproved: enrich failure (fallback to ids only):", e?.message);
        forwardItems = items;
      }

  let forwarded = null;
  let receivedIds = [];
  let failedIds = [...sentIds];


  try {
    const r = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: forwardItems, userId }),
      cache: "no-store",
    });

    const bodyText = await r.text();
    const parsed = safeParse(bodyText);
    forwarded = { ok: r.ok, status: r.status, body: parsed };

    if (!r.ok) {
      console.error("sendApproved: webhook non-2xx", forwarded);
      return Response.json(
        { ok: false, step: "fetch", mongo, count: items.length, forwarded, receivedIds: [], failedIds: sentIds },
        { status: 502 }
      );
    }

    receivedIds = extractIdsFromForwardBody(parsed, sentIds);
    if (!receivedIds.length) receivedIds = [...sentIds];
    const receivedSet = new Set(receivedIds);
    failedIds = sentIds.filter(id => !receivedSet.has(id));
  } catch (e) {
    const cause = e?.cause || {};
    console.error("sendApproved: fetch to webhook failed:", {
      name: e?.name, message: e?.message, code: cause.code, errno: cause.errno, syscall: cause.syscall, hostname: cause.hostname,
    });
    return Response.json({
      ok: false, step: "fetch", mongo, count: items.length,
      error: e?.message || String(e),
      code: cause.code, host: cause.hostname,
      receivedIds: [], failedIds: sentIds,
    }, { status: 502 });
  }

  try {
    if (receivedIds.length) {
      const r = await UserOffer.updateOne(
        { _id: userId },
        {
          $set: {
            "offers.$[elem].status": "sent",
            "offers.$[elem].updatedAt": new Date(),
          },
        },
        {
          arrayFilters: [{ "elem.offerId": { $in: receivedIds } }],
        }
      );
      console.log("UserOffer updateOne (sent ack) →", r);
    }
  } catch (e) {
    console.error("sendApproved: UserOffer update error:", e);
  }

  return Response.json(
    { ok: true, mongo, count: items.length, forwarded, receivedIds, failedIds },
    { status: 200 }
  );
}

export async function GET() {
  return Response.json({ ok: true, msg: "sendApproved is alive" });
}

