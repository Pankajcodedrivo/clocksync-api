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
 * Ensure a scorekeeper user exists, otherwise create it or link to existing one.
 * Supports shared scorekeepers (multiple event directors can link to the same user).
 */
const ensureUser = async (email, req, userMap, createdUsers, fullName = '') => {
    if (!email) return null;

    const key = email.trim().toLowerCase();
    const creatorId = req.user?._id;

    // ✅ Return cached user if already processed
    if (userMap[key]) return userMap[key];

    // ✅ Try to find existing user by email
    let user = await userService.getUserByEmail(key);

    if (user) {
        // ✅ If user exists but not yet linked to this director, link them
        if (!user.createdBy.some(id => id.equals(creatorId))) {
            user.createdBy.push(creatorId);
            await user.save();
        }

        userMap[key] = user._id;
        return user._id;
    }

    // ✅ Otherwise, create a new scorekeeper user
    const password = Math.random().toString(36).slice(-8); // random 8-char password

    user = await userService.addUser({
        email: key,
        password,
        fullName: fullName || email.split('@')[0],
        role: 'scorekeeper',
        createdBy: [creatorId],
        firstTimeLogin: true,
    });

    // ✅ Cache and track created user
    userMap[key] = user._id;
    createdUsers.push({
        email: user.email,
        fullName: user.fullName,
    });

    return user._id;
};


module.exports = {
    ensureField,
    ensureUser,
};
