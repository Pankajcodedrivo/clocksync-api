const router = require('express').Router();
const controller = require('../../controllers/scoreKeeper/scoreKeeper.controller');
const auth = require('../../middlewares/auth.middleware');
const validationSchema = require('../../validators/admin/user.validator');
const validator = require('express-joi-validation').createValidator({
    passError: true,
});
router.post("/code", auth(['scorekeeper']), controller.generateCode);
router.post(
    '/all-scorekeeper/:page/:limit', auth(['admin']),
    validator.params(validationSchema.pagination),
    controller.listUser,
);
router.post("/get", auth(['admin']), controller.generateCode);

// Verify code and get access/refresh tokens (public)
router.post("/verify", controller.verifyCode);
module.exports = router;
