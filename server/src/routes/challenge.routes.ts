import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { computeChallengeProgress } from '../lib/gamification';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const challengeRouter = Router();
challengeRouter.use(authenticate);

async function findChallenge(id: string) {
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) {
    throw new AppError(404, 'Challenge not found');
  }
  return challenge;
}

challengeRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const challenges = await prisma.challenge.findMany({
      include: {
        _count: { select: { participants: true } },
        participants: { where: { userId }, select: { id: true } },
      },
      orderBy: { endsAt: 'asc' },
    });

    res.json({
      challenges: challenges.map(({ _count, participants, ...rest }) => ({
        ...rest,
        participantCount: _count.participants,
        joined: participants.length > 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

challengeRouter.post('/:id/join', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    await findChallenge(id);

    const existing = await prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId: id, userId } },
    });
    if (existing) {
      throw new AppError(409, 'Already joined this challenge');
    }

    await prisma.challengeParticipant.create({ data: { challengeId: id, userId } });
    res.status(201).send();
  } catch (err) {
    next(err);
  }
});

challengeRouter.delete('/:id/join', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId: id, userId } },
    });
    if (!existing) {
      throw new AppError(404, 'Not a participant of this challenge');
    }

    await prisma.challengeParticipant.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

challengeRouter.get('/:id/leaderboard', async (req, res, next) => {
  try {
    const { id } = req.params;
    const challenge = await findChallenge(id);

    const participants = await prisma.challengeParticipant.findMany({
      where: { challengeId: id },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    const rangeEnd = challenge.endsAt < new Date() ? challenge.endsAt : new Date();

    const ranked = await Promise.all(
      participants.map(async (participant) => ({
        userId: participant.userId,
        name: participant.user.name,
        avatar: participant.user.avatar,
        joinedAt: participant.joinedAt,
        progress: await computeChallengeProgress(
          participant.userId,
          challenge.metric,
          challenge.startsAt,
          rangeEnd,
        ),
      })),
    );

    ranked.sort((a, b) => b.progress - a.progress);

    res.json({
      challenge,
      leaderboard: ranked.map((entry, index) => ({ ...entry, rank: index + 1 })),
    });
  } catch (err) {
    next(err);
  }
});
