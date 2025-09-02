const mongoose = require("mongoose");

const scoreKeeperCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
});

// TTL index automatically deletes expired codes
scoreKeeperCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ScoreKeeperCode", scoreKeeperCodeSchema);
