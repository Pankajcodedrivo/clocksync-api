const catchAsync = require('../../helpers/asyncErrorHandler');
const ApiError = require('../../helpers/apiErrorConverter');
const service = require('../../services/field/field.service');
const emailService = require('../../services/email/gmail.service');
const userService = require('../../services/admin/user.service');
const QRCode = require('qrcode');
const { uploadBufferToS3, deleteFromS3, renameS3Object } = require('../../helpers/s3Helper');
const config = require('../../config/config');
const { generateUniqueSlug } = require('../../helpers/slugHelper');
const axios = require('axios');

/**
 * ✅ Create Field
 */
const createField = catchAsync(async (req, res) => {
  let { name, ads = {}, unviseralClock, adsTime } = req.body;
  if (typeof ads === "string") {
    ads = JSON.parse(ads);
  }
  if (!name) throw new ApiError(400, 'Field name is required');
  name = name.trim();

  adsTime = Number(adsTime);
  if (isNaN(adsTime)) adsTime = 30;
  const slug = await generateUniqueSlug(name);
  const redirectUrl = `${config.APP_BASE_URL}/${slug}`;
  const qrBuffer = await QRCode.toBuffer(redirectUrl);
  const qrCodeUrl = await uploadBufferToS3(
    qrBuffer,
    'cloclsync/qrcodes',
    `${slug}_${Date.now()}`
  );

  // ✅ Map uploaded files to real URLs
  const uploadedFilesMap = {};
  (req.files || []).forEach((file) => {
    if (!uploadedFilesMap[file.fieldname]) {
      uploadedFilesMap[file.fieldname] = file.location || file.path;
    }
  });

  // ✅ Replace placeholders or use direct URLs
  const processAdsSection = (adsSection = {}, platform, position) => {
    return (adsSection[platform]?.[position] || []).map((adObj) => {
      return {
        imageUrl: uploadedFilesMap[adObj.imageUrl] || adObj.imageUrl || '',
        link: adObj.link || '',
      };
    });
  };

  const desktopAds = {
    top: processAdsSection(ads, 'desktop', 'top'),
    left: processAdsSection(ads, 'desktop', 'left'),
    right: processAdsSection(ads, 'desktop', 'right'),
  };

  const mobileAds = {
    top: processAdsSection(ads, 'mobile', 'top'),
    middle: processAdsSection(ads, 'mobile', 'middle'),
    bottom: processAdsSection(ads, 'mobile', 'bottom'),
  };

  const field = await service.createField({
    name,
    slug,
    qrCodeUrl,
    unviseralClock,
    adsTime,
    ads: { desktop: desktopAds, mobile: mobileAds },
    createdBy: req.user._id,
    status: req.user.role === 'admin' ? 'approve' : 'pending',
  });

  if (req.user.role !== 'admin') {
    await emailService.sendGmailEmail(
      'admin@clocksynk.com', "Approval required", 'fieldAddedUpdateEmail', {
      name: req.user.fullName,
      status: "added",
      url: config.ADMIN_BASE_URL
    });
  }


  res.status(201).json({
    message: 'Field created successfully',
    field,
    qrCodeUrl,
  });
});

/**
 * ✅ Update Field
 */
const updateField = catchAsync(async (req, res) => {
  const { id } = req.params;
  let { name, ads = {}, unviseralClock, adsTime } = req.body;

  // ✅ IMPORTANT
  if (typeof ads === "string") {
    ads = JSON.parse(ads);
  }

  if (!name) throw new ApiError(400, 'Field name is required');
  name = name.trim();

  adsTime = Number(adsTime);
  if (isNaN(adsTime)) adsTime = 30;

  const field = await service.getByFieldId(id);
  if (!field) throw new ApiError(404, 'Field not found');

  // ✅ Slug & QR
  let slug = field.slug;
  let qrCodeUrl = field.qrCodeUrl;

  if (field.name !== name) {
    slug = await generateUniqueSlug(name);
    if (qrCodeUrl) {
      const newKey = `cloclsync/qrcodes/${slug}_${Date.now()}.png`;
      qrCodeUrl = await renameS3Object(qrCodeUrl, newKey);
    } else {
      const redirectUrl = `${config.APP_BASE_URL}/${slug}`;
      const qrBuffer = await QRCode.toBuffer(redirectUrl);
      qrCodeUrl = await uploadBufferToS3(
        qrBuffer,
        'cloclsync/qrcodes',
        `${slug}_${Date.now()}`
      );
    }
  }

  // ✅ Map uploaded files
  const uploadedFilesMap = {};
  (req.files || []).forEach((file) => {
    if (!uploadedFilesMap[file.fieldname]) {
      uploadedFilesMap[file.fieldname] = file.location || file.path;
    }
  });

  // ✅ CORRECT MERGE (NO INDEX LOGIC)
  const resolveAds = (updatedAds = []) => {
    return updatedAds.map((ad) => {
      // New uploaded file
      if (uploadedFilesMap[ad.imageUrl]) {
        return {
          imageUrl: uploadedFilesMap[ad.imageUrl],
          link: ad.link || '',
        };
      }

      // Keep existing image
      return {
        imageUrl: ad.imageUrl || '',
        link: ad.link || '',
      };
    });
  };
  const desktopAds = {
    top: resolveAds(ads.desktop?.top),
    left: resolveAds(ads.desktop?.left),
    right: resolveAds(ads.desktop?.right),
  };

  const mobileAds = {
    top: resolveAds(ads.mobile?.top),
    middle: resolveAds(ads.mobile?.middle),
    bottom: resolveAds(ads.mobile?.bottom),
  };

  const updatedField = await service.updateField(id, {
    name,
    slug,
    qrCodeUrl,
    unviseralClock,
    adsTime,
    ads: { desktop: desktopAds, mobile: mobileAds },
    status: req.user.role === 'admin' ? 'approve' : 'pending',
  });

  if (req.user.role !== 'admin') {
    await emailService.sendGmailEmail(
      'admin@clocksynk.com',
      "Approval required",
      'fieldAddedUpdateEmail',
      {
        name: req.user.fullName,
        status: "updated",
        url: config.ADMIN_BASE_URL
      }
    );
  }

  res.status(200).json({
    message: 'Field updated successfully',
    field: updatedField,
    qrCodeUrl,
  });
});


