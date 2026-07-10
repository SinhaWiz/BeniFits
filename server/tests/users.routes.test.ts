import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

interface RegisteredUser {
  token: string;
  id: string;
}

async function registerUser(email: string, name = 'User Test'): Promise<RegisteredUser> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name });
  return { token: res.body.accessToken as string, id: res.body.user.id as string };
}

async function cleanup() {
  await prisma.comment.deleteMany();
  await prisma.postLike.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('Users API', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/users/whatever');
    expect(res.status).toBe(401);
  });

  it('returns 404 for an unknown user', async () => {
    const alice = await registerUser('user-alice@example.com', 'Alice');
    const res = await request(app)
      .get('/api/users/does-not-exist')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(404);
  });

  it('returns public profile fields with counts and isFollowedByMe', async () => {
    const alice = await registerUser('user-alice2@example.com', 'Alice');
    const bob = await registerUser('user-bob2@example.com', 'Bob');
    await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ content: 'Bob post' });

    const before = await request(app)
      .get(`/api/users/${bob.id}`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(before.body.user).toMatchObject({
      id: bob.id,
      name: 'Bob',
      followersCount: 0,
      followingCount: 0,
      postsCount: 1,
      isFollowedByMe: false,
    });
    expect(before.body.user.email).toBeUndefined();

    await request(app)
      .post(`/api/users/${bob.id}/follow`)
      .set('Authorization', `Bearer ${alice.token}`);

    const after = await request(app)
      .get(`/api/users/${bob.id}`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(after.body.user.followersCount).toBe(1);
    expect(after.body.user.isFollowedByMe).toBe(true);
  });

  it('blocks following yourself', async () => {
    const alice = await registerUser('user-alice3@example.com', 'Alice');
    const res = await request(app)
      .post(`/api/users/${alice.id}/follow`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(400);
  });

  it('prevents double-following and unfollowing when not following', async () => {
    const alice = await registerUser('user-alice4@example.com', 'Alice');
    const bob = await registerUser('user-bob4@example.com', 'Bob');

    const first = await request(app)
      .post(`/api/users/${bob.id}/follow`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/users/${bob.id}/follow`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(second.status).toBe(409);

    const unfollow = await request(app)
      .delete(`/api/users/${bob.id}/follow`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(unfollow.status).toBe(204);

    const unfollowAgain = await request(app)
      .delete(`/api/users/${bob.id}/follow`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(unfollowAgain.status).toBe(404);
  });
});
