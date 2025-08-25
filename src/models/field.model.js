const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    qrCodeUrl: { type: String }, // Base64 QR code
}, { timestamps: true });

module.exports = mongoose.model('field', FieldSchema);