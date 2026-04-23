import { describe, expect, test } from 'bun:test';
import { applyFrontmatterPatch, parseFrontmatter, serializeFrontmatter } from '../src/utils/frontmatter';

describe('parseFrontmatter', () => {
  test('no frontmatter returns null fm and original body', () => {
    const src = '# Plan title\n\nbody';
    const { fm, body } = parseFrontmatter(src);
    expect(fm).toBeNull();
    expect(body).toBe(src);
  });

  test('parses basic key/value pairs', () => {
    const src =
      '---\nworkspace: /Users/foo/proj\ntitle: My Plan\ncreated: 2026-04-22\nstatus: draft\n---\n# body';
    const { fm, body } = parseFrontmatter(src);
    expect(fm).toEqual({
      workspace: '/Users/foo/proj',
      title: 'My Plan',
      created: '2026-04-22',
      status: 'draft',
    });
    expect(body).toBe('# body');
  });

  test('parses flow-style array for tags', () => {
    const src = '---\ntags: [frontend, refactor, ui]\n---\nbody';
    const { fm } = parseFrontmatter(src);
    expect(fm?.tags).toEqual(['frontend', 'refactor', 'ui']);
  });

  test('strips surrounding quotes from values', () => {
    const src = '---\ntitle: "Quoted Title"\nalias: \'short\'\n---\nbody';
    const { fm } = parseFrontmatter(src);
    expect(fm?.title).toBe('Quoted Title');
    expect(fm?.alias).toBe('short');
  });

  test('ignores comments and blank lines', () => {
    const src = '---\n# a comment\n\nworkspace: /x\n  # another comment\ntitle: y\n---\nbody';
    const { fm } = parseFrontmatter(src);
    expect(fm).toEqual({ workspace: '/x', title: 'y' });
  });

  test('tolerates CRLF line endings', () => {
    const src = '---\r\nworkspace: /x\r\ntitle: y\r\n---\r\nbody';
    const { fm, body } = parseFrontmatter(src);
    expect(fm).toEqual({ workspace: '/x', title: 'y' });
    expect(body).toBe('body');
  });

  test('malformed fence (missing close) returns null fm', () => {
    const src = '---\nworkspace: /x\ntitle: y\n# body';
    const { fm } = parseFrontmatter(src);
    expect(fm).toBeNull();
  });
});

describe('serializeFrontmatter', () => {
  test('round-trips strings and arrays', () => {
    const src = '---\nworkspace: /x\ntitle: y\ntags: [a, b]\n---\nbody';
    const { fm } = parseFrontmatter(src);
    const yaml = serializeFrontmatter(fm!);
    expect(yaml).toBe('workspace: /x\ntitle: y\ntags: [a, b]');
  });

  test('skips empty arrays and null values', () => {
    const yaml = serializeFrontmatter({ workspace: '/x', tags: [], title: null as any });
    expect(yaml).toBe('workspace: /x');
  });
});

describe('applyFrontmatterPatch', () => {
  test('adds frontmatter to plan without it', () => {
    const out = applyFrontmatterPatch('# Plan title\n\nbody', {
      workspace: '/repo',
      created: '2026-04-22',
    });
    expect(out).toStartWith('---\nworkspace: /repo\ncreated: 2026-04-22\n---\n\n# Plan title');
  });

  test('merges into existing frontmatter, preserving unrelated fields', () => {
    const src = '---\ntitle: T\nstatus: draft\n---\n# body';
    const out = applyFrontmatterPatch(src, { workspace: '/x' });
    const { fm, body } = parseFrontmatter(out);
    expect(fm).toEqual({ title: 'T', status: 'draft', workspace: '/x' });
    expect(body).toBe('# body');
  });

  test('null in patch deletes a key', () => {
    const src = '---\nworkspace: /old\ntitle: T\n---\nbody';
    const out = applyFrontmatterPatch(src, { workspace: null as any });
    const { fm } = parseFrontmatter(out);
    expect(fm).toEqual({ title: 'T' });
  });

  test('does not duplicate body leading whitespace', () => {
    const src = '\n\n# body';
    const out = applyFrontmatterPatch(src, { workspace: '/x' });
    expect(out).toBe('---\nworkspace: /x\n---\n\n# body');
  });
});
