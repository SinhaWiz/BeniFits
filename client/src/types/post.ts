export interface PostAuthor {
  id: string;
  name: string | null;
  avatar: string | null;
  role: string;
}

export interface Post {
  id: string;
  authorId: string;
  author: PostAuthor;
  content: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
}
