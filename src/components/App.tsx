import { Editor } from './Editor';
import { CommentSidebar } from './CommentSidebar';
import { CopyXmlButton } from './CopyXmlButton';
import { PlanMetaCard } from './PlanMetaCard';
import { useReviewState } from '../hooks/useReviewState';

function Header() {
  const { filePath, comments } = useReviewState();
  const fileName = filePath.split('/').pop() ?? filePath;
  return (
    <header className="flex items-center justify-between px-6 h-14 border-b border-slate-200/70 bg-white/70 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        <a href="/" title="Back to index" className="flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm hover:shadow-md transition">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h12l4 4v12H4z" />
            <path d="M14 4v6h6" />
          </svg>
        </a>
        <div className="flex items-baseline gap-2 min-w-0">
          <a href="/" className="text-[14px] font-semibold text-slate-900 tracking-tight hover:text-indigo-600 transition">open-plan</a>
          <span className="text-slate-300 text-sm">/</span>
          <span className="text-[13px] text-slate-500 truncate font-medium" title={filePath}>{fileName}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[12px] text-slate-500">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100/70 border border-slate-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </span>
      </div>
    </header>
  );
}

export function App() {
  const { frontmatter } = useReviewState();
  return (
    <div className="flex flex-col h-screen bg-white">
      <Header />
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-12 py-14">
            {frontmatter && <PlanMetaCard frontmatter={frontmatter} />}
            <Editor />
          </div>
        </main>
        <aside className="w-96 border-l border-slate-200/70 bg-slate-50/40 flex flex-col">
          <CommentSidebar />
          <CopyXmlButton />
        </aside>
      </div>
    </div>
  );
}
