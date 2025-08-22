const ApiError = require('../helpers/apiErrorConverter');
const tokenService = require('../services/auth/token.service');
const authService = require('../services/auth/auth.service');
const catchAsync = require('../helpers/asyncErrorHandler');

module.exports = function (role, unCheckRole = false) {
  return catchAsync(async function (req, res, next) {
    const token = req.headers.authorization;
    if (!token) {
      throw new ApiError('Please authenticate', 401);
    }
    const access = token.split(' ')[1];
    const data = await tokenService.verifyToken(access, 'access');
    const user = await authService.getUserDataById(data.sub);
    if (!user) {
      throw new ApiError('Invalid User', 401);
    }

    if (unCheckRole === true) {
    } else {
      if (role !== user.role) {
        throw new ApiError('Permission Denied', 401);
      }
    }

    req.user = user;

    next();
  });
};
