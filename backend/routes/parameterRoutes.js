const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const c = require('../controllers/parameterController');

// Semua route di sini khusus admin
router.use(authMiddleware, roleMiddleware('admin'));

router.get('/meta', c.getMeta); // Pilihan form: struktur menu, parameter, file sumber
router.get('/', c.listParameters); // Daftar parameter per pabrik
router.post('/', c.createParameter); // Add
router.put('/:unitId/:parameterId', c.updateParameter); // Edit
router.delete('/:unitId/:parameterId', c.deleteParameter); // Delete

module.exports = router;