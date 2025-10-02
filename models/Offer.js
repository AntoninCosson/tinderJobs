// models/Offer.js
import mongoose from "mongoose";

const OfferSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, index: true },
    offer: { type: String, required: true }, 
    title: { type: String },  
    company: { type: String, required: true },
    description: { type: String },
    location: { type: String },
    postedAt: { type: String },

   
    url: { type: [String], default: [] },

    
    tasks: { type: [String], default: [] },

   
    mathingScore: { type: mongoose.Schema.Types.Mixed, default: {} },
    offersSkill: {
      tech: { type: [String], default: [] },
      soft: { type: [String], default: [] },
    },

    
    track: { type: String },
    cv: { type: String },
    cvInfos: { type: mongoose.Schema.Types.Mixed, default: [] },

    
    tags: { type: [String], default: [] },


    salary: { type: String },
    source: { type: String, default: "webhook" },
  },
  { timestamps: true }
);

OfferSchema.index({ userId: 1, createdAt: -1 }); 

export default mongoose.models.Offer || mongoose.model("Offer", OfferSchema);
