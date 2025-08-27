const mongoose = require('mongoose');
const User = require('./user.model');
const Field = require('./field.model');
const GameSchema = new mongoose.Schema({
    homeTeamName: { type: String, required: true },
    homeTeamLogo: { type: String },
    awayTeamName: { type: String, required: true },
    awayTeamLogo: { type: String },
    fieldId: {
        type: mongoose.Types.ObjectId,
        ref: Field,
    },
    startDateTime: {
        type: Date,
    },
    assignUserId: {
        type: mongoose.Types.ObjectId,
        ref: User,
    }
}, { timestamps: true });

module.exports = mongoose.model('game', GameSchema);