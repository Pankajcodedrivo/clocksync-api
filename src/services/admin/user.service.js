const User = require('../../models/user.model');
const ApiError = require('../../helpers/apiErrorConverter');

const mongoose = require('mongoose');
const { http } = require('winston');
const email = require('../email/email.service');
const config = require('../../config/config');

const userListFind = async (
  id,
  limit = 10,
  page = 1,
  searchQuery = '',
  role = '',
) => {
  try {
    const query = {};
    if (searchQuery) {
      const sanitizedSearchTerm = searchQuery.replace(/"/g, '');
      query.$or = [
        { firstName: { $regex: sanitizedSearchTerm, $options: 'i' } },
        { lastName: { $regex: sanitizedSearchTerm, $options: 'i' } },
        { email: { $regex: sanitizedSearchTerm, $options: 'i' } },
      ];
    }

    if (role) {
      query.role = role;
    }

    if (id) {
      query._id = { $ne: id };
    }
    const skip = (page - 1) * limit;
    const totalItems = await User.find(query).countDocuments();
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const userList = {
      users,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalResults: totalItems,
    };

    return userList;
  } catch (e) {
    throw new ApiError(e.message, 404);
  }
};

const userListFindBySubscibedAdmin = async (
  id,
  limit = 10,
  page = 1,
  searchQuery = '',
) => {
  try {
    const query = {};
    if (searchQuery) {
      const sanitizedSearchTerm = searchQuery.replace(/"/g, '');
      query.$or = [
        { fullName: { $regex: sanitizedSearchTerm, $options: 'i' } },
        { email: { $regex: sanitizedSearchTerm, $options: 'i' } },
      ];
    }


    query.role = "scorekeeper";
    query.isSubscribedByAdmin = true;

    if (id) {
      query._id = { $ne: id };
    }
    const skip = (page - 1) * limit;
    const totalItems = await User.find(query).countDocuments();
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const userList = {
      users,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalResults: totalItems,
    };

    return userList;
  } catch (e) {
    throw new ApiError(e.message, 404);
  }
};

const addUser = async (userData) => {
  const user = await User.create(userData);
  await email.sendSGEmail({
    to: userData.email,
    templateId: "d-57526b95011b477796f87e43361a8b5d",
    dynamic_template_data: {
      email: userData.email,
      password: userData.password,
      url: config.ADMIN_BASE_URL
    },
  });
  return user;
};

const getUserById = (id) => {
  return User.findById(id);
};

const editUser = async (id) => {
  try {
    const user = await getUserById(id);

    return user;
  } catch (e) {
    throw new ApiError(e.message, 404);
  }
};

const addamount = async (id, amount) => {
  const updateAmount = await User.findByIdAndUpdate(
    id,
    { $inc: { amount: amount } },
    { new: true },
  );

  return updateAmount;
};

const updateUser = async (id, data) => {
  return User.findByIdAndUpdate({ _id: new mongoose.Types.ObjectId(id) }, data);
};

const deleteUser = async (id) => {
  try {
    await User.findByIdAndDelete(id);
  } catch (e) {
    throw new ApiError(e.message, 404);
  }
};

const userVerification = async (id, status) => {
  const userData = await User.findByIdAndUpdate(
    id,
    {
      $set: { isVerfied: status },
    },
    { new: true },
  );
  return userData;
};

const userBlockUnblock = async (id, status) => {
  const userData = await User.findByIdAndUpdate(
    id,
    {
      $set: { isActive: status },
    },
    { new: true },
  );
  return userData;
};

// get number of users
const getUsersCount = async (query) => {
  const totalUsers = await User.countDocuments(query);
  return totalUsers;
};

const userInvitations = async (id, limit = 10, page = 1, searchQuery = '') => {
  try {
    const query = {};
    if (searchQuery) {
      const sanitizedSearchTerm = searchQuery.replace(/"/g, '');
      query.$or = [
        { description: { $regex: sanitizedSearchTerm, $options: 'i' } },
        { transportationMoney: { $regex: sanitizedSearchTerm, $options: 'i' } },
      ];
    }

    if (id) {
      query.userId = id;
    }

    const skip = (page - 1) * limit;
    const totalItems = await Invitations.find(query).countDocuments();

    const invitations = await Invitations.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const invitationList = {
      invitations,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalResults: totalItems,
    };

    return invitationList;
  } catch (e) {
    throw new ApiError(e.message, 404);
  }
};

module.exports = {
  userListFind,
  addUser,
  editUser,
  updateUser,
  deleteUser,
  userVerification,
  userBlockUnblock,
  getUsersCount,
  userInvitations,
  addamount,
  userListFindBySubscibedAdmin
};
