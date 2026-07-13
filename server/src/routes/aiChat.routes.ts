import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { buildNutritionSystemPrompt, CLAUDE_MODEL, getClaudeClient } from '../lib/claude';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { sendChatMessageSchema } from '../schemas/aiChat.schema';

export const aiChatRouter = Router();
aiChatRouter.use(authenticate);

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const HISTORY_LIMIT = 20;

async function getOrCreateConversation(userId: string) {
  const existing = await prisma.aiConversation.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.aiConversation.create({ data: { userId } });
}

aiChatRouter.get('/', async (req, res, next) => {
  try {
    const conversation = await getOrCreateConversation(req.userId!);
    const messages = await prisma.aiChatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

aiChatRouter.delete('/', async (req, res, next) => {
  try {
    const conversation = await prisma.aiConversation.findUnique({ where: { userId: req.userId! } });
    if (conversation) {
      await prisma.aiChatMessage.deleteMany({ where: { conversationId: conversation.id } });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

aiChatRouter.post(
  '/messages',
  chatLimiter,
  validateBody(sendChatMessageSchema),
  async (req, res, next) => {
    const userId = req.userId!;

    let conversationId: string;
    let systemPrompt: string;
    let anthropicMessages: { role: 'user' | 'assistant'; content: string }[];
    let claudeClient: ReturnType<typeof getClaudeClient>;

    try {
      claudeClient = getClaudeClient();
      const { message } = req.body as ReturnType<typeof sendChatMessageSchema.parse>;

      const conversation = await getOrCreateConversation(userId);
      conversationId = conversation.id;

      await prisma.aiChatMessage.create({
        data: { conversationId, role: 'USER', content: message },
      });

      const [healthProfile, recentMessages] = await Promise.all([
        prisma.healthProfile.findUnique({ where: { userId } }),
        prisma.aiChatMessage.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'desc' },
          take: HISTORY_LIMIT,
        }),
      ]);

      systemPrompt = buildNutritionSystemPrompt(healthProfile);
      anthropicMessages = recentMessages.reverse().map((m) => ({
        role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));
    } catch (err) {
      next(err);
      return;
    }

    // Past this point, response headers may already be sent, so errors are
    // reported as an SSE event rather than via next().
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const stream = claudeClient.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: anthropicMessages,
      output_config: { effort: 'medium' },
    });

    stream.on('text', (delta) => {
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    });

    try {
      const finalMessage = await stream.finalMessage();
      const textContent = finalMessage.content
        .filter((block) => block.type === 'text')
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('');

      await prisma.aiChatMessage.create({
        data: { conversationId, role: 'ASSISTANT', content: textContent },
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (streamErr) {
      (req.log ?? logger).error({ err: streamErr }, 'AI chat stream error');
      res.write(
        `data: ${JSON.stringify({ error: 'The AI assistant failed to respond. Please try again.' })}\n\n`,
      );
    } finally {
      res.end();
    }
  },
);
