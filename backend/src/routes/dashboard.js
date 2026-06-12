const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/auth');

// Protected routes - requires authentication
router.get('/user', authMiddleware, dashboardController.getUserDashboard);

module.exports = router;
