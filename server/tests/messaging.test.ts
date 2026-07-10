import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import request from 'supertest';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { attachSocket } from '../src/lib/socket';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'Messaging Test' });
  return res.body.accessToken as string;
}

async function loginAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'supersecret123' });
  return res.body.accessToken as string;
}

async function makeExpertWithProfile(email: string): Promise<string> {
  await registerAndGetToken(email);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.user.update({ where: { id: user.id }, data: { role: 'NUTRITIONIST' } });
  const token = await loginAndGetToken(email);
  await request(app)
    .put('/api/experts/me')
    .set('Authorization', `Bearer ${token}`)
    .send({ specialty: 'Weight Management', focusArea: 'Fat loss', bio: 'Bio text' });
  return token;
}

async function bookAppointment(expertToken: string, clientToken: string): Promise<string> {
  const slotRes = await request(app)
    .post('/api/experts/me/slots')
    .set('Authorization', `Bearer ${expertToken}`)
    .send({
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      endsAt: new Date(Date.now() + 90000000).toISOString(),
    });
  const bookRes = await request(app)
    .post('/api/appointments')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ slotId: slotRes.body.slot.id });
  return bookRes.body.appointment.id as string;
}

function waitForEvent<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

function connectClient(port: number, token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${port}`, { auth: { token }, forceNew: true });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
  });
}

async function cleanup() {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.expertProfile.deleteMany();
  await prisma.user.deleteMany();
}

let httpServer: HttpServer;
let port: number;
const openSockets: ClientSocket[] = [];

beforeAll(async () => {
  httpServer = createServer(app);
  attachSocket(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  port = (httpServer.address() as AddressInfo).port;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

beforeEach(cleanup);
afterEach(() => {
  for (const socket of openSockets.splice(0)) socket.close();
});

describe('Real-time messaging', () => {
  it('delivers a message to both participants and persists it', async () => {
    const expertToken = await makeExpertWithProfile('msgexpert1@example.com');
    const clientToken = await registerAndGetToken('msgclient1@example.com');
    const appointmentId = await bookAppointment(expertToken, clientToken);

    const clientSocket = await connectClient(port, clientToken);
    const expertSocket = await connectClient(port, expertToken);
    openSockets.push(clientSocket, expertSocket);

    clientSocket.emit('conversation:join', { appointmentId });
    expertSocket.emit('conversation:join', { appointmentId });
    await new Promise((resolve) => setTimeout(resolve, 200));

    const received = waitForEvent<{ content: string }>(expertSocket, 'message:new');
    clientSocket.emit('message:send', { appointmentId, content: 'Hello there' });
    const message = await received;
    expect(message.content).toBe('Hello there');

    const historyRes = await request(app)
      .get(`/api/conversations/${appointmentId}/messages`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(historyRes.body.messages).toHaveLength(1);
    expect(historyRes.body.messages[0].content).toBe('Hello there');
  });

  it('rejects a non-participant trying to join or read history', async () => {
    const expertToken = await makeExpertWithProfile('msgexpert2@example.com');
    const clientToken = await registerAndGetToken('msgclient2@example.com');
    const appointmentId = await bookAppointment(expertToken, clientToken);
    const intruderToken = await registerAndGetToken('intruder@example.com');

    const intruderSocket = await connectClient(port, intruderToken);
    openSockets.push(intruderSocket);

    const errorPromise = waitForEvent<{ message: string }>(intruderSocket, 'conversation:error');
    intruderSocket.emit('conversation:join', { appointmentId });
    const error = await errorPromise;
    expect(error.message).toMatch(/not found/i);

    const historyRes = await request(app)
      .get(`/api/conversations/${appointmentId}/messages`)
      .set('Authorization', `Bearer ${intruderToken}`);
    expect(historyRes.status).toBe(404);
  });

  it('returns an empty history before any messages are sent', async () => {
    const expertToken = await makeExpertWithProfile('msgexpert3@example.com');
    const clientToken = await registerAndGetToken('msgclient3@example.com');
    const appointmentId = await bookAppointment(expertToken, clientToken);

    const historyRes = await request(app)
      .get(`/api/conversations/${appointmentId}/messages`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.messages).toEqual([]);
  });
});
