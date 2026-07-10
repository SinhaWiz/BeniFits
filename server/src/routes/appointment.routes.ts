import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} from '../schemas/appointment.schema';

export const appointmentRouter = Router();
appointmentRouter.use(authenticate);

const appointmentInclude = {
  slot: true,
  expertProfile: { select: { id: true, specialty: true, user: { select: { id: true, name: true } } } },
  client: { select: { id: true, name: true, email: true } },
};

appointmentRouter.post('/', validateBody(createAppointmentSchema), async (req, res, next) => {
  try {
    const clientId = req.userId!;
    const { slotId, notes } = req.body as ReturnType<typeof createAppointmentSchema.parse>;

    const appointment = await prisma.$transaction(async (tx) => {
      const claimed = await tx.availabilitySlot.updateMany({
        where: { id: slotId, status: 'OPEN' },
        data: { status: 'BOOKED' },
      });
      if (claimed.count !== 1) {
        throw new AppError(409, 'Slot is no longer available');
      }

      const slot = await tx.availabilitySlot.findUnique({ where: { id: slotId } });
      if (!slot) {
        throw new AppError(409, 'Slot is no longer available');
      }

      return tx.appointment.create({
        data: {
          clientId,
          expertProfileId: slot.expertProfileId,
          slotId: slot.id,
          notes,
        },
        include: appointmentInclude,
      });
    });

    res.status(201).json({ appointment });
  } catch (err) {
    next(err);
  }
});

appointmentRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const role = req.query.role === 'expert' ? 'expert' : 'client';

    if (role === 'expert') {
      const profile = await prisma.expertProfile.findUnique({ where: { userId } });
      if (!profile) {
        throw new AppError(404, 'Expert profile not found');
      }
      const appointments = await prisma.appointment.findMany({
        where: { expertProfileId: profile.id },
        include: appointmentInclude,
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ appointments });
    }

    const appointments = await prisma.appointment.findMany({
      where: { clientId: userId },
      include: appointmentInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ appointments });
  } catch (err) {
    next(err);
  }
});

async function findAppointmentForActor(id: string, userId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });
  if (!appointment) {
    throw new AppError(404, 'Appointment not found');
  }

  const isClient = appointment.clientId === userId;
  const isExpert = appointment.expertProfile.user.id === userId;
  if (!isClient && !isExpert) {
    throw new AppError(404, 'Appointment not found');
  }

  return { appointment, isClient, isExpert };
}

const CLIENT_ALLOWED_STATUSES = new Set(['CANCELLED']);
const EXPERT_ALLOWED_STATUSES = new Set(['CONFIRMED', 'CANCELLED', 'COMPLETED']);

appointmentRouter.patch(
  '/:id',
  validateBody(updateAppointmentStatusSchema),
  async (req, res, next) => {
    try {
      const userId = req.userId!;
      const { status } = req.body as ReturnType<typeof updateAppointmentStatusSchema.parse>;
      const appointmentId = req.params.id as string;
      const { appointment, isClient } = await findAppointmentForActor(appointmentId, userId);

      const allowed = isClient ? CLIENT_ALLOWED_STATUSES : EXPERT_ALLOWED_STATUSES;
      if (!allowed.has(status)) {
        throw new AppError(403, 'Not authorized to set this status');
      }
      if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
        throw new AppError(409, 'Appointment is no longer active');
      }
      if (status === 'COMPLETED' && appointment.status !== 'CONFIRMED') {
        throw new AppError(409, 'Only confirmed appointments can be completed');
      }

      const updated = await prisma.$transaction(async (tx) => {
        if (status === 'CANCELLED' && appointment.slot.startsAt > new Date()) {
          await tx.availabilitySlot.update({
            where: { id: appointment.slotId },
            data: { status: 'OPEN' },
          });
        }
        return tx.appointment.update({
          where: { id: appointment.id },
          data: { status },
          include: appointmentInclude,
        });
      });

      res.json({ appointment: updated });
    } catch (err) {
      next(err);
    }
  },
);
