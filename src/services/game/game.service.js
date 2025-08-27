const Game = require('../../models/game.model');

// Create new Game
const createGame = async (data) => {
  return Game.create(data);
};

// Find Game by id
const getByGameId = async (id) => {
  return Game.findById(id).populate('fieldId').populate('assignUserId');
};

// Update Game
const updateGame = async (id, data) => {
  return Game.findByIdAndUpdate(id, { $set: data }, { new: true });
};

// List all games with pagination + search
const listGames = async ({ page = 1, limit = 10, search = "" }) => {
  const skip = (page - 1) * limit;

  let query = {};
  if (search) {
    query = {
      $or: [
        { homeTeamName: { $regex: search, $options: "i" } },
        { awayTeamName: { $regex: search, $options: "i" } },
      ]
    };
  }

  const total = await Game.countDocuments(query);
  const games = await Game.find(query)
    .populate('fieldId')
    .populate('assignUserId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

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

module.exports = {
  createGame,
  getByGameId,
  updateGame,
  listGames,
  deleteGameById
};
