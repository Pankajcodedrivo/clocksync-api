const Joi = require("joi");

// Placement schema for ads
const placementSchema = Joi.object({
  useGoogleAd: Joi.boolean().default(false),

  // Google AdSense fields
  googleAdSense: Joi.object({
    slot: Joi.string().allow("", null),
    width: Joi.number().allow(null),
    height: Joi.number().allow(null),
  }).optional(),

  // Custom Ad fields
  image: Joi.string().allow("", null), // will usually be a file path after upload
  link: Joi.string().uri().allow("", null),
});

// Main settings schema
const saveSetting = Joi.object({
  sitelogo: Joi.string().optional(),
  copyright: Joi.string().optional(),
  copyright2: Joi.string().optional(),
  // Global AdSense client ID
  googleAdClient: Joi.string().allow("", null),

  // Desktop placements
  desktop: Joi.object({
    top: placementSchema.optional(),
    right: placementSchema.optional(),
    left: placementSchema.optional(),
  }).optional(),

  // Mobile placements
  mobile: Joi.object({
    top: placementSchema.optional(),
    middle: placementSchema.optional(),
    bottom: placementSchema.optional(),
  }).optional(),
});

// Optional: keep pause schema separate if still needed
const saveTimeSetting = Joi.object({
  pauseTime: Joi.optional(),
  pauseStatus: Joi.optional(),
});

module.exports = {
  saveSetting,
  saveTimeSetting,
};
