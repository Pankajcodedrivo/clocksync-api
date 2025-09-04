const mongoose = require('mongoose');
const Game = require('./game.model');

// Clock schema
const ClockSchema = new mongoose.Schema({
    quarter: { type: Number, default: 0 },
    minutes: { type: Number, default: 0 },
    seconds: { type: Number, default: 0 },
    running: { type: Boolean, default: false }
}, { _id: false });

// Team stats schema (summary only)
const TeamStatsSchema = new mongoose.Schema({
    score: { type: Number, default: 0 },
    stats: {
        penalties: { type: Number, default: 0 },
        shots: { type: Number, default: 0 },
        saves: { type: Number, default: 0 },
        fouls: { type: Number, default: 0 }
    }
}, { _id: false });

// Goal schema
const GoalSchema = new mongoose.Schema({
    team: { type: String, enum: ['home', 'away'], required: true },
    playerNo: { type: Number, required: true },
    minute: { type: Number, required: true },
}, { _id: false });

// Penalty schema
const PenaltySchema = new mongoose.Schema({
    team: { type: String, enum: ['home', 'away'], required: true },
    type: { type: String, enum: ['illegal', 'legal'], required: true },
    playerNo: { type: Number, required: true },
    minutes: { type: Number, default: 0 },
    seconds: { type: Number, default: 0 }
}, { _id: false });

// Main schema
const GameStatisticsSchema = new mongoose.Schema({
    gameId: {
        type: mongoose.Types.ObjectId,
        ref: Game,
        required: true
    },
    homeTeam: { type: TeamStatsSchema, default: () => ({}) },
    awayTeam: { type: TeamStatsSchema, default: () => ({}) },
    clock: { type: ClockSchema, default: () => ({}) },

    goals: [GoalSchema],
    penalties: [PenaltySchema]
}, { timestamps: true });

module.exports = mongoose.model('gameStatistics', GameStatisticsSchema);