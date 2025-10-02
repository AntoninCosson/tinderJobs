// models/SavedQuerySet.js
import mongoose from "mongoose";

const QuerySchema = new mongoose.Schema({
  query: String,
  where: String,
  sinceDays: Number,
  results: Number,
  remote: { type: String, enum: ["any","remote","onsite","hybrid"], default: "any" },
  minSalary: String,
}, { _id: false });

const SavedQuerySetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, index: true, required: true },
  name: { type: String, required: true },
  queries: { type: [QuerySchema], default: [] },
}, { timestamps: true });

export default mongoose.models.SavedQuerySet || mongoose.model("SavedQuerySet", SavedQuerySetSchema);