const catchAsync = require('../../helpers/asyncErrorHandler');
const userService = require('../../services/admin/user.service');
const fieldService = require('../../services/field/field.service');
const gameService = require('../../services/game/game.service');

const getDashboardData = catchAsync(async (req, res, next) => {
  // Fetch all required data concurrently
  const [
    totalUsers, totalFields, totalGames
  ] = await Promise.all([
    userService.getUsersCount('scorekeeper'),
    fieldService.getFieldCount(),
    gameService.getGameCount()
  ]);

  // Send the response
  res.status(200).json({
    totalUsers,
    totalFields,
    totalGames
  });
});

module.exports = {
  getDashboardData,
};
