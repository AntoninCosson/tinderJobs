// lib/db.js
import mongoose from "mongoose";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || "tinder-jobs",
    });

    isConnected = true;
    console.log("✅ Database connected");
    console.log("📂 Base actuelle :", mongoose.connection.name);
  } catch (err) {
    console.error("❌ Database connection error:", err);
  }
}