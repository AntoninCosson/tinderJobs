// lib/db.js
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");

let cached = global.mongoose || (global.mongoose = { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB || "tinder-jobs",
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    }).then(m => {
        console.log('✅ Mongo connected:', m.connection.host, m.connection.name);
        return m;
      }).catch(err => {
        console.error("[db] connect error:", err?.message || err);
        throw err;
      });
    }
  
    cached.conn = await cached.promise;
    return cached.conn;
  }