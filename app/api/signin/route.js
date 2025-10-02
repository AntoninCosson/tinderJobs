import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/Users";
import bcrypt from "bcryptjs";

export async function POST(req) {
  await connectDB();
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ ok:false, error:"email & password required" }, { status:400 });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ ok:false, error:"Invalid credentials" }, { status:401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ ok:false, error:"Invalid credentials" }, { status:401 });
  }

  const res = NextResponse.json({ ok:true, userId: String(user._id) });
  res.cookies.set("tj_uid", String(user._id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}