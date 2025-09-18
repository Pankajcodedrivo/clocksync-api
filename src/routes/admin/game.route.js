const router = require('express').Router();
const controller = require('../../controllers/game/game.controller');
const fieldController = require('../../controllers/field/field.controller');
const userController = require('../../controllers/user/user.controller');
const auth = require('../../middlewares/auth.middleware');
const validationSchema = require('../../validators/admin/game.validation');
const upload = require('../../middlewares/multer.middleware');
const validator = require('express-joi-validation').createValidator({
    passError: true,
});

router.use(auth(['admin', 'scorekeeper']));

router.post('/create', upload.fields([
    { name: "homeTeamLogo", maxCount: 1 },
    { name: "awayTeamLogo", maxCount: 1 },
]), validator.body(validationSchema.createGame), controller.createGame);
router.patch('/update/:id', upload.fields([
    { name: "homeTeamLogo", maxCount: 1 },
    { name: "awayTeamLogo", maxCount: 1 },
]), validator.params(validationSchema.singleId), validator.body(validationSchema.createGame), controller.updateGame);
router.get('/list/:page/:limit', controller.listGames);
router.get('/detail/:id', validator.params(validationSchema.singleId), controller.getGameById);
router.delete('/delete/:id', validator.params(validationSchema.singleId), controller.deleteGame);
router.get('/getallfield', fieldController.getAllField);
router.get('/getallScorekeeper', userController.getAllScoreKeeper);
module.exports = router;
