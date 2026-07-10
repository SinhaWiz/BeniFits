import { Router } from 'express';
import { assertConversationMembership } from '../lib/conversationAccess';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const conversationRouter = Router();
conversationRouter.use(authenticate);

conversationRouter.get('/:appointmentId/messages', async (req, res, next) => {
  try {
    const appointmentId = req.params.appointmentId as string;
    await assertConversationMembership(appointmentId, req.userId!);

    const conversation = await prisma.conversation.findUnique({ where: { appointmentId } });
    if (!conversation) {
      return res.json({ messages: [] });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ messages });
  } catch (err) {
    next(err);
  }
});
