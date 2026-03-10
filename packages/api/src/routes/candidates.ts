import { Router } from 'express';
import { CandidateController } from '../controllers/CandidateController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new CandidateController();

router.use(authMiddleware);

router.post('/', (req, res, next) => controller.createCandidate(req, res, next));
router.get('/', (req, res, next) => controller.getAllCandidates(req, res, next));
router.get('/:id', (req, res, next) => controller.getCandidate(req, res, next));
router.put('/:id', (req, res, next) => controller.updateCandidate(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteCandidate(req, res, next));

router.put('/:id/status', (req, res, next) => controller.updateCandidateStatus(req, res, next));

export default router;
