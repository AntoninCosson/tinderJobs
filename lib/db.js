// lib/db.js
import mongoose from "mongoose";

let isConnected = false;

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('Missing MONGODB_URI');

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };


// export async function connectDB() {
//   if (isConnected) return;

//   try {
//     await mongoose.connect(process.env.MONGODB_URI, {
//       dbName: process.env.MONGODB_DB || "tinder-jobs",
//     });

//     isConnected = true;
//     console.log("✅ Database connected");
//     console.log("📂 Base actuelle :", mongoose.connection.name);
//   } catch (err) {
//     console.error("❌ Database connection error:", err);
//   }
// }


export async function connectDB() {
  try{
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
      cached.promise = mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        dbName: process.env.MONGODB_DB || 'tinder-jobs',
      }).then((m) => {
        console.log('✅ Mongo connected:', m.connection.host, m.connection.name);
        return m;
      });
    }
    cached.conn = await cached.promise;
    return cached.conn;
  }
  catch (err) {
    console.error("❌ Database connection error:", err);
  }
}