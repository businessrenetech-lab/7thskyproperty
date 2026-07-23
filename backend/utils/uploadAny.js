const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Universal file uploader. Routes files into an allow-listed sub-folder of
 * /uploads chosen via `?folder=`:
 *   · documents (default) — private, JWT-gated (KYC, IDs, contracts, receipts)
 *   · properties          — public (listing photos, floor plans shown on site)
 * Anything else falls back to `documents`.
 */
const ALLOWED_FOLDERS = new Set(['documents', 'properties']);
const baseDir = path.join(__dirname, '..', 'uploads');

const folderFor = (req) => {
  // req.uploadFolder: set by route middleware to force a folder (req.query
  // mutations don't reliably survive into multer's callbacks).
  const f = String(req.uploadFolder || req.query.folder || req.body?.folder || 'documents').toLowerCase();
  return ALLOWED_FOLDERS.has(f) ? f : 'documents';
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(baseDir, folderFor(req));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Keep a readable prefix from the original name.
    const safe = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-z0-9]+/gi, '-').slice(0, 40).toLowerCase() || 'file';
    cb(null, `${safe}-${suffix}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /pdf|jpg|jpeg|png|webp|gif|heic|doc|docx|xls|xlsx|csv|txt|mp4|mov|webm|m4v/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype) || file.mimetype.includes('image/') || file.mimetype.includes('video/') || file.mimetype.includes('document') || file.mimetype.includes('sheet');
  if (ext || mime) return cb(null, true);
  cb(new Error('Unsupported file type. Allowed: PDF, images, videos (mp4/mov/webm), Word, Excel, CSV, TXT.'));
};

module.exports = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter,
});
module.exports.folderFor = folderFor;
