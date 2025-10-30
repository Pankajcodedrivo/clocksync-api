const catchAsync = require('../../helpers/asyncErrorHandler');
const userService = require('../../services/admin/user.service');
const fieldService = require('../../services/field/field.service');
const gameService = require('../../services/game/game.service');

const getDashboardData = catchAsync(async (req, res, next) => {
  // Fetch all required data con  currently
  const createdByFilter = {};

  if (req.user.role !== 'admin') {
    createdByFilter.createdBy = req.user._id;
  }
  const [
    totalScorekeeper, totalFields, totalGames, totalAdmin, totalSubscribeUser, totalEventDirector
  ] = await Promise.all([
    userService.getUsersCount({ role: 'scorekeeper', ...createdByFilter }),
    fieldService.getFieldCount(req.user),
    gameService.getGameCount(),
    userService.getUsersCount({ role: 'admin', ...createdByFilter }),
    userService.getUsersCount({ role: 'scorekeeper', isSubscribedByAdmin: true, ...createdByFilter }),
    userService.getUsersCount({ role: 'event-director', ...createdByFilter }),
  ]);

  // Send the response
  res.status(200).json({
    totalScorekeeper,
    totalFields,
    totalGames,
    totalAdmin,
    totalSubscribeUser,
    totalEventDirector
  });
});

module.exports = {
  getDashboardData,
};
