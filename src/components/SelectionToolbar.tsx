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
      setPosition({ x: rect.left + rect.width / 2, y: rect.top - 40 });
    };

    editor.on('selectionUpdate', handleSelectionChange);
    return () => {
      editor.off('selectionUpdate', handleSelectionChange);
    };
  }, [editor]);

  const handleAddComment = () => {
    const { state } = editor;
    const { from, to } = state.selection;
    const selectedText = state.doc.textBetween(from, to);
    if (!selectedText.trim()) return;

    createCommentFromSelection(selectedText);
    setPosition(null);
    editor.commands.focus('end');
  };

  if (!position) return null;

  return (
    <div
      className="absolute z-50 bg-gray-900 text-white text-sm px-3 py-1.5 rounded shadow-lg cursor-pointer hover:bg-gray-800"
      style={{ left: position.x, top: position.y, transform: 'translateX(-50%)' }}
      onClick={handleAddComment}
    >
      Add Comment
    </div>
  );
}
