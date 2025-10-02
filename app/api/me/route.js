// app/api/me/route.js
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(req) {
  const uid = await getCurrentUserId(req);
  const authed = !!uid && uid !== 'default';
  return NextResponse.json({ authed, userId: authed ? uid : null });
}