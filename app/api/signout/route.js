// app/api/auth/signout/route.js
import { NextResponse } from "next/server";
export async function POST() {
  const res = NextResponse.json({ ok:true });
  res.cookies.set("tj_uid", "", { path:"/", maxAge: 0 });
  return res;
}