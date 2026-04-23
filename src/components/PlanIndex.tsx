import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlanEntry, PlanGroup, PlansResponse } from '../types';

export function PlanIndex() {
  const [data, setData] = useState<PlansResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const refresh = () => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(String(e)));
  };

  useEffect(refresh, []);

  // Suggest workspace paths that we already know about (from plans that DO have a workspace).
  const workspaceSuggestions = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const g of data.groups) {
      if (g.workspace) set.add(g.workspace);
    }
    return [...set].sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return null;
    const q = query.trim().toLowerCase();
    if (!q) return data.groups;
    return data.groups
      .map((g) => ({
        ...g,
        plans: g.plans.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.filename.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.plans.length > 0);
  }, [data, query]);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h12l4 4v12H4z" />
              <path d="M14 4v6h6" />
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[14px] font-semibold text-slate-900 tracking-tight">open-plan</span>
            <span className="text-slate-300 text-sm">/</span>
            <span className="text-[13px] text-slate-500 font-medium">index</span>
          </div>
          <div className="ml-auto relative">
            <svg viewBox="0 0 24 24" width="14" height="14" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plans…"
              className="pl-8 pr-3 h-8 text-[13px] bg-slate-100/70 border border-slate-200/70 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white"
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            加载失败：{error}
          </div>
        )}
        {!data && !error && <div className="text-slate-400 text-sm">Scanning…</div>}
        {data && filtered && filtered.length === 0 && (
          <EmptyState total={data.total} scannedDirs={data.scannedDirs} query={query} />
        )}
        {data && filtered && filtered.length > 0 && (
          <div className="space-y-10">
            {filtered.map((g) => (
              <GroupSection
                key={g.workspace ?? '__uncat__'}
                group={g}
                workspaceSuggestions={workspaceSuggestions}
                onUpdated={refresh}
              />
            ))}
          </div>
        )}
        {data && (
          <footer className="mt-16 pt-6 border-t border-slate-100 text-[12px] text-slate-400">
            {data.total} {data.total === 1 ? 'plan' : 'plans'} across {data.groups.length} workspace
            {data.groups.length === 1 ? '' : 's'} · scanned{' '}
            <code className="font-mono text-slate-500">{data.scannedDirs.join(', ')}</code>
          </footer>
        )}
      </main>

      <datalist id="workspace-suggestions">
        {workspaceSuggestions.map((w) => (
          <option key={w} value={w} />
        ))}
      </datalist>
    </div>
  );
}

function GroupSection({
  group,
  workspaceSuggestions,
  onUpdated,
}: {
  group: PlanGroup;
  workspaceSuggestions: string[];
  onUpdated: () => void;
}) {
  const isUncategorized = group.workspace === null;
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-[15px] font-semibold text-slate-900 tracking-tight">
          {isUncategorized ? <span className="text-slate-500">未分类</span> : <span>{group.label}</span>}
        </h2>
        {!isUncategorized && (
          <code className="font-mono text-[11px] text-slate-400 truncate" title={group.workspace ?? ''}>
            {group.workspace}
          </code>
        )}
        <span className="ml-auto text-[11px] font-medium text-slate-500 px-1.5 py-0.5 rounded bg-slate-100">
          {group.plans.length}
        </span>
      </div>
      <div className="rounded-xl border border-slate-200/70 bg-white overflow-hidden divide-y divide-slate-100">
        {group.plans.map((p) => (
          <PlanRow
            key={p.path}
            plan={p}
            canTag={isUncategorized}
            workspaceSuggestions={workspaceSuggestions}
            onUpdated={onUpdated}
          />
        ))}
      </div>
    </section>
  );
}

