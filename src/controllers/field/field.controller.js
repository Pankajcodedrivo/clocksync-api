const catchAsync = require('../../helpers/asyncErrorHandler');
const ApiError = require('../../helpers/apiErrorConverter');
const service = require('../../services/field/field.service');
const QRCode = require('qrcode');
const { uploadBufferToS3, deleteFromS3, renameS3Object } = require('../../helpers/s3Helper');
const config = require('../../config/config');
const { generateUniqueSlug } = require('../../helpers/slugHelper');

/**
 * ✅ Create Field
 */
const createField = catchAsync(async (req, res) => {
  let { name, ads = {}, unviseralClock } = req.body;

  if (!name) throw new ApiError(400, 'Field name is required');
  name = name.trim();

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
    uploadedFilesMap[file.fieldname] = file.location || file.path;
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
    ads: { desktop: desktopAds, mobile: mobileAds },
    createdBy: req.user._id,
  });

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
  let { name, ads = {}, unviseralClock } = req.body;

  if (!name) throw new ApiError(400, 'Field name is required');
  name = name.trim();

  const field = await service.getByFieldId(id);
  if (!field) throw new ApiError(404, 'Field not found');

  // ✅ Slug & QR logic
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
    uploadedFilesMap[file.fieldname] = file.location || file.path;
  });

  // ✅ Merge updates: replace placeholder or keep old image
  const mergeAds = (existingAds, updatedAds, platform, position) => {
    return (updatedAds[platform]?.[position] || []).map((adObj, idx) => {
      if (uploadedFilesMap[adObj.imageUrl]) {
        return {
          imageUrl: uploadedFilesMap[adObj.imageUrl],
          link: adObj.link || '',
        };
      }

      const oldAd = existingAds[idx] || {};
      return {
        imageUrl: adObj.imageUrl || oldAd.imageUrl || '',
        link: adObj.link || oldAd.link || '',
      };
    });
  };

  const desktopAds = {
    top: mergeAds(field.ads.desktop.top, ads, 'desktop', 'top'),
    left: mergeAds(field.ads.desktop.left, ads, 'desktop', 'left'),
    right: mergeAds(field.ads.desktop.right, ads, 'desktop', 'right'),
  };

  const mobileAds = {
    top: mergeAds(field.ads.mobile.top, ads, 'mobile', 'top'),
    middle: mergeAds(field.ads.mobile.middle, ads, 'mobile', 'middle'),
    bottom: mergeAds(field.ads.mobile.bottom, ads, 'mobile', 'bottom'),
  };

  const updatedField = await service.updateField(id, {
    name,
    slug,
    qrCodeUrl,
    unviseralClock,
    ads: { desktop: desktopAds, mobile: mobileAds },
  });

  res.status(200).json({
    message: 'Field updated successfully',
    field: updatedField,
    qrCodeUrl,
  });
});

const updateUniversalClock = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updatedField = await service.updateField(id, req.body);
  res.status(200).json({
    message: 'Field updated successfully',
    field: updatedField,

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

module.exports = {
  createField,
  updateField,
  getFieldById,
  deleteField,
  listField,
  getAllField,
  getFieldBySlug,
  updateUniversalClock,
  ensureField
};
