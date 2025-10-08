// lib/db.js
import mongoose from "mongoose";

let conn = global._mongoose;
export async function connectMongo(uri = process.env.MONGODB_URI) {
  if (conn) return conn;
  if (!uri) throw new Error("MONGODB_URI missing");
  conn = await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || "app" });
  global._mongoose = conn;
  return conn;
}

// lib/models/User.js
import mongoose, { Schema } from "mongoose";
const UserSchema = new Schema({
  email: { type: String, index: true },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model("User", UserSchema);

// lib/auth.js
import { connectMongo } from "@/lib/db";
import { User } from "@/models/Users";
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
  await connectMongo();
  const user = await User.findById(userId, { email: 1 }).lean();
  return user?.email || null;
}
