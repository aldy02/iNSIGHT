const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const plantController = require('../controllers/plantController');

router.get('/', authMiddleware, plantController.getAllPlants);

module.exports = router;