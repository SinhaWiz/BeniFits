import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { assertConversationMembership, getOrCreateConversation } from './conversationAccess';
import { prisma } from './prisma';
import { verifyAccessToken } from './jwt';

interface JoinPayload {
  appointmentId: string;
}

interface SendPayload {
  appointmentId: string;
  content: string;
}

function roomName(appointmentId: string): string {
  return `conversation:${appointmentId}`;
}

export function attachSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer);

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Missing authentication token'));
    }
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid or expired access token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;

    socket.on('conversation:join', async ({ appointmentId }: JoinPayload) => {
      try {
        await assertConversationMembership(appointmentId, userId);
        await getOrCreateConversation(appointmentId);
        socket.join(roomName(appointmentId));
      } catch (err) {
        socket.emit('conversation:error', {
          message: err instanceof Error ? err.message : 'Unable to join conversation',
        });
      }
    });

    socket.on('message:send', async ({ appointmentId, content }: SendPayload) => {
      try {
        const trimmed = content.trim();
        if (!trimmed) return;

        await assertConversationMembership(appointmentId, userId);

        const conversation = await getOrCreateConversation(appointmentId);

        const message = await prisma.message.create({
          data: { conversationId: conversation.id, senderId: userId, content: trimmed },
        });

        io.to(roomName(appointmentId)).emit('message:new', message);
      } catch (err) {
        socket.emit('conversation:error', {
          message: err instanceof Error ? err.message : 'Unable to send message',
        });
      }
    });
  });

  return io;
}
