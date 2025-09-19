const Game = require('../../models/game.model');

// ✅ Create new Game
const createGame = async (data) => {
  return Game.create(data);
};

// ✅ Find Game by id
const getByGameId = async (id) => {
  return Game.findById(id).populate('fieldId').populate('assignUserId');
};

// ✅ Find Game by id and assigned user
const getGameByIdAndUserId = async (_id, assignUserId) => {
  return Game.findOne({ _id, assignUserId });
};

// ✅ Update Game (prevent endDateTime update after endGame=true)
const updateGame = async (id, data) => {
  const game = await Game.findById(id);
  if (!game) throw new Error('Game not found');

  if (game.endGame && data.endDateTime) {
    throw new Error('Cannot update endDateTime after game has ended.');
  }

  Object.assign(game, data);
  return game.save();
};

// ✅ List all games with pagination + search
const listGames = async ({ page = 1, limit = 10, search = "", user }) => {
  const skip = (page - 1) * limit;

  const match = {};
  if (user?.role === "scorekeeper") {
    match.assignUserId = user._id;
  }

  const pipeline = [
    {
      $lookup: {
        from: "fields",
        localField: "fieldId",
        foreignField: "_id",
        as: "field",
      },
    },
    { $unwind: { path: "$field", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
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

// ✅ Delete Game
const deleteGameById = async (id) => {
  return Game.findByIdAndDelete(id);
};

// ✅ Get game by field
const getGameByFieldId = async (id) => {
  return Game.findOne({ fieldId: id }).sort({ startDateTime: 1 });
};

// ✅ Count games
const getGameCount = async () => {
  return Game.countDocuments();
};

// ✅ Auto end games (cron job)
const autoEndGames = async (io) => {
  const now = new Date();
  const gamesToEnd = await Game.find({
    endDateTime: { $lte: now },
    endGame: false,
  });

  for (const game of gamesToEnd) {
    game.endGame = true;
    await game.save();

    if (io) {
      io.to(game._id.toString()).emit('gameEnded', {
        gameId: game._id,
        message: 'Game has automatically ended',
      });
    }
  }

  return gamesToEnd;
};

// ✅ Manual end game (admin)
const endGameManually = async (id) => {
  const game = await Game.findById(id);
  if (!game) throw new Error('Game not found');

  if (game.endGame) {
    throw new Error('Game already ended');
  }

  game.endGame = true;
  await game.save();
  return game;
};

module.exports = {
  createGame,
  getByGameId,
  getGameByIdAndUserId,
  updateGame,
  listGames,
  deleteGameById,
  getGameByFieldId,
  getGameCount,
  autoEndGames,
  endGameManually,
};
