const ScoreKeeperCode = require('../../models/scoreKeeperCode.model');
const User = require('../../models/user.model');
const ApiError = require('../../helpers/apiErrorConverter');
const crypto = require('crypto');
const tokenService = require('../admin/auth.service'); // your token generation service

// Create a one-time code for a game
const createScoreKeeperCode = async (userId, gameId) => {
    // Generate random code
    const code = crypto.randomBytes(16).toString('hex');

    // Set expiry (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const newCode = await ScoreKeeperCode.create({
        code,
        gameId,
        userId,
        expiresAt
    });

    return newCode.code;
};

// Verify a code and issue JWT tokens
const verifyScoreKeeperCode = async (code) => {
    // Find the code in DB
    const record = await ScoreKeeperCode.findOne({ code });
    if (!record) {
        throw new ApiError('Invalid or expired code', 400);
    }

    // Delete code to enforce one-time use
    //await ScoreKeeperCode.deleteOne({ _id: record._id });

    // Fetch the user if needed for token generation
    const user = await User.findById(record.userId);
    if (!user) {
        throw new ApiError('User not found', 404);
    }

    return {
        user,
        gameId: record.gameId
    };
};

module.exports = {
    createScoreKeeperCode,
    verifyScoreKeeperCode
};
