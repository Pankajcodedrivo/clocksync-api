const catchAsync = require('../../helpers/asyncErrorHandler');
const userService = require('../../services/admin/user.service');
const fieldService = require('../../services/field/field.service');
const gameService = require('../../services/game/game.service');

const getDashboardData = catchAsync(async (req, res, next) => {
  // Fetch all required data concurrently
  const [
    totalScorekeeper, totalFields, totalGames, totalSubscribeUser, totalUsers
  ] = await Promise.all([
    userService.getUsersCount({ role: 'scorekeeper' }),
    fieldService.getFieldCount(),
    gameService.getGameCount(),
    userService.getUsersCount({ role: 'scorekeeper', isSubscribedByAdmin: true }),
    userService.getUsersCount({}),
  ]);

  // Send the response
  res.status(200).json({
    totalScorekeeper,
    totalFields,
    totalGames,
    totalSubscribeUser,
    totalUsers
  });
});

module.exports = {
  getDashboardData,
};
