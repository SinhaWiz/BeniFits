import { AppError } from '../errors/AppError';
import { PrismaClientKnownRequestError } from '../generated/prisma/internal/prismaNamespace';
import { prisma } from './prisma';

export async function getOrCreateConversation(appointmentId: string) {
  try {
    return await prisma.conversation.upsert({
      where: { appointmentId },
      create: { appointmentId },
      update: {},
    });
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
      return prisma.conversation.findUniqueOrThrow({ where: { appointmentId } });
    }
    throw err;
  }
}

export async function assertConversationMembership(appointmentId: string, userId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { expertProfile: { select: { userId: true } } },
  });

  if (!appointment) {
    throw new AppError(404, 'Appointment not found');
  }
  if (appointment.clientId !== userId && appointment.expertProfile.userId !== userId) {
    throw new AppError(404, 'Appointment not found');
  }
  if (appointment.status === 'CANCELLED') {
    throw new AppError(409, 'This appointment has been cancelled');
  }

  return appointment;
}
