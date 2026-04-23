export interface Frontmatter {
  workspace?: string;
  title?: string;
  created?: string;
  updated?: string;
  status?: string;
  tags?: string[];
  [k: string]: unknown;
}

/**
 * Parse YAML frontmatter from a markdown string.
 *
 * Supports a tiny subset: `key: value` per line, values may be quoted strings
 * or bracketed flow-arrays (`[a, b, c]`). Good enough for plan metadata.
 */
export function parseFrontmatter(content: string): { fm: Frontmatter | null; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)*/);
  if (!match) return { fm: null, body: content };
  return { fm: parseYamlLike(match[1]), body: content.slice(match[0].length) };
}

/**
 * Serialize a Frontmatter object back to a YAML block (without the fences).
 * Preserves simple string values and flow-array serialization for string[].
 */
export function serializeFrontmatter(fm: Frontmatter): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(fm)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      lines.push(`${k}: [${v.map((x) => String(x)).join(', ')}]`);
    } else {
      lines.push(`${k}: ${String(v)}`);
    }
  }
  return lines.join('\n');
}

/**
 * Return `content` with the given frontmatter patch applied.
 * - If the file has no frontmatter, a new fence is prepended.
 * - If it has frontmatter, fields in `patch` are merged (undefined values skipped,
 *   null values delete the key).
 */
export function applyFrontmatterPatch(content: string, patch: Frontmatter): string {
  const { fm, body } = parseFrontmatter(content);
  const merged: Frontmatter = { ...(fm ?? {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (v === null) delete merged[k];
    else merged[k] = v;
  }
  const yaml = serializeFrontmatter(merged);
  const prefix = yaml ? `---\n${yaml}\n---\n\n` : '';
  return prefix + body.replace(/^\s+/, '');
}

function parseYamlLike(yaml: string): Frontmatter {
  const out: Frontmatter = {};
  for (const raw of yaml.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '').trimEnd();
    if (!line || line.trimStart().startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (!val) continue;
    if (val.startsWith('[') && val.endsWith(']')) {
      out[key] = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else {
      out[key] = val.replace(/^['"]|['"]$/g, '');
    }
  }
  return out;
}
