const mongoose = require('mongoose');
const User = require('./user.model');
const EventSchema = new mongoose.Schema({
    eventName: { type: String, required: true },
    eventLogo: { type: String },
    startDate: {
        type: Date,
    },
    endDate: {
        type: Date,
    },
    assignUserId: {
        type: mongoose.Types.ObjectId,
        ref: User,
    }
}, { timestamps: true });

module.exports = mongoose.model('event', EventSchema);