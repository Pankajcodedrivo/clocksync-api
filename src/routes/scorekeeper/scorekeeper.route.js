const router = require('express').Router();
const controller = require('../../controllers/scoreKeeper/scoreKeeper.controller');
const auth = require('../../middlewares/auth.middleware');

router.post("/code", auth(['scorekeeper']), controller.generateCode);

// Verify code and get access/refresh tokens (public)
router.post("/verify", controller.verifyCode);
module.exports = router;
