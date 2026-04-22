import { useReviewState } from '../hooks/useReviewState';
import { CommentCard } from './CommentCard';

export function CommentSidebar() {
  const { comments } = useReviewState();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">Comments ({comments.length})</h2>
      </div>
      {comments.length === 0 ? (
        <div className="p-4 text-sm text-gray-400 text-center">
          Select text and click "Add Comment" to start reviewing
        </div>
      ) : (
        comments.map((comment, i) => (
          <CommentCard key={comment.id} comment={comment} index={i} />
        ))
      )}
    </div>
  );
}
