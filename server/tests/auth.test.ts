import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

beforeEach(async () => {
  await prisma.healthProfile.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.healthProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('auth flow', () => {
  const credentials = {
    email: 'auth-test@example.com',
    password: 'supersecret123',
    name: 'Auth Test',
  };

  it('registers a new user and returns an access token + refresh cookie', async () => {
    const res = await request(app).post('/api/auth/register').send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(credentials.email);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.headers['set-cookie']?.[0]).toMatch(/refresh_token=/);
  });

  it('rejects duplicate email registration', async () => {
    await request(app).post('/api/auth/register').send(credentials);
    const res = await request(app).post('/api/auth/register').send(credentials);

    expect(res.status).toBe(409);
  });

  it('rejects invalid registration payloads', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
  });

  it('logs in with correct credentials and rejects a wrong password', async () => {
    await request(app).post('/api/auth/register').send(credentials);

    const badLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'wrongpassword' });
    expect(badLogin.status).toBe(401);

    const goodLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    expect(goodLogin.status).toBe(200);
    expect(goodLogin.body.accessToken).toEqual(expect.any(String));
  });

  it('refreshes the access token via cookie and rejects reuse after logout', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(credentials);
    const cookie = registerRes.headers['set-cookie'];

    const refreshRes = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toEqual(expect.any(String));

    const rotatedCookie = refreshRes.headers['set-cookie'];
    const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', rotatedCookie);
    expect(logoutRes.status).toBe(204);

    const clearedCookie = logoutRes.headers['set-cookie'];
    const failedRefresh = await request(app).post('/api/auth/refresh').set('Cookie', clearedCookie);
    expect(failedRefresh.status).toBe(401);
  });

  it('rejects refresh without a cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('returns the current user from /me when authenticated', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(credentials);
    const { accessToken } = registerRes.body;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(credentials.email);
  });

  it('rejects /me without a valid access token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
