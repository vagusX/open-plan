import { useReviewState } from '../hooks/useReviewState';
import type { Comment } from '../types';

export function CommentCard({ comment, index }: { comment: Comment; index: number }) {
  const { updateComment, deleteComment } = useReviewState();

  return (
    <div className="border-b border-gray-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
        <span className="text-xs text-gray-400">lines {comment.lines[0]}-{comment.lines[1]}</span>
        <button
          onClick={() => deleteComment(comment.id)}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Delete
        </button>
      </div>
      <div className="bg-yellow-50 text-sm text-gray-700 p-2 rounded mb-2 italic">
        "{comment.quote}"
      </div>
      <textarea
        className="w-full text-sm border border-gray-200 rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
        rows={3}
        placeholder="Write your comment..."
        value={comment.text}
        onChange={(e) => updateComment(comment.id, e.target.value)}
      />
    </div>
  );
}
