import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Badge, Button, Card } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { Comment } from '../types/comment';
import type { Post } from '../types/post';

type FeedScope = 'discover' | 'following';

function formatPostTime(createdAt: string): string {
  return new Date(createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface CommentThreadProps {
  postId: string;
}

function CommentThread({ postId }: CommentThreadProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');

  const commentsQuery = useQuery({
    queryKey: ['posts', postId, 'comments'],
    queryFn: async () => {
      const res = await apiClient.get<{ comments: Comment[] }>(`/posts/${postId}/comments`);
      return res.data.comments;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiClient.post(`/posts/${postId}/comments`, { content });
    },
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['posts', postId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiClient.delete(`/posts/${postId}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', postId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    addMutation.mutate(draft.trim());
  };

  const comments = commentsQuery.data ?? [];

  return (
    <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
      {commentsQuery.isLoading ? (
        <p className="text-sm text-slate-400">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-400">No comments yet.</p>
      ) : (
        comments.map((comment) => (
          <div key={comment.id} className="rounded-lg bg-slate-950/40 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-200">
                {comment.author.name ?? 'Member'}
              </span>
              {comment.author.id === user?.id && (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(comment.id)}
                  className="text-xs text-rose-400 hover:text-rose-300"
                >
                  Delete
                </button>
              )}
            </div>
            <p className="mt-1 text-slate-300">{comment.content}</p>
          </div>
        ))
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Add a comment..."
          className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={1000}
        />
        <Button
          type="submit"
          disabled={addMutation.isPending || !draft.trim()}
          className="px-3 py-1 text-sm"
        >
          Reply
        </Button>
      </form>
    </div>
  );
}

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (post.likedByMe) {
        await apiClient.delete(`/posts/${post.id}/like`);
      } else {
        await apiClient.post(`/posts/${post.id}/like`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            to={`/users/${post.author.id}`}
            className="font-medium text-slate-100 hover:text-sky-300"
          >
            {post.author.name ?? 'Member'}
          </Link>
          <p className="text-xs text-slate-400">{formatPostTime(post.createdAt)}</p>
        </div>
        <Badge>{post.author.role}</Badge>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{post.content}</p>
      <div className="mt-4 flex items-center gap-4 text-sm">
        <button
          type="button"
          onClick={() => likeMutation.mutate()}
          disabled={likeMutation.isPending}
          className={
            post.likedByMe
              ? 'font-medium text-sky-300 hover:text-sky-200'
              : 'text-slate-300 hover:text-white'
          }
        >
          {post.likedByMe ? 'Liked' : 'Like'} ({post.likesCount})
        </button>
        <button
          type="button"
          onClick={() => setShowComments((prev) => !prev)}
          className="text-slate-300 hover:text-white"
        >
          {post.commentsCount} {post.commentsCount === 1 ? 'comment' : 'comments'}
        </button>
      </div>
      {showComments && <CommentThread postId={post.id} />}
    </Card>
  );
}

export default function FeedPage() {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<FeedScope>('discover');
  const [draft, setDraft] = useState('');
  const [postError, setPostError] = useState<string | null>(null);

  const feedQuery = useQuery({
    queryKey: ['posts', { scope }],
    queryFn: async () => {
      const res = await apiClient.get<{ posts: Post[] }>('/posts', { params: { scope } });
      return res.data.posts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiClient.post('/posts', { content });
    },
    onSuccess: () => {
      setDraft('');
      setPostError(null);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (err) => {
      setPostError(getErrorMessage(err, 'Unable to create post'));
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    createMutation.mutate(draft.trim());
  };

  const posts = feedQuery.data ?? [];

  return (
    <div className="space-y-8">
      <Card>
        <h1 className="text-2xl font-bold">Community feed</h1>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <textarea
            rows={3}
            placeholder="Share a win, ask for advice, or cheer someone on..."
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
          />
          {postError && <p className="text-sm text-rose-400">{postError}</p>}
          <Button type="submit" disabled={createMutation.isPending || !draft.trim()}>
            {createMutation.isPending ? 'Posting...' : 'Post'}
          </Button>
        </form>
      </Card>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={scope === 'discover' ? 'primary' : 'secondary'}
          onClick={() => setScope('discover')}
          className="px-3 py-1 text-sm"
        >
          Discover
        </Button>
        <Button
          type="button"
          variant={scope === 'following' ? 'primary' : 'secondary'}
          onClick={() => setScope('following')}
          className="px-3 py-1 text-sm"
        >
          Following
        </Button>
      </div>

      {feedQuery.isLoading ? (
        <p className="text-slate-300">Loading...</p>
      ) : feedQuery.isError ? (
        <p className="text-sm text-rose-400">
          {getErrorMessage(feedQuery.error, 'Unable to load the feed')}
        </p>
      ) : posts.length === 0 ? (
        <p className="text-slate-300">
          {scope === 'following'
            ? 'No posts yet from people you follow.'
            : 'No posts yet. Be the first to share something.'}
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
