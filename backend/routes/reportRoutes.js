const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');
const reportController = require('../controllers/reportController');
const plantController = require('../controllers/plantController');
const dataController = require('../controllers/dataController');

router.get('/plants', authMiddleware, plantController.getAllPlants);
router.get('/structure', authMiddleware, reportController.getStructure);
router.get('/readings', authMiddleware, dataController.getReadings);

router.get('/', authMiddleware, reportController.getReport);
router.put('/', authMiddleware, reportController.saveReport);
router.get('/history', authMiddleware, reportController.getHistory);
router.delete('/:id', authMiddleware, checkRole('admin'), reportController.deleteReport);

module.exports = router;
