const ApiError = require('../helpers/apiErrorConverter');
const tokenService = require('../services/auth/token.service');
const authService = require('../services/auth/auth.service');
const catchAsync = require('../helpers/asyncErrorHandler');

module.exports = function (roles = [], unCheckRole = false) {
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

    if (!unCheckRole) {
      // ✅ support single role or array of roles
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      if (!allowedRoles.includes(user.role)) {
        throw new ApiError('Permission Denied', 401);
      }
    }

    req.user = user;
    next();
  });
};
