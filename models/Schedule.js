// models/Schedule.js
import mongoose, { Schema } from "mongoose";

const QuerySchema = new Schema(
  {
    query: String,
    where: String,
    sinceDays: Number,
    results: Number,
    remote: {
      type: String,
      enum: ["any", "remote", "onsite", "hybrid"],
      default: "any",
    },
    minSalary: String,
  },
  { _id: false }
);

const ScheduleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, index: true, required: true },
    name: { type: String, default: "Search" },
    cron: { type: String, required: true },
    queries: { type: [QuerySchema], default: [] },
    active: { type: Boolean, default: true },
    meta: { type: Schema.Types.Mixed, default: {} },

    lastRunAt: Date,
    nextRunAt: Date,
    lastStatus: {
      type: String,
      enum: ["ok", "error", "idle"],
      default: "idle",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Schedule ||
  mongoose.model("Schedule", ScheduleSchema);