function PlanRow({
  plan,
  canTag,
  workspaceSuggestions,
  onUpdated,
}: {
  plan: PlanEntry;
  canTag: boolean;
  workspaceSuggestions: string[];
  onUpdated: () => void;
}) {
  const [tagging, setTagging] = useState(false);
  const href = `/plan?path=${encodeURIComponent(plan.path)}`;

  return (
    <div className="border-l-2 border-transparent hover:border-indigo-300 transition">
      <div className="flex items-center gap-2 px-4 py-3 group">
        <a href={href} className="min-w-0 flex-1 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-medium text-slate-900 truncate group-hover:text-indigo-700 transition">
                {plan.title}
              </span>
              {plan.status && <StatusChip status={plan.status} />}
              {!plan.hasFrontmatter && (
                <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  no frontmatter
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[12px] text-slate-400">
              <code className="font-mono">{plan.filename}</code>
              <span>·</span>
              <span>{formatRelative(plan.mtime)}</span>
              {plan.tags.length > 0 && (
                <>
                  <span>·</span>
                  <span className="flex gap-1">
                    {plan.tags.map((t) => (
                      <span key={t} className="text-indigo-600/80">#{t}</span>
                    ))}
                  </span>
                </>
              )}
            </div>
          </div>
        </a>
        {canTag && (
          <button
            type="button"
            onClick={() => setTagging((v) => !v)}
            className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition"
          >
            {tagging ? 'Cancel' : 'Tag workspace'}
          </button>
        )}
        <a href={href} className="text-slate-300 hover:text-slate-600 transition">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </a>
      </div>
      {tagging && (
        <TagPanel
          plan={plan}
          workspaceSuggestions={workspaceSuggestions}
          onDone={() => {
            setTagging(false);
            onUpdated();
          }}
          onCancel={() => setTagging(false)}
        />
      )}
    </div>
  );
}

function TagPanel({
  plan,
  workspaceSuggestions,
  onDone,
  onCancel,
}: {
  plan: PlanEntry;
  workspaceSuggestions: string[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [workspace, setWorkspace] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [inferred, setInferred] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetch(`/api/plan/suggest?path=${encodeURIComponent(plan.path)}`)
      .then((r) => r.json())
      .then((d) => setInferred(d.suggestions ?? []))
      .catch(() => {});
  }, [plan.path]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const ws = workspace.trim();
    if (!ws) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/plan/frontmatter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: plan.path, patch: { workspace: ws } }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onDone();
    } catch (e) {
      setErr(String(e));
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pb-3 -mt-1 bg-slate-50/80 border-t border-slate-100">
      <form onSubmit={submit} className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500 font-medium shrink-0">workspace:</span>
        <input
          ref={inputRef}
          type="text"
          list="workspace-suggestions"
          value={workspace}
          onChange={(e) => setWorkspace(e.target.value)}
          placeholder="/Users/you/Projects/my-repo"
          className="flex-1 h-8 px-2 text-[12.5px] font-mono bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
        />
        <button
          type="submit"
          disabled={saving || !workspace.trim()}
          className="h-8 px-3 text-[12px] font-medium bg-slate-900 text-white rounded hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-8 px-2 text-[12px] text-slate-500 hover:text-slate-900"
        >
          Cancel
        </button>
        {err && <span className="ml-2 text-[11px] text-red-600">{err}</span>}
        {workspaceSuggestions.length > 0 && !workspace && (
          <span className="text-[11px] text-slate-400">
            ↓ {workspaceSuggestions.length} known
          </span>
        )}
      </form>
      {inferred.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
            suggested from content:
          </span>
          {inferred.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setWorkspace(s)}
              className="text-[11px] font-mono px-2 py-0.5 rounded border border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
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

function EmptyState({ total, scannedDirs, query }: { total: number; scannedDirs: string[]; query: string }) {
  if (query) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-slate-500">No plans match "{query}".</p>
      </div>
    );
  }
  return (
    <div className="text-center py-16">
      <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h12l4 4v12H4z" />
          <path d="M14 4v6h6" />
        </svg>
      </div>
      <p className="text-[14px] font-medium text-slate-700 mb-1">No plans found</p>
      <p className="text-[12px] text-slate-400">
        Scanned <code className="font-mono">{scannedDirs.join(', ')}</code> · {total} files
      </p>
    </div>
  );
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day}d ago`;
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}
