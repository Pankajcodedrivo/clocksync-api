const router = require('express').Router();
const controller = require('../../controllers/field/field.controller'); // your field controller
const validationSchema = require('../../validators/admin/field.validator');
const validator = require('express-joi-validation').createValidator({
    passError: true,
});
router.get('/:slug', validator.params(validationSchema.getFieldBySlug), controller.getFieldBySlug);
module.exports = router;