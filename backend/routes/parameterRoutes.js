const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const c = require('../controllers/parameterController');

// Semua route di sini khusus admin
router.use(authMiddleware, roleMiddleware('admin'));

router.get('/meta', c.getMeta); // pilihan form: struktur menu, parameter, file sumber
router.get('/', c.listParameters); // daftar parameter per pabrik
router.post('/', c.createParameter); // add
router.put('/:unitId/:parameterId', c.updateParameter); // edit
router.delete('/:unitId/:parameterId', c.deleteParameter); // delete

module.exports = router;