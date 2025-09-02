const router = require('express').Router();
const controller = require('../../controllers/game/game.controller');
const auth = require('../../middlewares/auth.middleware');
const validationSchema = require('../../validators/admin/game.validation');
const validator = require('express-joi-validation').createValidator({
    passError: true,
});

router.use(auth(['scorekeeper']));
router.get('/:id', validator.params(validationSchema.singleId), controller.getGameByIdAndUserId);
module.exports = router;
