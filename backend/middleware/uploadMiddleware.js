const multer = require('multer');
const path = require('path');

// Simpan file di memory (buffer)
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const allowedExt = ['.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExt.includes(ext)) {
    return cb(new Error('File harus berformat .xlsx atau .xls'), false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // maks 10MB
});

module.exports = upload;