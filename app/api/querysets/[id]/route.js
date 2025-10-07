// app/api/querysets/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import SavedQueriesSet from "@/models/SavedQueriesSet";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function ensureValidId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("invalid id");
  }
  return id;
}

export async function GET(req, ctx) {
  try {
    await connectDB();
    const userId = await getCurrentUserId(req);
    if (!userId)
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );

    const { id } = await ctx.params;
    ensureValidId(id);

    const doc = await SavedQueriesSet.findOne({ _id: id, userId }).lean();
    if (!doc)
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 }
      );

    return NextResponse.json({ ok: true, data: doc });
  } catch (e) {
    console.error("[querysets:id:GET]", e);
    return NextResponse.json(
      { ok: false, error: e.message || String(e) },
      { status: 500 }
    );
  }
}

export async function PATCH(req, ctx) {
  try {
    await connectDB();
    const userId = await getCurrentUserId(req);
    if (!userId)
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );

    const { id } = await ctx.params;
    ensureValidId(id);

    const body = await req.json().catch(() => ({}));
    const { name, queries } = body || {};

    const $set = {};
    if (typeof name === "string") $set.name = name;
    if (Array.isArray(queries)) {
      if (!queries.length) {
        return NextResponse.json(
          { ok: false, error: "queries[] cannot be empty" },
          { status: 400 }
        );
      }
      $set.queries = queries;
    }
    if (!Object.keys($set).length) {
      return NextResponse.json(
        { ok: false, error: "nothing to update" },
        { status: 400 }
      );
    }

    const doc = await SavedQueriesSet.findOneAndUpdate(
      { _id: id, userId },
      { $set, $currentDate: { updatedAt: true } },
      { new: true }
    );
    if (!doc)
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 }
      );

    return NextResponse.json({ ok: true, id: doc._id, data: doc });
  } catch (e) {
    console.error("[querysets:id:PATCH]", e);
    return NextResponse.json(
      { ok: false, error: e.message || String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req, ctx) {
  try {
    await connectDB();
    const userId = await getCurrentUserId(req);
    if (!userId)
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );

    const { id } = await ctx.params;
    ensureValidId(id);

    const r = await SavedQueriesSet.deleteOne({ _id: id, userId });
    if (r.deletedCount === 0) {
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, deleted: r.deletedCount });
  } catch (e) {
    console.error("[querysets:id:DELETE]", e);
    return NextResponse.json(
      { ok: false, error: e.message || String(e) },
      { status: 500 }
    );
  }
}
