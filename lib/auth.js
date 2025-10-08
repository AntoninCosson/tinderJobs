// lib/auth.js
import { connectDB } from "@/lib/db";
import User from "@/models/Users";
import { headers as nextHeaders, cookies as nextCookies } from "next/headers";

export async function getCurrentUserId(req) {
  const H = req?.headers || (await nextHeaders());
  const fromHeader = H.get("x-user-id");
  if (fromHeader) return String(fromHeader);

  try {
    const C = await nextCookies();
    const uid = C.get("tj_uid")?.value;
    if (uid) return String(uid);
  } catch {}

  return null;
}

export async function getCurrentUserEmailFromDB(userId) {
  if (!userId) return null;
  await connectDB();
  const user = await User.findById(userId, "email").lean();
  return user?.email || null;
}