const updateUniversalClock = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updatedFieldData = await service.updateField(id, req.body);
  res.status(200).json({
    message: 'Field updated successfully',
    field: updatedFieldData,

  });
});

const listField = catchAsync(async (req, res) => {

  const page = parseInt(req.params.page) || 1;
  const limit = parseInt(req.params.limit) || 10;
  const search = req.query.search || "";
  const result = await service.listFields({ user: req.user, page, limit, search });

  res.status(200).json({
    success: true,
    ...result,
  });

});

/**
 * Get Field by ID
 */
const getFieldById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const field = await service.getByFieldId(id);
  if (!field) throw new ApiError(404, 'Field not found');

  res.status(200).json({ field });
});


/**
 * Get All field
 */
const getAllField = catchAsync(async (req, res) => {
  let match = {}
  if (req.user.role === 'event-director') {
    match.createdBy = req.user._id
  }
  match.status = "approve";
  const field = await service.getAllField(match);
  res.status(200).json({ field });
});


/**
 * Get All field
 */
const getFieldBySlug = catchAsync(async (req, res) => {
  const { field, games, gameStatistics } = await service.getFieldBySlug(req.params.slug);
  res.status(200).json({ field, games, gameStatistics });
});

/**
 * Delete Field
 */
const deleteField = catchAsync(async (req, res) => {
  const { id } = req.params;

  const field = await service.getByFieldId(id);
  if (!field) throw new ApiError(404, 'Field not found');

  // Delete QR from S3 if exists
  if (field.qrCodeUrl) await deleteFromS3(field.qrCodeUrl);

  await service.deleteFieldById(id);

  res.status(200).json({ message: 'Field deleted successfully' });
});

const ensureField = async (fieldName) => {
  if (!fieldName) return null;
  const key = fieldName.trim().toLowerCase();
  if (fieldMap[key]) return fieldMap[key];

  // Create new field with QR
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

const verifyCaptcha = catchAsync(async (req, res) => {
  const { token } = req.body;
  const secretKey = config.RECAPTCHA_SECRET_KEY;

  try {
    // Call Google API
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`
    );
    const data = response.data;
    if (data.success) {
      // Human detected (v3 score-based) or v2 success
      res.status(200).json({ success: true, human: true });
    } else {
      res.status(400).json({ success: false, message: "You are not a human" });
    }
  } catch (error) {
    console.error("Captcha verification error:", error);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
});

const updateStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate status (only "true" or "false" allowed)
  if (status !== "approve" && status !== "reject") {
    return res.status(400).json({
      message: "Invalid status value",
    });
  }
  const data = await service.updateField(id, { status: status });
  const user = await userService.getUserById(data.createdBy);
  console.log(user);
  await emailService.sendGmailEmail(
    user.email,
    `${status === "approve" ? "Approved" : "Rejected"} by Admin`,
    'adminApprovalField', {
    status: status === "approve" ? "approved" : "rejected",
    url: config.ADMIN_BASE_URL
  });

  const message =
    status === "approve"
      ? "Field approved successfully"
      : "Field reject successfully";

  res.status(200).json({
    message,
    field: data,
  });
});

module.exports = {
  createField,
  updateField,
  getFieldById,
  deleteField,
  listField,
  getAllField,
  getFieldBySlug,
  updateUniversalClock,
  ensureField,
  verifyCaptcha,
  updateStatus
};
