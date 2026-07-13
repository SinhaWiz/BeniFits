import type { NotificationType } from '../generated/prisma/enums';
import { sendEmail } from './email';
import { logger } from './logger';
import { prisma } from './prisma';
import { sendPushToUser } from './push';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
) {
  const notification = await prisma.notification.create({ data: { userId, type, title, body } });

  prisma.user
    .findUnique({ where: { id: userId }, select: { email: true } })
    .then((user) => user && sendEmail({ to: user.email, subject: title, text: body }))
    .catch((err) => {
      logger.error({ err, userId, type }, 'Failed to send notification email');
    });

  sendPushToUser(userId, { title, body }).catch((err) => {
    logger.error({ err, userId, type }, 'Failed to send push notification');
  });

  return notification;
}
