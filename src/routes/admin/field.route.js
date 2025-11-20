const router = require('express').Router();
const controller = require('../../controllers/field/field.controller');
const auth = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/multer.middleware');
const validationSchema = require('../../validators/admin/field.validator');
const validator = require('express-joi-validation').createValidator({
    passError: true,
});

// ✅ Allow only admin & event-director
router.use(auth('admin', 'event-director'));

/**
 * Inline middleware to parse 'ads' JSON from multipart/form-data
 */
const parseAdsMiddleware = (req, res, next) => {
    if (req.body.ads && typeof req.body.ads === 'string') {
        try {
            req.body.ads = JSON.parse(req.body.ads);
        } catch (err) {
            return res.status(400).json({ status: 'fail', message: 'Invalid ads JSON' });
        }
    }
    next();
};

// ✅ Create Field
router.post(
    '/create',
    upload.any(),
    parseAdsMiddleware,
    validator.body(validationSchema.createField), // Make sure this supports ads
    controller.createField
);

// ✅ Update Field
router.patch(
    '/update/:id',
    upload.any(),
    parseAdsMiddleware,
    validator.params(validationSchema.singleId),
    validator.body(validationSchema.createField), // Supports ads as well
    controller.updateField
);

// ✅ Get paginated list
router.get('/list/:page/:limit', controller.listField);
router.patch('/update-universal-clock/:id', controller.updateUniversalClock);
router.patch('/update-status/:id', controller.updateStatus);

// ✅ Get single field detail
router.get('/detail/:id', validator.params(validationSchema.singleId), controller.getFieldById);

// ✅ Delete field
router.delete('/delete/:id', validator.params(validationSchema.singleId), controller.deleteField);

module.exports = router;
