const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/user',  authMiddleware,           dashboardController.getUserDashboard);
router.get('/admin', authMiddleware, adminOnly, dashboardController.getAdminDashboard);

module.exports = router;
