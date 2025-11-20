const mongoose = require('mongoose');
const User = require('./user.model');

const AdSchema = new mongoose.Schema({
    imageUrl: { type: String }, // Ad image / media URL
    link: { type: String }, // Optional redirect URL
});

const FieldSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    qrCodeUrl: { type: String }, // Base64 QR code
    adsTime: { type: Number, default: 30 },
    status: { type: String, enum: ['pending', 'approve', 'reject'] },
    // ✅ Ads structured by platform and position
    ads: {
        desktop: {
            top: [AdSchema],      // Multiple ads allowed
            left: [AdSchema],
            right: [AdSchema],
        },
        mobile: {
            top: [AdSchema],
            middle: [AdSchema],
            bottom: [AdSchema],
        }
    },
    unviseralClock: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
        default: null,
    },
}, { timestamps: true });

module.exports = mongoose.model('field', FieldSchema);