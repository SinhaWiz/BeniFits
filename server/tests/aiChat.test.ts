import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/gemini', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/gemini')>('../src/lib/gemini');
  return {
    ...actual,
    getGeminiClient: vi.fn(),
  };
});

import { app } from '../src/app';
import { AppError } from '../src/errors/AppError';
import { getGeminiClient } from '../src/lib/gemini';
import { prisma } from '../src/lib/prisma';

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name: 'AI Chat Test' });
  return res.body.accessToken as string;
}

function mockStreamingClient(deltas: string[]) {
  return {
    models: {
      generateContentStream: vi.fn(async function* () {
        for (const delta of deltas) {
          yield { text: delta };
        }
      }),
    },
  };
}

beforeEach(async () => {
  vi.mocked(getGeminiClient).mockReset();
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
    vi.mocked(getGeminiClient).mockReturnValue(mockStreamingClient(['Hello', ' there']) as never);

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
    vi.mocked(getGeminiClient).mockReturnValue(mockStreamingClient(['Hi']) as never);
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
    vi.mocked(getGeminiClient).mockImplementation(() => {
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
