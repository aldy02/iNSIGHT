const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const importController = require('../controllers/importController');

// Admin Only: daftar sumber file milik satu pabrik (untuk dropdown form upload)
router.get(
  '/sources',
  authMiddleware,
  roleMiddleware('admin'),
  importController.listSources
);

// Admin Only: upload satu file ke satu sumber
router.post(
  '/source',
  authMiddleware,
  roleMiddleware('admin'),
  upload.single('file'),
  importController.uploadSourceExcel
);

module.exports = router;