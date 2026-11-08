/**
 * /api/hr/recruitment: Recruitment & ATS (plan Tasks 18 and 20). HR (rec.manage) runs the pipeline; department
 * managers (rec.request) raise workforce requests and follow their own vacancies. Candidate files are HR only.
 */
const express = require('express');
const ctrl = require('../controllers/hrRecruitment.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { hrRole } = require('../services/hrAccess.service');
const upload = require('../utils/uploadDocument');

const router = express.Router();
router.use(authMiddleware);
const follow = hrRole('rec.manage', 'rec.request');
const hr = hrRole('rec.manage');

router.get('/meta', follow, ctrl.meta);
router.get('/panel-options', hr, ctrl.panelOptions);

router.get('/job-descriptions', follow, ctrl.listJds);
router.post('/job-descriptions', hr, ctrl.createJd);
router.get('/job-descriptions/:id', follow, ctrl.getJd);
router.patch('/job-descriptions/:id', hr, ctrl.updateJd);
router.post('/job-descriptions/:id/clone', hr, ctrl.cloneJd);

router.get('/workforce-requests', follow, ctrl.listRequests);
router.post('/workforce-requests', follow, ctrl.createRequest);

router.get('/vacancies', follow, ctrl.listVacancies);
router.get('/vacancies/:code', follow, ctrl.getVacancy);
router.patch('/vacancies/:code', hr, ctrl.updateVacancy);
router.post('/vacancies/:code/publish', hr, ctrl.publishVacancy);
router.post('/vacancies/:code/close', hr, ctrl.closeVacancy);
router.post('/vacancies/:code/invite', hr, ctrl.inviteToVacancy);

router.get('/candidates', hr, ctrl.listCandidates);
router.post('/candidates', hr, ctrl.createCandidate);
router.get('/candidates/:code', hr, ctrl.getCandidate);
router.patch('/candidates/:code', hr, ctrl.updateCandidate);
router.post('/candidates/:code/documents', hr, upload.single('file'), ctrl.addCandidateDocument);
router.post('/candidates/:code/talent-pool', hr, ctrl.setTalentPool);

router.post('/applications', hr, ctrl.addApplication);
router.post('/applications/:id/status', hr, ctrl.moveStatus);
router.post('/applications/:id/screening', hr, ctrl.saveScreening);
router.post('/applications/:id/notes', hr, ctrl.addNote);
router.post('/applications/:id/messages', hr, ctrl.message);
router.post('/applications/:id/interviews', hr, ctrl.scheduleInterview);
router.put('/applications/:id/checks/:type', hr, ctrl.setCheck);
router.post('/applications/:id/offer', hr, ctrl.saveOffer);
router.post('/applications/:id/confirm-onboarding', hr, ctrl.confirmOnboarding);
router.post('/applications/:id/transfer', hr, ctrl.transfer);

router.patch('/interviews/:id', hr, ctrl.updateInterview);
// Any panel member scores the interview they sat on; HR may too.
router.post('/interviews/:id/evaluations', authMiddleware, ctrl.evaluate);
router.post('/offers/:id/send', hr, ctrl.sendOffer);

module.exports = router;
