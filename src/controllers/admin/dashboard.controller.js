const catchAsync = require('../../helpers/asyncErrorHandler');
const userService = require('../../services/admin/user.service');

const getDashboardData = catchAsync(async (req, res, next) => {
  // Fetch all required data concurrently
  const [
    totalUsers,
  ] = await Promise.all([
    userService.getUsersCount(),
  ]);

  // Send the response
  res.status(200).json({
    status: 200,
    totalUsers
  });
});

module.exports = {
  getDashboardData,
};
