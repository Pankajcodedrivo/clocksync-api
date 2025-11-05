const router = require('express').Router();
const controller = require('../../controllers/event/event.controller');
const auth = require('../../middlewares/auth.middleware');
const validationSchema = require('../../validators/admin/event.validation');
const upload = require('../../middlewares/multer.middleware');
const validator = require('express-joi-validation').createValidator({
    passError: true,
});



router.post('/create', auth(['admin']), upload.fields([
    { name: "eventLogo", maxCount: 1 },
]), validator.body(validationSchema.createEvent), controller.createEvent);
router.patch('/update/:id', auth(['admin']), upload.fields([
    { name: "eventLogo", maxCount: 1 },
]), validator.params(validationSchema.singleId), validator.body(validationSchema.createEvent), controller.updateEvent);
router.get('/list/:page/:limit', auth(['admin', 'event-director']), controller.listEvents);
router.get('/detail/:id', auth(['admin']), validator.params(validationSchema.singleId), controller.getEventById);
router.delete('/delete/:id', auth(['admin']), validator.params(validationSchema.singleId), controller.deleteEvent);
router.get('/list-current-event', auth(['admin', 'event-director']), controller.getEventListByEventDirector);
module.exports = router;
