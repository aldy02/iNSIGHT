const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const compareController = require('../controllers/compareController');

router.get('/meta', authMiddleware, compareController.getMeta);
router.get('/', authMiddleware, compareController.getCompare);

module.exports = router;