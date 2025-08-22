const router = require('express').Router();

const authRouter = require('./auth/auth.route');
const adminAuth = require('./admin/auth/auth.route');
const Profile = require('./profile/profile.route');
const settings = require('./site-settings/sitesettings.route');
const pages = require('../routes/page.route');

//admin profile
const adminProfile = require('./admin/profile.route');
const userManagement = require('./admin/user.route');

const adminSetting = require('./admin/setting.route');
const adminDashboard = require('./admin/dashboard.route');

// all routes
router.use('/auth', authRouter);
router.use('/profile', Profile);
router.use('/settings', settings);
router.use('/pages', pages);

//all admin route
router.use('/admin', adminAuth);
router.use('/admin/dashboard', adminDashboard);
router.use('/admin/profile', adminProfile);
router.use('/admin/user-management', userManagement);
router.use('/admin/setting', adminSetting);

module.exports = router;
