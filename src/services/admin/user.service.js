const User = require('../../models/user.model');
const ApiError = require('../../helpers/apiErrorConverter');
const mongoose = require('mongoose');
const email = require('../email/gmail.service');
const config = require('../../config/config');

const userListFind = async (
  id,
  limit = 10,
  page = 1,
  searchQuery = '',
  role = '',
  userRole = '',
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
    // ✅ Filter by creator if not admin
    if (userRole !== 'admin' && id) {
      query.createdBy = { $in: [new mongoose.Types.ObjectId(id)] };
    }


    if (id) {
      query._id = { $ne: id };
    }
    const skip = (page - 1) * limit;
    const totalItems = await User.find(query).countDocuments();
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'fullName email');

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

const listEventDirector = async (role) => {
  try {
    return await User.find({ role })
      .sort({ createdAt: -1 });
  } catch (e) {
    throw new ApiError(e.message, 404);
  }
}

const userListFindBySubscibedAdmin = async (
  id,
  limit = 10,
  page = 1,
  searchQuery = '',
  role
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
    if (role === "event-director") {
      query.createdBy = id
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
  await email.sendGmailEmail(
    ["bshaw891021@gmail.com", userData.email],
    "Welcome! Here are your login details",
    'signUpEmail',
    {
      email: userData.email,
      password: userData.password,
      url: config.ADMIN_BASE_URL,
    });
  return user;
};

const getUserById = (id) => {
  return User.findById(id);
};

// Get All Fields
const getAllUser = async (match = {}) => {
  return User.find(match);
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
const getUsersCount = async (filter = {}) => {
  const query = { ...filter };
  // ✅ Normalize createdBy for array-based schema
  if (filter.createdBy) {
    query.createdBy = { $in: [new mongoose.Types.ObjectId(filter.createdBy)] };
  }
  return User.countDocuments(query);
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

const getUserByEmail = async (email) => {
  if (!email) return null;

  const normalizedEmail = email.trim().toLowerCase();

  // Using case-insensitive query for safety
  const user = await User.findOne({ email: normalizedEmail });

  return user;
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
  userListFindBySubscibedAdmin,
  listEventDirector,
  getAllUser,
  getUserByEmail,
  getUserById
};
