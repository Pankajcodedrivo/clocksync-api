const catchAsync = require('../../helpers/asyncErrorHandler');
const scoreKeeperService = require('../../services/scoreKeeper/scoreKeeper.service');
const userService = require('../../services/admin/user.service');
const token = require('../../services/auth/token.service');
// 🔹 Generate one-time code (admin click)
const generateCode = catchAsync(async (req, res) => {
    const userId = req.user._id; // from auth middleware
    const { gameId } = req.body;
    const code = await scoreKeeperService.createScoreKeeperCode(userId, gameId);
    res.status(200).json({ code });
});

// 🔹 Verify code and get access/refresh tokens (public)
const verifyCode = catchAsync(async (req, res) => {
    const { code } = req.body;
    const { user, gameId } = await scoreKeeperService.verifyScoreKeeperCode(code);
    const tokens = await token.generateAuthTokens(user);
    res.status(200).json({ tokens, gameId });
});


const listUser = catchAsync(async (req, res, next) => {
    const limit = req.params.limit ? Number(req.params.limit) : 10;
    const page = req.params.page ? Number(req.params.page) : 1;
    const search = req.body.search ? req.body.search : '';
    const users = await userService.userListFindBySubscibedAdmin(
        req.user._id,
        limit,
        page,
        search,
        req.user.role
    );
    res.status(200).send({ status: 200, users });
});
module.exports = {
    generateCode,
    verifyCode,
    listUser
};
