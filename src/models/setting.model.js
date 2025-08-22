const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    sitelogo: {
      type: String,
      required: true,
    },
    footerlogo: {
      type: String,
      required: true,
    },

    footerContent: {
      type: String,
      required: false,
    },
    copyright: {
      type: String,
      required: false,
    },
    adminEmail: {
      type: String,
      required: false,
      default: '',
    },
    twitterUrl: {
      type: String,
      required: false,
      default: '',
    },
    instagramUrl: {
      type: String,
      required: false,
      default: '',
    },
    linkedinUrl: {
      type: String,
      required: false,
      default: '',
    },
    contactphone: {
      type: String,
      required: false,
      default: '',
    },
    contactemail: {
      type: String,
      required: false,
      default: '',
    },
    contactaddress: {
      type: String,
      required: false,
      default: '',
    },
    auctionDate: {
      type: Date,
      required: false,
      default: '',
    },
    pauseTime: {
      type: Date,
      required: false,
      default: '',
    },
    pauseStatus: {
      type: Boolean,
      required: false,
      default: '',
    },
  },
  { timestamps: true },
);

const Settings = mongoose.model('setting', settingsSchema);
module.exports = Settings;
