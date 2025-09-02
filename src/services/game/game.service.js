const Game = require('../../models/game.model');

// Create new Game
const createGame = async (data) => {
  return Game.create(data);
};

// Find Game by id
const getByGameId = async (id) => {
  return Game.findById(id).populate('fieldId').populate('assignUserId');
};

// Find Game by id
const getGameByIdAndUserId = async (_id, assignUserId) => {
  return Game.findOne({ _id, assignUserId });
};

// Update Game
const updateGame = async (id, data) => {
  return Game.findByIdAndUpdate(id, { $set: data }, { new: true });
};

// List all games with pagination + search
const listGames = async ({ page = 1, limit = 10, search = "", user }) => {
  const skip = (page - 1) * limit;

  const match = {};
  if (user?.role === "scorekeeper") {
    match.assignUserId = user._id;
  }

  const pipeline = [
    {
      $lookup: {
        from: "fields",               // collection name for fields
        localField: "fieldId",
        foreignField: "_id",
        as: "field",
      },
    },
    { $unwind: { path: "$field", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",                // collection name for users
        localField: "assignUserId",
        foreignField: "_id",
        as: "assignedUser",
      },
    },
    { $unwind: { path: "$assignedUser", preserveNullAndEmptyArrays: true } },
    { $match: match },
  ];

  // 🔎 Add search filter
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { homeTeamName: { $regex: search, $options: "i" } },
          { awayTeamName: { $regex: search, $options: "i" } },
          { "field.name": { $regex: search, $options: "i" } },
          { "assignedUser.fullName": { $regex: search, $options: "i" } },
        ],
      },
    });
  }

  const totalPipeline = [...pipeline, { $count: "total" }];
  const totalResult = await Game.aggregate(totalPipeline);
  const total = totalResult[0]?.total || 0;

  const games = await Game.aggregate([
    ...pipeline,
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    games,
  };
};
// Delete Game
const deleteGameById = async (id) => {
  return Game.findByIdAndDelete(id);
};

const getGameByFieldId = async (id) => {
  return Game.findOne({ fieldId: id })
    .sort({ startDateTime: 1 });
};


module.exports = {
  createGame,
  getByGameId,
  updateGame,
  listGames,
  deleteGameById,
  getGameByFieldId,
  getGameByIdAndUserId
};
