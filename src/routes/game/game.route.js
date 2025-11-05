const router = require('express').Router();
const controller = require('../../controllers/game/game.controller');
const auth = require('../../middlewares/auth.middleware');
const validationSchema = require('../../validators/admin/game.validation');
const validator = require('express-joi-validation').createValidator({
    passError: true,
});

router.get('/:id', auth(['scorekeeper']), validator.params(validationSchema.singleId), controller.getGameByIdAndUserId);
router.get('/score/:id', validator.params(validationSchema.singleId), controller.getGameScoreByGameId);
module.exports = router;
