import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

interface RegisteredUser {
  token: string;
  id: string;
}

async function registerUser(email: string, name = 'Post Test'): Promise<RegisteredUser> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret123', name });
  return { token: res.body.accessToken as string, id: res.body.user.id as string };
}

async function createPost(token: string, content = 'Hello world'): Promise<string> {
  const res = await request(app)
    .post('/api/posts')
    .set('Authorization', `Bearer ${token}`)
    .send({ content });
  return res.body.post.id as string;
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

describe('Posts API', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(401);
  });

  it('validates post content', async () => {
    const user = await registerUser('post-invalid@example.com');
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ content: '' });
    expect(res.status).toBe(400);
  });

  it('creates and lists posts in the discover feed', async () => {
    const alice = await registerUser('post-alice@example.com', 'Alice');
    const bob = await registerUser('post-bob@example.com', 'Bob');
    await createPost(alice.token, 'Alice post');
    await createPost(bob.token, 'Bob post');

    const res = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(2);
    expect(res.body.posts[0].content).toBe('Bob post');
    expect(res.body.hasMore).toBe(false);
  });

  it('filters the feed by authorId', async () => {
    const alice = await registerUser('post-alice2@example.com', 'Alice');
    const bob = await registerUser('post-bob2@example.com', 'Bob');
    await createPost(alice.token, 'Alice post');
    await createPost(bob.token, 'Bob post');

    const res = await request(app)
      .get('/api/posts')
      .query({ authorId: alice.id })
      .set('Authorization', `Bearer ${alice.token}`);
    expect(res.body.posts).toHaveLength(1);
    expect(res.body.posts[0].content).toBe('Alice post');
  });

  it('scopes the following feed to followed authors and excludes the viewer', async () => {
    const alice = await registerUser('post-alice3@example.com', 'Alice');
    const bob = await registerUser('post-bob3@example.com', 'Bob');
    const carol = await registerUser('post-carol3@example.com', 'Carol');
    await createPost(alice.token, 'Alice post');
    await createPost(bob.token, 'Bob post');
    await createPost(carol.token, 'Carol post');

    await request(app)
      .post(`/api/users/${bob.id}/follow`)
      .set('Authorization', `Bearer ${alice.token}`);

    const res = await request(app)
      .get('/api/posts')
      .query({ scope: 'following' })
      .set('Authorization', `Bearer ${alice.token}`);
    expect(res.body.posts).toHaveLength(1);
    expect(res.body.posts[0].content).toBe('Bob post');
  });

  it('deletes only the owner’s post', async () => {
    const alice = await registerUser('post-alice4@example.com', 'Alice');
    const bob = await registerUser('post-bob4@example.com', 'Bob');
    const postId = await createPost(alice.token, 'Alice post');

    const otherDelete = await request(app)
      .delete(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(otherDelete.status).toBe(404);

    const ownDelete = await request(app)
      .delete(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(ownDelete.status).toBe(204);
  });

  it('likes and unlikes a post, reflected in feed counts', async () => {
    const alice = await registerUser('post-alice5@example.com', 'Alice');
    const bob = await registerUser('post-bob5@example.com', 'Bob');
    const postId = await createPost(alice.token, 'Alice post');

    const likeRes = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(likeRes.status).toBe(201);

    const likeAgain = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(likeAgain.status).toBe(409);

    const feedAsBob = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${bob.token}`);
    const post = feedAsBob.body.posts.find((p: { id: string }) => p.id === postId);
    expect(post.likesCount).toBe(1);
    expect(post.likedByMe).toBe(true);

    const unlikeRes = await request(app)
      .delete(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(unlikeRes.status).toBe(204);

    const unlikeAgain = await request(app)
      .delete(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(unlikeAgain.status).toBe(404);
  });

  it('creates, lists, and deletes comments with author-only delete', async () => {
    const alice = await registerUser('post-alice6@example.com', 'Alice');
    const bob = await registerUser('post-bob6@example.com', 'Bob');
    const postId = await createPost(alice.token, 'Alice post');

    const commentRes = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ content: 'Nice!' });
    expect(commentRes.status).toBe(201);
    const commentId = commentRes.body.comment.id;

    const listRes = await request(app)
      .get(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(listRes.body.comments).toHaveLength(1);
    expect(listRes.body.comments[0].content).toBe('Nice!');

    const feedRes = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${alice.token}`);
    const post = feedRes.body.posts.find((p: { id: string }) => p.id === postId);
    expect(post.commentsCount).toBe(1);

    const otherDelete = await request(app)
      .delete(`/api/posts/${postId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(otherDelete.status).toBe(404);

    const ownDelete = await request(app)
      .delete(`/api/posts/${postId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(ownDelete.status).toBe(204);
  });
});
