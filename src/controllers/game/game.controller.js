const catchAsync = require('../../helpers/asyncErrorHandler');
const ApiError = require('../../helpers/apiErrorConverter');
const service = require('../../services/game/game.service');
const gameStatisticsService = require('../../services/gameStatistics.service');

// Create Game
const createGame = catchAsync(async (req, res) => {
  // Extract file paths if provided
  console.log(req.files);
  const homeTeamLogo = req.files?.homeTeamLogo?.[0]?.location || null;
  const awayTeamLogo = req.files?.awayTeamLogo?.[0]?.location || null;

  // Merge file paths into game data
  const gameData = {
    ...req.body,
    homeTeamLogo,
    awayTeamLogo
  };

  const game = await service.createGame(gameData);
  gameStatisticsService.createGameStatistics(game._id);

  res.status(201).json({
    message: 'Game created successfully',
    game
  });
});

// List Games
const listGames = catchAsync(async (req, res) => {
  const page = parseInt(req.params.page) || 1;
  const limit = parseInt(req.params.limit) || 10;
  const search = req.query.search || "";
  const result = await service.listGames({ page, limit, search, user: req.user });

  res.status(200).json({
    success: true,
    ...result,
  });
});

// Update Game
const updateGame = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Extract file paths if new files are uploaded
  const homeTeamLogo = req.files?.homeTeamLogo?.[0]?.location;
  const awayTeamLogo = req.files?.awayTeamLogo?.[0]?.location;

  // Build update data (merge body + new logos if provided)
  const updateData = {
    ...req.body,
    ...(homeTeamLogo && { homeTeamLogo }),
    ...(awayTeamLogo && { awayTeamLogo }),
  };

  const updatedGame = await service.updateGame(id, updateData);
  if (!updatedGame) throw new ApiError(404, 'Game not found');

  res.status(200).json({
    message: 'Game updated successfully',
    game: updatedGame,
  });
});

// Get Game by ID
const getGameById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const game = await service.getByGameId(id);

  if (!game) throw new ApiError(404, 'Game not found');

  res.status(200).json({ game });
});

const getGameByIdAndUserId = catchAsync(async (req, res) => {
  const { id } = req.params;
  const game = await service.getGameByIdAndUserId(id, req.user.id);
  const gameStatistics = await gameStatisticsService.getStatsByGameId(id);
  if (!game) throw new ApiError(404, 'Game not found');

  res.status(200).json({ game, gameStatistics });
});
// Delete Game
const deleteGame = catchAsync(async (req, res) => {
  const { id } = req.params;
  const game = await service.deleteGameById(id);
  if (!game) throw new ApiError(404, 'Game not found');

  res.status(200).json({ message: 'Game deleted successfully' });
});

module.exports = {
  createGame,
  updateGame,
  getGameById,
  deleteGame,
  listGames,
  getGameByIdAndUserId
};
