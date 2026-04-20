const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

function processUpload(subfolder) {
  const dest = path.join(UPLOAD_ROOT, subfolder);
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, dest); },
    filename: function (req, file, cb) {
      const unique = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, unique + ext);
    }
  });

  const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: function (req, file, cb) {
      if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
      cb(new Error('Недопустимый тип файла: ' + file.mimetype));
    }
  });

  return {
    single: function (fieldName) {
      return [upload.single(fieldName), resizeMiddleware];
    },
    array: function (fieldName, maxCount) {
      return [upload.array(fieldName, maxCount), resizeMiddleware];
    }
  };
}

async function resizeMiddleware(req, res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    for (const file of files) {
      if (file.mimetype === 'image/svg+xml') continue;
      const tmpPath = file.path + '.tmp';
      await sharp(file.path)
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(tmpPath);
      fs.renameSync(tmpPath, file.path);
    }
    next();
  } catch (err) {
    next(err);
  }
}

function deleteFile(relativePath) {
  if (!relativePath) return;
  const abs = path.join(__dirname, '..', relativePath);
  fs.unlink(abs, function () {});
}

module.exports = { processUpload, deleteFile };
