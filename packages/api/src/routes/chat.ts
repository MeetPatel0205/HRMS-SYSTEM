import { Router } from 'express';
import { ChatController } from '../controllers/ChatController';
import { authenticate } from '../middleware/auth';

const router = Router();
const chatController = new ChatController();

router.use(authenticate); // Apply authentication to all chat routes

router.get('/conversations', chatController.getConversations.bind(chatController));
router.post('/conversations', chatController.createConversation.bind(chatController));
router.get('/conversations/:conversationId/messages', chatController.getMessages.bind(chatController));

export default router;
