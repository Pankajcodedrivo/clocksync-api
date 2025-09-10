const mongoose = require('mongoose');

// Updated placement schema
const placementSchema = new mongoose.Schema(
  {
    image: { type: String },                  // logo/banner image URL (optional if using AdSense)
    link: { type: String },                   // click-through link (optional if using AdSense)
    googleAdSense: {
      slot: { type: String },    // Ad unit slot ID
      width: { type: Number },   // Fixed width (optional)
      height: { type: Number }   // Fixed height (optional)
    },          // Google AdSense code (optional if using image/link)
    useGoogleAd: { type: Boolean, default: false }, // toggle: true = AdSense, false = image/link
  },
  { _id: false } // don't need sub-document IDs
);

const settingsSchema = new mongoose.Schema(
  {
    sitelogo: {
      type: String,
      required: true,
    },
    copyright: {
      type: String,
      required: false,
    },
    copyright2: {
      type: String,
      required: false,
    },
    googleAdClient: { type: String },
    // Desktop / Tablet placements
    desktop: {
      top: placementSchema,
      right: placementSchema,
      left: placementSchema,
    },

    // Mobile placements
    mobile: {
      top: placementSchema,
      middle: placementSchema,
      bottom: placementSchema,
    },
  },
  { timestamps: true }
);

const Settings = mongoose.model("setting", settingsSchema);
module.exports = Settings;
