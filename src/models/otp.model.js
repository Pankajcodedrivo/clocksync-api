const mongoose = require('mongoose');
const validator = require('validator');
const { toJSON } = require('./plugins');
const ApiError = require('../helpers/apiErrorConverter');

const otpSchema = new mongoose.Schema(
  {
    otp: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new ApiError('Invalid Email address', 400);
        }
      },
    },
    is_verify: {
      type: Boolean,
      enum: [true, false],
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

otpSchema.plugin(toJSON);

const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;
