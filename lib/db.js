// lib/db.js
import mongoose from "mongoose";

let cached = global._mongoose || (global._mongoose = { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || undefined,
    }).then((m) => m.connection);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}