// models/AlreadySent.js
import mongoose from "mongoose";

const SentItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true },
    company: String,
    offer: String,
    description: String,
    postedAt: String,
  },
  { _id: false }
);

const AlreadySentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true, unique: true },
    accepted: { type: [SentItemSchema], default: [] },
    rejected: { type: [SentItemSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.AlreadySent
  || mongoose.model("AlreadySent", AlreadySentSchema);