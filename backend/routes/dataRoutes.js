const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const dataController = require('../controllers/dataController');

router.get('/structure', authMiddleware, dataController.getStructure);
router.get('/readings', authMiddleware, dataController.getReadings);

module.exports = router;