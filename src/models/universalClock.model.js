const mongoose = require("mongoose");
const User = require("./user.model");

const UniversalClockSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: User,
            required: true,
            index: true,
        },
        quarter: { type: Number, default: 0 },
        minutes: { type: Number, default: 0 },
        seconds: { type: Number, default: 0 },
        running: { type: Boolean, default: false },
        lastUpdated: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

module.exports = mongoose.model("universalClock", UniversalClockSchema);
