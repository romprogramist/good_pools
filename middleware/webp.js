const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const IMG_RE = /\.(png|jpe?g)$/i;
const inflight = new Map();

function webp(rootDir, options) {
  options = options || {};
  const quality = options.quality || 90;
  const cacheControl = options.cacheControl || 'public, max-age=31536000';
  const rootResolved = path.resolve(rootDir);

  return function (req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (!IMG_RE.test(req.path)) return next();
    const accept = req.headers.accept || '';
    if (accept.indexOf('image/webp') === -1) return next();

    let relPath;
    try { relPath = decodeURIComponent(req.path); } catch (e) { return next(); }
    if (relPath.indexOf('\0') !== -1) return next();

    const original = path.resolve(path.join(rootResolved, relPath));
    if (original.indexOf(rootResolved + path.sep) !== 0 && original !== rootResolved) {
      return next();
    }
    const webpPath = original.replace(IMG_RE, '.webp');

    function send(p) {
      res.set('Vary', 'Accept');
      res.set('Cache-Control', cacheControl);
      res.type('image/webp');
      res.sendFile(p, function (err) { if (err) next(err); });
    }

    fs.stat(webpPath, function (err) {
      if (!err) return send(webpPath);

      fs.stat(original, function (err2) {
        if (err2) return next();

        if (inflight.has(webpPath)) {
          inflight.get(webpPath).then(
            function () { send(webpPath); },
            function () { next(); }
          );
          return;
        }

        const p = sharp(original)
          .webp({ quality: quality })
          .toFile(webpPath)
          .then(function () { inflight.delete(webpPath); send(webpPath); })
          .catch(function () { inflight.delete(webpPath); next(); });
        inflight.set(webpPath, p);
      });
    });
  };
}

module.exports = webp;
