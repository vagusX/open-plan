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
}
