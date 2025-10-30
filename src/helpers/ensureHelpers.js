const fieldService = require('../services/field/field.service');
const userService = require('../services/admin/user.service');
const QRCode = require('qrcode');
const { uploadBufferToS3 } = require('./s3Helper');
const config = require('../config/config');
const { generateUniqueSlug } = require('./slugHelper');

/**
 * Ensure a field exists, otherwise create it (with QR + S3 upload)
 */
const ensureField = async (fieldName, req, fieldMap, createdFields) => {
    if (!fieldName) return null;
    const key = fieldName.trim().toLowerCase();
    if (fieldMap[key]) return fieldMap[key];

    const slug = await generateUniqueSlug(fieldName);
    const redirectUrl = `${config.APP_BASE_URL}/${slug}`;
    const qrBuffer = await QRCode.toBuffer(redirectUrl);
    const qrCodeUrl = await uploadBufferToS3(
        qrBuffer,
        'cloclsync/qrcodes',
        `${slug}_${Date.now()}`
    );

    const newField = await fieldService.createField({
        name: fieldName,
        slug,
        qrCodeUrl,
        ads: { desktop: {}, mobile: {} },
        createdBy: req.user._id,
    });

    fieldMap[key] = newField._id;
    createdFields.push(newField.name);
    return newField._id;
}

/**
 * Ensure a scorekeeper user exists, otherwise create it
 */
const ensureUser = async (email, req, userMap, createdUsers, fullName = '') => {
    if (!email) return null;

    const key = email.trim().toLowerCase();

    // ✅ If user already exists, return existing ID
    if (userMap[key]) return userMap[key];

    // ✅ Create a new user if not found
    const password = Math.random().toString(36).slice(-8); // random 8-char password

    const newUser = await userService.addUser({
        email,
        password,
        fullName: fullName || email.split('@')[0], // fallback to part before @
        role: 'scorekeeper',
        createdBy: req.user._id,
    });

    // ✅ Cache and track
    userMap[key] = newUser._id;
    createdUsers.push({
        email: newUser.email,
        fullName: newUser.fullName,
    });

    return newUser._id;
};


module.exports = {
    ensureField,
    ensureUser,
};
