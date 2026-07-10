export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  source: string;
  publishedAt: string;
}
