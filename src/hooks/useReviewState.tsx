import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Comment, ReviewState } from '../types';

interface ReviewContextValue extends ReviewState {
  setMarkdown: (md: string) => void;
  addComment: (comment: Omit<Comment, 'id'>) => void;
  updateComment: (id: string, text: string) => void;
  deleteComment: (id: string) => void;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

type Action =
  | { type: 'SET_MARKDOWN'; payload: string }
  | { type: 'ADD_COMMENT'; payload: Comment }
  | { type: 'UPDATE_COMMENT'; payload: { id: string; text: string } }
  | { type: 'DELETE_COMMENT'; payload: string };

function reducer(state: ReviewState, action: Action): ReviewState {
  switch (action.type) {
    case 'SET_MARKDOWN':
      return { ...state, markdown: action.payload };
    case 'ADD_COMMENT':
      return { ...state, comments: [...state.comments, action.payload] };
    case 'UPDATE_COMMENT':
      return {
        ...state,
        comments: state.comments.map((c) =>
          c.id === action.payload.id ? { ...c, text: action.payload.text } : c
        ),
      };
    case 'DELETE_COMMENT':
      return {
        ...state,
        comments: state.comments.filter((c) => c.id !== action.payload),
      };
    default:
      return state;
  }
}

export function ReviewStateProvider({
  initialMd,
  filePath,
  children,
}: {
  initialMd: string;
  filePath: string;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, {
    original: initialMd,
    markdown: initialMd,
    comments: [],
  });

  const value: ReviewContextValue = {
    ...state,
    setMarkdown: (md: string) => dispatch({ type: 'SET_MARKDOWN', payload: md }),
    addComment: (comment: Omit<Comment, 'id'>) => {
      const id = `c${state.comments.length + 1}`;
      dispatch({ type: 'ADD_COMMENT', payload: { ...comment, id } });
    },
    updateComment: (id: string, text: string) =>
      dispatch({ type: 'UPDATE_COMMENT', payload: { id, text } }),
    deleteComment: (id: string) => dispatch({ type: 'DELETE_COMMENT', payload: id }),
  };

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReviewState(): ReviewContextValue {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error('useReviewState must be used within ReviewStateProvider');
  return ctx;
}
