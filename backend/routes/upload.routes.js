const express = require('express');
const router = express.Router();
const upload = require('../utils/uploadAny');
const { authMiddleware } = require('../middleware/auth.middleware');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const { Op } = require('sequelize');

const PUBLIC_FOLDERS = new Set(['properties']);
const fileResponse = (req) => {
  if (!req.file) return null;
  const folder = upload.folderFor(req);
  return {
    url: `/uploads/${folder}/${req.file.filename}`,
    filename: req.file.filename,
    original_name: req.file.originalname,
    size: req.file.size,
    mime: req.file.mimetype,
    is_public: PUBLIC_FOLDERS.has(folder),
  };
};

// Authenticated upload — any logged-in staff member. Used everywhere a document,
// KYC scan, ID or photo is attached in the admin.
router.post('/', authMiddleware, upload.single('file'), (req, res) => {
  const data = fileResponse(req);
  if (!data) return res.status(400).json({ error: 'No file received.' });
  res.status(201).json({ data, message: 'File uploaded.' });
});

// Public token-gated upload — for the role-registration KYC page (applicant has
// no login). The registration token must be valid + unexpired.
router.post('/registration/:token', upload.single('file'), async (req, res) => {
  try {
    const profile = await PartyRoleProfile.findOne({
      where: {
        registration_token: req.params.token,
        registration_expires_at: { [Op.gt]: new Date() },
      },
    });
    if (!profile) return res.status(403).json({ error: 'Invalid or expired registration link.' });
    const data = fileResponse(req);
    if (!data) return res.status(400).json({ error: 'No file received.' });
    res.status(201).json({ data, message: 'File uploaded.' });
  } catch (e) {
    res.status(500).json({ error: 'Upload failed.' });
  }
});

// Public token-gated upload — tenant application form (photo, NID). Files stay
// in the private documents folder (identity documents).
router.post('/application/:token', upload.single('file'), async (req, res) => {
  try {
    const { TenantApplication } = require('../models/TenantApplication');
    const app = await TenantApplication.findOne({
      where: {
        application_token: req.params.token,
        application_token_expires_at: { [Op.gt]: new Date() },
      },
    });
    if (!app) return res.status(403).json({ error: 'Invalid or expired application link.' });
    if (app.submitted_at) return res.status(409).json({ error: 'This application has already been submitted.' });
    const data = fileResponse(req);
    if (!data) return res.status(400).json({ error: 'No file received.' });
    res.status(201).json({ data, message: 'File uploaded.' });
  } catch (e) {
    res.status(500).json({ error: 'Upload failed.' });
  }
});

module.exports = router;
