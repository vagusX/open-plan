import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { useReviewState } from '../hooks/useReviewState';
import { SelectionToolbar } from './SelectionToolbar';

export function Editor() {
  const { markdown, setMarkdown } = useReviewState();

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: markdown,
    onUpdate: ({ editor }) => {
      const md = editor.storage.markdown.getMarkdown();
      setMarkdown(md);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none p-6 focus:outline-none',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="relative">
      <EditorContent editor={editor} />
      <SelectionToolbar editor={editor} />
    </div>
  );
}
