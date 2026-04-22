import { useCallback } from 'react';
import { useReviewState } from './useReviewState';
import { getLineRange } from '../utils/lines';
import type { Comment } from '../types';

export function useComments() {
  const { markdown, addComment } = useReviewState();

  const createCommentFromSelection = useCallback(
    (selectedText: string) => {
      const lines = getLineRange(markdown, selectedText);
      if (!lines) return;

      const comment: Omit<Comment, 'id'> = {
        quote: selectedText,
        lines,
        text: '',
      };
      addComment(comment);
    },
    [markdown, addComment]
  );

  return { createCommentFromSelection };
}
