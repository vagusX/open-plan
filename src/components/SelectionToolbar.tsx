import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useComments } from '../hooks/useComments';

export function SelectionToolbar({ editor }: { editor: Editor }) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const { createCommentFromSelection } = useComments();

  useEffect(() => {
    const handleSelectionChange = () => {
      const { state } = editor;
      const { selection } = state;
      const { from, to } = selection;

      if (from === to) {
        setPosition(null);
        return;
      }

      const domSelection = window.getSelection();
      if (!domSelection || domSelection.rangeCount === 0) {
        setPosition(null);
        return;
      }

      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setPosition({ x: rect.left + rect.width / 2, y: rect.top - 44 });
    };

    editor.on('selectionUpdate', handleSelectionChange);
    return () => {
      editor.off('selectionUpdate', handleSelectionChange);
    };
  }, [editor]);

  const handleAddComment = (e: React.MouseEvent) => {
    e.preventDefault();
    const { state } = editor;
    const { from, to } = state.selection;
    const selectedText = state.doc.textBetween(from, to, '\n\n', ' ');
    if (!selectedText.trim()) return;

    createCommentFromSelection(selectedText);
    setPosition(null);
    editor.commands.focus('end');
  };

  if (!position) return null;

  return (
    <div
      className="fixed z-50 flex items-center gap-1.5 bg-slate-900 text-white text-[12.5px] font-medium pl-3 pr-3.5 h-9 rounded-full shadow-lg shadow-slate-900/20 ring-1 ring-white/10 cursor-pointer hover:bg-slate-800 transition"
      style={{ left: position.x, top: position.y, transform: 'translateX(-50%)' }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleAddComment}
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      Add comment
    </div>
  );
}
