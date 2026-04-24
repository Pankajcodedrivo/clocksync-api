const Game = require('../../models/game.model');
const mongoose = require('mongoose');
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
  return Game.findOne({ _id, assignUserId }).populate("fieldId");
};

const getGameByEventId = async (eventId) => {
  return Game.find({ eventId }).populate("fieldId").populate("assignUserId");
};

// ✅ Update Game (prevent endDateTime update after endGame=true)
const updateGame = async (id, data) => {
  const game = await Game.findById(id);
  if (!game) throw new Error('Game not found');

  if (game.endGame == true) {
    throw new Error('Cannot update endDateTime after game has ended.');
  }

  Object.assign(game, data);
  return game.save();
};

const listNotEndGames = async ({ user }) => {
  const match = {
    endGame: false,
    startDateTime: { $lte: new Date() }, // today
  };

  if (user?.role === 'event-director' && user?._id) {
    match.createdBy = new mongoose.Types.ObjectId(user._id);
  }

  return Game.find(match).sort({ startDateTime: -1 });
};

// ✅ List all games with pagination + search
const listGames = async ({ page = 1, limit = 10, search = "", user, eventId = "", fieldId = "",
  scorekeeperId = "" }) => {
  const skip = (page - 1) * limit;

  const match = {};
  if (user?.role === "scorekeeper" && user?._id) {
    match.assignUserId = user._id;
  }
  if (user?.role === 'event-director' && user?._id) {
    match.createdBy = new mongoose.Types.ObjectId(user._id);
  }
  if (fieldId) {
    match.fieldId = new mongoose.Types.ObjectId(fieldId);
  }
  if (scorekeeperId) {
    match.assignUserId = new mongoose.Types.ObjectId(scorekeeperId);
  }

  if (eventId) {
    match.eventId = new mongoose.Types.ObjectId(eventId);
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

    // ✅ Lookup for createdBy user
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdByUser",
      },
    },
    { $unwind: { path: "$createdByUser", preserveNullAndEmptyArrays: true } },

    // ✅ Lookup for game statistics (scores)
    {
      $lookup: {
        from: "gamestatistics",
        localField: "_id",
        foreignField: "gameId",
        as: "gameStatistics",
      },
    },
    { $unwind: { path: "$gameStatistics", preserveNullAndEmptyArrays: true } },

    { $match: match },

    // ✅ Add director fields + status + future-proof ids/times (response-only mapping)
    {
      $addFields: {
        event_director_name: "$createdByUser.fullName",
        event_director_email: "$createdByUser.email",
        status: {
          $ifNull: [
            "$status",
            {
              $cond: [
                "$endGame",
                "final",
                {
                  $cond: [
                    { $lte: ["$startDateTime", "$$NOW"] },
                    "live",
                    "upcoming",
                  ],
                },
              ],
            },
          ],
        },

        game_id: "$_id",
        event_id: "$eventId",
        field_id: "$fieldId",
        home_team_id: "$homeTeamId",
        away_team_id: "$awayTeamId",
        start_time: "$startDateTime",
        end_time: { $ifNull: ["$endDateTime", { $cond: ["$endGame", "$updatedAt", null] }] },

        homeScore: "$gameStatistics.homeTeam.score",
        awayScore: "$gameStatistics.awayTeam.score",
      },
    },
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
    { $sort: { startDateTime: -1 } },
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

// ----------------------------------------------------
// Delete Multiple Games
// ----------------------------------------------------
const deleteGamesByIds = async (ids) => {
  return Game.deleteMany({
    _id: { $in: ids }
  });
};

// ✅ Get game by field
const getGameByFieldId = async (fieldId) => {
  const now = new Date();
  // Find game that is currently active
  return Game.findOne({
    fieldId,
    startDateTime: { $lte: now },
    endGame: false,
  }).sort({ startDateTime: 1 });
};

// ✅ Count games
const getGameCount = async (match) => {
  return Game.countDocuments(match);
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
    game.status = 'final';
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
  game.status = 'final';
  game.endDateTime = new Date();
  await game.save();
  return game;
};

const insertMany = async (data) => {
  return Game.insertMany(data);
}

// ✅ Public list (no auth) for schedule/results view
const listGamesPublic = async ({ eventId, fieldId = "", search = "" }) => {
  if (!eventId) {
    throw new Error("eventId is required");
  }

  const match = {
    eventId: new mongoose.Types.ObjectId(eventId),
  };

  if (fieldId) {
    match.fieldId = new mongoose.Types.ObjectId(fieldId);
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
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdByUser",
      },
    },
    { $unwind: { path: "$createdByUser", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "gamestatistics",
        localField: "_id",
        foreignField: "gameId",
        as: "gameStatistics",
      },
    },
    { $unwind: { path: "$gameStatistics", preserveNullAndEmptyArrays: true } },
    { $match: match },
  ];

  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { homeTeamName: { $regex: search, $options: "i" } },
          { awayTeamName: { $regex: search, $options: "i" } },
          { "field.name": { $regex: search, $options: "i" } },
        ],
      },
    });
  }

  pipeline.push({
    $addFields: {
      event_director_name: "$createdByUser.fullName",
      status: {
        $ifNull: [
          "$status",
          {
            $cond: [
              "$endGame",
              "final",
              {
                $cond: [
                  { $lte: ["$startDateTime", "$$NOW"] },
                  "live",
                  "upcoming",
                ],
              },
            ],
          },
        ],
      },

      game_id: "$_id",
      event_id: "$eventId",
      field_id: "$fieldId",
      home_team_id: "$homeTeamId",
      away_team_id: "$awayTeamId",
      start_time: "$startDateTime",
      end_time: { $ifNull: ["$endDateTime", { $cond: ["$endGame", "$updatedAt", null] }] },

      homeScore: "$gameStatistics.homeTeam.score",
      awayScore: "$gameStatistics.awayTeam.score",
    },
  });

  const games = await Game.aggregate([
    ...pipeline,
    { $sort: { startDateTime: 1 } },
  ]);

  return { games };
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
  insertMany,
  getGameByEventId,
  deleteGamesByIds,
  listNotEndGames,
  listGamesPublic
};
