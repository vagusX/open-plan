import type { Frontmatter } from './utils/frontmatter';

export interface Comment {
  id: string;
  quote: string;
  lines: [number, number];
  text: string;
}

export interface ReviewState {
  original: string;
  markdown: string;
  comments: Comment[];
  frontmatter: Frontmatter | null;
}

export interface PlanEntry {
  path: string;
  filename: string;
  title: string;
  workspace: string | null;
  created: string | null;
  updated: string | null;
  status: string | null;
  tags: string[];
  size: number;
  mtime: number;
  hasFrontmatter: boolean;
}

export interface PlanGroup {
  workspace: string | null; // null = 未分类
  label: string;
  plans: PlanEntry[];
  latest: number;
}

export interface PlansResponse {
  groups: PlanGroup[];
  total: number;
  scannedDirs: string[];
}
