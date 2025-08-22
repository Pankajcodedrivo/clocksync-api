const ApiError = require('../../helpers/apiErrorConverter');
const Otp = require('../../models/otp.model');
const User = require('../../models/user.model');
const crypto = require('crypto');
const email = require('../email/email.service');
const config = require('../../config/config');

function generateSecureOTP() {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < 4; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  return otp;
}

const generateOtp = async (user, type) => {
  const otp = await Otp.create({ otp: generateSecureOTP(), email: user.email });
  if (!otp) {
    throw new ApiError('Error In OTP generations', 500);
  }
  if (type == 'emailVerify') {
    await email.sendSendgridEmail(
      user.email,
      'Email Verification',
      otp.otp,
      'd-92ce28b7f6664d5a9f53bb53003609f3',
    );
  } else if (type == 'resend') {
    await email.sendSendgridEmail(
      user.email,
      'Email Verification',
      otp.otp,
      'd-92ce28b7f6664d5a9f53bb53003609f3',
    );
  } else {
    await email.sendSendgridEmail(
      user.email,
      'Password Reset OTP',
      otp.otp,
      'd-92ce28b7f6664d5a9f53bb53003609f3',
    );
  }
};

const getOtpIfVerified = async (email, otp) => {
  const otpindb = await Otp.findOne({ email, otp });
  if (!otpindb) {
    throw new ApiError('Unverified Or Invalid OTP', 400);
  }
  return Otp.deleteOne({ _id: otpindb._id });
};

const resendOtp = async (user) => {
  let otp = await Otp.findOne({ email: user.email });

  if (!otp) {
    otp = await Otp.create({ otp: generateSecureOTP(), email: user.email });
  }

  if (!otp) {
    throw new ApiError('Error In OTP generations', 500);
  }

  await email.sendSendgridEmail(
    user.email,
    'Password Reset OTP',
    otp.otp,
    'd-8e092450a85a4e158288342590812cf9',
  );
};

const verifyOtp = async (email, otp) => {
  const otpindb = await Otp.findOne({ email, otp });

  if (!otpindb) {
    throw new ApiError('Invalid OTP', 400);
  }

  const createdAt = otpindb.createdAt;

  const currentTime = new Date();

  const timeDifferenceInMilliseconds = currentTime - createdAt;
  const timeDifferenceInMinutes = timeDifferenceInMilliseconds / (1000 * 600);

  if (
    timeDifferenceInMinutes > Number(config.jwt.resetPasswordExpirationMinutes)
  ) {
    throw new ApiError('OTP expired', 400);
  }

  otpindb.is_verify = true;
  otpindb.save();
  const updateemailVerify = await User.findOneAndUpdate(
    { email },
    { isEmailVerified: true },
    { new: true },
  );

  return;
};

module.exports = {
  generateOtp,
  getOtpIfVerified,
  resendOtp,
  verifyOtp,
};
