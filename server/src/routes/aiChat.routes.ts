import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { buildNutritionSystemPrompt, GEMINI_MODEL, getGeminiClient } from '../lib/gemini';
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
    let geminiContents: { role: 'user' | 'model'; parts: { text: string }[] }[];
    let geminiClient: Awaited<ReturnType<typeof getGeminiClient>>;

    try {
      geminiClient = await getGeminiClient();
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
      geminiContents = recentMessages.reverse().map((m) => ({
        role: m.role === 'USER' ? ('user' as const) : ('model' as const),
        parts: [{ text: m.content }],
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

    try {
      const stream = await geminiClient.models.generateContentStream({
        model: GEMINI_MODEL,
        contents: geminiContents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 2048,
        },
      });

      let textContent = '';
      for await (const chunk of stream) {
        const delta = chunk.text;
        if (delta) {
          textContent += delta;
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
      }

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
