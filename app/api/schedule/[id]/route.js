// app/api/schedule/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Schedule from "@/models/Schedule";
import { getCurrentUserId } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(_, { req, ctx }) {
  try {
    await connectDB();
    const userId = await getCurrentUserId(req);
    const { id } = await ctx.params;  
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });
    }
    const doc = await Schedule.findOne({ _id: id, userId }).lean();
    if (!doc)
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 }
      );
    return NextResponse.json({ ok: true, data: doc });
  } catch (err) {
    console.error("[GET /api/schedule/:id]", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req, ctx) {
  try {
    await connectDB();
    const userId = await getCurrentUserId(req);
    const { id } = await ctx.params; 
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });
    }
    const patch = await req.json().catch(() => ({}));
    const allowed = ["name", "cron", "queries", "active", "meta"];
    const $set = {};
    for (const k of allowed) if (k in patch) $set[k] = patch[k];

    const doc = await Schedule.findOneAndUpdate(
      { _id: id, userId },
      { $set },
      { new: true }
    );
    if (!doc)
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 }
      );
    return NextResponse.json({ ok: true, data: doc });
  } catch (err) {
    console.error("[PATCH /api/schedule/:id]", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE( req, ctx) {
  try {
    await connectDB();
    const userId = await getCurrentUserId(req);
    const { id } = await ctx.params; 
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });
    }
    const doc = await Schedule.findOneAndDelete({ _id: id, userId });
    if (!doc)
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 }
      );
    return NextResponse.json({ ok: true, data: { _id: id } });
  } catch (err) {
    console.error("[DELETE /api/schedule/:id]", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
