export interface UserProfile {
  id: string;
  name: string | null;
  role: string;
  avatar: string | null;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowedByMe: boolean;
}
