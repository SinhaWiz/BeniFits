import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/claude', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/claude')>('../src/lib/claude');
  return {
    ...actual,
    getClaudeClient: vi.fn(),
  };
});

import { app } from '../src/app';
import { AppError } from '../src/errors/AppError';
import { getClaudeClient } from '../src/lib/claude';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'AI Chat Test' });
  return res.body.accessToken as string;
}

function mockStreamingClient(deltas: string[], finalText: string) {
  const listeners: Record<string, Array<(delta: string) => void>> = {};
  const stream = {
    on(event: string, cb: (delta: string) => void) {
      (listeners[event] ??= []).push(cb);
      return stream;
    },
    async finalMessage() {
      for (const delta of deltas) {
        listeners.text?.forEach((cb) => cb(delta));
      }
      return { content: [{ type: 'text', text: finalText }] };
    },
  };
  return {
    messages: {
      stream: vi.fn(() => stream),
    },
  };
}

beforeEach(async () => {
  vi.mocked(getClaudeClient).mockReset();
  await prisma.aiChatMessage.deleteMany();
  await prisma.aiConversation.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.aiChatMessage.deleteMany();
  await prisma.aiConversation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('AI nutritionist chat', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/ai/chat');
    expect(res.status).toBe(401);
  });

  it('creates an empty conversation on first GET', async () => {
    const token = await registerAndGetToken('aichat-empty@example.com');
    const res = await request(app).get('/api/ai/chat').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toEqual([]);
  });

  it('rejects empty messages', async () => {
    const token = await registerAndGetToken('aichat-invalid@example.com');
    const res = await request(app)
      .post('/api/ai/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: '' });
    expect(res.status).toBe(400);
  });

  it('streams a reply and persists both messages', async () => {
    const token = await registerAndGetToken('aichat-stream@example.com');
    vi.mocked(getClaudeClient).mockReturnValue(
      mockStreamingClient(['Hello', ' there'], 'Hello there') as never,
    );

    const res = await request(app)
      .post('/api/ai/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'What should I eat?' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('"delta":"Hello"');
    expect(res.text).toContain('"done":true');

    const historyRes = await request(app)
      .get('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`);
    expect(historyRes.body.messages).toHaveLength(2);
    expect(historyRes.body.messages[0].role).toBe('USER');
    expect(historyRes.body.messages[0].content).toBe('What should I eat?');
    expect(historyRes.body.messages[1].role).toBe('ASSISTANT');
    expect(historyRes.body.messages[1].content).toBe('Hello there');
  });

  it('deletes the conversation', async () => {
    const token = await registerAndGetToken('aichat-delete@example.com');
    vi.mocked(getClaudeClient).mockReturnValue(mockStreamingClient(['Hi'], 'Hi') as never);
    await request(app)
      .post('/api/ai/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Hello' });

    const deleteRes = await request(app)
      .delete('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(204);

    const historyRes = await request(app)
      .get('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`);
    expect(historyRes.body.messages).toEqual([]);
  });

  it('returns a 503 when the API key is not configured, with no orphaned message', async () => {
    const token = await registerAndGetToken('aichat-nokey@example.com');
    vi.mocked(getClaudeClient).mockImplementation(() => {
      throw new AppError(503, 'not configured');
    });

    const res = await request(app)
      .post('/api/ai/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Hello' });
    expect(res.status).toBe(503);

    const historyRes = await request(app)
      .get('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`);
    expect(historyRes.body.messages).toEqual([]);
  });
});
