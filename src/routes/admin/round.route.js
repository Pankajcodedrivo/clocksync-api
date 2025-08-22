const router = require('express').Router();
const controller = require('../../controllers/admin/round.controller');
const auth = require('../../middlewares/auth.middleware');
const validationSchema = require('../../validators/admin/round.validator');
const validator = require('express-joi-validation').createValidator({
    passError: true,
});

router.use(auth('admin'));

router.post('/roundadd', validator.body(validationSchema.roundValidation), controller.createRound);

router.get('/allrounds', controller.allRoundsLists);

router.get('/edit-round/:id', controller.roundEdit);

router.patch('/update-round/:id', controller.updateRound,);

router.delete('/delete-round/:id', controller.deleteRound,);

module.exports = router;