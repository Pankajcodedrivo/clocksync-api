const router = require('express').Router();
const controller = require('../../controllers/game/game.controller');
const auth = require('../../middlewares/auth.middleware');
const validationSchema = require('../../validators/admin/game.validation');
const validator = require('express-joi-validation').createValidator({
    passError: true,
});

router.use(auth(['admin', 'scorekeeper']));

router.post('/create', validator.body(validationSchema.createGame), controller.createGame);
router.patch('/update/:id', validator.params(validationSchema.singleId), validator.body(validationSchema.createGame), controller.updateGame);
router.get('/list/:page/:limit', controller.listGames);
router.get('/detail/:id', validator.params(validationSchema.singleId), controller.getGameById);
router.delete('/delete/:id', validator.params(validationSchema.singleId), controller.deleteGame);

module.exports = router;
