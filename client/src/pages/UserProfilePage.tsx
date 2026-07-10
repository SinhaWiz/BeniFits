import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Badge, Button, Card } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import { PostCard } from './FeedPage';
import type { Post } from '../types/post';
import type { UserProfile } from '../types/user';

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: viewer } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const res = await apiClient.get<{ user: UserProfile }>(`/users/${id}`);
      return res.data.user;
    },
    enabled: Boolean(id),
  });

  const postsQuery = useQuery({
    queryKey: ['posts', { authorId: id }],
    queryFn: async () => {
      const res = await apiClient.get<{ posts: Post[] }>('/posts', { params: { authorId: id } });
      return res.data.posts;
    },
    enabled: Boolean(id),
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (profileQuery.data?.isFollowedByMe) {
        await apiClient.delete(`/users/${id}/follow`);
      } else {
        await apiClient.post(`/users/${id}/follow`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', id] });
    },
  });

  if (profileQuery.isLoading) {
    return <p className="text-slate-300">Loading...</p>;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <p className="text-sm text-rose-400">
        {getErrorMessage(profileQuery.error, 'Unable to load this profile')}
      </p>
    );
  }

  const profile = profileQuery.data;
  const isOwnProfile = viewer?.id === profile.id;
  const posts = postsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{profile.name ?? 'Member'}</h1>
            <Badge className="mt-2">{profile.role}</Badge>
          </div>
          {!isOwnProfile && (
            <Button
              type="button"
              variant={profile.isFollowedByMe ? 'secondary' : 'primary'}
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
            >
              {profile.isFollowedByMe ? 'Unfollow' : 'Follow'}
            </Button>
          )}
        </div>
        <dl className="mt-4 flex gap-6 text-sm">
          <div>
            <dt className="text-slate-400">Posts</dt>
            <dd className="text-slate-200">{profile.postsCount}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Followers</dt>
            <dd className="text-slate-200">{profile.followersCount}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Following</dt>
            <dd className="text-slate-200">{profile.followingCount}</dd>
          </div>
        </dl>
      </Card>

      {postsQuery.isLoading ? (
        <p className="text-slate-300">Loading posts...</p>
      ) : posts.length === 0 ? (
        <p className="text-slate-300">No posts yet.</p>
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
