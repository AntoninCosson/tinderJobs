// models/UserOffer.js
import mongoose from "mongoose";

const OfferItemSchema = new mongoose.Schema(
  {
    offerId: { type: String, required: true },
    status:  { type: String, enum: ["unread","queued","accepted","rejected","sent"], default: "unread" },
    snapshot:{ type: mongoose.Schema.Types.Mixed, default: {} },
    updatedAt:{ type: Date, default: Date.now },
  },
  { _id: false }
);

const UserOfferSchema = new mongoose.Schema(
  {
    _id:    { type: String, required: true },
    userId: { type: String, required: true, index: true },
    offers: { type: [OfferItemSchema], default: [] },
  },
  { timestamps: true }
);

UserOfferSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.UserOffer || mongoose.model("UserOffer", UserOfferSchema);
