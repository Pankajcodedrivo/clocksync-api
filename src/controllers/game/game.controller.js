const catchAsync = require('../../helpers/asyncErrorHandler');
const ApiError = require('../../helpers/apiErrorConverter');
const service = require('../../services/game/game.service');

// Create Game
const createGame = catchAsync(async (req, res) => {
  const game = await service.createGame(req.body);
  res.status(201).json({ message: 'Game created successfully', game });
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
  const updatedGame = await service.updateGame(id, req.body);
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
  if (!game) throw new ApiError(404, 'Game not found');

  res.status(200).json({ game });
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
