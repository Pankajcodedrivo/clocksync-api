const router = require('express').Router();
const controller = require('../../controllers/game/game.controller');
const auth = require('../../middlewares/auth.middleware');
const validationSchema = require('../../validators/admin/game.validation');
const validator = require('express-joi-validation').createValidator({
    passError: true,
});

// Public, read-only schedule/results (no auth)
router.get('/public/list', controller.listPublicGames);
router.get('/public/score/:id', validator.params(validationSchema.singleId), controller.getGameScoreByGameId);

router.get('/:id', auth(['scorekeeper']), validator.params(validationSchema.singleId), controller.getGameByIdAndUserId);
router.get('/score/:id', validator.params(validationSchema.singleId), controller.getGameScoreByGameId);
module.exports = router;
