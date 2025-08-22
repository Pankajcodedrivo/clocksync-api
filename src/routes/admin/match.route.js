const router = require('express').Router();
const controller = require('../../controllers/admin/match.controller');
const auth = require('../../middlewares/auth.middleware');
const validationSchema = require('../../validators/admin/match.validator');
const validator = require('express-joi-validation').createValidator({
    passError: true,
});

router.use(auth('admin'));

router.post(
    '/add-match',
    validator.body(validationSchema.addMatch),
    controller.addMatch,
);

router.get(
    '/list-match/:page/:limit',
    controller.listMatch
);

router.get(
    '/detail-match/:id',
    validator.params(validationSchema.singleId),
    controller.matchDetail,
);

router.patch(
    '/update-match/:id',
    controller.updateMatch,
);

router.delete(
    '/delete-match/:id',
    validator.params(validationSchema.singleId),
    controller.deleteMatch,
);

module.exports = router;
