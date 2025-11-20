const mongoose = require('mongoose');
const Game = require('./game.model');
//
// CLOCK SCHEMA
//
const ClockSchema = new mongoose.Schema({
    quarter: { type: Number, default: 1 },
    minutes: { type: Number, default: 0 },
    seconds: { type: Number, default: 0 },
    running: { type: Boolean, default: false }
}, { _id: false });
//
// TEAM SUMMARY STATS
//
const TeamStatsSchema = new mongoose.Schema({
    score: { type: Number, default: 0 },
    stats: {
        shotOn: { type: Number, default: 0 },
        shotOff: { type: Number, default: 0 },
        save: { type: Number, default: 0 },
        groundBall: { type: Number, default: 0 },
        drawW: { type: Number, default: 0 },
        drawL: { type: Number, default: 0 },
        turnoverForced: { type: Number, default: 0 },   // TO - F
        turnoverUnforced: { type: Number, default: 0 },  // TO - U
        goal: { type: Number, default: 0 },  // TO - U
        penalty: { type: Number, default: 0 },
    }
}, { _id: false });
//
// UNIFIED ACTION / EVENT SCHEMA
//
const ActionEventSchema = new mongoose.Schema({
    // Event Type
    type: {
        type: String,
        enum: [
            'shot_on',
            'shot_off',
            'save',
            'ground_ball',
            'draw_w',
            'draw_l',
            'to_f',
            'to_u',
            'goal',
            'penalty'
        ],
        required: true
    },
    team: { type: String, enum: ['home', 'away'], required: true },
    playerNo: { type: Number, required: true },
    // When?
    quarter: { type: Number, required: true },
    minute: { type: Number, default: 0 },
    second: { type: Number, default: 0 },
    // Penalty-specific fields (only used when type === 'penalty')
    penaltyType: { type: String, enum: ['releasable', 'non-releasable'] },
    penaltyMinutes: { type: Number },
    penaltySeconds: { type: Number },
    infraction: { type: String },
}, { _id: true, timestamps: true });
//
// MAIN SCHEMA
//
const GameStatisticsSchema = new mongoose.Schema({
    gameId: {
        type: mongoose.Types.ObjectId,
        ref: Game,
        required: true
    },
    homeTeam: { type: TeamStatsSchema, default: () => ({}) },
    awayTeam: { type: TeamStatsSchema, default: () => ({}) },
    clock: { type: ClockSchema, default: () => ({}) },
    // Only one event list now
    actions: [ActionEventSchema]
}, { timestamps: true });

module.exports = mongoose.model('gameStatistics', GameStatisticsSchema);