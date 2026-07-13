import type { NotificationType } from '../generated/prisma/enums';
import { prisma } from './prisma';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
) {
  return prisma.notification.create({ data: { userId, type, title, body } });
}
