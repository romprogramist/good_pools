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
    },
    fields: function (fieldsArr) {
      return [upload.fields(fieldsArr), resizeMiddleware];
    }
  };
}

function collectFiles(req) {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') {
    // multer .fields() returns { fieldName: [file, ...], ... }
    var out = [];
    Object.keys(req.files).forEach(function (k) {
      (req.files[k] || []).forEach(function (f) { out.push(f); });
    });
    return out;
  }
  return [];
}

async function resizeMiddleware(req, res, next) {
  var files = collectFiles(req);
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (file.mimetype === 'image/svg+xml') continue;
    try {
      var tmpPath = file.path + '.tmp';
      var pipeline = sharp(file.path)
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true });

      // Preserve original format
      if (file.mimetype === 'image/png') {
        pipeline = pipeline.png({ quality: 80 });
      } else if (file.mimetype === 'image/webp') {
        pipeline = pipeline.webp({ quality: 80 });
      } else {
        pipeline = pipeline.jpeg({ quality: 80 });
      }

      await pipeline.toFile(tmpPath);
      fs.renameSync(tmpPath, file.path);
    } catch (err) {
      // If sharp fails, keep the original file as-is
      console.error('Sharp resize failed for ' + file.originalname + ':', err.message);
      try { fs.unlinkSync(file.path + '.tmp'); } catch (e) {}
    }
  }
  next();
}

function deleteFile(relativePath) {
  if (!relativePath) return;
  var abs = path.join(__dirname, '..', relativePath);
  fs.unlink(abs, function () {});
}

module.exports = { processUpload, deleteFile };
