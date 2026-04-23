import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { groupByWorkspace, normalizeWorkspace, resolveScanDirs, scanPlans, suggestWorkspaces } from '../src/utils/scan';

describe('scanPlans', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'open-plan-scan-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('extracts title from frontmatter or first H1', () => {
    writeFileSync(
      join(dir, 'a.md'),
      '---\nworkspace: /repo/a\ntitle: With FM\ncreated: 2026-04-01\n---\n# not this\nbody'
    );
    writeFileSync(join(dir, 'b.md'), '# From H1\n\nbody');
    writeFileSync(join(dir, 'c.md'), 'no heading at all');
    writeFileSync(join(dir, 'skip.txt'), 'not markdown');

    const plans = scanPlans([dir]);
    const byName = Object.fromEntries(plans.map((p) => [p.filename, p]));

    expect(Object.keys(byName).sort()).toEqual(['a.md', 'b.md', 'c.md']);
    expect(byName['a.md'].title).toBe('With FM');
    expect(byName['a.md'].workspace).toBe('/repo/a');
    expect(byName['a.md'].hasFrontmatter).toBe(true);
    expect(byName['b.md'].title).toBe('From H1');
    expect(byName['b.md'].hasFrontmatter).toBe(false);
    expect(byName['c.md'].title).toBe('c'); // fallback to basename
  });

  test('missing dir is silently skipped', () => {
    const plans = scanPlans([join(dir, 'nope')]);
    expect(plans).toEqual([]);
  });
});

describe('groupByWorkspace', () => {
  test('groups by workspace and buckets missing into null group', () => {
    const now = Date.now();
    const entries = [
      makePlan({ path: '/a/1.md', workspace: '/repo/a', mtime: now - 1000 }),
      makePlan({ path: '/a/2.md', workspace: '/repo/a', mtime: now - 2000 }),
      makePlan({ path: '/b/1.md', workspace: '/repo/b', mtime: now - 500 }),
      makePlan({ path: '/x/1.md', workspace: null, mtime: now - 100 }),
    ];
    const groups = groupByWorkspace(entries);

    expect(groups.map((g) => g.workspace)).toEqual(['/repo/b', '/repo/a', null]);
    expect(groups[0].plans.map((p) => p.path)).toEqual(['/b/1.md']);
    expect(groups[1].plans.map((p) => p.path)).toEqual(['/a/1.md', '/a/2.md']);
    expect(groups[2].workspace).toBeNull();
    expect(groups[2].label).toBe('未分类');
    expect(groups[2].plans.map((p) => p.path)).toEqual(['/x/1.md']);
  });
});

describe('normalizeWorkspace', () => {
  test('expands ~ and ~/', () => {
    expect(normalizeWorkspace('~')).toMatch(/^\//);
    const expanded = normalizeWorkspace('~/Projects/x');
    expect(expanded).toMatch(/Projects\/x$/);
  });

  test('passes through absolute paths', () => {
    expect(normalizeWorkspace('/abs/path')).toBe('/abs/path');
  });

  test('null/empty → null', () => {
    expect(normalizeWorkspace(null)).toBeNull();
    expect(normalizeWorkspace('')).toBeNull();
  });
});

describe('resolveScanDirs', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'open-plan-cwd-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  test('returns only defaults when cwd has no plans dirs', () => {
    const dirs = resolveScanDirs(tmp);
    expect(dirs.length).toBeGreaterThan(0);
    expect(dirs.every((d) => !d.startsWith(tmp))).toBe(true);
  });

  test('includes <cwd>/plans and <cwd>/.claude/plans when present', () => {
    const plans = join(tmp, 'plans');
    const claudePlans = join(tmp, '.claude', 'plans');
    require('fs').mkdirSync(plans);
    require('fs').mkdirSync(claudePlans, { recursive: true });
    const dirs = resolveScanDirs(tmp);
    expect(dirs).toContain(plans);
    expect(dirs).toContain(claudePlans);
  });
});

describe('suggestWorkspaces', () => {
  test('extracts and ranks project-root paths from content', () => {
    const body = `
This plan concerns /Users/alice/Projects/foo-app/src/index.ts.
Also mentions /Users/alice/Projects/foo-app/package.json twice:
/Users/alice/Projects/foo-app/README.md
and a different repo /Users/alice/Projects/bar-tool/build.ts.
`;
    const suggestions = suggestWorkspaces(body);
    expect(suggestions[0]).toBe('/Users/alice/Projects/foo-app');
    expect(suggestions).toContain('/Users/alice/Projects/bar-tool');
  });

  test('prefers deeper project root on tie (org/repo layouts)', () => {
    const body = [
      '/Users/bob/Projects/lark/fullstack-plugin/src/a.ts',
      '/Users/bob/Projects/lark/fullstack-plugin/src/b.ts',
      '/Users/bob/Projects/lark/fullstack-plugin/packages/x.ts',
    ].join('\n');
    const [first] = suggestWorkspaces(body);
    expect(first).toBe('/Users/bob/Projects/lark/fullstack-plugin');
  });

  test('skips dotfile dirs under user home (e.g. .claude, .config)', () => {
    const body = 'see /Users/alice/.claude/plans/x.md and /Users/alice/.config/foo';
    expect(suggestWorkspaces(body)).toEqual([]);
  });

  test('respects limit', () => {
    const body = Array.from({ length: 10 }, (_, i) => `/Users/alice/Projects/p${i}/file.ts`).join('\n');
    expect(suggestWorkspaces(body, 3)).toHaveLength(3);
  });

  test('empty content → empty suggestions', () => {
    expect(suggestWorkspaces('no paths here')).toEqual([]);
  });
});

function makePlan(opts: { path: string; workspace: string | null; mtime: number }) {
  return {
    path: opts.path,
    filename: opts.path.split('/').pop()!,
    title: 't',
    workspace: opts.workspace,
    created: null,
    updated: null,
    status: null,
    tags: [],
    size: 100,
    mtime: opts.mtime,
    hasFrontmatter: opts.workspace != null,
  };
}
