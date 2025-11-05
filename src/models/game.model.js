const mongoose = require('mongoose');
const User = require('./user.model');
const Field = require('./field.model');
const Event = require('./event.model');
const GameSchema = new mongoose.Schema({
    homeTeamName: { type: String, required: true },
    homeTeamLogo: { type: String },
    awayTeamName: { type: String, required: true },
    awayTeamLogo: { type: String },
    fieldId: {
        type: mongoose.Types.ObjectId,
        ref: Field,
    },
    eventId: {
        type: mongoose.Types.ObjectId,
        ref: Event,
    },
    startDateTime: {
        type: Date,
    },
    endGame: {
        type: Boolean,
        default: false, // automatically set true after endDateTime OR by admin
    },
    assignUserId: {
        type: mongoose.Types.ObjectId,
        ref: User,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
    },
}, { timestamps: true });

module.exports = mongoose.model('game', GameSchema);