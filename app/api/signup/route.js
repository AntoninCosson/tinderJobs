// app/api/auth/signup/route.js
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

  const exists = await User.findOne({ email }).lean();
  if (exists) {
    return NextResponse.json({ ok:false, error:"Email already registered" }, { status:409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash });

  const res = NextResponse.json({ ok:true, userId: String(user._id) });
  res.cookies.set("tj_uid", String(user._id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 an
  });
  return res;
}