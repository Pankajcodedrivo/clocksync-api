const User = require('../../models/user.model');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const ApiError = require('../../helpers/apiErrorConverter');

// Create new user
const createUser = async (data) => {
  const checkEmail = await User.findOne({ email: data.email });
  if (checkEmail) {
    throw new ApiError('Email already exists', 400);
  }
  const user = await User.create(data);
  return getUserById(user._id);
};

// User login
const loginUser = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  if (!(await user.isPasswordMatch(password))) {
    throw new ApiError('Invalid email or password', 401);
  }
  user.online = true;
  await user.save();
  return getUserById(user._id);
};

// Find user by id
const findUserByEmail = async (email) => {
  return User.findOne({ email });
};

// Find user by id
const checkUserExistById = async (id) => {
  return User.findById(id);
};
// Change pasword
const changePassword = async (email, password) => {
  const pwd = await bcrypt.hash(password, 8);
  return User.findOneAndUpdate({ email }, { password: pwd });
};

// Update notification settings
const updateNotificationSetting = async (email, notification) => {
  return User.findOneAndUpdate({ email }, { notification });
};

const getUserById = async (id) => {
  return User.findById(new mongoose.Types.ObjectId(id));
};

const getUserDataById = async (id) => {
  try {
    return User.findById(new mongoose.Types.ObjectId(id));
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};

// Delete user account
const deleteAccountById = async (id) => {
  return User.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
};

// Update password
const updatePassword = async (user, newpass, oldpass) => {
  const isMatch = await bcrypt.compare(oldpass, user.password);
  if (!isMatch) {
    throw new ApiError('Invalid credentials', 400);
  }
  if (oldpass.trim() === newpass.trim()) {
    throw new ApiError(
      'New password cannot be the same as the old password',
      400,
    );
  }
  return changePassword(user.email, newpass);
};

const updatePasswordFirst = async (user, newpass) => {
  const isMatch = await bcrypt.compare(newpass, user.password);
  if (isMatch) {
    throw new ApiError('New password cannot be the same as the old password', 400);
  }
  const pwd = await bcrypt.hash(newpass, 8);
  return User.findOneAndUpdate({ email: user.email }, { password: pwd, firstTimeLogin: false });
};

// update User
const updateUser = async (id, data) => {
  const updatedUser = await User.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true },
  );

  return updatedUser;
};

const getAllScoreKeeper = async () => {
  return User.find({ role: "scorekeeper" }).select("fullName");
}

const listUser = async (currentUserId) => {
  const totalItems = await User.countDocuments({
    role: 'user',
    _id: { $ne: currentUserId },
  });
  const users = await User.find({ role: 'user', _id: { $ne: currentUserId } })
    .sort({ createdAt: -1 })
    .limit(30);

  const userList = {
    users,
    totalResults: totalItems,
  };

  return userList;
};

module.exports = {
  createUser,
  loginUser,
  findUserByEmail,
  changePassword,
  getUserById,
  deleteAccountById,
  updatePassword,
  updateNotificationSetting,
  getUserDataById,
  checkUserExistById,
  updateUser,
  listUser,
  updatePasswordFirst,
  getAllScoreKeeper
};
