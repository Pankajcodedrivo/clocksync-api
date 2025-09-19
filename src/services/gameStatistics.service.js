const GameStatistics = require("../models/gameStatistics.model");

// Create stats for new game
const createGameStatistics = async (gameId) => {
    return GameStatistics.create({ gameId });
};

// Get stats by gameId
const getStatsByGameId = async (gameId) => {
    return GameStatistics.findOne({ gameId });
};

const resetGame = async (gameId) => {
    return GameStatistics.findOneAndUpdate(
        { gameId },
        {
            $set: {
                "homeTeam.score": 0,
                "awayTeam.score": 0,
                "homeTeam.stats": { shots: 0, fouls: 0, saves: 0, penalties: 0 },
                "awayTeam.stats": { shots: 0, fouls: 0, saves: 0, penalties: 0 },
                goals: [],
                penalties: [],
                clock: { quarter: 0, minutes: 0, seconds: 0 }
            }
        },
        { new: true }
    );
};
// Set team score directly
const setScore = async (gameId, team, value) => {
    if (value < 0) value = 0;
    const path = `${team.toLowerCase()}Team.score`;

    return GameStatistics.findOneAndUpdate(
        { gameId },
        { $set: { [path]: value } },
        { new: true }
    );
};

// Set team stat directly (shots, fouls, saves, penalties count)
const setTeamStat = async (gameId, team, field, value) => {
    if (value < 0) value = 0;
    const path = `${team.toLowerCase()}Team.stats.${field}`;

    return GameStatistics.findOneAndUpdate(
        { gameId },
        { $set: { [path]: value } },
        { new: true }
    );
};

// Add goal (timeline only)
const addGoal = async (gameId, team, playerNo, minute, second) => {
    const goal = { team, playerNo, minute, second };

    return GameStatistics.findOneAndUpdate(
        { gameId },
        { $push: { goals: goal } },
        { new: true }
    );
};

// Add penalty (timeline only)
const addPenalty = async (gameId, team, type, playerNo, minutes, seconds) => {
    const penalty = { team, type, playerNo, minutes, seconds };
    return GameStatistics.findOneAndUpdate(
        { gameId },
        { $push: { penalties: penalty } },
        { new: true }
    );
};

const removePenalty = async (gameId, penaltyId) => {
    return GameStatistics.findOneAndUpdate(
        { gameId },
        { $pull: { penalties: { _id: penaltyId } } }, // remove by Mongo _id
        { new: true }
    );
};
// Update clock
const updateClock = async (gameId, updates) => {
    const setData = {};
    // build dot-notation update for each field
    for (const key of Object.keys(updates)) {
        setData[`clock.${key}`] = updates[key];
    }
    return GameStatistics.findOneAndUpdate(
        { gameId },
        { $set: setData },
        { new: true }
    );
};

module.exports = {
    createGameStatistics,
    getStatsByGameId,
    setScore,
    setTeamStat,
    addGoal,
    addPenalty,
    updateClock,
    resetGame,
    removePenalty
};
