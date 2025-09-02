const catchAsync = require('../../helpers/asyncErrorHandler');
const scoreKeeperService = require('../../services/scoreKeeper/scoreKeeper.service');
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

module.exports = {
    generateCode,
    verifyCode,
};
