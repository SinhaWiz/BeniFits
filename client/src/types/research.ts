export interface ResearchSummary {
  pmid: string;
  title: string;
  journal: string | null;
  authors: string[];
  year: string | null;
  abstract: string;
  url: string;
}
