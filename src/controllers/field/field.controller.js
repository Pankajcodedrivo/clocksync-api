const catchAsync = require('../../helpers/asyncErrorHandler');
const ApiError = require('../../helpers/apiErrorConverter');
const service = require('../../services/field/field.service');
const QRCode = require('qrcode');
const { uploadBufferToS3, deleteFromS3, renameS3Object } = require('../../helpers/s3Helper');
const config = require('../../config/config');
const { generateUniqueSlug } = require('../../helpers/slugHelper');

/**
 * Create Field with QR code
 */
const createField = catchAsync(async (req, res) => {
  const { name } = req.body;
  if (!name) throw new ApiError(400, 'Field name is required');
  const slug = await generateUniqueSlug(name);
  const redirectUrl = `${config.APP_BASE_URL}/${slug}`;
  const qrBuffer = await QRCode.toBuffer(redirectUrl);
  const qrCodeUrl = await uploadBufferToS3(qrBuffer, 'cloclsync/qrcodes', `${slug}_${Date.now()}`);

  const field = await service.createField({ name, slug, qrCodeUrl });

  res.status(201).json({ message: 'Field created successfully', field, qrCodeUrl });
});

const listField = catchAsync(async (req, res) => {

  const page = parseInt(req.params.page) || 1;
  const limit = parseInt(req.params.limit) || 10;
  const search = req.query.search || "";
  const result = await service.listFields({ page, limit, search });

  res.status(200).json({
    success: true,
    ...result,
  });

});
/**
 * Update Field and rename QR code in S3
 */
const updateField = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) throw new ApiError(400, 'Field name is required');

  const field = await service.getByFieldId(id);
  if (!field) throw new ApiError(404, 'Field not found');

  let slug = field.slug;
  let qrCodeUrl = field.qrCodeUrl;

  // 🔹 Only regenerate slug & QR if name has actually changed
  if (field.name !== name) {
    slug = await generateUniqueSlug(name);

    if (field.qrCodeUrl) {
      // Rename existing QR code in S3 with new slug
      const newKey = `cloclsync/qrcodes/${slug}_${Date.now()}.png`;
      qrCodeUrl = await renameS3Object(field.qrCodeUrl, newKey);
    } else {
      // No QR exists → generate a fresh one
      const redirectUrl = `${config.APP_BASE_URL}/${slug}`;
      const qrBuffer = await QRCode.toBuffer(redirectUrl);
      qrCodeUrl = await uploadBufferToS3(
        qrBuffer,
        'cloclsync/qrcodes',
        `${slug}_${Date.now()}`
      );
    }
  }

  // 🔹 Update DB with new name/slug/qrCodeUrl
  const updatedField = await service.updateField(id, { name, slug, qrCodeUrl });

  res.status(200).json({
    message: 'Field updated successfully',
    field: updatedField,
    qrCodeUrl,
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

module.exports = {
  createField,
  updateField,
  getFieldById,
  deleteField,
  listField
};
