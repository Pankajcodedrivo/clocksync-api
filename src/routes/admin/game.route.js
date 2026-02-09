const router = require('express').Router();
const controller = require('../../controllers/game/game.controller');
const fieldController = require('../../controllers/field/field.controller');
const userController = require('../../controllers/user/user.controller');
const auth = require('../../middlewares/auth.middleware');
const validationSchema = require('../../validators/admin/game.validation');
const upload = require('../../middlewares/multer.middleware');
const uploadMemory = require('../../middlewares/multerMemory.middleware.js');
const validator = require('express-joi-validation').createValidator({
    passError: true,
});

router.use(auth(['admin', 'scorekeeper', 'event-director']));

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
router.get('/notendgame/list/', controller.listNotEndGames);
router.delete(
    '/mullti-delete',
    validator.body(validationSchema.multipleIds),
    controller.deleteGames
);

router.get('/download/statistics/:id', validator.params(validationSchema.singleId), controller.downloadGameStatistics);
router.get('/getallfield', fieldController.getAllField);
router.get('/getallScorekeeper', userController.getAllScoreKeeper);
// 📤 🧾 Import games via Excel or CSV file
router.post(
    '/import',
    uploadMemory.single('file'), // use same field name as in frontend FormData.append('file', uploadFile)
    controller.importGamesFromFile
);

module.exports = router;
