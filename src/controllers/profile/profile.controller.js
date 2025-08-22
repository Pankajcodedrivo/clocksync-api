const catchAsync = require('../../helpers/asyncErrorHandler');
const service = require('../../services/auth/auth.service');
const ApiError = require('../../helpers/apiErrorConverter');

// Delete account
const deleteAccount = catchAsync(async (req, res, next) => {
  await service.deleteAccountById(req.user._id);
  res.status(200).send({ message: 'Account Deleted Successfully' });
});

const edituser = catchAsync(async (req, res) => {
  const userData = await service.getUserByIdWithGroup(req.params.id);
  const teamData = await service.getTeamByUserId(req.params.id);
  const matchData = await service.getMatchByUserId(req.params.id, teamData);
  res.status(200).send({ status: 200, userData: userData, team: teamData, matchData: matchData });
});

// Password change
const passwordChange = catchAsync(async (req, res, next) => {
  await service.updatePassword(
    req.user,
    req.body.password_new,
    req.body.password_old,
  );
  res
    .status(200)
    .send({ status: 200, message: 'Password Updated Successfully' });
});

// Notification settings
const notificationToggle = catchAsync(async (req, res, next) => {
  await service.updateNotificationSetting(
    req.user.email,
    req.body.notification,
  );
  res
    .status(200)
    .send({ message: 'Notification Settings Updated Successfully' });
});

// Get profile
const getProfile = catchAsync(async (req, res, next) => {
  res.status(200).send({ message: 'Profile Data', user: req.user });
});

// Update profile with image
const updateProfile = catchAsync(async (req, res, next) => {
  if (req.file) {
    req.body.profileimageurl = req.file.location;
  }
  const user = await service.updateUser(req.user._id, req.body);
  res
    .status(200)
    .send({ message: 'Profile data update successfully', user: user });
});

const listusers = catchAsync(async (req, res, next) => {
  const id = req.user._id;
  const users = await service.listUser(id);
  res.status(200).send({ users });
});

// Immegration request
const immegrationRequest = catchAsync(async (req, res, next) => {
  const userID = req.user._id;
  const workpermitFile = req.files['workpermit']
    ? req.files['workpermit'][0]
    : null;
  const visadocumentFile = req.files['visadocument']
    ? req.files['visadocument'][0]
    : null;
  let data = req.body;
  data.userID = userID;
  data.permitimageurl = workpermitFile.location;
  data.visaimageurl = visadocumentFile.location;
  const immegration = await service.updateUserImmegration(data);
  res
    .status(200)
    .send({ message: 'Immegration request added successfully', immegration });
});

const addSupport = catchAsync(async (req, res) => {
  userId = req.user._id;
  const data = {
    userId,
    ...req.body,
  };
  const supportData = await service.addSupport(data);
  res.status(200).json({
    message: 'Data added successfully',
    data: supportData,
  });
});

const addIntroMedia = catchAsync(async (req, res) => {
  let intromedias = '';

  if (req.files && req.files.length > 0) {
    intromedias = req.files.map((file) => ({
      introImage: file.location,
    }));
  }

  const usermedia = await service.addIntroMedia(req.user._id, intromedias);

  res.status(200).send({
    message: 'Media uploaded successfully',
    media: usermedia,
  });
});

const deleteIntroMedia = catchAsync(async (req, res) => {
  await service.deleteIntroMedia(req.params.id);
  res.status(200).send({ message: 'Image deleted successfully' });
});

const addPrivateMedia = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError('File not found', 404);
  }
  data = { userId: req.user._id, privatemedia: req.file.location };
  const privateMedia = await service.addPrivateMedia(data);

  res.status(200).json({
    message: 'Image added successfully',
    data: privateMedia,
  });
});

const deletePrivateMedia = catchAsync(async (req, res) => {
  await service.deletePrivateMedia(req.params.id);
  res.status(200).send({
    message: 'Image added successfully',
  });
});

const viewPrivateMedia = catchAsync(async (req, res) => {
  const viewMedia = await service.viewPrivateMedia(req.params.id);
  res.status(200).json(viewMedia);
});

const addVerfication = catchAsync(async (req, res) => {
  const idCardImage = req.files.idcardimage
    ? req.files.idcardimage[0].location
    : null;
  const selfieImage = req.files.selfie ? req.files.selfie[0].location : null;
  let message = '';
  const data = {};
  if (idCardImage) {
    data['verification.verificationId'] = idCardImage;
    message = 'Id upload successfully';
  }
  if (selfieImage) {
    data['verification.selfie'] = selfieImage;
    message = 'Selfie upload successfully';
  }
  const verifyImage = await service.addVerfication(req.user._id, data);
  res.status(200).json({
    message,
    verification: verifyImage.verification,
  });
});

const UpdateSocialLinks = catchAsync(async (req, res) => {
  const { facebooklink, instagramlink, twitterlink } = req.body;

  const data = {};
  if (facebooklink) data['socialLinks.facebooklink'] = facebooklink;
  if (instagramlink) data['socialLinks.instagramlink'] = instagramlink;
  if (twitterlink) data['socialLinks.twitterlink'] = twitterlink;

  const sociallinks = await service.updateSocialLinks(req.user._id, data);

  res.status(200).json({
    message: 'Social links updated successfully',
    links: sociallinks.socialLinks,
  });
});

module.exports = {
  deleteAccount,
  passwordChange,
  getProfile,
  updateProfile,
  notificationToggle,
  immegrationRequest,
  addSupport,
  addIntroMedia,
  deleteIntroMedia,
  addPrivateMedia,
  deletePrivateMedia,
  viewPrivateMedia,
  addVerfication,
  UpdateSocialLinks,
  listusers,
  edituser,
};
