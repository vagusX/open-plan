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
        class: [
          'prose prose-slate max-w-none focus:outline-none',
          'prose-headings:font-semibold prose-headings:tracking-tight',
          'prose-h1:text-[34px] prose-h1:leading-[1.15] prose-h1:mb-6 prose-h1:mt-0',
          'prose-h2:text-[22px] prose-h2:mt-10 prose-h2:mb-3',
          'prose-h3:text-[17px] prose-h3:mt-8 prose-h3:mb-2',
          'prose-p:leading-[1.75] prose-p:text-[15px] prose-p:text-slate-700',
          'prose-li:my-0.5 prose-li:text-[15px] prose-li:text-slate-700',
          'prose-strong:text-slate-900',
          'prose-a:text-indigo-600 prose-a:font-medium prose-a:no-underline hover:prose-a:underline',
          'prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:font-mono prose-code:text-[13px] prose-code:font-medium prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none',
          'prose-blockquote:border-l-indigo-400 prose-blockquote:bg-slate-50 prose-blockquote:py-2 prose-blockquote:not-italic prose-blockquote:text-slate-700',
        ].join(' '),
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
