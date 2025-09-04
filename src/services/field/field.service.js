const Field = require('../../models/field.model');
const ApiError = require('../../helpers/apiErrorConverter');
const gameService = require('../game/game.service');
const gameStatisticsService = require('../gameStatistics.service');
// Create new Field
const createField = async (data) => {
  return Field.create(data);
};

// Find Field by id
const getByFieldId = async (id) => {
  return Field.findById(id);
};

// Get All Fields
const getAllField = async () => {
  return Field.find();
};


// update Field
const updateField = async (id, data) => {
  const updatedField = await Field.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true },
  );
  return updatedField;
};
// List all fields with optional pagination + search
const listFields = async ({ page = 1, limit = 10, search = "" }) => {
  const skip = (page - 1) * limit;

  // Build query condition
  let query = {};
  if (search) {
    query = {
      $or: [
        { name: { $regex: search, $options: "i" } },  // case-insensitive match
      ]
    };
  }

  const total = await Field.countDocuments(query);
  const fields = await Field.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    fields,
  };
};


const deleteFieldById = async (id) => {
  return Field.findByIdAndDelete(id)
};

const getFieldBySlug = async (slug) => {
  const field = await Field.findOne({ slug });
  if (!field) {
    throw new ApiError("Field not found", 404);
  }
  const games = await gameService.getGameByFieldId(field._id); // earliest first
  if (!games) {
    throw new ApiError("No games are being played on this field", 404);
  }
  const gameStatistics = await gameStatisticsService.getStatsByGameId(games?._id);
  return {
    field,
    games,
    gameStatistics
  }
}
module.exports = {
  createField,
  getByFieldId,
  updateField,
  listFields,
  deleteFieldById,
  getAllField,
  getFieldBySlug
};