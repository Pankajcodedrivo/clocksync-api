const router = require('express').Router();
const controller = require('../../controllers/field/field.controller'); // your field controller
const auth = require('../../middlewares/auth.middleware');
const validationSchema = require('../../validators/admin/field.validator');
const validator = require('express-joi-validation').createValidator({
    passError: true,
});
router.use(auth('admin'));
router.patch('/update/:id', validator.params(validationSchema.singleId), validator.body(validationSchema.createField), controller.updateField);
router.post('/create', validator.body(validationSchema.createField), controller.createField);
router.get('/list/:page/:limit', controller.listField);
router.get('/detail/:id', validator.params(validationSchema.singleId), controller.getFieldById);
router.delete('/delete/:id', validator.params(validationSchema.singleId), controller.deleteField);
module.exports = router;