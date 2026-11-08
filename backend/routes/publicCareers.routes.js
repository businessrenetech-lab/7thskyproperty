/**
 * /api/public/careers: no login. Open vacancies, applying (with CV upload), and the candidate's answer to an
 * offer through its emailed link. Applying and answering are rate-limited per IP.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/publicCareers.controller');
const upload = require('../utils/uploadDocument');

const router = express.Router();
const browse = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please wait a minute.' } });
const applyLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many applications from this connection. Please try again later.' } });
const offerLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Please try again later.' } });

const MAX = { certificates: 5, licences: 3 };
const docs = upload.fields(ctrl.DOC_UPLOADS.map((name) => ({ name, maxCount: MAX[name] || 1 })));
// A refused file (wrong type, over 10MB) is a 400 with a reason, not a server error.
const withDocs = (req, res, next) => docs(req, res, (err) => (err ? res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Each file must be 10MB or smaller' : err.message }) : next()));

router.get('/offers/:token', offerLimit, ctrl.getOffer);
router.post('/offers/:token/:answer', offerLimit, ctrl.answerOffer);
router.get('/', browse, ctrl.list);
router.get('/:slug', browse, ctrl.get);
router.post('/:slug/apply', applyLimit, withDocs, ctrl.apply);

module.exports = router;
