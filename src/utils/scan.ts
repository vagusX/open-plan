import { readdirSync, readFileSync, statSync } from 'fs';
import { basename, join, resolve } from 'path';
import { homedir } from 'os';
import { parseFrontmatter } from './frontmatter';
import type { PlanEntry, PlanGroup } from '../types';

export const DEFAULT_PLAN_DIRS = [join(homedir(), '.claude', 'plans')];

/**
 * Resolve the effective scan directories: the global `~/.claude/plans/`
 * plus any `plans/` or `.claude/plans/` found under `cwd` (if provided).
 */
export function resolveScanDirs(cwd?: string): string[] {
  const dirs = new Set<string>(DEFAULT_PLAN_DIRS);
  if (cwd) {
    for (const sub of ['plans', '.claude/plans']) {
      const candidate = join(cwd, sub);
      if (isDirectory(candidate)) dirs.add(candidate);
    }
  }
  return [...dirs];
}

function isDirectory(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function scanPlans(dirs: string[] = DEFAULT_PLAN_DIRS): PlanEntry[] {
  const out: PlanEntry[] = [];
  for (const dir of dirs) {
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.endsWith('.md')) continue;
      const fullPath = resolve(dir, name);
      let st;
      try {
        st = statSync(fullPath);
      } catch {
        continue;
      }
      if (!st.isFile()) continue;
      let content: string;
      try {
        content = readFileSync(fullPath, 'utf8');
      } catch {
        continue;
      }
      const { fm } = parseFrontmatter(content);
      const title =
        (typeof fm?.title === 'string' && fm.title) ||
        extractFirstH1(content) ||
        basename(name, '.md');
      out.push({
        path: fullPath,
        filename: name,
        title,
        workspace: stringOrNull(fm?.workspace),
        created: stringOrNull(fm?.created),
        updated: stringOrNull(fm?.updated),
        status: stringOrNull(fm?.status),
        tags: Array.isArray(fm?.tags) ? (fm!.tags as string[]) : [],
        size: st.size,
        mtime: st.mtimeMs,
        hasFrontmatter: fm != null,
      });
    }
  }
  return out;
}

export function groupByWorkspace(plans: PlanEntry[]): PlanGroup[] {
  const groups = new Map<string | null, PlanEntry[]>();
  for (const p of plans) {
    const key = normalizeWorkspace(p.workspace);
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }
  const result: PlanGroup[] = [];
  for (const [ws, list] of groups) {
    list.sort((a, b) => b.mtime - a.mtime);
    result.push({
      workspace: ws,
      label: ws ? basename(ws) || ws : '未分类',
      plans: list,
      latest: list.reduce((m, p) => Math.max(m, p.mtime), 0),
    });
  }
  result.sort((a, b) => {
    if (a.workspace === null) return 1;
    if (b.workspace === null) return -1;
    return b.latest - a.latest;
  });
  return result;
}

export function normalizeWorkspace(ws: string | null): string | null {
  if (!ws) return null;
  if (ws === '~') return homedir();
  if (ws.startsWith('~/')) return join(homedir(), ws.slice(2));
  return ws;
}

function stringOrNull(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

function extractFirstH1(content: string): string | null {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

/**
 * Extract plausible workspace paths from plan body content.
 *
 * Scans absolute paths under `/Users/<name>/...`, emits candidate roots at
 * multiple depths (4–5 segments, e.g. `Projects/repo` and `Projects/org/repo`),
 * and ranks by frequency — ties break to the more specific (longer) path since
 * that's usually what the user means when everything sits under a common org dir.
 *
 * A depth D is only emitted when there's something below it in the matched
 * path (`D < parts.length`). Otherwise a leaf file like `.../foo-app/package.json`
 * would register as its own "workspace candidate" and, on length-desc tie-break,
 * crowd out genuine project roots that were only mentioned once.
 */
export function suggestWorkspaces(content: string, limit = 5): string[] {
  const counts = new Map<string, number>();
  const regex = /\/Users\/[A-Za-z0-9._-]+\/[A-Za-z0-9._\-/]+/g;
  for (const match of content.matchAll(regex)) {
    const parts = match[0].split('/').filter(Boolean);
    if (parts[0] !== 'Users' || !parts[2] || parts[2].startsWith('.')) continue;
    for (let depth = 4; depth <= 5 && depth < parts.length; depth++) {
      const root = '/' + parts.slice(0, depth).join('/');
      counts.set(root, (counts.get(root) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([path]) => path);
}
