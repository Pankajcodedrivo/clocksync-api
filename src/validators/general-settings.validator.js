const Joi = require('joi');

// Save settings data
const saveSetting = Joi.object({
  sitelogo: Joi.optional(),
  footerlogo: Joi.optional(),
  footerContent: Joi.string().optional(),
  copyright: Joi.string().optional(),
  adminEmail: Joi.optional(),
  twitterUrl: Joi.optional(),
  linkedinUrl: Joi.optional(),
  instagramUrl: Joi.optional(),
  contactphone: Joi.optional(),
  contactemail: Joi.optional(),
  contactaddress: Joi.optional(),
  auctionDate: Joi.optional(),
  auctionTime: Joi.optional(),
  pauseTime: Joi.optional(),
  pauseStatus: Joi.optional(),
});
const saveTimeSetting = Joi.object({
  pauseTime: Joi.optional(),
  pauseStatus: Joi.optional(),
});

module.exports = {
  saveSetting,
  saveTimeSetting,
};
