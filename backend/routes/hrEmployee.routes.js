/**
 * /api/hr/employees: the Employee Master Database (plan Task 11). Reading needs some view right; the
 * controller narrows it to what this viewer may see. Writes need emp.edit, except payroll proposals by
 * Finance (PATCH, checked in the controller) and people adding their own documents.
 */
const express = require('express');
const ctrl = require('../controllers/hrEmployee.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { hrRole } = require('../services/hrAccess.service');
const upload = require('../utils/uploadDocument');

const router = express.Router();
router.use(authMiddleware);
const read = hrRole('emp.view_any', 'emp.view_team', 'emp.view_own');
const team = hrRole('emp.view_any', 'emp.view_team');
const edit = hrRole('emp.edit');

const own = hrRole('emp.view_own');
router.get('/me', own, ctrl.me);
router.patch('/me', own, ctrl.updateMe);
router.get('/me/history', own, ctrl.myHistory);
router.get('/me/requests', own, ctrl.myRequests);
router.get('/me/policies', own, ctrl.myPolicies);
router.post('/me/documents', own, upload.single('file'), ctrl.myDocument);
router.patch('/me/onboarding/:taskId', own, ctrl.myTask);
router.get('/meta', read, ctrl.meta);
router.get('/team', team, ctrl.team);
router.patch('/types/:id', edit, ctrl.updateType);
router.get('/', read, ctrl.list);
router.post('/', edit, ctrl.create);
router.get('/:code', read, ctrl.get);
router.patch('/:code', hrRole('emp.edit', 'emp.view_payroll'), ctrl.update);
router.get('/:code/history', read, ctrl.history);
router.get('/:code/export', read, ctrl.exportRecord);
router.post('/:code/documents', read, upload.single('file'), ctrl.addDocument);
router.patch('/:code/documents/:id', edit, ctrl.verifyDocument);
router.post('/:code/notes', team, ctrl.addNote);
router.patch('/:code/onboarding/:taskId', read, ctrl.doneTask);
router.post('/:code/deactivate', edit, ctrl.deactivate);
router.post('/:code/archive', edit, ctrl.archive);
router.post('/:code/send-login', edit, ctrl.sendLogin);

module.exports = router;
