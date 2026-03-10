import { Router } from 'express';
import { TeamController } from '../controllers/TeamController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new TeamController();

router.use(authMiddleware);

router.post('/', (req, res, next) => controller.createTeam(req, res, next));
router.get('/', (req, res, next) => controller.getAllTeams(req, res, next));
router.get('/:id', (req, res, next) => controller.getTeam(req, res, next));
router.put('/:id', (req, res, next) => controller.updateTeam(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteTeam(req, res, next));

router.post('/:id/members', (req, res, next) => controller.addMember(req, res, next));
router.delete('/:id/members/:memberId', (req, res, next) => controller.removeMember(req, res, next));
router.put('/:id/members/:memberId/role', (req, res, next) => controller.updateMemberRole(req, res, next));

router.get('/:id/stats', (req, res, next) => controller.getTeamStats(req, res, next));

export default router;
