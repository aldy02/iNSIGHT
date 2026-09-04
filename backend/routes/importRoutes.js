const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const importController = require('../controllers/importController');

// Admin Only: Cuma admin yang bisa upload
router.post(
  '/master',
  authMiddleware,
  roleMiddleware(['admin', 'operator']),
  upload.single('file'),
  importController.uploadMasterExcel
);

module.exports = router;