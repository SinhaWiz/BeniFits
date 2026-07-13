import { Router } from 'express';
import { getPublicKey, isPushEnabled } from '../lib/push';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { pushSubscribeSchema, pushUnsubscribeSchema } from '../schemas/push.schema';

export const pushRouter = Router();

pushRouter.get('/public-key', (_req, res) => {
  res.json({ enabled: isPushEnabled(), publicKey: getPublicKey() });
});

pushRouter.use(authenticate);

pushRouter.post('/subscribe', validateBody(pushSubscribeSchema), async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { endpoint, keys } = req.body as ReturnType<typeof pushSubscribeSchema.parse>;

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    });

    res.status(201).send();
  } catch (err) {
    next(err);
  }
});

pushRouter.delete('/subscribe', validateBody(pushUnsubscribeSchema), async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { endpoint } = req.body as ReturnType<typeof pushUnsubscribeSchema.parse>;

    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
