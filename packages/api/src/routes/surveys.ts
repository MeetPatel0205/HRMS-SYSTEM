import { Router } from 'express';
import { SurveyController } from '../controllers/SurveyController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new SurveyController();

router.use(authMiddleware);

router.post('/', (req, res, next) => controller.createSurvey(req, res, next));
router.get('/', (req, res, next) => controller.getAllSurveys(req, res, next));
router.get('/:id', (req, res, next) => controller.getSurvey(req, res, next));
router.put('/:id', (req, res, next) => controller.updateSurvey(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteSurvey(req, res, next));

router.post('/:id/responses', (req, res, next) => controller.submitResponse(req, res, next));
router.get('/:id/responses', (req, res, next) => controller.getSurveyResponses(req, res, next));
router.get('/:id/responses/user/:userId', (req, res, next) => controller.getUserResponse(req, res, next));
router.get('/:id/stats', (req, res, next) => controller.getSurveyStats(req, res, next));

router.get('/user/:userId/active', (req, res, next) => controller.getActiveSurveysForUser(req, res, next));

export default router;
