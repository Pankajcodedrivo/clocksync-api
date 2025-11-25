const GameStatistics = require("../models/gameStatistics.model");

// Create stats for new game
const createGameStatistics = async (gameId) => {
    return GameStatistics.create({ gameId });
};

// Get stats by gameId
const getStatsByGameId = async (gameId) => {
    return GameStatistics.findOne({ gameId });
};
/*
const resetGame = async (gameId) => {
    return GameStatistics.findOneAndUpdate(
        { gameId },
        {
            $set: {
                "homeTeam.score": 0,
                "awayTeam.score": 0,
                "homeTeam.stats": { shots: 0, fouls: 0, saves: 0, penalties: 0 },
                "awayTeam.stats": { shots: 0, fouls: 0, saves: 0, penalties: 0 },
               
                clock: { quarter: 0, minutes: 0, seconds: 0 }
            }
        },
        { new: true }
    );
}; */
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

    const gameStats = await GameStatistics.findOne({ gameId });
    if (!gameStats) throw new Error("Game not found");

    const { minutes: clockMin, seconds: clockSec } = gameStats.clock;

    // Build penalty object
    const penalty = {
        team,
        type,
        playerNo,
        minutes,
        seconds,
        startMinute: clockMin,
        startSecond: clockSec,

    };
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

// -----------------------------
// UPDATE STATS FOR EVENT TYPES
// -----------------------------
const incrementTeamStat = (teamObj, type) => {
    switch (type) {
        case "goal": teamObj.score++; teamObj.stats.goal++; break;
        case "shot_on": teamObj.stats.shotOn++; break;
        case "shot_off": teamObj.stats.shotOff++; break;
        case "save": teamObj.stats.save++; break;
        case "ground_ball": teamObj.stats.groundBall++; break;
        case "draw_w": teamObj.stats.drawW++; break;
        case "draw_l": teamObj.stats.drawL++; break;
        case "to_f": teamObj.stats.turnoverForced++; break;
        case "to_u": teamObj.stats.turnoverUnforced++; break;
        case "penalty": teamObj.stats.penalty++; break;
    }
};

const decrementTeamStat = (teamObj, type) => {
    switch (type) {
        case "goal": teamObj.score--; teamObj.stats.goal--; break;
        case "shot_on": teamObj.stats.shotOn--; break;
        case "shot_off": teamObj.stats.shotOff--; break;
        case "save": teamObj.stats.save--; break;
        case "ground_ball": teamObj.stats.groundBall--; break;
        case "draw_w": teamObj.stats.drawW--; break;
        case "draw_l": teamObj.stats.drawL--; break;
        case "to_f": teamObj.stats.turnoverForced--; break;
        case "to_u": teamObj.stats.turnoverUnforced--; break;
        case "penalty": teamObj.stats.penalty--; break;
    }
};

// ----------------------------------------------------
// ADD ACTION EVENT (goal, shot, save, penalty, etc.)
// ----------------------------------------------------
const addActionEvent = async (payload) => {
    const {
        gameId,
        team,                // "home" or "away"
        type,                // "goal" | "shot_on" | "penalty" ...
        playerNo,
        duration,
        releasable,
        infraction
    } = payload;

    const gameStats = await GameStatistics.findOne({ gameId });
    if (!gameStats) throw new Error("Game not found");

    const currentQuarter = gameStats.clock?.quarter || 1;
    const minute = gameStats.clock?.minutes || 0;
    const second = gameStats.clock?.seconds || 0;

    // Build unified event
    const event = {
        type,
        team,
        playerNo,
        quarter: currentQuarter,
        minute,
        second,
    };

    // If penalty, attach penalty fields
    if (type === "penalty") {
        event.penaltyType = releasable ? "releasable" : "non-releasable";
        event.penaltyMinutes = Math.floor(duration / 60);
        event.penaltySeconds = duration % 60;
        event.infraction = infraction;
    }

    // Add to unified actions list
    gameStats.actions.push(event);

    // Update team statistics
    const teamObj = team === "home" ? gameStats.homeTeam : gameStats.awayTeam;
    incrementTeamStat(teamObj, type);
    await gameStats.save();
    return gameStats;
};

// ----------------------------------------------------
// UNDO LAST ACTION EVENT
// ----------------------------------------------------
const undoAction = async (payload) => {
    const { gameId, teamName: requestedTeam } = payload;

    const gameStats = await GameStatistics.findOne({ gameId });
    if (!gameStats) throw new Error("Game not found");

    if (!Array.isArray(gameStats.actions) || gameStats.actions.length === 0) {
        return gameStats; // no actions at all
    }

    const normalized = requestedTeam.trim().toLowerCase();
    const lastIndex = [...gameStats.actions]
        .map((a, i) => ({ team: String(a.team).toLowerCase(), index: i }))
        .filter(a => a.team === normalized)
        .map(a => a.index)
        .pop();
    if (lastIndex === undefined) {
        // This team has no events
        return gameStats;
    }

    // Remove that event
    const lastEvent = gameStats.actions.splice(lastIndex, 1)[0];

    const { type: eventType } = lastEvent;

    const teamObj =
        normalized === "home"
            ? gameStats.homeTeam
            : gameStats.awayTeam;

    decrementTeamStat(teamObj, eventType, lastEvent);

    gameStats.markModified(normalized === "home" ? "homeTeam" : "awayTeam");
    gameStats.markModified("actions");

    await gameStats.save();
    return gameStats;
};

// ----------------------------------------------------

// ----------------------------------------------------
// DELETE ACTION BY ID (works like undo, but for any item)
// ----------------------------------------------------
const deleteAction = async ({ gameId, actionId }) => {
    const gameStats = await GameStatistics.findOne({ gameId });
    if (!gameStats) throw new Error("Game not found");

    // Find action
    const index = gameStats.actions.findIndex(a => a._id.toString() === actionId);
    if (index === -1) throw new Error("Action not found");

    const deletedAction = gameStats.actions[index];

    // Remove action
    gameStats.actions.splice(index, 1);

    // Reverse stats exactly like undoAction
    const teamObj = deletedAction.team === "home"
        ? gameStats.homeTeam
        : gameStats.awayTeam;

    decrementTeamStat(teamObj, deletedAction.type);

    await gameStats.save();
    return gameStats;
};

module.exports = {
    createGameStatistics,
    getStatsByGameId,
    setScore,
    setTeamStat,
    addGoal,
    addPenalty,
    updateClock,
    removePenalty,
    addActionEvent,
    undoAction,
    deleteAction
};
