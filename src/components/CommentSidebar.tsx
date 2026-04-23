import { useReviewState } from '../hooks/useReviewState';
import { CommentCard } from './CommentCard';

export function CommentSidebar() {
  const { comments } = useReviewState();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-5 h-14 flex items-center justify-between border-b border-slate-200/70 sticky top-0 bg-slate-50/80 backdrop-blur-md z-10">
        <h2 className="text-[13px] font-semibold text-slate-900 tracking-tight">Comments</h2>
        <span className="text-[11px] font-medium text-slate-500 px-1.5 py-0.5 rounded bg-slate-200/60">{comments.length}</span>
      </div>
      {comments.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="p-3 space-y-2">
          {comments.map((comment, i) => (
            <CommentCard key={comment.id} comment={comment} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-8 py-16 text-center">
      <div className="mx-auto w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm mb-4">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <p className="text-[13px] text-slate-600 font-medium mb-1">No comments yet</p>
      <p className="text-[12px] text-slate-400 leading-relaxed">
        Select text in the editor, then click <span className="font-medium text-slate-600">Add Comment</span>.
      </p>
    </div>
  );
}
