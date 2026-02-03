const catchAsync = require('../../helpers/asyncErrorHandler');
const service = require('../../services/admin/user.service');
const tokenService = require('../../services/auth/token.service');
const listUser = catchAsync(async (req, res, next) => {
  const limit = req.params.limit ? Number(req.params.limit) : 10;
  const page = req.params.page ? Number(req.params.page) : 1;
  const search = req.body.search ? req.body.search : '';
  const role = req.body.role ? req.body.role : '';
  const users = await service.userListFind(
    req.user._id,
    limit,
    page,
    search,
    role,
    req.user.role
  );
  res.status(200).send({ status: 200, users });
});

const listEventDirector = catchAsync(async (req, res, next) => {
  const eventDirectors = await service.listEventDirector('event-director');
  res.status(200).send({ status: 200, eventDirectors });
})

const addUser = catchAsync(async (req, res) => {
  const creatorId = req.user?._id;
  const { role, email, ...rest } = req.body;

  const data = {
    ...rest,
    email: email?.toLowerCase(),
    role,
    firstTimeLogin: ['scorekeeper', 'event-director'].includes(role),
    createdBy: creatorId ? [creatorId] : [],
    profileimageurl: req.file?.location || '',
  };

  // ✅ Handle scorekeeper separately (shared account logic)
  if (role === 'scorekeeper' && email) {
    const existingUser = await service.getUserByEmail(data.email);

    if (existingUser) {
      // Add creator if not already linked
      if (!existingUser.createdBy.some(id => id.equals(creatorId))) {
        existingUser.createdBy.push(creatorId);
        await existingUser.save();
      }

      return res.status(200).json({
        status: 200,
        message: 'User added successfully',
        userdata: existingUser,
      });
    }
  }

  // ✅ Create new user
  const user = await service.addUser(data);

  res.status(200).json({
    status: 200,
    message: 'User added successfully',
    userdata: user,
  });
});

const edituser = catchAsync(async (req, res) => {
  const userData = await service.editUser(req.params.id);
  res.status(200).send({ status: 200, userData: userData });
});

const updateUser = catchAsync(async (req, res) => {
  const id = req.params.id;
  const data = { ...req.body };

  if (req.file && req.file.location) {
    data.profileimageurl = req.file.location;
  }
  const updateData = await service.updateUser(id, data);
  res.status(200).json({
    status: 200,
    message: 'User updated successfully',
    userData: updateData,
  });
});

const addamount = catchAsync(async (req, res) => {
  const addData = await service.addamount(req.params.id, req.body.amount);
  res.status(200).json({
    status: 200,
    message: 'Amount added successfully',
    userData: addData,
  });
});

const deleteUser = catchAsync(async (req, res) => {
  await service.deleteUser(req.params.id);
  res.status(200).send({ status: 200, message: 'User deleted successfully' });
});

const userVerification = catchAsync(async (req, res) => {
  const verificationStatus = await service.userVerification(
    req.params.id,
    req.body.isVerfied,
  );
  res.status(200).json({ message: 'Status updated', verificationStatus });
});

// Block unblock user
const userBlockUnblock = catchAsync(async (req, res) => {
  const userStatus = await service.userBlockUnblock(
    req.params.id,
    req.body.isActive,
  );
  res.status(200).json({ message: 'Status updated', userStatus });
});

const getInvitations = catchAsync(async (req, res) => {
  const limit = req.params.limit ? Number(req.params.limit) : 10;
  const page = req.params.page ? Number(req.params.page) : 1;
  const search = req.body.search ? req.body.search : '';
  const invitations = await service.userInvitations(
    req.params.id,
    limit,
    page,
    search,
  );
  res.status(200).json({ status: 200, invitations });
});
// Switch User
const switchUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Validate ID presence
  if (!id) {
    throw new ApiError(400, 'User ID is required');
  }

  const user = await service.getUserById(id);

  // Handle user not found
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!['event-director', 'scorekeeper'].includes(user.role)) {
    throw new ApiError(403, 'You are not authorized to switch to this account');
  }

  // Generate tokens
  const tokens = await tokenService.generateAuthTokens(user);

  res.status(200).send({
    message: 'You have successfully switched to that account.',
    tokens: {
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
    },
    user,
  });
});

module.exports = {
  listUser,
  addUser,
  edituser,
  updateUser,
  deleteUser,
  userVerification,
  userBlockUnblock,
  getInvitations,
  addamount,
  listEventDirector,
  switchUser
};
