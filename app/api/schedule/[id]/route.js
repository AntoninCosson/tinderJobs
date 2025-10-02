// app/api/schedules/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Schedule from "@/models/Schedule";
import { getCurrentUserId } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(_, { params }) {
  await connectDB();
  const userId = await getCurrentUserId();
  const { id } = params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ ok:false, error:"bad id" }, { status:400 });
  const doc = await Schedule.findOne({ _id:id, userId }).lean();
  if (!doc) return NextResponse.json({ ok:false, error:"not found" }, { status:404 });
  return NextResponse.json({ ok:true, data: doc });
}

export async function PATCH(req, { params }) {
  await connectDB();
  const userId = await getCurrentUserId(req);
  const { id } = params;
  const patch = await req.json().catch(()=> ({}));
  const allowed = ["name","cron","queries","active"];
  const $set = {};
  for (const k of allowed) if (k in patch) $set[k] = patch[k];
  const doc = await Schedule.findOneAndUpdate({ _id:id, userId }, { $set }, { new:true });
  if (!doc) return NextResponse.json({ ok:false, error:"not found" }, { status:404 });
  return NextResponse.json({ ok:true, data: doc });
}
