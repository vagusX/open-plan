import type { Frontmatter } from '../utils/frontmatter';

/**
 * Compact metadata strip shown above the editor body. Renders the frontmatter
 * fields as chips/inline chrome instead of letting TipTap swallow the raw YAML
 * block into an unreadable paragraph.
 */
export function PlanMetaCard({ frontmatter }: { frontmatter: Frontmatter }) {
  const { workspace, status, created, updated, tags } = frontmatter;
  const hasAny =
    workspace || status || created || updated || (Array.isArray(tags) && tags.length > 0);
  if (!hasAny) return null;

  return (
    <div className="not-prose mb-8 rounded-xl border border-slate-200/70 bg-slate-50/60 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
      {typeof workspace === 'string' && workspace && (
        <div className="flex items-center gap-1.5 min-w-0" title={workspace}>
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-400 shrink-0"
          >
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          <code className="font-mono text-slate-600 truncate">{workspace}</code>
        </div>
      )}
      {typeof status === 'string' && status && <StatusChip status={status} />}
      {typeof created === 'string' && created && (
        <DateField label="created" value={created} />
      )}
      {typeof updated === 'string' && updated && (
        <DateField label="updated" value={updated} />
      )}
      {Array.isArray(tags) && tags.length > 0 && (
        <span className="flex items-center gap-1.5 flex-wrap">
          {tags.map((t) => (
            <span key={String(t)} className="text-indigo-600 font-medium">
              #{String(t)}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

function DateField({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-slate-500">
      <span className="text-slate-400">{label}</span> <span className="font-mono">{value}</span>
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    'in-progress': 'bg-indigo-50 text-indigo-700 border-indigo-100',
    done: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    archived: 'bg-slate-50 text-slate-400 border-slate-100',
  };
  const cls = map[status] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls}`}>
      {status}
    </span>
  );
}
