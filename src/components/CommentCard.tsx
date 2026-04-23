import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useReviewState } from '../hooks/useReviewState';
import type { Comment } from '../types';

export function CommentCard({ comment, index }: { comment: Comment; index: number }) {
  const { updateComment, deleteComment } = useReviewState();
  const [editing, setEditing] = useState(comment.text === '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const commit = () => {
    if (comment.text.trim()) setEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      commit();
    }
  };

  const lineLabel = comment.lines[0] === comment.lines[1]
    ? `L${comment.lines[0]}`
    : `L${comment.lines[0]}–${comment.lines[1]}`;

  return (
    <div className="group rounded-xl bg-white border border-slate-200/80 shadow-[0_1px_0_rgba(15,23,42,0.03)] hover:shadow-sm hover:border-slate-300/70 transition p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[11px] font-semibold text-slate-400">#{index + 1}</span>
        <span className="text-[11px] font-mono font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
          {lineLabel}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {!editing && comment.text.trim() && (
            <IconButton onClick={() => setEditing(true)} label="Edit">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </IconButton>
          )}
          <IconButton onClick={() => deleteComment(comment.id)} label="Delete" danger>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </IconButton>
        </div>
      </div>
      <blockquote className="text-[12.5px] text-slate-600 leading-relaxed border-l-2 border-indigo-300 bg-slate-50/60 pl-3 pr-2 py-1.5 mb-3 rounded-r whitespace-pre-wrap font-normal">
        {comment.quote}
      </blockquote>
      {editing ? (
        <>
          <textarea
            ref={textareaRef}
            className="w-full text-[13.5px] text-slate-800 leading-relaxed bg-white border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition placeholder:text-slate-400"
            rows={3}
            placeholder="Write your comment…"
            value={comment.text}
            onChange={(e) => updateComment(comment.id, e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commit}
          />
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
            <Kbd>Enter</Kbd><span>save</span>
            <span className="text-slate-300">·</span>
            <Kbd>⇧</Kbd><Kbd>Enter</Kbd><span>newline</span>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full text-left text-[13.5px] text-slate-800 leading-relaxed whitespace-pre-wrap px-3 py-2 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 transition"
          title="Click to edit"
        >
          {comment.text}
        </button>
      )}
    </div>
  );
}

function IconButton({
  onClick,
  label,
  danger = false,
  children,
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-6 h-6 inline-flex items-center justify-center rounded-md border border-transparent transition ${
        danger
          ? 'text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100'
          : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="font-mono text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-1 py-px rounded shadow-[0_1px_0_rgba(15,23,42,0.05)]">
      {children}
    </kbd>
  );
}
